# Session-Bound Return Destination Architecture

## System Design & Invariants

The return destination architecture ensures that every Secret Login session is inextricably bound to the operator's originating navigation context while enforcing strict same-origin isolation and role-based access control.

```
+-----------------------------------------------------------------------------------------+
|                                OPERATOR INITIATION                                      |
|  - Operator at: /platform?tab=users&page=3&search=rahul  OR  /admin                     |
|  - Captures exact pathname + search parameters before navigation                        |
+-----------------------------------------------------------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------------+
|                               API GATEWAY & SANITIZER                                   |
|  - POST /api/v1/platform/impersonation/start { targetUserId, reason, returnTo }         |
|  - sanitizeReturnUrl(returnTo, fallback):                                               |
|      * Rejects external protocols (https:, http:, javascript:, data:)                   |
|      * Rejects protocol-relative (//, ///, \\, /\)                                      |
|      * Unwraps multi-level URL encoding (%2f%2fevil.com)                                |
|      * Validates same-origin URL pathname + query                                       |
+-----------------------------------------------------------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------------+
|                               MONGODB SESSION STORAGE                                   |
|  SessionModel.create({                                                                  |
|    userId: targetUserId,                                                                |
|    impersonatedBy: superAdminId,                                                        |
|    impersonationReturnTo: sanitizedReturnTo,                                            |
|    ...                                                                                  |
|  })                                                                                     |
|  AuditService.logEvent("SUPERADMIN_IMPERSONATION_STARTED", { returnTo })                |
+-----------------------------------------------------------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------------+
|                               REFRESH & HYDRATION IMMUNITY                              |
|  - Page refresh on /instructor calls /api/v1/auth/me                                    |
|  - Auth middleware inspects DB session and returns user.impersonationReturnTo           |
|  - Token rotation (/api/v1/auth/refresh) preserves session document in DB               |
+-----------------------------------------------------------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------------+
|                               EXIT & AUTHORIZED RESTORATION                             |
|  - POST /api/v1/platform/impersonation/exit                                             |
|  - Reads session.impersonationReturnTo from verified MongoDB session                    |
|  - Evaluates getAuthorizedReturnUrl(restoredUser, returnTo)                             |
|  - Revokes impersonation session atomically (revokedAt: new Date())                     |
|  - AuditService.logEvent("SUPERADMIN_IMPERSONATION_ENDED", { returnTo })                |
|  - Restores SuperAdmin HttpOnly cookies                                                 |
|  - Client executes atomic window.location.replace(returnTo)                             |
+-----------------------------------------------------------------------------------------+
```

---

## 1. Database Schema Specifications

### `ISessionDocument` & `SessionSchema`
Located in `packages/database/src/models/session.model.ts`:
```typescript
export interface ISessionDocument extends Document {
  userId: Types.ObjectId;
  tenantId: Types.ObjectId | null;
  activeTenantId?: Types.ObjectId | null;
  impersonatedBy?: Types.ObjectId | null;
  originalSessionId?: Types.ObjectId | null;
  impersonationReason?: string | null;
  impersonationReturnTo?: string | null; // Bound initiating URL
  currentRefreshTokenHash: string;
  tokenVersion: number;
  ipAddress?: string;
  userAgent?: string;
  lastUsedAt: Date;
  expiresAt: Date;
  revokedAt?: Date | null;
}
```

---

## 2. Security Sanitization Matrix

The `sanitizeReturnUrl` utility (`packages/utils/src/index.ts`) enforces the following boundary checks:

| Input Variant | Threat Vector | Sanitizer Decision | Effective Output |
| :--- | :--- | :---: | :--- |
| `/admin` | Legitimate application route | **ALLOW** | `/admin` |
| `/platform?tab=users&search=rahul` | Query parameter state | **ALLOW** | `/platform?tab=users&search=rahul` |
| `https://evil.com/phish` | External Open Redirect | **REJECT** | Fallback (`/platform`) |
| `http://attacker.com` | Plaintext external target | **REJECT** | Fallback (`/platform`) |
| `//evil.com` | Protocol-relative bypass | **REJECT** | Fallback (`/platform`) |
| `///evil.com` | Multi-slash browser exploit | **REJECT** | Fallback (`/platform`) |
| `/\\evil.com` | Backslash normalization | **REJECT** | Fallback (`/platform`) |
| `\\evil.com` | Windows UNC path bypass | **REJECT** | Fallback (`/platform`) |
| `javascript:alert(1)` | Cross-Site Scripting (XSS) | **REJECT** | Fallback (`/platform`) |
| `data:text/html,...` | Data URI script execution | **REJECT** | Fallback (`/platform`) |
| `%2f%2fevil.com` | URL-encoded protocol relative | **REJECT** | Fallback (`/platform`) |
| `%252f%252fevil.com` | Double-encoded evasion | **REJECT** | Fallback (`/platform`) |
| `/platform\r\nSet-Cookie:` | HTTP Response Splitting | **REJECT** | Fallback (`/platform`) |
| `/platform\0bad` | Null byte poison | **REJECT** | Fallback (`/platform`) |
| `null` / `undefined` / `""` | Falsy / absent input | **FALLBACK** | Default fallback |

---

## 3. Role Authorization Matrix (`getAuthorizedReturnUrl`)

Even after URL sanitization, the return destination is evaluated against the restored operator's authenticated identity:

```typescript
export function getAuthorizedReturnUrl(
  user: { isSuperAdmin?: boolean; roles?: string[] } | null | undefined,
  returnUrl?: string | null,
  fallback?: string
): string
```

1. **Platform Route Protection (`/platform*`):**
   - Strictly requires `user.isSuperAdmin === true`.
   - If a non-SuperAdmin operator has a saved return destination pointing to `/platform`, it is rejected and safely redirected to `/admin`.
2. **Tenant Admin Route Protection (`/admin*`):**
   - Requires `isSuperAdmin === true` OR tenant admin membership (`ADMIN`, `TENANT_ADMIN`, `BRANCH_MANAGER`).
   - If an unauthorized role attempts `/admin`, it falls back to the user's role-specific home (`/instructor` or `/student`).
3. **Safe Default Fallbacks:**
   - SuperAdmin: `/platform`
   - Tenant Admin: `/admin`
   - Instructor: `/instructor`
   - Student: `/student`

---

## 4. Audit Trail Integrity

Every Secret Login cycle produces two immutable, correlation-linked audit log entries:
1. `SUPERADMIN_IMPERSONATION_STARTED`:
   ```json
   {
     "action": "SUPERADMIN_IMPERSONATION_STARTED",
     "actorId": "superadmin-object-id",
     "resource": "User",
     "resourceId": "target-user-id",
     "critical": true,
     "metadata": {
       "superAdminEmail": "superadmin@didm.edu",
       "targetEmail": "aarav.sharma@didm.edu",
       "reason": "Investigating instructor grading issue",
       "returnTo": "/platform?tab=users&search=aarav",
       "impersonationSessionId": "session-object-id"
     }
   }
   ```
2. `SUPERADMIN_IMPERSONATION_ENDED`:
   ```json
   {
     "action": "SUPERADMIN_IMPERSONATION_ENDED",
     "actorId": "superadmin-object-id",
     "resource": "Session",
     "resourceId": "impersonated-session-id",
     "critical": true,
     "metadata": {
       "superAdminEmail": "superadmin@didm.edu",
       "targetUserId": "target-user-id",
       "returnTo": "/platform?tab=users&search=aarav",
       "restoredSessionId": "restored-session-id"
     }
   }
   ```

