# DIDM LMS — Wave 0.8 / Batch 6 Corrective
## Registration & User Creation Source Trace

This document provides a comprehensive end-to-end trace across every public, tenant, staff, and student user-creation and onboarding code path in the DIDM LMS platform.

---

### 1. Executive Contract Summary

- **Self-Registration Is Strictly Tenant-Bound**: The public registration schema (`RegisterSchema`) strictly enforces `tenantSlug: z.string().min(2)`. The API does not provide any public, tenantless platform user registration.
- **Organization Onboarding (Tenant + Admin Creation)**: In `OrganizationDomainService.onboardOrganization`, a new `Organization` tenant record is inserted first, followed immediately by user creation scoped under that new `organization._id`.
- **Pre-Session User Operations**: Unauthenticated endpoints (e.g. login, registration, session exchange) operate under explicit pre-session exception policies (`LOGIN_USER_BY_EMAIL`, `REGISTER_USER_BY_EMAIL`) authorized at the plugin layer.
- **Tenant Context Preservation**: Unauthenticated invitation acceptance (`acceptInvitation`) resolves the invitation by token, recovers the bound `tenantId`, and wraps user profile creation and membership upsert in `tenantContextStorage.run({ currentTenantId: invitation.tenantId })`.

---

### 2. Path-by-Path Code Trace

#### Path A: Public Self-Registration (Student / Self-Enrollment)
- **Source File & Function**: `apps/api/src/services/auth.service.ts` -> `AuthService.register`
- **Route & Caller**: `POST /api/v1/auth/register` (invoked via `apps/api/src/routes/v1/auth.route.ts`)
- **Required Authentication**: None (public unauthenticated pre-session endpoint).
- **Source of `tenantId`**: Request payload (`RegisterSchema.parse(input).tenantSlug`). Resolved against `OrganizationModel.findOne({ slug })`. If the tenant does not exist or is inactive, returns `404 Organization not found`.
- **Can `tenantId` Be Legitimely Absent?**: **NO**. The Zod schema requires `tenantSlug`, and registration aborts if no matching organization is resolved.
- **Database Model Behavior**:
  - `UserModel.findOne({ email, tenantId })`: Queried under pre-session exception `REGISTER_USER_BY_EMAIL`. Rejects if duplicate email exists within tenant.
  - `UserModel.create`: Created with explicit `tenantId: organization._id`.
  - `OrganizationMemberModel.create`: Creates membership with `organizationId: organization._id`, `tenantId: organization._id`, `role: 'STUDENT'`.
- **Existing Tests**:
  - `apps/api/src/services/__tests__/wave08-batch6-registration.integration.test.ts` (test: *Public self-registration requires explicit tenantSlug and provisions user with tenantId*)
  - `apps/api/src/services/__tests__/student-lifecycle.integration.test.ts`

#### Path B: Organization & Tenant Onboarding
- **Source File & Function**: `apps/api/src/services/organizationDomain.service.ts` -> `OrganizationDomainService.onboardOrganization`
- **Route & Caller**: `POST /api/v1/platform/organizations/onboard` or automated deployment bootstrap.
- **Required Authentication**: Platform Super Admin (`PLATFORM_SUPERADMIN`) capability or deployment script.
- **Source of `tenantId`**: Generated during onboarding: `OrganizationModel.create(...)` assigns `_id`. This `_id` becomes the `tenantId` for the admin user.
- **Can `tenantId` Be Legitimely Absent?**: **NO**. The tenant is created first; the admin user is created immediately with `tenantId: organization._id`.
- **Database Model Behavior**:
  - `UserModel.create`: Runs within platform/bootstrap context with `tenantId: organization._id`, `role: 'ADMIN'`.
  - `OrganizationMemberModel.create`: Assigns `role: 'ADMIN'`.
- **Existing Tests**:
  - `apps/api/src/services/__tests__/academic-scheduling.integration.test.ts`
  - `apps/api/src/services/__tests__/superadmin-impersonation.test.ts`

#### Path C: Student Registration / Lead-to-Student Conversion
- **Source File & Function**: `apps/api/src/services/studentLifecycle.service.ts` -> `StudentLifecycleService.enrollStudent` / `AdmissionService.admitStudent`
- **Route & Caller**: Internal authenticated staff route (`POST /api/v1/students`, `POST /api/v1/admissions/convert`).
- **Required Authentication**: Authenticated Staff (`ADMIN`, `COUNSELOR`, `INSTRUCTOR`) with active tenant context via `requireAuth` + `tenantContextStorage`.
- **Source of `tenantId`**: Inherited from authenticated session context (`tenantContextStorage.currentTenantId`).
- **Can `tenantId` Be Legitimely Absent?**: **NO**. Authenticated middleware guarantees non-empty tenant context.
- **Database Model Behavior**:
  - `UserModel.create`: Uses session `tenantId`.
  - `StudentLifecycleModel.create`: Bounded to session `tenantId`.
  - `StudentSequenceModel.findOneAndUpdate`: Atomic per-tenant sequence increment.
- **Existing Tests**:
  - `apps/api/src/services/__tests__/student-lifecycle.integration.test.ts`
  - `apps/api/src/services/__tests__/student-lifecycle-redis-proof.integration.test.ts`

#### Path D: Staff Invitations & Invitation Acceptance
- **Source File & Function**: `apps/api/src/services/organizationInvitation.service.ts` -> `OrganizationInvitationService.inviteStaff` & `acceptInvitation`
- **Route & Caller**:
  - Invitation issue: `POST /api/v1/organization/invitations` (requires `ADMIN` session).
  - Invitation acceptance: `POST /api/v1/public/invitations/accept` (public endpoint with cryptographic invitation token).
- **Required Authentication**:
  - Issue: Authenticated `ADMIN`.
  - Acceptance: Unauthenticated bearer token in request body (`token`).
- **Source of `tenantId`**:
  - Issue: Inherited from active admin session.
  - Acceptance: Decrypted/verified from `OrganizationInvitationModel.findOne({ token, status: 'PENDING' })`. `invitation.tenantId` is recovered from the verified token record.
- **Can `tenantId` Be Legitimely Absent?**: **NO**. Every invitation is bound to `tenantId`.
- **Database Model Behavior**:
  - Wrapped inside `tenantContextStorage.run({ currentTenantId: invitation.tenantId, currentUserId: 'invitation-accept', ... })`.
  - `UserModel.findOneAndUpdate` or `UserModel.create`: Created/updated under `invitation.tenantId`.
  - `OrganizationMemberModel.findOneAndUpdate`: Upserted with membership role (e.g., `INSTRUCTOR`, `COUNSELOR`, `ADMIN`) without mutating tenant identity.
- **Existing Tests**:
  - `apps/api/src/services/__tests__/wave08-batch6-registration.integration.test.ts` (test: *Staff invitation acceptance executes under invitation tenant context*)

#### Path E: User Creation (Core Service Layer)
- **Source File & Function**: `apps/api/src/services/auth.service.ts` / Mongoose `UserModel.create`
- **Route & Caller**: Various caller services.
- **Required Authentication**: Either authenticated session with `tenantContextStorage`, or authorized execution context (`REGISTER_USER_BY_EMAIL`, `PLATFORM`).
- **Source of `tenantId`**: Active context or explicit payload attribute matching context.
- **Can `tenantId` Be Legitimely Absent?**:
  - For normal multi-tenant users: **NO**.
  - For Platform Super Admin (system maintainer): `tenantId: null` exists only when created via platform maintenance scripts (`demo-seed.ts` via direct collection driver). Normal application code cannot insert tenantless users.
- **Database Model Behavior**:
  - Enforced by `tenantIsolationPlugin`: If model is `FAIL_CLOSED`, any operation lacking tenant context or valid authorization throws `Tenant context is required for tenant-owned model operation (User)`.

#### Path F: Session Creation & Token Issuance
- **Source File & Function**: `apps/api/src/services/auth.service.ts` -> `AuthService.createSession` / `login`
- **Route & Caller**: `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`
- **Required Authentication**:
  - Login: Valid email + password under `LOGIN_USER_BY_EMAIL`.
  - Refresh: Valid JWT refresh token.
- **Source of `tenantId`**: Resolved from verified user record (`user.tenantId`).
- **Can `tenantId` Be Legitimely Absent?**: **NO** (except global Platform Super Admin, which has role `PLATFORM_SUPERADMIN`).
- **Session Tokens Produced**:
  - JWT Access Token: contains `{ sub: user._id, tenantId: user.tenantId, role: user.role }`.
  - Redis Session: key includes tenant boundary or user session prefix.
- **Database Model Behavior**:
  - Verified user updates `lastLoginAt` permitted under `LOGIN_USER_BY_EMAIL`.
- **Existing Tests**:
  - `apps/api/src/services/__tests__/superadmin-impersonation.test.ts`
  - `apps/api/src/services/__tests__/wave08-batch6-registration.integration.test.ts`

