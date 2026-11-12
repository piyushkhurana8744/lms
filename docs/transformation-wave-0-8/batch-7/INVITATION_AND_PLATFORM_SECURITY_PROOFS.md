# Batch 7 — Invitation Acceptance & Platform Security Proofs

## 1. Invitation Acceptance Hardening

In `apps/api/src/services/organizationInvitation.service.ts`, `acceptInvitation` was hardened to eliminate race conditions, privilege escalations, and cross-tenant leakage.

### Key Architectural Invariants:
1. **Atomic Single-Use State Transition**:
   - Uses `OrganizationInvitationModel.findOneAndUpdate` matching `{ tokenHash, status: 'PENDING', expiresAt: { $gt: new Date() } }` with `$set: { status: 'ACCEPTED', acceptedAt: new Date() }`.
   - In a concurrent race with 10 parallel claims on the same invitation token, exactly 1 wins; 9 fail with `NotFoundError('Invalid or expired invitation')`.
2. **Token-Derived Tenant and Role Immutability**:
   - Neither the caller nor client request payload can specify or override the target `tenantId` or `role`. Both are read strictly from the immutable invitation document.
   - The user creation and organization membership creation execute inside `tenantContextStorage.run({ currentTenantId: invitation.tenantId.toString(), ... })`.
3. **Automatic Rollback on Validation Failure**:
   - If input validation fails (e.g. invalid password complexity or mismatch), the invitation status is automatically rolled back from `ACCEPTED` to `PENDING`, allowing the user to retry without losing their invite.
4. **Tenant Isolation Guarantees**:
   - User creation enforces `tenantId` match.
   - OrganizationMember creation links `userId` to the invitation's `tenantId`.

---

## 2. Platform SuperAdmin Exception Contract

Historically, `User` collection contained both tenant-scoped users and platform-level SuperAdmins. In Wave 0.8 Batch 7, this privilege boundary was strictly formalized:

### Security Contract:
1. **Platform Identity Definition**:
   - A platform SuperAdmin user MUST have `tenantId: null` and `isSuperAdmin: true`.
   - A tenant-scoped user MUST have `tenantId: <valid ObjectId>` and `isSuperAdmin: false`.
2. **Provisioning Isolation**:
   - `tenantIsolationPlugin.ts` enforces that creating a user with `tenantId: null` is only allowed when running under `PLATFORM` execution mode via `runPlatformProvisioningOperation`.
   - Any attempt to create a user with `tenantId: null` outside `PLATFORM` mode throws `Platform users must be created under PLATFORM execution mode`.
   - Any attempt by a tenant user to create another user with `isSuperAdmin: true` throws `Tenant users cannot be created as SuperAdmin`.
3. **Public Registration Guard**:
   - Public registration (`REGISTER_USER_BY_EMAIL`) explicitly rejects any payload specifying `isSuperAdmin: true` or `tenantId: null`, throwing `Public registration cannot create platform SuperAdmin`.
4. **Session Authorization**:
   - Platform sessions are authorized only after verifying that `session.isPlatformSession === true`, `session.revoked === false`, `session.expiresAt > now`, and `user.isSuperAdmin === true` with `user.tenantId == null`.

---

## 3. Dedicated Real-Mongo Proofs (`wave08-batch7-invitation-platform.integration.test.ts`)

A dedicated suite of 15 real-Mongo tests was implemented in `apps/api/src/services/__tests__/wave08-batch7-invitation-platform.integration.test.ts`:

1. `OrganizationMember: rejects query without tenant context` (Verified fail-closed query rejection)
2. `OrganizationMember: rejects document save without tenant context` (Verified fail-closed save rejection)
3. `OrganizationMember: succeeds with valid tenant context` (Verified positive path)
4. `Invitation: atomically transitions status PENDING -> ACCEPTED on claim` (Verified single-use)
5. `Invitation: exactly 1 winner in 10-way concurrent acceptance race` (Verified concurrency safety)
6. `Invitation: derives tenantId and role strictly from token, ignoring caller overrides` (Verified role immutability)
7. `Invitation: rejects expired invitation` (Verified expiry guard)
8. `Invitation: rolls back ACCEPTED state if validation fails` (Verified retry safety)
9. `Platform SuperAdmin: tenant users cannot be created with isSuperAdmin=true` (Verified negative tenant escalation test)
10. `Platform SuperAdmin: tenant users cannot be created with tenantId=null` (Verified negative null-tenant test)
11. `Platform SuperAdmin: platform users must have tenantId=null` (Verified contract)
12. `Platform SuperAdmin: global platform provisioning succeeds under PLATFORM capability` (Verified positive platform path)
13. `Platform SuperAdmin: public registration cannot create SuperAdmin` (Verified registration endpoint protection)
14. `Platform SuperAdmin: platform session authorizes valid SuperAdmin` (Verified session authorization)
15. `Platform SuperAdmin: platform session rejects expired or revoked session` (Verified session revocation)

**Result**: 15 passed | 0 failed | 0 skipped.

