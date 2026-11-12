# Certificate & Receipt Artifact Security

## Artifact Handoff Architecture
Artifact generation involves producing PDF documents (receipts and certificates) and storing them in object storage (S3/local mock), linking the resulting storage URL back to the multi-tenant document record.

In asynchronous generation (e.g. background worker outbox consumers or reconciliation tasks), operations must transition from cross-tenant queue events to tenant-isolated generation pipelines without using unconstrained database bypasses.

## Certificate Handoff Flow (`apps/api/src/services/certificate.service.ts`)
- **Method:** `CertificateService.trustedGenerate(certificateId, options)`
- **Caller Requirements:**
  - Caller must provide a verified `SystemAuthority` OR have an active tenant workspace context (`tenantContextStorage.getStore()`).
  - If an unauthenticated caller or forged object is passed without active context, throws `TenantContextMissingError`.
- **Target Resolution:**
  - Under `AuthorizedSystemOperationType.ARTIFACT_HANDOFF`, executes a minimal query `{ _id: certificateId }` selecting only `_id` and `tenantId`.
  - If `options.expectedTenantId` is provided, asserts `candidate.tenantId.toString() === options.expectedTenantId.toString()`. Mismatch raises a security exception.
- **Tenant Isolation:**
  - Enters `tenantContextStorage.run({ tenantId: candidate.tenantId, role: 'SYSTEM' })`.
  - Invokes `CertificateArtifactService.generate(certificateId)` within tenant context.
  - Generates the PDF artifact, uploads to storage, and writes `artifactUrl`, `issuedAt`, and verification hashes inside tenant bounds.

## Receipt Handoff Flow (`apps/api/src/services/receiptArtifact.service.ts`)
- **Method:** `ReceiptArtifactService.generateTrusted(receiptId, options)`
- **Caller Requirements:**
  - Requires `SystemAuthority` or active tenant context.
- **Target Resolution:**
  - Discovers receipt record using `AuthorizedSystemOperationType.ARTIFACT_HANDOFF` selecting `_id` and `tenantId`.
  - Enforces `candidate.tenantId.toString() === options.expectedTenantId.toString()`.
- **Tenant Isolation:**
  - Enters `tenantContextStorage.run` with the resolved `tenantId`.
  - Calls `ReceiptArtifactService.generate(receiptId)`.
  - Preserves receipt numbering, currency, ledger association, line items, and storage references.

## Preservation of Public Certificate Verification
- Public certificate verification (`CertificateService.verify` invoked via `/verify/certificate/:code`) relies on finding certificates by unique `verificationCode` across tenants for public validation.
- Per scope instructions, this single legitimate public verification query was preserved untouched and will be addressed in a future dedicated public-route batch.

