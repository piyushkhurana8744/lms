# Regression results

- `pnpm security:check:wave07`: PASS; 5 protected production modules (`outboxDispatcher.ts`, `notificationDispatcher.ts`, `integrationDispatcher.ts`, worker `index.ts`, and `notification.service.ts`).
- `pnpm type-check`: PASS; 10/10 packages in scope.
- `pnpm build`: PASS; 10/10 packages in scope.
- `pnpm test`: PASS; 777 passed, 362 integration-mode skips.
- `pnpm test:integration:mongo`: PASS; 1,049 passed, 5 intentional Redis-mode skips.
- Dedicated Redis proof harness (`node scripts/run-redis-proofs.mjs`): PASS; 9 separate outage, recovery, and finalization stages passed across notifications, student lifecycle, instructor operations, and integrations.
- `pnpm test:e2e:isolated`: PASS; 36/36 tests passed across multi-role workflows and viewports with clean shutdown.

All negative trust boundary, worker authentication, and tenant mismatch tests passed with real MongoDB and Redis execution.

