# Browser audit

Status: **BLOCKED**.

Playwright 1.64 and three configured projects (1440, 430, 375) are installed. The brief additionally requires 768, which is not configured. Existing suites cover five personas, permitted sidebar traversal, screenshots, console/request/server errors, provider discoverability, class meeting lifecycle, student join security and impersonation.

No service responded at localhost ports 3000, 4000 or 5012. Browser tests were not run because the existing seed was not proven to target a dedicated test-only database. Starting production-oriented Compose would also create persistent volumes and invoke edge/domain registration. Consequently there are no new screenshots or traces, and no browser claim is made.

Known code-level UX risks remain: overloaded admin navigation, `/admin/organization/website` redirect duplication, Super Admin landing ambiguity, auth-route middleware’s hardcoded `/student` redirect, bespoke loading/error states, and missing 768 viewport coverage.

Unblocker: add a safe E2E orchestrator that owns ephemeral Mongo/Redis, validates database name, seeds without logging secrets, starts API/web/worker in test mode, waits for health, runs all four viewports, and guarantees teardown.
