# Public Certificate Verification Policy

## 1. Context & Motivation
DIDM LMS issues cryptographically verifiable credentials (certificates) that must be readable by external third parties (e.g. employers, regulatory bodies, students) without requiring platform authentication or tenant-scoped user logins (`/verify/certificate/:code`).

Previously, this route relied on `bypassTenantFilter: true` on `CertificateModel.findOne`. In Batch 5, an explicit, narrow **Public Read Policy** was established.

---

## 2. Policy Specification & Enforcement

### Explicit Read Policy Hook
In `packages/database/src/authorizedExecutionContext.ts` and `packages/database/src/plugin/tenantIsolationPlugin.ts`:
```typescript
export function assertPublicReadPolicy(policy: PublicReadPolicy, query: any) {
  if (policy === 'CERTIFICATE_VERIFICATION') {
    const code = query?.verificationCode;
    if (!code || typeof code !== 'string' || !/^[A-Za-z0-9_-]{6,64}$/.test(code.trim())) {
      throw new Error('Public certificate verification requires an exact valid verificationCode predicate');
    }
  }
}
```

### Safety Guarantees
1. **No Ambient System Capability:** Public callers are never granted `SystemAuthority` or internal execution capabilities.
2. **Predicate Invariance:** Queries using `publicReadPolicy: 'CERTIFICATE_VERIFICATION'` MUST contain an exact, literal `verificationCode` string. Broad enumeration attacks (e.g., `{ verificationCode: { $exists: true } }`, empty `{}` queries, or regex wildcards) are immediately aborted by the plugin.
3. **Data Minimization:** Only public snapshot fields are projected:
   ```typescript
   CertificateModel.findOne({ verificationCode: normalizedCode })
     .setOptions({ publicReadPolicy: 'CERTIFICATE_VERIFICATION' })
     .select('verificationCode status certificateNumber credentialSnapshot.studentName credentialSnapshot.courseTitle credentialSnapshot.organizationName issuedAt credentialSnapshot.completionDate')
     .lean();
   ```
4. **Zero PII Disclosure:** Internal notes, student IDs, student emails, student phone numbers, tenant IDs, and database revisions are never returned.
5. **Revocation Semantics:** Preserves credential integrity:
   - Status `ISSUED` returns `valid: true`.
   - Status `REVOKED` returns `valid: false, status: 'REVOKED'`.
6. **Anti-Abuse Rate Limiting:** Enforces rate limiting on `/certificates/verify/:code` to prevent enumeration attacks.

