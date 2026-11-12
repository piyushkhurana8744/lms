# Security Verification

## Wave 0.8 compatibility

- **Verified PLATFORM session:** `authorizePlatformSession` reads live `Session` and `User` records and validates actor binding, expiry, revocation, non-nesting, active status, and `isSuperAdmin=true` before issuing a process-local capability.
- **Fail-closed User access:** cross-tenant target resolution occurs only within `runAuthorizedPlatformOperation`; ordinary authentication uses the registered `SESSION_USER_BY_ID` bootstrap policy.
- **OrganizationMember authority:** effective tenant roles and permissions are reconstructed from an active membership inside target tenant context. SuperAdmin permission is not inherited.
- **Tenant-bound session:** the new session and JWT are bound to the target user's tenant. Middleware derives effective tenant context from the live session/user.
- **AsyncLocalStorage:** membership and role lookup run inside `tenantContextStorage` with the target tenant/user and a single allowed tenant.
- **Audit durability:** session creation/revocation and critical start/end audit events are transactionally coupled with correlation and idempotency identifiers.
- **Legacy bypass rejection:** nested impersonation, forged/revoked/expired Platform sessions, unauthorized roles, inactive targets, self-targeting, and peer-SuperAdmin targeting are rejected.

## Executed negative evidence

- Tenant admin, instructor, and student start attempts: 403.
- Missing reason, self-target, peer SuperAdmin, suspended target: rejected.
- Impersonated session accessing Platform command center: 403.
- Out-of-branch and cross-tenant resource lookup: 404.
- Expired impersonation session with otherwise valid JWT: 401 `ERR_SESSION_REVOKED`.
- Logout revokes impersonated session; subsequent use: 401.

## Remaining observations

- The `/platform/users` directory is paginated and the UI searches server-side; operators should select a named target rather than rely on the first row.
- Development logs showed an ephemeral Mongo lock retry during an exit audit write; the transactional operation retried and committed successfully. No unaudited session transition was observed.
- The Platform SuperAdmin can visit `/admin`, where tenant-specific widgets may issue expected 403s until a tenant workspace is selected. This is separate from Secret Login and does not grant access.
