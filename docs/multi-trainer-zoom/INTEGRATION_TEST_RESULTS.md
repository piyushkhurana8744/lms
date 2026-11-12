# Multi-Trainer Zoom Hosting: Integration Test Evidence

## Test Suite Overview

Comprehensive unit and integration test suites were written and executed to prove correctness, tenant isolation, license enforcement, concurrency safety, and role boundary protection.

---

## 1. Unit Test Matrix (`trainerZoomAccount.test.ts`)

File: `apps/api/src/services/__tests__/trainerZoomAccount.test.ts`
Command: `pnpm test apps/api/src/services/__tests__/trainerZoomAccount.test.ts`

```text
✓ apps/api/src/services/__tests__/trainerZoomAccount.test.ts (9)
  ✓ TrainerZoomAccountService Unit Tests (9)
    ✓ mapTrainerZoomAccount (3)
      ✓ successfully maps a Licensed Zoom user to an active LMS instructor
      ✓ rejects mapping when Zoom user has a Basic (free) license
      ✓ rejects mapping when the Zoom user belongs to an external foreign Zoom account
    ✓ resolveHostForClass (5)
      ✓ resolves specifically assigned class instructor over batch instructor
      ✓ falls back to batch instructor when class has no direct instructorId
      ✓ fails clearly when assigned trainer has no mapped Zoom host account
      ✓ detects and flags host scheduling conflicts when trainer has overlapping classes
      ✓ rejects meeting creation when trainer is ineligible due to basic account
    ✓ syncAllTrainersZoomStatus (1)
      ✓ synchronizes all mapped trainer Zoom accounts and computes eligible count

Test Files  1 passed (1)
     Tests  9 passed (9)
  Duration  431ms
```

### Key Behaviors Proven by Unit Tests:
1. **Licensed Host Verification**:
   When Zoom API returns `type: 2` (Licensed) and `status: 'active'`, `isHostEligible` is set to `true` and `licenseType` to `'LICENSED'`.
2. **Basic Account Rejection**:
   When Zoom API returns `type: 1` (Basic/Free), `isHostEligible` is set to `false` and `ineligibilityReason` to `'BASIC_UNLICENSED_USER'`.
3. **Foreign Account Defense**:
   When the queried Zoom user has an `account_id` differing from the institute's connection, mapping is rejected with a 403 Forbidden error.
4. **Hierarchical Host Resolution**:
   Direct `Class.instructorId` takes strict precedence over `Batch.instructorId`. If class instructor is absent, batch instructor is seamlessly resolved.
5. **Non-Fallback Invariant**:
   When an assigned instructor has no mapped Zoom account, `resolveHostForClass` throws a `BadRequestError` rather than silently assigning the SuperAdmin.
6. **Conflict Detection**:
   Overlapping class schedules for the same trainer are detected and returned in `hasConflict` with full conflict details.

---

## 2. Mongo Integration Test Suite (`multi-trainer-zoom.integration.test.ts`)

File: `apps/api/src/services/__tests__/multi-trainer-zoom.integration.test.ts`

### Scenarios Covered:
1. **Multi-Tenant Isolation**:
   Proves that TrainerZoomAccount records created under Tenant A cannot be queried, mapped, or resolved by Tenant B.
2. **Batch Trainer Auto-Resolution**:
   Proves that when a class is created without a direct instructor, the batch trainer is resolved and the Zoom meeting is provisioned under that trainer's host ID.
3. **Class Trainer Precedence**:
   Proves that guest faculty specifically assigned to a single class overrides the parent batch trainer.
4. **Trainer Reassignment Lifecycle**:
   Proves that reassigning a class trainer retires the old meeting in `LiveMeetingAssociationHistoryModel`, cancels the old meeting on Zoom, and creates a new meeting under the new trainer.
5. **Durable Idempotency & Concurrency**:
   Proves that 5 concurrent meeting creation calls for the same class return the exact same meeting ID without duplicating provider resources.
6. **Privilege Separation (Student vs Instructor)**:
   - Instructor receives `isHost: true`, `startUrl`, and `joinUrl`.
   - Student receives `isHost: false`, `joinUrl`, and `startUrl: undefined`.

---

## 3. Security Baseline Verification

Command: `pnpm security:check:wave07`
Result:
- **0 production raw bypasses** found across API and Worker modules.
- **69 tenant-owned models** registered.
- **24 fail-closed models** verified (including `TrainerZoomAccountModel`).
- **Regression Guard**: 0 violations.

Command: `pnpm type-check`
Result:
- Clean across all 10 monorepo packages.

Command: `pnpm build`
Result:
- Successfully compiled Next.js with all 92 static and dynamic routes.

