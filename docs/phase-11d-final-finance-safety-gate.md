# Phase 11D — Final Finance Safety Gate

Status: **PARTIAL**

This pass closes two money-movement defects and adds two real-database isolation proofs. It does not claim final finance production readiness.

## Closed in this pass

- Refund creation sends the immutable internal refund number to Razorpay as both the receipt and an internal note.
- A refund left in `PROCESSING` after a provider timeout can be discovered from the original provider payment and finalized by reconciliation.
- A provider-confirmed failed refund releases its reserved refund capacity in the same MongoDB transaction that marks the refund failed.
- Concurrent manual-payment duplicate-key races recover the already committed payment and receipt for the same idempotency request.
- Finance readiness now requires a recent worker heartbeat stored in Redis; the worker refreshes it every 15 seconds with a 60-second TTL.
- Replica-set integration coverage now proves finance-service tenant isolation and denial of another student's receipt.

## Executed evidence

- Normal Vitest suite: 701 passed, 7 integration tests skipped by opt-in design.
- MongoDB replica-set integration suite: 7 passed, including transaction rollback, sequence concurrency, outbox rollback/deduplication, tenant isolation, and student receipt isolation.
- Razorpay refund-correlation tests: 2 passed as part of the normal suite.

## Remaining release blockers

- There is no automatic scheduler/consumer that reconciles stale payments and refunds through the canonical finance service. Reconciliation remains operator-triggered.
- The real Express raw-body webhook endpoint does not yet have socket-level integration tests for exact bytes, duplicate delivery, and cross-tenant reference rejection.
- Full service-level races (payment versus payment, payment versus refund, and refund versus refund) are not yet exercised concurrently against MongoDB.
- The outbox worker claim/lease/retry/dead-letter behavior is not isolated behind a testable component and lacks failure-injection tests.
- Receipts remain authoritative database snapshots only; async PDF generation, provider-neutral artifact storage, retry behavior, and authorized download are not implemented.
- Failure-injection rollback tests do not yet cover every named finance workflow boundary.

Until those blockers are closed with executed evidence, the finance subsystem must not be represented as fully production-ready.
