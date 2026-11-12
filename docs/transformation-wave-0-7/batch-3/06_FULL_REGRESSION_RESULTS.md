# Full Regression Results — Wave 0.7 Batch 3

## Verification Suite Summary

| Suite / Check | Command | Result | Metrics / Notes |
|---|---|---|---|
| Static Bypass Enforcement | `pnpm security:check:wave07` | **PASS** | 8 production modules protected; 0 violations |
| Bypass Inventory Count | `node scripts/check-wave07-bypass.mjs --json` | **PASS** | Textual count reduced from 27 to 21 |
| TypeScript Type-Check | `pnpm type-check` | **PASS** | 10/10 workspaces clean without type errors |
| Workspace Build | `pnpm build` | **PASS** | 10/10 workspaces built successfully |
| Unit / Service Tests | `pnpm test` | **PASS** | 777 passed, 364 skipped (integration-mode) |
| Mongo Integration Suite | `pnpm test:integration:mongo` | **PASS** | 1,051 passed, 5 skipped (dedicated Redis mode) |
| Dedicated Redis Recovery Proofs | `node scripts/run-redis-proofs.mjs` | **PASS** | 9/9 stages across notifications, student, instructor, integrations |
| Isolated Browser E2E Suite | `pnpm test:e2e:isolated` | **PASS** | 36/36 passed across multi-role workflows and viewports |

---

## Detailed Test Breakdown

### 1. Static Security Check
```
> didm-lms-platform@ security:check:wave07
> node scripts/check-wave07-bypass.mjs

[security:check:wave07] Checking 8 migrated modules for raw tenant bypasses...
✓ apps/worker/src/services/outboxDispatcher.ts
✓ apps/worker/src/services/notificationDispatcher.ts
✓ apps/worker/src/services/integrationDispatcher.ts
✓ apps/worker/src/index.ts
✓ apps/api/src/services/notification.service.ts
✓ apps/worker/src/services/financeReconciliation.ts
✓ apps/api/src/services/receiptArtifact.service.ts
✓ apps/api/src/app.ts

All 8 migrated modules are free of raw tenant bypasses.
```

### 2. Bypass Reduction Inventory
```
Total raw bypass textual count: 21 (previously 27 in Batch 2, 33 in Batch 1, 45 baseline).
Protected production modules: 8.
Pending modules: 7.
```

### 3. Mongo Integration Suite
- Total test files: 51
- Tests passed: 1,051
- Tests skipped: 5 (intentional dedicated Redis mode tests)
- Duration: 23.36s
- New test coverage:
  - `apps/worker/src/services/__tests__/finance-worker.integration.test.ts`: Added tests verifying missing/forged `SystemAuthority` is rejected during `claimReconciliation`, and valid authority allows atomic claim and tenant re-entry.
  - `apps/api/src/services/__tests__/certificate.integration.test.ts`: Added test verifying forged system capability and tenant mismatches are rejected, while authorized execution generates the certificate artifact under tenant isolation.
  - `apps/api/src/services/__tests__/finance-http-security.integration.test.ts`: Added negative tests for missing secret (401), invalid secret (401), missing tenant header (400), malformed tenant header (400), cross-tenant mismatches (400), and authorized execution of receipt artifact, payment reconciliation, and refund reconciliation (200).

### 4. Dedicated Redis Proofs
- Harness: `node scripts/run-redis-proofs.mjs`
- 9 stages verified:
  - Phase 19: Notification queue dispatch, lease claim, retry, recovery, and finalization
  - Phase 20: Student lifecycle events & progression
  - Phase 20: Instructor operating queue & batch sync
  - Phase 22: Integration queue processing & circuit breakers
- Result: 9 passed, 0 failed.

### 5. Playwright E2E Isolated Suite
- Harness: `node scripts/run-wave05-e2e.mjs`
- Test run: 36 passed (5.1m)
- Matrix covered:
  - Desktop Chrome, Mobile Chrome (375px), Mobile Safari (iPhone)
  - Personas: superadmin, admin, branch-admin, instructor, student
  - Navigation, dashboard, classes, integrations, notifications, and auth flows
- Process cleanup: MongoDB in-memory replica set, Redis server (port 6392), Web dev server, API server, and Worker shut down gracefully with zero orphan processes.

