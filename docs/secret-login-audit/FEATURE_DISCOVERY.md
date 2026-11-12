# Secret Login Feature Discovery

## Established purpose

`Secret Login` is the repository's product label for **audited Platform SuperAdmin impersonation**. It is not a second credential form, hidden route, master password, emergency account, or universal token. The original source contract is explicit in `AuthService.impersonateUser`, `PlatformController.impersonateUser`, the `/platform` user directory, the `ImpersonationBanner`, and the existing service/HTTP/browser tests.

Intended users are active Platform SuperAdmins with a live, non-revoked, non-expired server-side session. Targets are active non-SuperAdmin tenant users. A reason is mandatory. Self-impersonation, peer-SuperAdmin impersonation, nested impersonation, suspended targets, and unverified platform sessions are rejected.

## Canonical entry points

- Product UI: `/platform` → `Secret Login & User Directory` → target row → `Secret Login`.
- Workspace shortcut: `/admin` → `Login as Trainer` → `/platform?tab=users`.
- Canonical API: `POST /api/v1/platform/impersonation/start`.
- Compatibility API: `POST /api/v1/platform/impersonate/:userId`.
- Status: `GET /api/v1/platform/impersonation/status`.
- Exit: `POST /api/v1/platform/impersonation/exit` (plus the compatibility alias).

## Complete flow

1. `PlatformCommandCenterPage` lists users through `GET /api/v1/platform/users`.
2. The operator selects a target and supplies an audit reason.
3. `AuthProvider.impersonate` posts the target ID and reason.
4. `authenticate` validates the current access JWT and live `Session`; `requireSuperAdmin` requires the live user to remain a SuperAdmin.
5. `AuthService.impersonateUser` calls `authorizePlatformSession`, which verifies session/actor binding, expiry, revocation, non-nesting, active user status, and live SuperAdmin status directly from MongoDB.
6. A process-local `PlatformAuthority` authorizes cross-tenant lookup of the SuperAdmin and target.
7. The target must exist, be active, and not be a SuperAdmin.
8. A four-hour impersonation `Session` and `SUPERADMIN_IMPERSONATION_STARTED` audit record are committed in one Mongo transaction.
9. The access JWT contains only the target subject, new session ID, target tenant ID, and token version. The refresh token is hashed at rest.
10. Target roles and permissions are rebuilt inside target `tenantContextStorage` from the active `OrganizationMember` and custom/system role permissions.
11. The controller replaces HttpOnly access/refresh cookies. `AuthProvider` reloads `/auth/me`.
12. The frontend redirects by effective role (`/instructor`, `/student`, or `/admin`).
13. `ImpersonationBanner` is rendered globally by `Providers` and exposes audited exit.
14. Exit verifies the active impersonated session and original SuperAdmin, atomically revokes the impersonation session, creates a clean Platform session, records `SUPERADMIN_IMPERSONATION_ENDED`, replaces cookies, and returns to `/platform`.

## Persistence and context

The `Session` record stores `userId`, `tenantId`, `activeTenantId`, `impersonatedBy`, `originalSessionId`, `impersonationReason`, hashed refresh-token state, expiry, revocation, IP, and user agent. Request authentication derives the effective identity from live `Session.userId`; tenant context is the target tenant, and SuperAdmin permissions are not carried into the impersonated session.

## Primary implementation inventory

- Frontend: `apps/web/src/app/platform/page.tsx`, `apps/web/src/components/auth-provider.tsx`, `apps/web/src/components/auth/ImpersonationBanner.tsx`, `apps/web/src/components/providers.tsx`.
- Dashboard shortcut: `apps/web/src/app/admin/page.tsx`.
- Routing/controller: `apps/api/src/routes/v1/platform.route.ts`, `apps/api/src/controllers/platform.controller.ts`.
- Authentication/security: `apps/api/src/services/auth.service.ts`, `apps/api/src/middleware/auth.middleware.ts`, `apps/api/src/middleware/tenant.middleware.ts`.
- Persistence/capabilities: `packages/database/src/models/session.model.ts`, `packages/database/src/authorizedExecutionContext.ts`.
- Role redirect: `packages/utils/src/index.ts#getDashboardRoute`.
- Tests: `superadmin-impersonation.test.ts`, `impersonation-http.integration.test.ts`, `integration-workflows.spec.ts`, and `secret-login.spec.ts`.
