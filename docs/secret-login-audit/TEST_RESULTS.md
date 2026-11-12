# Test Results

All results below were executed on 2026-11-03 in isolated local test environments.

| Command | Result |
|---|---|
| `pnpm vitest run apps/api/src/services/__tests__/superadmin-impersonation.test.ts --reporter=verbose` | PASS — 11/11 |
| `node scripts/run-mongo-integration.mjs apps/api/src/services/__tests__/impersonation-http.integration.test.ts` | PASS before extension — 19/19 |
| same real-Mongo command after invalid-credential, expiry, and logout coverage | PASS — 22/22 |
| `env -u MONGO_URI -u MONGODB_URI -u REDIS_URL node scripts/run-wave05-e2e.mjs -- tests/e2e/integration-workflows.spec.ts --project=desktop-chrome-1440` | PASS — 1/1 full workflow |
| `env -u MONGO_URI -u MONGODB_URI -u REDIS_URL node scripts/run-wave05-e2e.mjs -- tests/e2e/secret-login.spec.ts --project=desktop-chrome-1440` | PASS — 1/1 focused role redirect |

The Mongo and browser commands use an owned ephemeral Mongo replica set; the browser orchestrator additionally starts isolated Redis, API, worker, and web processes and shuts them down afterward.


## Regression gates

| Command | Result |
|---|---|
| `pnpm security:check:wave07` | PASS — bypass scan and Wave 0.8 policy guard |
| `pnpm type-check` | PASS — 7/7 configured package tasks |
| `pnpm build` | PASS — 10/10 workspace builds, including API, worker, and optimized Next.js build |
| `git diff --check` | PASS |
