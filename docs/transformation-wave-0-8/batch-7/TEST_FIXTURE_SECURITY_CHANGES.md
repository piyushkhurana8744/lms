# Batch 7 — Test Fixture Security Changes Audit

## 1. Guiding Security Principles

In accordance with Wave 0.8 Batch 7 mandates:
1. **No Production Plugin Weakening**: Production plugin behavior in `packages/database/src/plugin/tenantIsolationPlugin.ts` was never degraded or relaxed to accommodate historical tests.
2. **No Ambient Test-Wide Fallbacks**: No ambient tenant fallback or auto-injection was introduced to test environments.
3. **No Unsafe Raw Collection Bypasses for Tenant Users**: Normal tenant users and tenant entities must always pass through standard Mongoose fail-closed validation. Direct `.collection` calls are strictly limited to index synchronization and fixture cleanup in test lifecycle hooks (`beforeAll`/`afterAll`).
4. **Platform Provisioning Strictness**: Any test that requires global SuperAdmin credentials uses `runPlatformProvisioningOperation` under authenticated `PLATFORM` capability.

---

## 2. Inventory of Test Fixture Adjustments

### 2.1 Academic Scheduling (`academic-scheduling.integration.test.ts` & `academic-scheduling-http.integration.test.ts`)
- **Change**: Updated `beforeAll` fixture setup to ensure all scheduling mutexes and automation models (`AutomationEventModel`, `AutomationExecutionModel`, `AutomationStepExecutionModel`, `SchedulingMutexModel`) are cleared.
- **Change**: Ensured `TenantModel` fixture has explicit `status: 'ACTIVE'`, aligning with tenant activation checks in runtime operations.
- **Change**: Wrapped mid-test status toggles (`OrganizationMemberModel.updateOne(...)`) in `run(...)` helper to provide proper tenant context.
- **Change**: Used `OrganizationMemberModel.collection.updateMany` in the initial DB seeding step before test execution.

### 2.2 Communication (`communication.integration.test.ts`)
- **Change**: Wrapped student transfer simulation in `runWithContext(async () => { ... })` so that `OrganizationMemberModel.updateOne` executes under valid ALS tenant context.
- **Security Validation**: Confirmed that when student transfer executes without tenant context, `OrganizationMemberModel` throws `Tenant context is required for tenant-owned model operation (OrganizationMember)` (fail-closed behavior verified).

### 2.3 Student Lifecycle (`student-lifecycle.integration.test.ts`)
- **Change**: In Test 11, moved `OrganizationMemberModel.create` into `runAsAdmin(async () => { ... })`.
- **Change**: In Test 12, wrapped `OrganizationMemberModel.countDocuments` in `runAsAdmin()`.
- **Change**: In Test 12, extended vitest timeout to 30,000ms to allow 10-way concurrent admission conversion transactions against replica set MongoDB without false timeouts.

### 2.4 Redis Outage & Recovery Proofs (`scripts/run-redis-proofs.mjs`)
- **Files Affected**:
  - `apps/worker/src/services/__tests__/notification-redis-recovery.integration.test.ts`
  - `apps/api/src/services/__tests__/notification-redis-finalize.integration.test.ts`
  - `apps/api/src/services/__tests__/student-lifecycle-redis-proof.integration.test.ts`
  - `apps/api/src/services/__tests__/instructor-operating-redis-proof.integration.test.ts`
  - `apps/api/src/services/__tests__/integrations-redis-proof.integration.test.ts`
- **Change**: Removed all `.setOptions({ bypassTenantFilter: true })` and `.setOptions({ __bypassTenantIsolation: true })`.
- **Change**: Updated test teardown to use `Model.collection.deleteMany({ tenantId })` to isolate cleanup from runtime business logic hooks.
- **Change**: In `integrations-redis-proof.integration.test.ts`, corrected `ExternalMeetingModel.collection.countDocuments` to match `classId` as `new mongoose.Types.ObjectId(id)` rather than string.

---

## 3. Negative Security Tests for Platform Provisioning

To verify that ordinary tenant operations cannot create platform accounts or SuperAdmins:
- Added real-Mongo negative tests in `apps/api/src/services/__tests__/wave08-batch7-invitation-platform.integration.test.ts`:
  1. Creating a User with `isSuperAdmin: true` from a tenant context fails with `Tenant users cannot be created as SuperAdmin`.
  2. Creating a User with `tenantId: null` from a tenant context fails with `Platform users must be created under PLATFORM execution mode`.
  3. Creating a User with `tenantId: null` via public registration fails with `Public registration cannot create platform SuperAdmin`.
  4. Global platform provisioning succeeds exclusively when wrapped in `runPlatformProvisioningOperation(PLATFORM_AUTHORITY, ...)`.

