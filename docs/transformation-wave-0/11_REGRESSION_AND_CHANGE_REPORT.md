# Regression and change report

Wave 0 made one product-test change only:

- `apps/api/src/services/__tests__/student-lifecycle.integration.test.ts`: replaced a stale fixed post-resume timestamp with runtime-relative future timestamps. This preserves the production service’s real transaction-time activation semantics and keeps the historical eligibility assertion meaningful.

Focused verification passed 16/16. No navigation, dashboard, API, schema, permission, production infrastructure or business logic was changed. The 13 Wave 0 reports were added. Existing dirty files were preserved.

Regression baseline retained: default unit/contract suite, route integrity, navigation RBAC, back navigation, Mongo integration command, Redis proof runner and Playwright suites. Remaining unexplained signal: best-effort audit logging emitted a transient Mongo lock warning during a passing Redis proof.
