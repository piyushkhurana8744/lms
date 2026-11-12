# Wave 0.7 Raw Bypass Migration Progress

## Summary
- Initial Pre-Wave 0.7 Raw Bypass Sites: **45**
- Batch 1 Post-Migration Count: **33**
- Batch 2 Post-Migration Count: **27**
- Batch 3 Post-Migration Count: **21**
- **Batch 4 Post-Migration Count: 5**
- **Cumulative Reduction:** 40 of 45 sites eliminated (88.9% progress).
- **Protected Production Modules:** 12 modules under static check enforcement.

---

## Batch 4 Migrations (16 Sites Eliminated)

| Production Module | Migrated Function / Call Site | Replaced Mechanism |
|---|---|---|
| `apps/api/src/services/automation.service.ts` | `processNextEvent` (candidate discovery) | `runAuthorizedSystemOperation(AUTOMATION_RECOVERY)` with `select('_id tenantId')` |
| `apps/api/src/services/automation.service.ts` | `processNextEvent` (atomic claim) | `tenantContextStorage.run` bound to candidate `tenantId` |
| `apps/api/src/services/automation.service.ts` | `runExecution` (execution lookup) | `tenantContextStorage.run` with fallback `AUTOMATION_RECOVERY` tenant lookup |
| `apps/api/src/services/automation.service.ts` | `runExecution` (step execution claim) | `tenantContextStorage.run` bound to `execution.tenantId` |
| `apps/api/src/services/automation.service.ts` | `recoverDue` (stale steps & due executions) | Identifier-only `AUTOMATION_RECOVERY` discovery + per-tenant `tenantContextStorage.run` |
| `apps/api/src/services/integrations/orchestration/integrationWebhook.service.ts` | `handleZoomWebhook` (connection resolution) | `runAuthorizedSystemOperation(PROVIDER_WEBHOOK)` selecting `_id tenantId status provider externalTenantId` |
| `apps/api/src/services/integrations/orchestration/integrationWebhook.service.ts` | `handleZoomWebhook` (meeting update & delegation) | `tenantContextStorage.run` bound to `connection.tenantId` |
| `apps/api/src/services/integrations/orchestration/zoomRecording.service.ts` | `signalMeetingEnded` (meeting resolution) | `runAuthorizedSystemOperation(ZOOM_RECORDING_WEBHOOK)` with `select('_id tenantId')` |
| `apps/api/src/services/integrations/orchestration/zoomRecording.service.ts` | `signalMeetingEnded` (meeting update) | `tenantContextStorage.run` bound to meeting `tenantId` |
| `apps/api/src/services/integrations/orchestration/zoomRecording.service.ts` | `signalRecordingCompleted` (meeting resolution) | `runAuthorizedSystemOperation(ZOOM_RECORDING_WEBHOOK)` with `select('_id tenantId')` |
| `apps/api/src/services/integrations/orchestration/zoomRecording.service.ts` | `signalRecordingCompleted` (recording upsert) | `tenantContextStorage.run` bound to meeting `tenantId` |
| `apps/api/src/services/integrations/orchestration/zoomRecording.service.ts` | `enqueueSync` (recording lookup & enqueue) | `tenantContextStorage.run` bound to recording `tenantId` |
| `apps/api/src/services/integrations/orchestration/zoomRecording.service.ts` | `sync` (recording lookup) | `runAuthorizedSystemOperation(ZOOM_RECORDING_WEBHOOK)` selecting `_id tenantId` |
| `apps/api/src/services/integrations/orchestration/zoomRecording.service.ts` | `sync` (recording mutation) | `tenantContextStorage.run` bound to recording `tenantId` |
| `apps/api/src/services/finance.service.ts` | `processRazorpayWebhook` (order resolution) | `runAuthorizedSystemOperation(FINANCE_WEBHOOK)` selecting `_id tenantId` |
| `apps/api/src/services/finance.service.ts` | `processRazorpayWebhook` (refund resolution) | `runAuthorizedSystemOperation(FINANCE_WEBHOOK)` selecting `_id tenantId` |

---

## Static Enforcement Roster (12 Modules)
The following 12 production files are protected by `scripts/check-wave07-bypass.mjs` against any introduction or re-introduction of `bypassTenantFilter` or `__bypassTenantIsolation`:
1. `apps/worker/src/services/outboxDispatcher.ts`
2. `apps/worker/src/services/notificationDispatcher.ts`
3. `apps/worker/src/services/integrationDispatcher.ts`
4. `apps/worker/src/index.ts`
5. `apps/api/src/services/notification.service.ts`
6. `apps/worker/src/services/financeReconciliation.ts`
7. `apps/api/src/services/receiptArtifact.service.ts`
8. `apps/api/src/app.ts`
9. `apps/api/src/services/automation.service.ts`
10. `apps/api/src/services/integrations/orchestration/integrationWebhook.service.ts`
11. `apps/api/src/services/integrations/orchestration/zoomRecording.service.ts`
12. `apps/api/src/services/finance.service.ts`

---

## Remaining 5 Sites (Targeted for Wave 0.7 Batch 5)
```
1. apps/api/src/scripts/migratePhase18BranchAccess.ts:8
   - One-off migration script for Phase 18 branch access.
2. apps/api/src/services/auth.service.ts:368
   - Platform superadmin cross-tenant user lookup for session bootstrap.
3. apps/api/src/services/auth.service.ts:376
   - Platform superadmin tenant lookup for impersonation authorization.
4. apps/api/src/services/auth.service.ts:536
   - Platform superadmin impersonation session token creation.
5. apps/api/src/services/certificate.service.ts:68
   - Public certificate verification code lookup (/verify/certificate/:code).
```

