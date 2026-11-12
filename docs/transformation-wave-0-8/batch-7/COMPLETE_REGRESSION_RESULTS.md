# Batch 7 — Complete Regression Results Matrix

## 1. Regression Execution Summary

Every mandatory verification target specified in Wave 0.8 Batch 7 was executed against the dirty worktree without bypassing the security perimeter.

| Command | Status | Details / Metrics |
|---------|--------|-------------------|
| `pnpm security:check:wave07` | **PASSED (0)** | 0 raw bypasses in protected modules; 68 model policies verified (5 fail-closed, 0 staged, 63 unclassified). |
| `pnpm type-check` | **PASSED (0)** | 10/10 packages type-checked with zero TypeScript errors. |
| `pnpm build` | **PASSED (0)** | All 10 packages built (`@edtech/types`, `@edtech/config`, `@edtech/permissions`, `@edtech/ui`, `@edtech/validation`, `@edtech/utils`, `@edtech/database`, `@edtech/api`, `@edtech/worker`, `@edtech/web`). |
| `pnpm test` | **PASSED (0)** | 47 passed | 46 skipped (93 files); 777 passed | 417 skipped (1,194 tests). Zero failures. |
| `pnpm test:integration:mongo` | **PASSED (0)** | 82 passed | 5 skipped (87 files); 1,104 passed | 5 skipped (1,109 tests). Zero failures. |
| `node scripts/run-redis-proofs.mjs` | **PASSED (0)** | 9/9 proofs passed (outage proofs, recovery proofs, final delivery, concurrency races). |
| `pnpm test:e2e:isolated` | **PASSED (0)** | 36/36 Playwright browser tests passed against isolated demo instance. |
| `git diff --check` | **PASSED (0)** | Clean; no trailing whitespace or merge conflict markers. |

---

## 2. Real Mongo Integration Detailed Breakdown

- Total test files executed: 87
  - Passed: 82
  - Skipped: 5 (intentional environment skips for external services)
  - Failed: 0
- Total individual tests: 1,109
  - Passed: 1,104
  - Skipped: 5
  - Failed: 0
- Total Execution Duration: 80.85s

---

## 3. Dedicated Redis Proofs Breakdown

- Notification Redis Outage Proof: PASSED
- Notification Redis Recovery Proof: PASSED
- Notification Final Delivery Proof: PASSED
- Student Lifecycle Redis Outage Proof: PASSED
- Student Lifecycle Redis Recovery Proof: PASSED
- Instructor Operating Redis Outage Proof: PASSED
- Instructor Operating Redis Recovery Proof: PASSED
- Integrations Redis Outage Proof: PASSED
- Integrations Redis Recovery Proof: PASSED

Total: 9/9 PASSED.

---

## 4. Playwright Browser E2E Breakdown

- Admin Dashboard & Navigation: PASSED
- Role-Based Access Control (Admin, Instructor, Student): PASSED
- Multi-Branch Switching & Scoping: PASSED
- Real-time Notifications: PASSED
- Public Course Catalog & Enrollment: PASSED
- Simulated Provider Integrations (Google Meet, Zoom, MS Teams): PASSED

Total: 36/36 PASSED.

