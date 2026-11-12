# Razorpay Webhook Ownership & Tenant Context Isolation

## Overview
`FinanceService.processRazorpayWebhook` (`apps/api/src/services/finance.service.ts`) receives payment gateway lifecycle webhooks from Razorpay (such as `payment.captured`, `payment.failed`, and `refund.processed`). Because Razorpay webhook HTTP requests originate externally without a DIDM LMS tenant session header, the service must reliably determine tenant ownership without exposing financial records across tenants.

---

## Security Model & Sequence

```
Razorpay Cloud ──── POST /api/v1/finance/webhooks/razorpay
                             │
                  [x-razorpay-signature check]
                   Missing? ──► 400 Bad Request
                             │
                             ▼
                Authorized Global Routing Discovery
                 (FINANCE_WEBHOOK System Operation)
                             │
     Query PaymentModel / RefundModel by gatewayOrderId / gatewayRefundId
                   Projection: _id tenantId
                             │
                   Not Found? ──► 404 Not Found
                             │
                             ▼
                 tenantContextStorage.run(tenantId)
                             │
                  [Provider Signature Check]
             provider.verifyWebhookSignature(rawBody, signature)
                   Invalid? ──► 401 Unauthorized
                             │
                             ▼
               Domain Ledger Execution
     - Update Payment / Refund state machine
     - Record double-entry financial ledger entries
     - Emit idempotent outbox notifications
```

---

## Key Invariants & Safeguards

### 1. Pre-Query Signature Requirement
Incoming requests must provide `x-razorpay-signature`. Webhook payloads lacking signatures are immediately rejected with `BadRequestError` before any database queries execute.

### 2. Identifier-Only Routing Discovery
Candidate discovery is authorized exclusively under `AuthorizedSystemOperationType.FINANCE_WEBHOOK`:
```typescript
const candidate = await runAuthorizedSystemOperation(auth, {
  kind: 'FINANCE_WEBHOOK',
  reason: 'Resolve payment record tenant for Razorpay webhook routing',
  correlationId: `razorpay-webhook-${orderId}`
}, () =>
  PaymentModel.findOne({ gatewayOrderId: orderId })
    .setOptions({ authorizedSystemOperation: 'FINANCE_WEBHOOK' })
    .select('_id tenantId')
    .lean()
);
```
No financial balances, student identities, invoice amounts, or bank account details are returned by the global discovery step.

### 3. Tenant Context Signature Verification
Signature verification is executed **inside** the resolved tenant context using that tenant's configured gateway webhook secret:
```typescript
await tenantContextStorage.run({ currentTenantId: tenantId }, async () => {
  const provider = await PaymentProviderFactory.getProvider(tenantId);
  if (!provider.verifyWebhookSignature(rawBody, signature)) {
    throw new UnauthorizedError('Invalid Razorpay webhook signature');
  }
  // Proceed with tenant ledger mutations...
});
```

### 4. Preservation of Financial Guarantees
- No modifications were made to payment state transitions (`PENDING` -> `SUCCESS` / `FAILED`).
- Double-entry ledger postings remain immutable and append-only.
- Refund idempotency keys and reconciliation locks remain untouched.

