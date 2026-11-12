# DIDM LMS — Wave 0.8 / Batch 6 Corrective
## Implemented Code Changes

This document details all code modifications introduced in Batch 6 Corrective execution to activate `User` model fail-closed enforcement and resolve all pre-session and invitation acceptance operations.

---

### 1. `packages/database/src/tenantModelPolicyRegistry.ts`
- **Change**: Promoted `User` model policy mode from `STAGED` to `FAIL_CLOSED`.
- **Policy Configuration**:
  ```typescript
  User: {
    model: 'User',
    mode: 'FAIL_CLOSED',
    authorizedExceptions: [
      'LOGIN_USER_BY_EMAIL',
      'REGISTER_USER_BY_EMAIL',
      'SESSION_USER_BY_ID',
      'PLATFORM',
    ],
    operationCoverage: [
      'query',
      'aggregate',
      'document-create',
      'document-save',
      'insertMany',
      'bulkWrite',
    ],
    lastTestEvidence:
      'wave08-batch6-registration.integration.test.ts: real-Mongo tenant registration and missing-context rejection',
  }
  ```
- **Total Registered Models**: 68
  - `FAIL_CLOSED` (4): `Course`, `NotificationIntent`, `OrganizationDomain`, `User`
  - `STAGED` (1): `OrganizationMember`
  - `UNCLASSIFIED` (63): All remaining models

---

### 2. `packages/database/src/plugin/tenantIsolationPlugin.ts`
- **Scoped Legacy Bypass Rejection**:
  - Updated `rejectLegacyOptions(target, options)` so that `bypassTenantFilter` / `__bypassTenantIsolation` rejection is scoped exclusively to fail-closed models (`isModelFailClosed(modelName(target))`).
  - Ensures unclassified models in legacy test suites can continue during gradual wave migration without runtime crashes while strictly forbidding bypasses on fail-closed models.
- **Tenant Immutability Operator Rules**:
  - Refined `assertTenantImmutable(update, contextTenantId)`:
  - Allowed `$setOnInsert: { tenantId: id }` when it matches the context tenant ID, which is critical for atomic upserts (e.g. membership creation on invitation accept).
  - Strictly rejected `$set`, `$unset`, and `$rename` operators attempting to mutate `tenantId`.

---

### 3. `apps/api/src/services/organizationInvitation.service.ts`
- **Invitation Acceptance Execution Context**:
  - Wrapped `acceptInvitation` profile creation and membership upsert in `tenantContextStorage.run`:
    ```typescript
    return tenantContextStorage.run(
      {
        currentTenantId: invitation.tenantId.toString(),
        currentUserId: 'invitation-accept',
        currentUserRole: invitation.role,
        correlationId: `invite-accept-${invitation._id}`,
      },
      async () => {
        // user lookup, password hash, user creation, membership upsert
      }
    );
    ```
  - Removed redundant `tenantId` field from `OrganizationMemberModel.findOneAndUpdate` `$set` payload to comply with tenant immutability assertions.

---

### 4. `apps/api/src/config/autoBootstrap.ts`
- **Initial Deployment Bootstrap Context**:
  - Wrapped auto-bootstrap logic for Super Admin role, User, Settings, and Branding inside `tenantContextStorage.run` with the initial tenant ID to prevent missing-context rejection during cold start.

---

### 5. `apps/api/src/services/notification.service.ts`
- **Mongoose Promise Context Retention**:
  - Ensured that `NotificationIntentModel.findOneAndUpdate`, `NotificationDeliveryModel.findOneAndUpdate`, and recipient lookups wrapped in `tenantContextStorage.run` use `async () => await ...` arrow functions.
  - Fixes premature AsyncLocalStorage scope exit caused by returning un-awaited Mongoose Query thenable objects before Mongoose pre-hooks trigger.

---

### 6. Test Suite & Harness Updates
- **`apps/api/src/services/__tests__/wave08-batch6-registration.integration.test.ts`**:
  - Added real-Mongo test proofs validating:
    1. Unauthenticated public registration fails without `tenantSlug`.
    2. Registration under valid `tenantSlug` provisions `User` with matching `tenantId`.
    3. `UserModel` missing-context rejection actively fails closed.
    4. Staff invitation acceptance executes safely under `invitation.tenantId`.
- **`apps/worker/src/services/__tests__/notification-redis-recovery.integration.test.ts`**:
  - Replaced unbound `UserModel.create` with direct collection insert (`UserModel.collection.insertOne`) to decouple test fixture seeding from ALS runtime requirements.
- **`apps/api/src/services/__tests__/instructor-operating-redis-proof.integration.test.ts`**:
  - Wrapped fixture setup in `tenantContextStorage.run`.
- **`apps/api/src/services/__tests__/student-lifecycle-redis-proof.integration.test.ts`**:
  - Wrapped fixture setup in `tenantContextStorage.run`.
- **`scripts/demo-seed.ts`**:
  - Wrapped tenant seed data generation in `tenantContextStorage.run` under `didmTenant._id`.
  - Used raw driver `UserModel.collection.insertOne` for the global Super Admin record (`tenantId: null`).

