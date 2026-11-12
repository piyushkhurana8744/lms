# Wave 0.7 Batch 5 Handoff: The Final Security Closure

## Context & Baseline
Batch 4 completed the migration of automation, provider webhooks, Zoom recording synchronization, and Razorpay webhook ownership discovery.

- Current Raw Bypass Count: **5** (down from initial 45).
- Protected Production Modules: **12**.
- All regression suites (unit, mongo integration, redis proofs, Playwright E2E) are 100% green.

---

## Remaining Target Inventory (The Final 5 Sites)

### 1. `apps/api/src/scripts/migratePhase18BranchAccess.ts:8`
- **Context:** One-off data migration script updating branch access scopes.
- **Migration Plan:**
  - Either migrate to run under a trusted administrative execution capability or wrap with `runAuthorizedSystemOperation({ kind: 'DATABASE_MIGRATION' })`.
  - Deprecate or retire if already executed in production environments.

### 2. `apps/api/src/services/auth.service.ts:368, 376, 536`
- **Context:** Platform Superadmin session bootstrap & cross-tenant impersonation:
  - Line 368: Cross-tenant lookup for superadmin user by email.
  - Line 376: Target tenant resolution for impersonation authorization.
  - Line 536: Session token creation across tenant boundaries.
- **Migration Plan:**
  - Define `AuthorizedSystemOperationType.PLATFORM_SUPERADMIN_SESSION`.
  - Validate superadmin credentials and MFA before granting the opaque capability.
  - Require explicit `targetTenantId` and re-enter tenant context via `tenantContextStorage.run` for all downstream operations.
  - Record immutable audit logs for all cross-tenant impersonation session establishments.
  - Protect `auth.service.ts` in the static enforcement check (13th module).

### 3. `apps/api/src/services/certificate.service.ts:68`
- **Context:** Public certificate verification endpoint (`/verify/certificate/:code`).
- **Migration Plan:**
  - Define `AuthorizedSystemOperationType.PUBLIC_CERTIFICATE_VERIFICATION`.
  - Perform unauthenticated lookup selecting strictly public metadata (`_id tenantId certificateCode recipientName issuedAt courseTitle status`).
  - Re-enter tenant context for `tenantContextStorage.run` using `certificate.tenantId` to render public verification artifacts without granting cross-tenant write or read access.
  - Protect `certificate.service.ts` in the static enforcement check (14th module).

---

## Target Milestones for Batch 5
1. **0 Raw Bypass Textual Count:** Eliminate the remaining 5 sites to reach true zero production raw bypasses.
2. **100% Static Protection:** Add `auth.service.ts` and `certificate.service.ts` to `check-wave07-bypass.mjs`.
3. **Full Regression Parity:** Retain 1,063+ Mongo integration tests, 777 unit tests, 9 Redis proofs, and 36 Playwright E2E tests green.
4. **Final Wave 0.7 Architecture Summary:** Produce the definitive Wave 0.7 completion audit and sign-off report.

