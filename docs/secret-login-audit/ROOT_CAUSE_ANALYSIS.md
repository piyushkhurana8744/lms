# Root Cause Analysis

## Reproduction executed

The audit executed the mocked service suite, an isolated real-Mongo replica-set HTTP suite, the existing owned browser workflow, and a focused owned browser flow selecting a known instructor.

Expected result: SuperAdmin can discover Secret Login, select an instructor, provide a reason, receive a tenant-bound effective session, land on `/instructor`, see an impersonation banner, lack Platform authority, and exit back to `/platform`.

Actual core result: the API exchange, session persistence, cookies, target permissions, role redirect, banner, tenant isolation, exit, expiry, and logout all succeeded in isolation.

## Verified issue

The verified user-visible issue was **entry-point discoverability and incomplete browser certification**, not an authentication bypass or failed token exchange:

1. The original feature lived in the Platform Command Center (`/platform`), while the Workspace Superadmin dashboard shown by the user did not expose it. A user looking only at `/admin` or a normal trainer session could reasonably conclude the feature was absent.
2. The pre-existing browser test launched impersonation and immediately clicked `Exit Impersonation`. It did not wait for the scheduled role redirect, identify a trainer target, verify `/auth/me`, or assert that Platform authority was removed. It could therefore pass without proving the reported trainer-panel behavior.
3. A normal trainer login intentionally has no impersonation banner. The banner is session-derived (`Session.impersonatedBy`), not role-derived; merely opening or normally logging into the trainer portal cannot display it.

## Non-root causes disproved by execution

- Invalid Secret Login credentials: Secret Login does not accept target credentials.
- Missing session persistence: real Mongo contains the impersonation session and audit record.
- Cookie/JWT mismatch: browser `/auth/me` resolves the target identity after cookie replacement.
- Tenant leakage: cross-tenant and out-of-branch resources return 404; Platform APIs return 403.
- Redirect loop: focused browser execution lands on `/instructor` and exits to `/platform`.
- Exit/logout failure: both revocation paths were executed successfully.
- Wave 0.8 fail-closed incompatibility: verified platform authority, auth bootstrap, tenant context, and live membership permission reconstruction remain enforced.

## Reproduction steps

1. Sign in as an active Platform SuperAdmin.
2. Open `/admin` and select `Login as Trainer` (or open `/platform`, then User Directory).
3. Search for a known active instructor.
4. Select `Secret Login`, enter a non-empty reason, and launch.
5. Observe navigation to `/instructor`, the global impersonation banner, and the effective instructor response from `/api/v1/auth/me`.
6. Confirm `/api/v1/platform/command-center/summary` returns 403.
7. Exit from the banner and confirm restoration at `/platform`.

The prior screenshot without a banner represents a normal trainer session or a session not created through Secret Login.
