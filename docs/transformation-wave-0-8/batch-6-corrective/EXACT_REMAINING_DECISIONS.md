# DIDM LMS — Wave 0.8 / Batch 6 Corrective
## Exact Remaining Decisions & Roadmap Alignment

This document articulates the concrete architectural decisions, trade-offs, and next batch milestones remaining in the Wave 0.8 multi-tenant isolation transformation.

---

### Decision 1: Historical Test Fixture Migration vs. Staged Isolation Progression

- **Context**: In `pnpm test:integration:mongo`, 951 tests passed and 25 failed. All 25 failures were triggered because older test fixtures (from Waves 0.1–0.4) seed `UserModel` records directly via Mongoose without invoking `tenantContextStorage.run`.
- **Options**:
  - **Option A (Recommended)**: Progressively wrap historical test setup helper utilities in test-scoped `tenantContextStorage.run` or use direct collection driver (`UserModel.collection.insertOne`) in test setup files across subsequent batches.
    - *Impact*: Preserves 100% fail-closed runtime security guarantees in production code while incrementally restoring green status to legacy test files.
  - **Option B**: Introduce a test-only ambient fallback context that auto-injects a mock tenant ID in Vitest environments when missing.
    - *Impact*: Makes test suites pass immediately, but introduces risk of masking real context loss bugs in tests.

---

### Decision 2: Progression Order for Remaining 64 Models

- **Current Registry Status**:
  - `FAIL_CLOSED` (4): `Course`, `NotificationIntent`, `OrganizationDomain`, `User`
  - `STAGED` (1): `OrganizationMember`
  - `UNCLASSIFIED` (63): All remaining models
- **Next Candidate Clusters for Promotion**:
  1. **Membership & Identity Cluster (Batch 7)**:
     - `OrganizationMember` (currently `STAGED`)
     - `OrganizationInvitation`
     - `Branch`
     - `Role`
  2. **Academic & Classroom Cluster (Batch 8)**:
     - `Batch`
     - `Class`
     - `AttendanceSession` / `AttendanceRecord`
     - `Timetable`
  3. **Financial & Compliance Cluster (Batch 9)**:
     - `FeePlan`
     - `FeeTransaction`
     - `ReceiptSequence`
     - `Certificate`

---

### Decision 3: Global Platform Super Admin Model Separation

- **Context**: The `User` model currently houses both multi-tenant tenant users (`tenantId != null`) and global platform super-administrators (`tenantId: null`).
- **Options**:
  - **Option A**: Maintain unified `User` model with `tenantId: null` allowed only under explicit `PLATFORM` execution context.
  - **Option B**: Split platform super-administrators into a distinct `PlatformUser` collection, making `User` 100% strictly non-nullable on `tenantId`.
    - *Impact*: Architectural purity and simplified isolation plugin, but requires migration of platform auth routes and session stores.

