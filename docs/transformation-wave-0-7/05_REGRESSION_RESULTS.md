# Regression results

- `pnpm security:check:wave07`: PASS, four migrated production modules.
- `pnpm type-check`: PASS.
- `pnpm build`: PASS, 10/10 packages.
- Capability unit tests: PASS, 2/2.
- Focused isolated-Mongo suites: PASS, 31/31.
- First full Mongo run after implementation: 1,039 passed, five skipped, six failed because Vitest resolved stale colocated generated JavaScript for the worker test. Test imports were pinned to TypeScript; the corrected focused run passed 31/31.
- Final `pnpm test:integration:mongo`: PASS, 1,045 passed and five intentional Redis-mode skips across 82 files in 70.54 seconds.
- `pnpm test`: PASS, 776 passed and 359 integration-mode skips.
- Dedicated Redis outage/recovery mode: not executed in this batch; those suites remained intentionally skipped by the Mongo harness.
- E2E: not executed for Batch 1.

