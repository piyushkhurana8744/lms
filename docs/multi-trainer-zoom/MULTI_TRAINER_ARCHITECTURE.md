# Multi-Trainer Zoom Hosting: System Architecture & Data Models

## Architectural Overview

DIDM LMS provides institutional online training where classes belong to batches and are instructed by qualified faculty members. Prior to this release, Zoom live meetings were created strictly under the single master Zoom account (`/users/me`), preventing concurrent class execution and causing host collisions.

The **Institute-Managed Multi-Trainer Zoom Hosting Architecture** decouples meeting scheduling from the administrative connection, automatically assigning each online class meeting to the verified Zoom host account of the assigned faculty trainer.

```
       ┌────────────────────────────────────────────────────────┐
       │                   Class Scheduling                      │
       │  (Batch Schedule / Timetable / One-Off Online Class)   │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │             Host Resolution & Verification             │
       │   1. Class.instructorId || Batch.instructorId          │
       │   2. Validate active INSTRUCTOR & OrganizationMember   │
       │   3. Resolve TrainerZoomAccountModel mapping           │
       │   4. Verify isHostEligible && licenseType: LICENSED    │
       │   5. Check host scheduling conflicts                   │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │             Zoom Meeting Provisioning                   │
       │   POST /users/{trainerZoomUserId}/meetings             │
       │   - Created using Institute Account OAuth Credentials  │
       │   - Dedicated start_url generated for Trainer          │
       │   - Public join_url generated for Students             │
       └───────────────────────────┬────────────────────────────┘
                                   │
             ┌─────────────────────┴─────────────────────┐
             ▼                                           ▼
┌─────────────────────────────┐             ┌─────────────────────────────┐
│    Trainer Dashboard        │             │      Student Portal         │
│  - Launch Class (start_url) │             │  - Join Class (join_url)    │
│  - Host Eligibility Status  │             │  - Privileged start_url     │
│  - Attendance Evidence      │             │    STRIPPED (Protected)     │
└─────────────────────────────┘             └─────────────────────────────┘
```

---

## 1. Database Model Changes

### 1.1 `TrainerZoomAccountModel` (`packages/database/src/models/trainerZoomAccount.model.ts`)
A tenant-isolated schema binding an LMS faculty trainer (`User`) to an enterprise Zoom user under the institute's Zoom account.

```typescript
export interface ITrainerZoomAccountDocument extends Document {
  tenantId: Types.ObjectId;
  userId: Types.ObjectId;
  zoomAccountId: string;
  zoomUserId: string;
  zoomEmail: string;
  accountMembershipStatus: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  licenseType: 'LICENSED' | 'BASIC' | 'ON_PREM';
  isHostEligible: boolean;
  ineligibilityReason?: string | null;
  verifiedAt?: Date | null;
  lastSyncedAt: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Compound Indexes
1. `{ tenantId: 1, userId: 1 }` (Unique): Ensures each trainer in a tenant has exactly one active Zoom host mapping.
2. `{ tenantId: 1, zoomUserId: 1 }` (Unique): Prevents two different trainers in the same tenant from claiming the same Zoom user ID.
3. `{ tenantId: 1, isHostEligible: 1 }`: Fast index for resolving eligible hosts during schedule compilation.

#### Multi-Tenant Security & Policy Classification
- Registered in `packages/database/src/tenantModelPolicyRegistry.ts` as `FAIL_CLOSED`.
- Plugged into `tenantIsolationPlugin` ensuring zero missing-context access.
- Total tenant-owned model count updated in `scripts/report-wave08-model-policies.mjs` to 69 with 24 fail-closed models.

### 1.2 `CreateMeetingInput` Contract Extension
In `apps/api/src/services/integrations/contracts/liveMeetingProvider.contract.ts`:
```typescript
export interface CreateMeetingInput {
  tenantId: string;
  branchId?: string | null;
  classId: string;
  topic: string;
  agenda?: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  organizerUserId: string;
  organizerEmail?: string;
  hostExternalUserId?: string; // Target Zoom user id for multi-trainer hosting
  hostEmail?: string;
  password?: string;
  autoRecord?: boolean;
  // ...
}
```

---

## 2. Automatic Host Selection Hierarchy

When creating a meeting for an online class:

1. **Direct Class Trainer Precedence**:
   If `Class.instructorId` is set, that trainer is the authoritative host.
2. **Batch Trainer Fallback**:
   If `Class.instructorId` is null, the system queries the parent `Batch.instructorId`.
3. **Faculty Membership Verification**:
   - `UserModel`: Status must be `ACTIVE`.
   - `OrganizationMemberModel`: Membership status must be `ACTIVE` and role must be `INSTRUCTOR`.
4. **Host Account & License Verification**:
   - `TrainerZoomAccountModel` must exist.
   - `accountMembershipStatus` must be `ACTIVE`.
   - `licenseType` must be `LICENSED` (Zoom type 2). Basic (free) accounts with 40-minute limits are rejected.
5. **Conflict Detection**:
   Checks whether the resolved trainer has another class overlapping in `scheduledStartAt` and `scheduledEndAt`.
6. **Strict Non-Fallback Invariant**:
   If no eligible trainer exists, meeting creation **fails clearly** with actionable diagnostic messages (e.g., `Trainer does not have a mapped Zoom host account`). The system **never silently falls back to scheduling under SuperAdmin** unless an explicit tenant-level setting (`metadata.allowAdminFallbackHost`) is activated.

---

## 3. Trainer Reassignment & Lifecycle Synchronization

When a class trainer changes from Trainer A to Trainer B:
1. `Class.instructorId` is updated to Trainer B.
2. `TrainerZoomAccountService.resolveHostForClass` verifies Trainer B's licensed Zoom mapping.
3. The previous meeting record in `LiveMeetingAssociationHistoryModel` is retired (`RETIRED_REASSIGNED_TRAINER`).
4. The old Zoom meeting is cancelled on Zoom via `ZoomAdapter.cancelMeeting` to prevent orphaned links.
5. A new Zoom meeting is created under Trainer B's Zoom user ID.
6. `ExternalMeetingModel` and `Class.zoomDetails` are updated with the new meeting URL, ID, and host credentials.
7. An audit log event `CLASS_TRAINER_REASSIGNED` is durably recorded.

