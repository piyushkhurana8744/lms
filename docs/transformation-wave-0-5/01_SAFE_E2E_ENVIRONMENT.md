# Safe E2E Environment

Date: 2026-10-28. Source revision: `6f68e5de7d2308e5f4639eff8beec846ce53c9a6` (`deployment`), with the uncommitted Wave 0/0.5 working tree preserved.

`pnpm test:e2e:isolated` is the approved browser entry point. `scripts/run-wave05-e2e.mjs` creates a one-node `MongoMemoryReplSet`, database `edtech_lms_e2e_wave05`, disposable Redis on loopback port 6392/database 15, API on 4400, web on 3300, and a worker. It sets deterministic/mock provider adapters and tears every child process and the replica set down in `finally`.

The runner refuses inherited `MONGO_URI`, `MONGODB_URI`, or `REDIS_URL`. The secondary seed additionally requires `NODE_ENV=test`, `WAVE05_E2E_OWNED=1`, a loopback Mongo endpoint, an `edtech_lms_e2e_*` database, and `replicaSet`. No cleanup query can point at a shared or production database. The original demo seed no longer prints its password; credentials are environment-supplied.

The first proof run safely failed before tests because of an invalid Next CLI argument. The runner was corrected from `dev -- -p 3300` to `dev --port 3300`; no external state was touched.

Known limitation: fixed local ports require an otherwise idle developer machine. Parallel instances are not supported yet.
