# Bypass Migration Progress & Inventory

## Quantitative Reduction
- **Baseline (Wave 0.7 Pre-migration):** 45 raw textual bypass lines
- **Batch 1 Result:** 33 raw textual bypass lines
- **Batch 2 Result:** 27 raw textual bypass lines
- **Batch 3 Result:** **21 raw textual bypass lines**

The authoritative check command is:
```bash
node scripts/check-wave07-bypass.mjs --json
```

---

## Protected Production Modules (Static Enforcement)
The static enforcement rule in `scripts/check-wave07-bypass.mjs` prevents raw bypass re-introduction in migrated files. In Batch 3, 3 modules were added, bringing the total to **8**:

1. `apps/worker/src/services/outboxDispatcher.ts` (Batch 1)
2. `apps/worker/src/services/notificationDispatcher.ts` (Batch 1)
3. `apps/worker/src/services/integrationDispatcher.ts` (Batch 1)
4. `apps/worker/src/index.ts` (Batch 1)
5. `apps/api/src/services/notification.service.ts` (Batch 2)
6. `apps/worker/src/services/financeReconciliation.ts` (Batch 3)
7. `apps/api/src/services/receiptArtifact.service.ts` (Batch 3)
8. `apps/api/src/app.ts` (Batch 3)

---

## Remaining Raw Bypass Inventory (21 sites across 7 files)

| File | Line(s) | Operational Domain | Justification / Status |
|---|---|---|---|
| `apps/api/src/scripts/migratePhase18BranchAccess.ts` | 8 | Data Migration Script | Standalone one-off migration script across all tenants. |
| `apps/api/src/services/auth.service.ts` | 368, 376, 536 | Platform SuperAdmin & Impersonation | Global SuperAdmin session bootstrap and user lookup across tenants. Pending authentication capability boundary. |
| `apps/api/src/services/automation.service.ts` | 75, 93, 98, 101, 118 | Automation Worker & Leases | Cross-tenant automation execution schedule, claim, and lock recovery. Recommended for Batch 4. |
| `apps/api/src/services/certificate.service.ts` | 68 | Public Certificate Verification | Public route lookup by verification code (`/verify/certificate/:code`). No tenant header exists on public lookup. |
| `apps/api/src/services/finance.service.ts` | 254, 256 | Razorpay Webhook Ingestion | Webhook payload lookup by gateway `order_id` / `payment_id` prior to tenant identification. Preserved per scope instructions. |
| `apps/api/src/services/integrations/orchestration/integrationWebhook.service.ts` | 65, 121 | Integration Webhooks | External incoming webhook provider dispatch where tenant must be resolved from webhook payload. |
| `apps/api/src/services/integrations/orchestration/zoomRecording.service.ts` | 49, 55, 61, 67, 83, 87, 89 | Zoom Webhooks & Sync | External Zoom webhook callbacks resolving tenant from account/meeting ID. Recommended for Batch 4. |

