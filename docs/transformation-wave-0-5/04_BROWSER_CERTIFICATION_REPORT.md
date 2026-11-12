# Browser Certification Report

Date: 2026-10-29. Command: `pnpm test:e2e:isolated`.

## Result

PASS: 36/36 Playwright tests in 3.5 minutes, using the real API, web and worker processes against an owned in-memory Mongo replica set and loopback Redis. The four projects were desktop Chrome at 1440x900, tablet Chrome at 768x1024, mobile Chromium at 375x812, and mobile Chromium at 430x932. The stack shut down cleanly with exit code 0.

Five real personas logged in: SuperAdmin, tenant admin, branch admin, instructor and student. The suite traversed every role-visible primary sidebar link, rejected server errors/404 navigation, exercised instructor student detail, provider configuration states, live meeting create/switch/reschedule, student host-URL isolation, branch-admin read-only integration UX, SuperAdmin impersonation/exit, re-login and logout-equivalent session clearing. Twenty role/viewport portal screenshots were captured in `test-results/portal-navigation-*`; workflow screenshots and traces are Playwright attachments.

The first full attempt produced 32 passes and four failures. Root cause was a production Zoom demo-credential guard applying even when deterministic adapters were explicitly enabled. The guard now remains active except when both `NODE_ENV=test` and `ENABLE_INTEGRATION_TEST_ADAPTERS=true`. The focused regression passed 4/4, then the full matrix passed 36/36.

## Runtime observations

- No HTTP 5xx response was observed by the role-navigation assertions.
- Pre-login `/auth/me` probes generate expected 401 browser-console messages.
- Next.js client transitions can report aborted RSC requests during deliberate navigation/reload; these were recorded but did not represent server failures.
- Next dev emitted an `allowedDevOrigins` future-version warning. This is environment noise, not a current product failure.
- Provider operations used deterministic adapters. This is not live Google, Zoom or Microsoft certification.

## Coverage limitation

This pass certifies the implemented primary-route and Phase 22 workflow suite. It does not prove every possible contextual action or every loading, empty and injected-error state on every route. Those remain incremental browser-suite work, not grounds to relabel this run as broader coverage.
