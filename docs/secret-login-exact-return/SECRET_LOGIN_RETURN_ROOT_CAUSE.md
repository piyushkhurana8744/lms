# Secret Login Exact Return Location: Root Cause Analysis

## Executive Summary

SuperAdmins and platform operators frequently launch "Secret Login" (impersonation) from diverse starting points across the application:
- From `/admin` (Workspace Overview) via "Login as Trainer".
- From `/platform?tab=users` (User Directory).
- From filtered directory views such as `/platform?tab=users&page=3&search=rahul`.

Under the previous implementation, exiting Secret Login universally redirected the browser to `/platform`. This caused significant operational friction:
1. **Context Loss:** Operators lost their exact search filters, pagination state, and previous workspace location.
2. **Hardcoded Redirection:** The exit mechanism hardcoded `/platform` at multiple layers of the frontend stack.
3. **Session State Volatility:** If an operator refreshed their browser while impersonated, any in-memory return destination was lost.
4. **Security Vulnerability Risk:** Naive client-side redirect parameters could introduce Open Redirect vulnerabilities if not strictly validated against protocol-relative (`//`), script (`javascript:`), or encoded bypass attacks.

---

## Detailed Root Cause Analysis

### 1. Hardcoded Exit Parameter in ImpersonationBanner & AuthProvider
In `apps/web/src/components/auth/ImpersonationBanner.tsx`:
```tsx
// PREVIOUS BUGGY IMPLEMENTATION:
const handleExit = async () => {
  if (isExiting) return;
  setIsExiting(true);
  try {
    await exitImpersonation('/platform'); // HARDCODED DESTINATION!
  } catch {
    setIsExiting(false);
  }
};
```
Similarly, `AuthProvider.exitImpersonation` defaulted its target to `redirectTo: string = '/platform'`. Regardless of where impersonation was launched from, the banner unconditionally forced navigation to `/platform`.

### 2. Lack of Initiating Location Capture in Start Flow
In `apps/web/src/app/platform/page.tsx`, the confirmation modal handler `handleConfirmImpersonate` called:
```tsx
await impersonate(targetUser.id, reason, destination);
```
The initiating page's URL (`window.location.pathname + window.location.search`) was discarded before the browser transitioned to the target user's dashboard (`/instructor` or `/student`).

### 3. Missing Server-Side Session Binding
In `packages/database/src/models/session.model.ts`, the `SessionSchema` tracked `userId`, `impersonatedBy`, `impersonationReason`, and `originalSessionId`, but lacked an `impersonationReturnTo` field. Consequently:
- If the operator reloaded the page during impersonation, the in-memory return state vanished.
- `/api/v1/auth/me` could not provide the return destination upon session hydration.
- The exit endpoint (`POST /api/v1/platform/impersonation/exit`) had no durable database record indicating where the operator originated.

### 4. Open Redirect & Privilege Escalation Risks
Allowing client-supplied redirect parameters without strict cryptographic or whitelist validation would expose the application to:
- External redirect phishing (e.g. `https://evil.com`).
- Protocol-relative bypasses (e.g. `//evil.com` or `/\evil.com`).
- Encoded redirect evasion (e.g. `%2f%2fevil.com` or double-encoded `%252f`).
- Unauthorized dashboard escalation (e.g. non-SuperAdmin accounts attempting to access `/platform`).

---

## Architectural Resolution

To resolve these root causes comprehensively:
1. **Database Persistence:** Added `impersonationReturnTo: string` to MongoDB `SessionModel`.
2. **Initiating Capture:** Captured `window.location.pathname + window.location.search` before navigation and transmitted it to `POST /api/v1/platform/impersonation/start`.
3. **Session Binding:** Bound the sanitized return URL directly to the impersonation session record during creation.
4. **Strict Sanitization:** Introduced `sanitizeReturnUrl` in `@edtech/utils` to strip external URLs, protocol-relative prefixes, script schemes, backslashes, and control characters.
5. **Authorization Verification:** Introduced `getAuthorizedReturnUrl` in `@edtech/utils` to recheck the operator's effective roles upon exit before returning the authorized URL.
6. **Decoupled Banner:** Updated `ImpersonationBanner` to invoke `await exitImpersonation()`, allowing the server-authoritative return destination to dictate navigation.

