# Batch 2 implementation report

Batch 2 migrated notification composition, notification delivery claims/finalization, internal notification routes, and finance payment-success outbox consumption onto the Batch 1 SYSTEM capability boundary.

`NotificationService.createIntent` now requires a matching workspace tenant. Recipient, preference, deduplication fallback, notification, and delivery queries are tenant-scoped without raw bypass. Worker consumption uses identifier-plus-tenant discovery under `SystemAuthority`, validates the expected queue/header tenant, and re-enters TENANT context.

Delivery claims retain one atomic compare-and-set mutation, five-attempt bounds, expired-lease recovery, and tenant-scoped finalization. Internal routes authenticate the worker before lookup and require a valid 24-character tenant binding. Worker queue payloads and finance callbacks now carry that tenant binding.

The authorization primitive was corrected to await Mongoose thenables inside `AsyncLocalStorage.run`; without this, a query could execute after SYSTEM context ended.

Modified production files:

- `packages/database/src/authorizedExecutionContext.ts`
- `apps/api/src/services/notification.service.ts`
- `apps/api/src/app.ts`
- `apps/worker/src/index.ts`
- `apps/worker/src/services/outboxDispatcher.ts`
- `scripts/check-wave07-bypass.mjs`

