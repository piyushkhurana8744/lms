# Secret Login & Session Lifecycle: Root Cause Analysis

## Executive Summary

The DIDM LMS Platform Console provides a "Secret Login" capability enabling authorized SuperAdmins to impersonate tenant staff (instructors, branch managers, counselors) and students for operational diagnostics and support.

User reports highlighted four critical reliability failures in Secret Login:
1. **Broken Impersonation Exit:** Returning to the original SuperAdmin account after impersonating a Trainer or Student was inconsistent or failed completely.
2. **Refresh Identity Loss / Spurious Logouts:** Refreshing the browser while impersonating or while authenticated caused the login/impersonated identity to disappear or be redirected to `/login`.
3. **Dashboard Navigation Inconsistency:** Moving between portal workspaces and returning to `/platform` resulted in blank screens, access warnings, or unexpected unmounts.
4. **Session Instability:** The impersonation lifecycle lacked atomic transitions, behaving like an ephemeral client state rather than a durable, server-authoritative authenticated session.

This document Details the end-to-end trace of the auth session lifecycle, identifies the root causes, and documents the systemic fixes implemented across the platform.

---

## Architecture & Lifecycle Tracing

### 1. Dual-Token & Server-Authoritative Session Model
The LMS architecture employs a dual-token authentication model backed by a database `SessionModel` (`sessions` collection in MongoDB):
- **Access Token:** Short-lived JWT stored in an HttpOnly, SameSite cookie (`didm_access_token`).
- **Refresh Token:** Long-lived JWT stored in an HttpOnly, SameSite cookie (`didm_refresh_token`).
- **Session Record:** Every login or impersonation creates an active `Session` document storing `userId`, `tenantId`, `role`, and impersonation metadata (`isImpersonated`, `originalUserId`, `impersonatedBy`).
- **Security Constraint:** Tokens are never stored in client-accessible `localStorage` or `sessionStorage` to eliminate XSS token theft vectors.

### 2. Impersonation Token Swap & Session Fork
When a SuperAdmin triggers Secret Login:
1. `POST /api/v1/platform/impersonation/start`:
   - Validates that caller is an authenticated `SUPERADMIN` via `authenticatePlatformSession` (strict `PLATFORM` scope ALS boundary).
   - Generates an impersonation session document referencing the target user with `impersonatedBy: superadminId`.
   - Rotates cookies: issues new access and refresh JWTs carrying the target user's identity and permissions with `isImpersonated: true`.
2. `POST /api/v1/platform/impersonation/exit`:
   - Validates that the active session has `impersonatedBy`.
   - Terminates or updates the impersonated session record.
   - Rotates cookies: re-issues access and refresh JWTs restored to the original SuperAdmin identity.

---

## Root Causes Identified

### Root Cause 1: Premature Data Fetching During Auth Hydration
*Affected Components:* `apps/web/src/app/instructor/page.tsx`, `apps/web/src/app/instructor/classes/page.tsx`.

*Mechanism:*
When a page is hard-refreshed (F5), Next.js mounts client components before `AuthProvider` finishes verifying session status via `/api/v1/auth/me`. In dashboard pages like `/instructor` and `/instructor/classes`:
```tsx
// BEFORE (Buggy):
useEffect(() => {
  fetchDashboardData(); // Fired immediately on mount!
}, []);
```
If the short-lived access token was expired and undergoing silent refresh via `/api/v1/auth/refresh`, or if `AuthProvider` had not set `user`, the immediate API call sent unhydrated or unrefreshed credentials, returning `401 Unauthorized` or `403 Forbidden`. The page rendered error states, giving the illusion that the session had disappeared on refresh.

*Remediation:*
Components must explicitly guard on auth hydration before making protected API requests:
```tsx
const { user, isLoading: isAuthLoading } = useAuth();

useEffect(() => {
  if (isAuthLoading || !user) return;
  fetchDashboardData();
}, [isAuthLoading, user]);
```

---

### Root Cause 2: Asynchronous Race Condition on Impersonation Exit
*Affected Components:* `apps/web/src/components/auth/ImpersonationBanner.tsx`, `apps/web/src/components/auth-provider.tsx`.

*Mechanism:*
In `AuthProvider`, `exitImpersonation()` previously executed:
```tsx
// BEFORE (Buggy):
const exitImpersonation = async () => {
  await fetch('/api/v1/platform/impersonation/exit', { method: 'POST' });
  await fetchMe(); // User state updated to SuperAdmin immediately in React state
  // Banner conditionally renders: if (!isImpersonated) return null;
  // -> Banner immediately UNMOUNTS
  router.push('/platform'); // React router navigation raced with unmount & layout re-rendering
};
```
Because `user` was mutated in React state while the browser was still located on a tenant route (e.g., `/instructor` or `/student`), the following cascading race occurred:
1. The `ImpersonationBanner` unmounted immediately because `isImpersonated` transitioned to `false`.
2. The current portal page detected a user role mismatch (SuperAdmin on `/instructor`) and rendered an "Access Denied" or redirect screen.
3. Multiple duplicate exit clicks could be fired if the user clicked the button rapidly.
4. Soft navigation via `router.push('/platform')` failed to purge stale React Query cache for the previously impersonated user.

*Remediation:*
1. Make redirect destination an explicit parameter defaulting to `/platform`.
2. Clear React Query cache before navigation to prevent cross-account cache bleed.
3. Perform atomic full-page navigation using `window.location.replace(redirectTo)`. This ensures cookies are cleanly passed on the new page load, `AuthProvider` cleanly initializes with SuperAdmin, and no stale portal layouts evaluate SuperAdmin permissions on tenant dashboards.
4. Add duplicate exit click guards (`if (isExiting) return;`) with an explicit loading indicator.

---

### Root Cause 3: Next.js Edge Middleware Matcher Gap for Platform Console
*Affected Component:* `apps/web/src/middleware.ts`.

*Mechanism:*
The edge route matcher defined protected paths such as `/admin`, `/instructor`, `/student`, `/admissions`, and `/counselor`, but omitted `/platform` from `isProtectedRoute` and the config matcher array:
```typescript
// BEFORE:
const isProtectedRoute = (pathname: string): boolean => {
  const protectedPrefixes = ['/admin', '/student', '/instructor', '/admissions', '/counselor'];
  return protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
};
```
Because `/platform` was not evaluated as a protected route by edge middleware, unauthenticated requests or stale requests fell through to client-side page rendering without pre-flight cookie validation.

*Remediation:*
Add `/platform` and `/platform/:path*` to `protectedPrefixes` and the Edge Middleware `config.matcher` array, ensuring server-side redirect to `/login?redirect=/platform` when cookies are missing or invalid.

---

### Root Cause 4: Missing Explicit Credential Policy on Client Fetch Calls
*Affected Component:* `apps/web/src/components/auth-provider.tsx`.

*Mechanism:*
While browser `fetch` defaults to `credentials: 'same-origin'` in modern specifications, varying browser environments, subpath routing, or reverse-proxy configurations (e.g. Next.js rewrites) can result in cookie omission if credentials are not explicitly enforced.

*Remediation:*
All auth endpoints (`/api/v1/auth/me`, `/api/v1/auth/refresh`, `/api/v1/auth/login`, `/api/v1/auth/logout`, `/api/v1/platform/impersonation/start`, `/api/v1/platform/impersonation/exit`) explicitly specify `credentials: 'same-origin'`.

