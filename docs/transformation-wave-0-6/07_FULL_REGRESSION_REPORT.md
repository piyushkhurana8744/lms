# Full Regression Report

Executed 2026-10-29:

- `pnpm build`: PASS after correcting strict optional-reason typing; 10/10 tasks.
- `pnpm test`: PASS; 774 passed, 358 skipped.
- `pnpm test:integration:mongo`: PASS; 1,042 passed, 5 skipped; 72.19 seconds.
- Focused real-Mongo impersonation HTTP: PASS; 19/19.
- Focused mocked impersonation service: PASS; 11/11.
- `pnpm test:e2e:isolated`: PASS; 36/36 across four viewports; 3.8 minutes.
- `pnpm type-check`: PASS.

The first Mongo attempt after the atomicity change found two stale unit mocks for the new transaction dependency. They were updated without weakening assertions. A separate strict-plugin dry run loaded a stale generated database artifact; it was stopped, rebuilt and not counted as regression evidence.

Dedicated Redis modes were not rerun in this pass; the five full-Mongo skips remain intentional and retain the Wave 0.5 evidence. No live provider certification was performed.
