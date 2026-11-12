# Implemented Fixes

## Production changes

1. Added a SuperAdmin-only `Login as Trainer` shortcut to the Workspace Admin dashboard. It links to `/platform?tab=users`; it is not rendered for tenant admins, instructors, or students.
2. Added query-driven initial tab selection to the existing Platform Command Center so the shortcut opens the canonical user directory instead of duplicating or replacing Secret Login.

No authentication API, JWT format, cookie policy, database record, permission calculation, tenant policy, or audit semantics were weakened or replaced.

## Test changes

1. Added `tests/e2e/secret-login.spec.ts`, which selects a known instructor and proves dashboard discovery, role redirect, banner state, effective identity, removal of Platform authority, and safe exit.
2. Extended the real-Mongo HTTP matrix with impersonated-session expiry and impersonated logout/revocation tests.

## Deliberately unchanged

- Canonical and compatibility routes remain intact.
- Normal login, Platform login, refresh, logout, and logout-all remain intact.
- No password, master credential, authentication bypass, universal token, or target credential exchange was introduced.
- Session duration remains four hours for impersonation.
- Mandatory transactional security audit remains fail-closed.
