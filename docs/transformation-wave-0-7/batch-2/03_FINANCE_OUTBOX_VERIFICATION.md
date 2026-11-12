# Finance outbox verification

Payment-success consumption first discovers only `_id` and `tenantId` under `OUTBOX_DISPATCH`. It rejects a supplied tenant mismatch, re-enters that tenant, reloads the exact payment-success event, publishes the deterministic domain event, and composes the recipient notification under tenant context.

No gateway webhook ownership lookup or Razorpay signature behavior changed. Payment, refund, ledger, receipt, and transaction code was not modified.

Real-Mongo finance transaction coverage passed, including ten-way replay, stable event identity, one notification/delivery, provider failure and retry, and unchanged finance snapshots.

