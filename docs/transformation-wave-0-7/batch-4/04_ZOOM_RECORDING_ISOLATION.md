# Zoom Recording Isolation & Synchronization Pipeline

## Overview
`ZoomRecordingService` (`apps/api/src/services/integrations/orchestration/zoomRecording.service.ts`) manages live class recordings, asynchronous download pipelines, transcoding, and tenant-isolated cloud storage uploads. In Wave 0.7 Batch 4, seven raw tenant bypass sites were eliminated across meeting signals, background job enqueuing, and sync workers.

---

## Architecture & Lifecycle

```
[Zoom Cloud] ─── Webhook (HMAC verified)
                     │
                     ▼
       IntegrationWebhookService
                     │
     Authorized Tenant Resolution (ZOOM_RECORDING_WEBHOOK)
                     │
                     ▼
       ZoomRecordingService.signalMeetingEnded / signalRecordingCompleted
                     │
         [tenantContextStorage.run]
                     │
                     ├─► ExternalMeetingModel (Update duration, timestamps)
                     ├─► LiveClassRecordingModel (Upsert recording metadata)
                     └─► IntegrationDispatcher.enqueuePendingIntegrationOperations
                                 │
                                 ▼
                     Background Sync Worker
                                 │
                     ZoomRecordingService.sync
                                 │
                     [tenantContextStorage.run]
                                 ├─► Download from Zoom CDN
                                 ├─► Upload to Tenant S3/R2 Bucket
                                 └─► LiveClassRecordingModel (status: COMPLETED)
```

---

## Detailed Migration of Sites

| Method | Previous Bypass Mechanism | Batch 4 Authorized Mechanism |
|---|---|---|
| `signalMeetingEnded` (Meeting lookup) | `ExternalMeetingModel.findOne(...).setOptions({ bypassTenantFilter: true })` | `AuthorizedSystemOperationType.ZOOM_RECORDING_WEBHOOK` selecting `_id tenantId`. Validates `expectedTenantId`. |
| `signalMeetingEnded` (Meeting update) | `ExternalMeetingModel.updateOne(...).setOptions({ bypassTenantFilter: true })` | Executed inside `tenantContextStorage.run` bound to meeting's `tenantId`. |
| `signalRecordingCompleted` (Meeting lookup) | `ExternalMeetingModel.findOne(...).setOptions({ bypassTenantFilter: true })` | `AuthorizedSystemOperationType.ZOOM_RECORDING_WEBHOOK` selecting `_id tenantId`. Validates `expectedTenantId`. |
| `signalRecordingCompleted` (Recording upsert) | `LiveClassRecordingModel.findOneAndUpdate(...).setOptions({ bypassTenantFilter: true })` | Executed inside `tenantContextStorage.run` bound to meeting's `tenantId`. |
| `enqueueSync` (Recording lookup) | `LiveClassRecordingModel.findById(...).setOptions({ bypassTenantFilter: true })` | Executed inside `tenantContextStorage.run` bound to caller or recording `tenantId`. |
| `sync` (Recording lookup) | `LiveClassRecordingModel.findById(...).setOptions({ bypassTenantFilter: true })` | Discovered under `ZOOM_RECORDING_WEBHOOK` with minimal projection `_id tenantId`. Validates `expectedTenantId`. |
| `sync` (Recording update) | `LiveClassRecordingModel.findByIdAndUpdate(...).setOptions({ bypassTenantFilter: true })` | Executed strictly inside `tenantContextStorage.run` bound to recording `tenantId`. |

---

## File Storage & Media Privacy
- Recording media files are downloaded using OAuth tokens scoped to the specific tenant's Zoom connection.
- Artifacts are stored under tenant-partitioned object paths (`tenants/<tenantId>/recordings/<recordingId>/...`).
- Cross-tenant recording access is prevented at query time by the Mongoose tenant isolation plugin.

