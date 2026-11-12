# DIDM LMS — Wave 0.8 / Batch 6 Corrective
## Real Mongo Proofs & Runtime Isolation Evidence

This document captures the exact execution output and verification results from real-MongoDB integration tests proving that the `User` model is fully fail-closed, pre-session operations are compliant, and runtime isolation guarantees hold.

---

### Proof 1: Wave 0.8 Batch 6 Registration & Fail-Closed Enforcement

**Command Executed**:
```bash
node scripts/run-mongo-integration.mjs apps/api/src/services/__tests__/wave08-batch6-registration.integration.test.ts
```

**Output**:
```
RUN  v2.1.9 /Users/piyushkhurana/lms

✓ apps/api/src/services/__tests__/wave08-batch6-registration.integration.test.ts (4 tests) 114ms
  ✓ Wave 0.8 Batch 6 - User Model Fail-Closed Registration Contract (4)
    ✓ public self-registration requires explicit tenantSlug and provisions user with tenantId (44ms)
    ✓ public self-registration rejects when tenantSlug does not resolve to active organization (12ms)
    ✓ staff invitation acceptance executes under invitation tenant context (21ms)
    ✓ UserModel rejects queries without tenant context or pre-session exception authorization (9ms)

Test Files  1 passed (1)
     Tests  4 passed (4)
  Start at  15:08:44
  Duration  1.67s (transform 89ms, setup 0ms, collect 469ms, tests 114ms, environment 0ms, run 1.11s)
```

**Key Invariants Verified**:
1. Unauthenticated self-registration strictly rejects when `tenantSlug` is missing or invalid.
2. Successful registration creates a `User` entity strictly bound to `tenantId`.
3. `UserModel.findOne({ email: ... })` called outside tenant context immediately throws:
   `Error: Tenant context is required for tenant-owned model operation (User)`.
4. Staff invitation acceptance successfully verifies token, enters invitation tenant context, and updates the user profile and membership without bypass.

---

### Proof 2: Wave 0.8 Runtime Isolation Verification

**Command Executed**:
```bash
node scripts/run-mongo-integration.mjs apps/api/src/services/__tests__/wave08-runtime-isolation.integration.test.ts
```

**Output**:
```
RUN  v2.1.9 /Users/piyushkhurana/lms

✓ apps/api/src/services/__tests__/wave08-runtime-isolation.integration.test.ts (11 tests) 279ms
  ✓ Wave 0.8 - Real Mongo Multi-Tenant Runtime Isolation (11)
    ✓ CourseModel.findOne() rejects queries when tenant context is missing (fail-closed) (33ms)
    ✓ CourseModel.create() rejects document creation when tenant context is missing (12ms)
    ✓ CourseModel operations succeed when explicit tenant context is active (27ms)
    ✓ Tenant A cannot read Tenant B documents via findOne (17ms)
    ✓ Tenant A update operations do not affect Tenant B documents (21ms)
    ✓ OrganizationDomainModel.findOne() rejects queries when tenant context is missing (12ms)
    ✓ OrganizationDomainModel allows platform-wide lookup when authorized with authorizedExecutionContext (13ms)
    ✓ NotificationIntentModel.findOne() rejects queries when tenant context is missing (12ms)
    ✓ NotificationIntentModel allows SYSTEM context via authorizedExecutionContext (15ms)
    ✓ Legacy bypass options (bypassTenantFilter, __bypassTenantIsolation) are rejected on fail-closed models (18ms)
    ✓ Tenant identity is immutable across save and update operations (39ms)

Test Files  1 passed (1)
     Tests  11 passed (11)
  Start at  15:08:52
  Duration  1.82s (transform 95ms, setup 0ms, collect 496ms, tests 279ms, environment 0ms, run 1.23s)
```

**Key Invariants Verified**:
1. All fail-closed models (`Course`, `NotificationIntent`, `OrganizationDomain`, `User`) reject operations when tenant context is absent.
2. Cross-tenant leakage is physically prevented at the query rewriting layer.
3. Legacy bypass flags (`bypassTenantFilter`, `__bypassTenantIsolation`) throw an explicit error on fail-closed models.
4. Tenant ID mutations via updates or saves are strictly blocked.

---

### Proof 3: Redis Recovery & Distributed Outbox Proofs

**Command Executed**:
```bash
node scripts/run-redis-proofs.mjs
```

**Output**:
```
[run-redis-proofs] Starting isolated Redis server on port 6391...
[run-redis-proofs] Redis server ready on port 6391 (PID: 23641)
[run-redis-proofs] Running Redis proof test suite...

RUN  v2.1.9 /Users/piyushkhurana/lms

✓ apps/worker/src/services/__tests__/finance-worker.integration.test.ts (1 test) 304ms
✓ apps/api/src/services/__tests__/academic-scheduling-proofs.integration.test.ts (1 test) 781ms
✓ apps/api/src/services/__tests__/notification-redis-finalize.integration.test.ts (1 test) 296ms
✓ apps/api/src/services/__tests__/integrations-redis-proof.integration.test.ts (1 test) 1037ms
✓ apps/api/src/services/__tests__/instructor-operating-redis-proof.integration.test.ts (1 test) 1041ms
✓ apps/api/src/services/__tests__/student-lifecycle-redis-proof.integration.test.ts (1 test) 1307ms
✓ apps/worker/src/services/__tests__/notification-redis-recovery.integration.test.ts (1 test) 1528ms
✓ apps/api/src/services/__tests__/finance-transactions.integration.test.ts (1 test) 1406ms
✓ apps/api/src/services/__tests__/finance-http-security.integration.test.ts (1 test) 808ms

Test Files  9 passed (9)
     Tests  9 passed (9)
  Start at  15:09:41
  Duration  4.10s (transform 322ms, setup 0ms, collect 7.02s, tests 8.51s, environment 0ms, run 3.73s)

[run-redis-proofs] Redis proof test suite passed!
[run-redis-proofs] Stopping Redis server (PID: 23641)...
[run-redis-proofs] Redis proofs completed successfully.
```

All 9/9 distributed Redis recovery and outbox tests passed with zero failures.

