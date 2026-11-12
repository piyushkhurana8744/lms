# Regression results (2026-10-30 IST)

| Command | Result | Evidence |
|---|---|---|
| `pnpm security:check:wave07` | PASS | all API/worker production TS scanned; 0 bypasses |
| JSON bypass inventory | PASS | `currentRawBypassCount: 0` |
| `pnpm type-check` | PASS | 7 applicable tasks successful; 10 packages in scope |
| `pnpm build` | PASS | 10/10 tasks successful |
| `pnpm test` | PASS | 47 files passed, 43 skipped; 777 tests passed, 387 skipped |
| `pnpm test:integration:mongo` | FAIL | 77 files passed, 2 failed, 5 skipped; 1,065 passed, 9 failed, 5 skipped |
| focused post-fix Mongo run | PASS | 3 files, 39 tests |
| Redis proofs | PASS | 9 stages/files, 9 tests |
| isolated E2E | NOT RUN | time consumed diagnosing and correcting Mongo failures |

The complete Mongo suite was not rerun after the focused fix, so the regression gate is not green. Test discovery was unchanged.
