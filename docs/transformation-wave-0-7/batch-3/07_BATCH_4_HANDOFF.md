# Batch 4 Handoff & Recommendations

## Recommended Scope for Wave 0.7 Batch 4
Batch 3 successfully closed all bypasses in finance reconciliation, internal finance routes, receipt artifact generation, and certificate artifact generation.

The recommended target domains for Batch 4 are:

### 1. Automation Service & Recovery (`apps/api/src/services/automation.service.ts`)
- **Current State:** 5 raw bypass sites (lines 75, 93, 98, 101, 118).
- **Functionality:** Automation execution scheduling, atomic job claims, execution logs, and lease expiry recovery.
- **Migration Strategy:**
  - Introduce `AuthorizedSystemOperationType.AUTOMATION_DISPATCH`.
  - Perform identifier-only query for candidate automations with tenant ID.
  - Re-enter tenant context with `tenantContextStorage.run` for atomic execution state transitions.
  - Protect `automation.service.ts` in `scripts/check-wave07-bypass.mjs`.

### 2. External Provider Webhooks (`integrationWebhook.service.ts` & `zoomRecording.service.ts`)
- **Current State:** 2 sites in `integrationWebhook.service.ts` (lines 65, 121); 7 sites in `zoomRecording.service.ts` (lines 49, 55, 61, 67, 83, 87, 89).
- **Functionality:** Ingesting external webhooks where incoming payloads reference provider accounts, meetings, or external IDs rather than DIDM tenant IDs.
- **Migration Strategy:**
  - Introduce `AuthorizedSystemOperationType.INTEGRATION_WEBHOOK_RESOLVE`.
  - Minimal identifier lookup resolving provider account ID -> DIDM `tenantId`.
  - Enter tenant context immediately before processing recording metadata, student attendees, or meeting details.
  - Protect both services in static enforcement.

### 3. Payment Gateway Webhook Resolution (`apps/api/src/services/finance.service.ts`)
- **Current State:** 2 sites in `finance.service.ts` (lines 254, 256).
- **Functionality:** Resolving order/payment records from Razorpay webhook events to locate tenant ownership.
- **Migration Strategy:**
  - Wrap order lookup in `AuthorizedSystemOperationType.WEBHOOK_DISCOVERY` selecting only `_id` and `tenantId`.
  - Enter tenant context and execute standard signature verification and state reconciliation.

### 4. Platform Impersonation & Bootstrap (`auth.service.ts`)
- **Current State:** 3 sites (lines 368, 376, 536).
- **Recommendation:** Handle in a dedicated final batch with verified superadmin session tokens, preventing arbitrary unconstrained caller bypasses.

