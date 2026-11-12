# Transformation roadmap

| Wave | Scope | Dependencies / risks | Acceptance and tests | Rollback / complexity |
|---|---|---|---|---|
| 0 Baseline & safety | route/permission manifest, five seeded personas, runnable Mongo/Redis suites, browser screenshots and journey traces, telemetry baseline | stable seed and environment; protect existing dirty worktree | all default + integration suites classified; E2E for critical paths; isolation matrix | docs/tests only; low product risk, M |
| 1 Navigation | regroup role navigation, canonical labels, breadcrumbs, context preservation; no URL/RBAC break | Wave 0 snapshots; risk hidden deep links | route integrity, permission snapshots, keyboard/mobile nav, old URLs preserved | feature flag old nav; M |
| 2 Dashboards | action queues and deep-linked KPIs for platform/admin/branch/instructor/student | reliable query definitions | data reconciliation tests; empty/error/loading; role/branch E2E | per-widget flags; M-L |
| 3 Connected journeys | admission checklist, course/batch/class workspaces, contextual attendance/recording/assessment transitions | API contracts and idempotency; highest regression risk | six journey E2Es, permission and tenant/branch tests, provider failure states | incremental tabs/actions; no big schema migration; L-XL |
| 4 Design consistency | token/component contracts, shared page/list/detail/forms and async states | Waves 1-3 patterns stabilized | visual regression, axe, keyboard, responsive matrix | migrate page-by-page; L |
| 5 Certification | real providers, payment/webhooks, worker recovery, load, security, mobile/browser and DR | staging credentials and operational ownership | signed evidence checklist and runbooks; zero critical isolation defects | provider kill switches and queue pause/replay; XL |

Affected areas: `apps/web/src/config/navigation.ts`, role layouts and dashboards, shared web components, `packages/ui`, route-level pages, targeted API query/aggregation services, integration/worker operations, tests and deployment observability. Avoid changing canonical database entities merely for labels.

## Safest first implementation wave

Wave 0 is non-negotiable. Specifically: preserve a generated route/API/permission inventory; enable `test:integration:mongo` and Redis-dependent suites in CI; validate demo seed; run Playwright for Super Admin, Tenant Admin, Branch Admin, Instructor and Student at desktop/mobile; capture current screenshots; add tenant/branch/IDOR tests; catalogue skipped tests and bypasses. Only then change navigation behind a reversible flag.
