# Real-Mongo negative matrix

Executed `wave08-runtime-isolation.integration.test.ts` against an isolated Mongo replica set.

PASS: 1 file, 5 tests.

Covered: both legacy bypass spellings, nested conflicting tenant query, cross-tenant update/delete, tenant-ID mutation, unsafe lookup rejection, aggregate tenant isolation, and valid tenant reads/writes.

The first two executions exposed a split AsyncLocalStorage singleton between source and built workspace modules (4/5 failed). A process-global symbol fixed the defect; the final execution passed 5/5.

Not yet covered: missing/invalid context, upsert, bulkWrite, insertMany, population, unionWith separately, forged/revoked PLATFORM, branch escalation, public/webhook positive paths, and concurrent async leakage.
