# Phase 11B production hardening

## Replica-set development setup

`docker compose up -d mongodb mongo-replica-init` starts MongoDB with `--replSet rs0`, waits for
health, and idempotently runs `rs.initiate`. Applications use
`mongodb://mongodb:27017/edtech_lms?replicaSet=rs0`. Host-run integration tests use
`mongodb://localhost:27017/edtech_lms_test?replicaSet=rs0&directConnection=true`.

Existing standalone containers must be recreated after this change. Production deployments must
provide their own replica set or sharded cluster; readiness should be treated as unsafe if MongoDB
does not report a set name and logical sessions.

## Transaction boundaries

- Manual collection: payment, allocation snapshot, fee-plan/installments, ledger, receipt, payment
  receipt link and audit entry commit together.
- Online success: provider fetch happens before the transaction; payment SUCCESS, allocations,
  fee plan, ledger and receipt commit through the single `finalizeSuccessfulPayment` operation.
- Refund: a transaction reserves refundable capacity and creates PROCESSING. The provider call is
  outside the transaction. Confirmed refund accounting atomically moves reserved to refunded,
  restores liability, updates payment/refund and creates the ledger entry.
- Manual reversal: allocation undo, balance restoration, payment REVERSED, receipt cancellation and
  reversal ledger entry commit together.
- Admission conversion: User, OrganizationMember, canonical Enrollment, Admission, Lead, timeline
  and audit records share one transaction/session.

The provider and email/file/network operations are deliberately outside database transactions.

## Webhooks and provider authority

`POST /api/v1/webhooks/payments/razorpay` is mounted before JSON middleware and receives an
`express.raw` Buffer. Tenant identity is resolved from the globally unique internal provider order
or refund reference, never a query/header tenant. The matching tenant secret verifies the exact
bytes before inbox or financial mutation. The inbox uniquely keys provider + event ID, records
attempts and supports FAILED retries.

Razorpay payment finalization fetches normalized provider data and requires CAPTURED status plus
exact order, amount and currency matches. Razorpay refund requests are sent before atomic local
finalization; asynchronous results remain PROCESSING for webhook or reconciliation.

## Reconciliation and correction APIs

- `POST /api/v1/finance/payments/:id/reconcile` — `payment.reconcile`
- `POST /api/v1/finance/refunds/:id/reconcile` — `payment.reconcile`
- `POST /api/v1/finance/payments/:id/reverse` — currently uses the strict refund permission

Only successful, unrefunded MANUAL payments can be reversed. Online payments use refunds.

## Index deployment preflight

Before application deployment, query for duplicate non-null idempotency keys, gateway order/payment
IDs, gateway refund IDs and payment receipts. Do not delete duplicates. Quarantine the affected
records for finance review, resolve references explicitly, then run model index synchronization.
Deploy the replica set and indexes before enabling gateway configuration.

## Verification and remaining limitations

The replica set was started and reported `rs0` PRIMARY. The opt-in integration suite executes actual
transaction rollback and 20-way atomic counter concurrency. The default suite skips infrastructure
tests unless `RUN_MONGO_INTEGRATION=1`.

Still open: transactional outbox/worker delivery, automated reconciliation scheduling, receipt PDF
artifact generation/storage, full service-level failure injection and race tests, complete webhook
test coverage, and a readiness response that exposes transaction capability. Consequently real
online payment/refund enablement remains **NO** and Phase 11B remains **PARTIAL**.
