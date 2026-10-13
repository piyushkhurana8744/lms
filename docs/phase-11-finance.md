# Phase 11 finance architecture and gap analysis

## Repository findings before hardening

The repository already contained fee structures, student fee plans, embedded installments,
payments and allocations, a financial ledger, receipts, refunds, encrypted tenant gateway
configuration, a Razorpay adapter, finance APIs, RBAC permissions, and admin/student pages.
Those pieces were reusable, but several production guarantees needed extension:

- numbering used `countDocuments()` plus randomness rather than an atomic sequence;
- provider order/payment IDs, receipts-by-payment, and request idempotency were not uniquely
  constrained;
- fee plans referenced a mutable template without snapshotting its components;
- the lead partial unique index used `$nin`, which MongoDB does not support in a partial index;
- payment/refund multi-document writes are not transactional;
- no unauthenticated raw-body webhook endpoint or persisted webhook-event inbox exists;
- provider verification validates the callback HMAC and order identity, but does not fetch the
  provider payment to independently compare amount and currency;
- the existing Docker MongoDB is a standalone node, so MongoDB transactions are unavailable;
- finance tests cover arithmetic, validation, allocation and RBAC helpers, but not a real MongoDB
  replica set, races, rollback, webhook retries, or cross-tenant HTTP integration.

Classification: the existing domain/UI/provider/RBAC work is **REUSABLE**; numbering, snapshots,
indexes and validation **NEEDED EXTENSION**; webhook inbox and replica-set transaction execution
are **MISSING**; claims of concurrency-safe numbering and transaction-safe conversion/payment
processing were **CONFLICTING** with the implementation.

## Phase 10 hardening verification

Lead deduplication is database constrained by `(tenantId, normalizedPhone)` for active stages.
The filter now enumerates active stages with `$in`, preserving legitimate LOST/CONVERTED history
and using an operator accepted by MongoDB partial indexes. Admissions also have a partial unique
active-record constraint per lead.

Admission conversion is idempotent at the service layer and its User, OrganizationMember and
Enrollment identities each have unique database constraints. It is **not atomic**: the repository's
default standalone MongoDB topology cannot execute multi-document transactions. A failed conversion
can therefore require retry, although retries converge on the unique identities. Deploy MongoDB as
a replica set and move User + membership + enrollment + admission + lead updates into one session
before representing this path as transaction-safe.

## Financial invariants

- All persisted amounts use integer minor units (`amountMinor`) and an explicit three-letter
  currency code. Percentage discounts round to the nearest minor unit with `Math.round`.
- A FeeStructure is mutable template data. A StudentFeePlan is the contract: when it references a
  template, the backend verifies course and amount and captures name, code, total, components and
  timestamp in `feeStructureSnapshot`.
- Installments must have positive integer amounts, unique sequences, and sum exactly to net payable.
  They are normalized oldest-due-first. Template schedules use either fixed amounts totaling the
  fee or percentages totaling 100%, never a mixture.
- Payments allocate oldest dues first and allow partial/multi-installment allocation. Refund ledger
  entries restore liability; they do not erase the original charge or payment.
- Payment, receipt and refund numbers use atomic counters scoped by tenant, kind and calendar year.
  Gaps are permitted; duplicates are not.
- Unique indexes protect tenant idempotency keys, provider orders, provider payments, provider
  refunds, and one receipt per payment. Gateway callback verification also requires the callback
  order to equal the internal order. HMAC comparison is constant-time.

## Known limitations and required production follow-up

The checked-in finance implementation must be reported as **PARTIAL**, not production-complete.
Manual payment, online completion, refund, ledger, balance and receipt changes are currently separate
writes. On standalone MongoDB they can partially succeed, and races can oversubscribe a balance or
refund capacity. Razorpay refunds are not yet invoked by the refund service. Webhook ingestion,
event deduplication, reconciliation/recheck actions, reversals, notification events, receipt PDF,
and database-backed concurrency tests remain to be implemented. Until then, online checkout and
refund execution should not be enabled for production money movement.
