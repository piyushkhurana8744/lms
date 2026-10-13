# Phase 11C production closure audit

## Closed in this iteration

- Transactional outbox records are inserted in the same sessions as payment success, receipt,
  refund success, and manual reversal.
- Worker dispatch uses atomic leases, lease expiry recovery, bounded attempts, persisted errors,
  exponential retry availability, and stable BullMQ job IDs.
- Payment/receipt/refund/reversal email notifications run after commit and cannot roll back money.
- Health readiness now includes MongoDB transaction capability.
- Tenant finance readiness checks transactions, Redis, gateway state, credentials, webhook secret,
  and production encryption configuration.
- Gateway enablement and online order creation enforce readiness server-side.
- Finance operations API exposes failed webhook/outbox events and stale payments/refunds.
- Real replica-set tests now cover transaction rollback, transactional outbox rollback, 20-way
  counter concurrency, and concurrent outbox identity enforcement.

## Event delivery semantics

Outbox event IDs are deterministic (`eventType:aggregateId`) and unique. A worker atomically claims
an eligible event for 60 seconds. Publishing uses the sanitized event ID as the BullMQ job ID. If a
worker dies after queue publication, retrying the same job ID does not enqueue a second job. Failed
claims back off and stop retrying automatically after five attempts, remaining visible to finance
operations.

## Readiness policy

Manual collections and manual reversals require transaction-capable MongoDB through their operation
itself but do not require gateway/Redis readiness. Online gateway enablement and order initiation are
blocked unless MongoDB transactions and Redis are available and Razorpay credentials plus webhook
secret are configured. Production additionally requires an explicit credential encryption key.

## Still open

- Receipt PDF creation and provider-neutral storage from the worker. Receipt DB snapshots and access
  authorization remain intact, but no PDF artifact is generated.
- Automated provider reconciliation scheduling. Manual reconciliation and stale-record visibility
  exist, but the worker does not invoke the canonical API finance service.
- Full domain-fixture integration coverage for concurrent payment finalization, refund races,
  manual idempotency races, raw HTTP webhook byte mutation, cross-tenant attacks, and admission
  failure injection.
- A worker heartbeat distinct from Redis connectivity; current readiness treats connected Redis as
  the worker prerequisite.

Therefore Phase 11C remains PARTIAL and real online payments/refunds must remain disabled.
