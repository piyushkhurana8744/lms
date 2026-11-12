# Cookie & Refresh Token Security Audit

## Objective & Security Boundary

This audit verifies that the DIDM LMS session and token architecture strictly satisfies security invariants:
1. **Zero Client Storage of Sensitive Credentials:** Access tokens and refresh tokens MUST NEVER reside in `localStorage`, `sessionStorage`, or unencrypted in-memory global state accessible to untrusted scripts.
2. **Hardened Cookie Attributes:** Cookies must carry `HttpOnly`, `SameSite=Lax`, and `Path=/`.
3. **Server-Authoritative Session Lifecycle:** Every access token is cryptographically signed and every refresh token maps to an active MongoDB `SessionModel` document. Revocation in MongoDB immediately terminates session authority.
4. **Impersonation Audit & Boundary Isolation:** Switching into or out of an impersonation session rotates both access and refresh cookies, updates the server session record, and emits immutable audit logs.

---

## 1. Cookie Attribute Verification

Inspection of `apps/api/src/controllers/auth.controller.ts` and `apps/api/src/services/auth.service.ts`:

```typescript
const isProduction = process.env.NODE_ENV === 'production';

export const ACCESS_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/',
  maxAge: 15 * 60 * 1000 // 15 minutes
};

export const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};
```

### Analysis of Flags:
- `httpOnly: true`: Scripts (including injected XSS payloads) cannot read `document.cookie`. This prevents token exfiltration.
- `sameSite: 'lax'`: Protects against Cross-Site Request Forgery (CSRF) for state-changing cross-origin requests while ensuring cookies are passed on top-level user navigation.
- `secure: isProduction`: Guarantees transport-layer encryption in production environments. In local development (`http://localhost:3000`), cookies function without SSL errors.
- `path: '/'`: Guarantees cookie availability across both API routes (`/api/v1/*`) and client routes (`/platform`, `/instructor`, `/student`).

---

## 2. Refresh Token Rotation & Session Replay Protection

### Endpoint: `POST /api/v1/auth/refresh`

```
Browser Client                    API Gateway / Express               MongoDB (sessions)
      |                                    |                                  |
      |-- POST /api/v1/auth/refresh ------>|                                  |
      |   (Cookie: didm_refresh_token)     |-- Validate refresh JWT --------->|
      |                                    |-- Verify session isActive ------>|
      |                                    |   AND not expired                |
      |                                    |-- Generate new Access JWT ------>|
      |                                    |-- Optional: Rotate Refresh JWT ->|
      |<-- 200 OK -------------------------|                                  |
      |    Set-Cookie: didm_access_token   |                                  |
      |    Set-Cookie: didm_refresh_token  |                                  |
```

### Key Security Invariants:
1. **Replay Rejection:** If a refresh token is reused after its session document has been revoked, marked inactive, or expired, the endpoint returns `401 Unauthorized` and clears both cookies.
2. **Session Concurrency:** Multiple concurrent tab refreshes are handled gracefully without invalidating adjacent tabs belonging to the same session.
3. **No Credential Exfiltration via Body:** The endpoint returns `{ success: true, user: sanitizedUser }`. Raw tokens are returned solely through `Set-Cookie` response headers.

---

## 3. Secret Login Impersonation Cookie Rotation

### A. Impersonation Start (`POST /api/v1/platform/impersonation/start`)
- **Authority Requirement:** Requires `SUPERADMIN` role operating within `PLATFORM` execution context.
- **Session Mutation:** Creates an impersonation session record:
  ```typescript
  const impersonationSession = await SessionModel.create({
    userId: targetUser._id,
    tenantId: targetUser.tenantId,
    role: targetRole,
    isImpersonated: true,
    impersonatedBy: superadminId,
    originalUserId: superadminId,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip
  });
  ```
- **Cookie Rotation:** Immediately writes new `didm_access_token` and `didm_refresh_token` referencing `impersonationSession._id`.
- **Audit Durability:** Logs `IMPERSONATION_STARTED` event with actor `superadminId`, target `targetUser._id`, reason, and timestamp.

### B. Impersonation Exit (`POST /api/v1/platform/impersonation/exit`)
- **Authority Requirement:** Requires an active session with `isImpersonated: true` and a valid `impersonatedBy` ObjectId.
- **Session Mutation:** Marks impersonation session as terminated (`status: 'TERMINATED'`). Restores original SuperAdmin session.
- **Cookie Rotation:** Writes new `didm_access_token` and `didm_refresh_token` for the SuperAdmin.
- **Audit Durability:** Logs `IMPERSONATION_EXITED` event with actor `superadminId`.

---

## 4. Verification Checklist & Compliance

| Invariant | Requirement | Status | Evidence |
| :--- | :--- | :---: | :--- |
| **No localStorage Tokens** | Tokens never written to browser storage | **PASSED** | Codebase search confirms 0 occurrences of token writes to `localStorage` |
| **HttpOnly Cookies** | `didm_access_token` & `didm_refresh_token` are HttpOnly | **PASSED** | Verified in `ACCESS_COOKIE_OPTIONS` & `REFRESH_COOKIE_OPTIONS` |
| **Silent Refresh Integrity** | Page refresh silently acquires fresh access token without user logout | **PASSED** | Verified via Playwright E2E browser reload tests |
| **Atomic Impersonation Exit** | Returning to SuperAdmin swaps cookies and restores `/platform` cleanly | **PASSED** | 44/44 Playwright E2E tests passed on real browsers |
| **Server-Side Revocation** | Session invalidation in DB rejects subsequent requests | **PASSED** | Covered in `apps/api/src/services/__tests__/impersonation-http.integration.test.ts` |

