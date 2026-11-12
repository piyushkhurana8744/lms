# Internal Finance Route Security & Negative Test Matrix

## Endpoint Architecture: `/api/v1/internal/finance/:kind/:id`

The internal finance endpoint handles worker-driven financial reconciliation and asynchronous artifact generation.

### Route Guard Implementation
1. **Internal Worker Authentication:**
   Requires HTTP header `x-internal-worker-secret`. Checked via `timingSafeEqual`.
   Rejects missing secret with `401 Unauthorized`.
   Rejects invalid/incorrect secret with `401 Unauthorized`.
2. **Tenant Header Enforcement:**
   Requires HTTP header `x-tenant-id` matching `/^[0-9a-fA-F]{24}$/`.
   Missing header -> `400 Bad Request`.
   Malformed header -> `400 Bad Request`.
3. **Capability Issuance:**
   Upon successful authentication, issues an in-memory opaque `SystemAuthority` (`createSystemAuthority('INTERNAL_FINANCE_ROUTE')`).
4. **Tenant Ownership Validation:**
   Performs identifier-only discovery to read `{ _id, tenantId }` from the target model (`Receipt`, `Certificate`, `Payment`, `Refund`).
   If record is not found -> `404 Not Found`.
   If record exists but `record.tenantId.toString() !== reqTenantId` -> `400 Bad Request` (`Tenant context mismatch`).
5. **Context Re-Entry & Dispatch:**
   Re-enters tenant context via `tenantContextStorage.run({ tenantId: reqTenantId, ... })` and dispatches:
   - `receipt-artifact`: `ReceiptArtifactService.generateTrusted(id, { expectedTenantId, systemAuthority })`
   - `certificate-artifact`: `CertificateService.trustedGenerate(id, { expectedTenantId, systemAuthority })`
   - `payment-reconcile`: `FinanceService.reconcilePayment(id)`
   - `refund-reconcile`: `FinanceService.reconcileRefund(id)`
6. **Error Sanitization:**
   Catch-all error handler sanitizes stack traces, gateway credentials, and customer PII before sending a generic error response.

---

## Negative Test Matrix (`apps/api/src/services/__tests__/finance-http-security.integration.test.ts`)

| Scenario | HTTP Header / Payload | Expected Status | Security Assertion |
|---|---|---|---|
| Unauthenticated request | No `x-internal-worker-secret` | `401 Unauthorized` | Worker route protected from public access |
| Invalid worker secret | `x-internal-worker-secret: invalid` | `401 Unauthorized` | Constant-time secret verification |
| Missing tenant header | Secret valid, no `x-tenant-id` | `400 Bad Request` | Tenant context cannot be omitted |
| Malformed tenant header | `x-tenant-id: invalid-mongo-id` | `400 Bad Request` | 24-character hex format enforced |
| Cross-tenant receipt artifact | Secret valid, `x-tenant-id: TenantB` targeting TenantA receipt | `400 Bad Request` | Cross-tenant access denied |
| Cross-tenant payment reconcile | Secret valid, `x-tenant-id: TenantB` targeting TenantA payment | `400 Bad Request` | Cross-tenant reconciliation denied |
| Authorized receipt generation | Secret valid, `x-tenant-id: TenantA` targeting TenantA receipt | `200 OK` | S3 artifact created, record updated in TenantA |
| Authorized payment reconcile | Secret valid, `x-tenant-id: TenantA` targeting TenantA payment | `200 OK` | Payment reconciled in TenantA context |
| Authorized refund reconcile | Secret valid, `x-tenant-id: TenantA` targeting TenantA refund | `200 OK` | Refund reconciled in TenantA context |

