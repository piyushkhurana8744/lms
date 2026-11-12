# Privileged Bypass Register

The original repository-wide search reported 136 textual occurrences. After excluding tests, generated JavaScript/type output, scripts, and documentation, the production TypeScript inventory is 45 call sites (including the two plugin checks). A textual count is not a vulnerability count.

| Class | Representative callers | Context and boundary | Disposition |
|---|---|---|---|
| Worker claims/leases | notification, finance, integration and outbox dispatchers | No request context; claims globally, then carries/validates `tenantId` | Legitimate, but require an authorized system-operation API and negative tests |
| Automation recovery | automation event/execution/step recovery | Global due-work scan; records retain tenant | Legitimate worker behavior; migrate to system-operation wrapper |
| Provider webhooks | integration webhook and Zoom recording services | Provider identifiers resolve connection/meeting, subsequent writes include resolved tenant | Legitimate only with signature verification and ownership tests |
| Public verification | certificate verification | Random public verification code; returns credential snapshot only | Accepted public lookup; retain response-minimization tests |
| Artifact handoff | certificate and receipt artifact services | Cross-context ID lookup only to establish tenant context | Replace with explicit trusted handoff helper |
| Payment webhook | finance provider order/refund lookup | Provider-signed identifier resolves tenant-bound record | Legitimate; retain signature/replay/tenant tests |
| SuperAdmin impersonation | auth service | Explicit active SuperAdmin check, reason, target validation and audit | High risk; keep, require critical audit atomicity |
| Internal integration routes | `app.ts` internal worker endpoints | Worker secret, resource lookup, then tenant checks | High risk; consolidate into trusted internal-operation wrapper |

No call site was proven to expose a cross-tenant response during this pass. However, raw `{ bypassTenantFilter: true }` remains broadly available and has no machine-enforced reason or authorization token. That structural risk is unresolved; the 45-line raw inventory is the authoritative review set.

Required next change: introduce typed `runAuthorizedSystemOperation({kind, tenantId?, reason, correlationId})`, deny raw bypass outside that module, and migrate each row with focused negative tests. Until then, disposition is architectural debt, not a security certification.
