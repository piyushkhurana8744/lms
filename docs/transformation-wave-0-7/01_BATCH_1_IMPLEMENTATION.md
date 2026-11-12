# Wave 0.7 Batch 1 implementation

Implemented a real SYSTEM boundary for the queue worker and internal integration processor. The migrated modules are `outboxDispatcher.ts`, `notificationDispatcher.ts`, `integrationDispatcher.ts`, `worker/index.ts`, and the integration-operation route in `api/app.ts`.

Global discovery now projects identifiers and `tenantId` only. Outbox claiming re-enters workspace TENANT context for its compare-and-set mutation. Integration recording upsert and stale-lease recovery re-enter TENANT context. Queue payloads retain tenant identity. Integration consumers verify `_id` plus `tenantId` before processing.

The legacy `bypassTenantFilter` switch remains available only for pending domains; the repository-wide plugin was not flipped fail-closed.

## Files modified for Batch 1

- `packages/database/src/authorizedExecutionContext.ts`
- `packages/database/src/plugin/tenantIsolationPlugin.ts`
- `apps/worker/src/services/outboxDispatcher.ts`
- `apps/worker/src/services/notificationDispatcher.ts`
- `apps/worker/src/services/integrationDispatcher.ts`
- `apps/worker/src/index.ts`
- `apps/api/src/app.ts`
- focused tests and `scripts/check-wave07-bypass.mjs`

