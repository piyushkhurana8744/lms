# Provider Webhook Trust Boundaries & Ingestion Security

## Overview
`IntegrationWebhookService` (`apps/api/src/services/integrations/orchestration/integrationWebhook.service.ts`) ingests asynchronous external events from third-party conferencing and cloud classroom providers (e.g., Zoom, Google Meet). In Wave 0.7 Batch 4, provider authentication was strictly detached from tenant resolution to eliminate blind raw bypasses.

---

## Threat Model & Attack Surface
Prior to Batch 4, incoming webhooks could query database collections with raw bypass flags before full validation of the provider's authenticity, risking:
- **Tenant Spoofing:** An attacker sending fabricated webhook payloads containing arbitrary tenant or meeting IDs.
- **Cross-Tenant Meeting State Mutation:** Modifying meeting attendance, duration, or recordings across tenant boundaries.
- **Resource Exhaustion:** Enqueueing unauthorized recording sync jobs without verifying connection ownership.

---

## Provider Trust Boundaries

### 1. Zoom Webhooks
- **Signature Verification:** Zoom provides HMAC-SHA256 signatures in the `x-zm-signature` header:
  ```
  v0 = HMAC_SHA256(secret, "v0:" + timestamp + ":" + rawBody)
  ```
- **Authentication Handshake:** Zoom sends `endpoint.url_validation` events. The service calculates the HMAC hash using the configured webhook secret token and returns the `plainToken` / `encryptedToken` response before any tenant or meeting records are queried.
- **Tenant Connection Discovery:**
  - Upon receiving verified event payloads, `accountId` (external tenant ID) is extracted.
  - An authorized system operation under `AuthorizedSystemOperationType.PROVIDER_WEBHOOK` executes:
    ```typescript
    IntegrationConnectionModel.findOne({
      provider: 'ZOOM',
      externalTenantId: accountId,
      status: 'CONNECTED'
    })
      .setOptions({ authorizedSystemOperation: 'PROVIDER_WEBHOOK' })
      .select('_id tenantId status provider externalTenantId')
      .lean();
    ```
  - If no active connection matches the verified `accountId`, the webhook returns 404 or rejects without exposing database state.
- **Tenant Re-entry:**
  - Once `connection.tenantId` is resolved, all downstream mutations (`ExternalMeetingModel.updateOne`, `ZoomRecordingService.signalMeetingEnded`, `signalRecordingCompleted`) execute inside `tenantContextStorage.run({ currentTenantId: connection.tenantId })`.

### 2. Google Meet / Google Classroom Webhooks
- Handled through provider adapter subscriptions where incoming notifications contain state sync tokens.
- Mapped to tenant integration connections using verified subscription channel tokens stored at connection creation time.
- Privileged lookups are restricted to `_id tenantId provider status` projections with immediate tenant context re-entry.

---

## Negative Security Verifications
1. **Invalid or Missing Signature:** Webhook requests lacking valid signatures are rejected prior to any database queries (`UnauthorizedError`).
2. **Unknown External Tenant / Account ID:** Payloads referencing unknown `accountId` values return 404 with zero database mutation.
3. **Cross-Tenant Meeting Binding:** Payloads attempting to associate a Zoom meeting belonging to Tenant A with a connection belonging to Tenant B are rejected during tenant validation.

