# Batch 7 — OrganizationMember Fail-Closed Activation Report

## 1. Context and Motivation

In Wave 0.8 Batch 6, `OrganizationMember` was placed in `STAGED` mode pending comprehensive real-Mongo verification of authentication middleware, session resolution, and invitation acceptance.

In Batch 7, `OrganizationMember` was successfully promoted to `FAIL_CLOSED`.

---

## 2. Changes Implemented

### 2.1 Model Policy Registry
In `packages/database/src/tenantModelPolicyRegistry.ts`:
- Promoted `OrganizationMember` from `TenantModelPolicyMode.STAGED` to `TenantModelPolicyMode.FAIL_CLOSED`.
- Registered authorized exceptions: none required (membership is always tenant-scoped).
- Registered operation coverage: `query`, `aggregate`, `document-create`, `document-save`, `insertMany`, `bulkWrite`.
- Test evidence: `wave08-batch7-invitation-platform.integration.test.ts`.

### 2.2 Middleware & Service Adaptations
1. **Authentication Middleware (`apps/api/src/middleware/auth.middleware.ts`)**:
   - In `authenticate`:
     - Once `tenantId` is resolved from header/session, wrapped `OrganizationMemberModel.findOne({ tenantId, userId: req.user._id, status: 'ACTIVE' })` in `tenantContextStorage.run({ currentTenantId: tenantId, currentUserId: req.user._id, isPlatformContext: false, allowedTenantIds: [tenantId] }, ...)`.
     - Ensured `rolesList` and `permissionsSet` are set accurately from the resolved member record.
2. **Auth Service (`apps/api/src/services/auth.service.ts`)**:
   - In `resolveTenantRolesAndPermissions`:
     - Wrapped member lookup in `tenantContextStorage.run({ currentTenantId: tenantId, currentUserId: userId, ... })`.
3. **Branch Access Service (`apps/api/src/services/branchAccess.service.ts`)**:
   - In `getScope` and `assertBranchAccess`:
     - Added auto-scoping ALS wrapper when `tenantContextStorage.getStore()?.currentTenantId !== tenantId`, ensuring offline background tasks and tests querying branch access execute under proper tenant context.

---

## 3. Negative and Positive Security Proofs

In `wave08-batch7-invitation-platform.integration.test.ts`:
- **Missing-Context Rejection**: Any query or document save against `OrganizationMemberModel` without ALS tenant context throws:
  `Tenant context is required for tenant-owned model operation (OrganizationMember)`
- **Cross-Tenant Isolation**: Queries executed under tenant A never observe memberships belonging to tenant B.

Both positive and negative proofs passed under real MongoDB.

