# Regression Baseline

Frozen on 2026-10-29 against branch `deployment` with the preserved Wave 0/0.5 working tree.

## Safety contract

| Contract | Evidence |
|---|---|
| Routes and navigation | `docs/transformation-wave-0/02_ROUTE_NAVIGATION_MANIFEST.md`, `apps/web/src/components/__tests__/route-integrity.test.ts`, `tests/e2e/portal-navigation.spec.ts` |
| Permissions | `docs/transformation-wave-0/03_API_PERMISSION_MATRIX.md`, permission middleware/service integration suites |
| Role navigation | Five personas, four viewports, 20 screenshots under `test-results/portal-navigation-*` |
| Tenant and branch isolation | Mongo HTTP suites for branches, finance, scheduling, attendance, analytics, communications, integrations, certificates and impersonation |
| Student own-resource access | Student lifecycle, progress, certificate and integration join security tests |
| Instructor assignment scope | Instructor operating and integration HTTP suites |
| SuperAdmin context switching | Impersonation service/HTTP suites plus four-viewport browser workflow |

## Counts

- Full Mongo mode: 1,042 passed, 5 skipped; 76 files passed, 5 skipped; 73.18 seconds.
- Browser mode: 36 passed, 0 failed; four projects; 3.5 minutes.
- Focused browser regression for the deterministic Zoom guard: 4 passed, 0 failed; 55.0 seconds.

## Preserved behavior

No navigation or dashboard redesign was performed. Existing route manifests and permission matrices remain the comparison source for Wave 1. Browser screenshots are run artifacts and should be promoted to a versioned visual-regression store before intentional UI changes are accepted.

## Known blockers

Raw privileged tenant bypass remains broadly available, missing workspace context can still become an unscoped query, and security-critical audit events can still be lost on best-effort writes. These are recorded in reports 05–07 and keep Wave 1 blocked.
