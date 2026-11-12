# Multi-Trainer Zoom Hosting: Existing Zoom Integration Audit

## Executive Summary

DIDM LMS currently possesses an active, production-grade Zoom integration covering meeting creation, rescheduling, cancellation, recording lifecycle synchronization, attendance evidence capture, and HMAC-SHA256 webhook validation.

However, prior to this implementation, the integration operated exclusively in a **single-account / single-host model**:
- Every Zoom meeting was created by issuing `POST https://api.zoom.us/v2/users/me/meetings` against the authorizing administrator's account.
- The LMS had no domain concept or database model linking LMS faculty trainers (`User` with role `INSTRUCTOR`) to their institute-managed Zoom accounts (`zoomUserId`, `zoomAccountId`, `licenseType`).
- Scheduling multiple online classes across different batches inevitably caused host collisions on the single admin account, preventing concurrent class execution and forcing instructors to either share admin credentials or rely on unauthenticated join links.

This audit documents the preexisting architecture, credentials, data models, and API interactions before implementing institute-managed multi-trainer Zoom hosting.

---

## 1. Existing Zoom Integration Inventory

### 1.1 Credential & OAuth Architecture
- **Model**: `IntegrationConnectionModel` (`packages/database/src/models/integrationConnection.model.ts`).
  - Stored fields: `tenantId`, `provider: 'ZOOM'`, `status`, `scopeType` (`TENANT` or `USER`), `externalAccountId`, `externalTenantId`, `encryptedCredentials`, `scopes`, `expiresAt`.
- **Encryption**: AES-256-GCM symmetric encryption via `SecretEncryptionService`. Plaintext structure contains:
  ```json
  {
    "accessToken": "ey...",
    "refreshToken": "...",
    "clientId": "...",
    "clientSecret": "...",
    "accountEmail": "admin@didm.in"
  }
  ```
- **Token Management**: `TokenManagerService` (`apps/api/src/services/integrations/security/tokenManager.service.ts`).
  - Implements single-flight in-memory promise caching for concurrent refresh requests.
  - Automatically refreshes tokens expiring within 5 minutes via `POST https://zoom.us/oauth/token` (`grant_type=refresh_token`).

### 1.2 Provider Adapter & API Contract
- **Contract**: `LiveMeetingProvider` in `apps/api/src/services/integrations/contracts/liveMeetingProvider.contract.ts`.
- **Implementation**: `ZoomAdapter` in `apps/api/src/services/integrations/adapters/zoom.adapter.ts`.
- **Capabilities**:
  - `supportsUpdate`: `true`
  - `supportsCancel`: `true`
  - `supportsParticipants`: `true` (via Zoom Report API `/report/meetings/{id}/participants`)
  - `supportsRecordings`: `true` (via Zoom Cloud Recording API `/meetings/{id}/recordings`)
  - `supportsTranscripts`: `false`
  - `supportsWebhooks`: `true` (HMAC-SHA256 signature verification)
- **Preexisting Meeting Creation Flaw**:
  ```ts
  // Line 52 in zoom.adapter.ts:
  const d = await this.request<any>(c, '/users/me/meetings', { method: 'POST', ... });
  ```
  Calling `/users/me/meetings` hardcodes the host to the owner of the OAuth token (`me`). In an enterprise or multi-instructor setup, Zoom API expects `POST /users/{userId}/meetings`, where `{userId}` is the specific Zoom User ID or verified email of the licensed instructor.

### 1.3 Batch and Class Data Model Associations
- **Batch Model (`IBatchDocument`)**:
  - `instructorId?: Types.ObjectId` (User reference).
  - `timing`: `{ startTime, endTime, timezone }`.
  - `mode`: `'ONLINE' | 'OFFLINE' | 'HYBRID'`.
  - `zoomDetails`: `{ meetingUrl, meetingId, passcode, hostUrl, instructions }`.
- **Class Model (`IClassDocument`)**:
  - `instructorId?: Types.ObjectId` (Specific class instructor override).
  - `batchId?: Types.ObjectId` (Parent batch reference).
  - `zoomDetails`: `{ meetingUrl, meetingId, passcode, hostUrl, autoRecord }`.
- **External Meeting Model (`IExternalMeetingDocument`)**:
  - Maps a canonical `Class` to an external provider meeting (`externalMeetingId`, `joinUrl`, `hostUrl`, `providerStatus`, `syncStatus`).

### 1.4 Webhook & Recording Security
- **Webhooks (`IntegrationWebhookService`)**:
  - Verifies Zoom signature using `x-zm-signature` and `x-zm-request-timestamp`.
  - Supports Zoom URL challenge validation (`endpoint.url_validation`).
  - Stores deduplicated events in `IntegrationWebhookEventModel`.
- **Cloud Recordings (`ZoomRecordingService`)**:
  - Synchronizes recordings upon meeting completion via `/meetings/{meetingId}/recordings`.
  - Tracks playback artifacts in `LiveClassRecordingModel`.

---

## 2. Identified Architecture Gaps

| # | Gap Area | Preexisting State | Impact |
|---|---|---|---|
| 1 | **Host Identification** | Single `/users/me` endpoint used for all meetings | All batch classes scheduled under one Zoom account; concurrent classes blocked by Zoom host limits. |
| 2 | **Trainer Account Mapping** | No mapping model between LMS `User` (`INSTRUCTOR`) and Zoom User ID | System cannot determine which Zoom account belongs to which trainer. |
| 3 | **License Verification** | No verification of Zoom license type (`Basic` vs `Licensed`) | Risk of scheduling classes under Basic free accounts (40-minute limit, no cloud recording). |
| 4 | **Host Assignment Resolution** | Class/Batch trainer ignored during meeting provisioning | SuperAdmin account burdened with all meetings; instructors cannot start meetings as native host. |
| 5 | **Trainer Reassignment** | Changing class instructor did not update Zoom host | Old instructor remained meeting host on Zoom; new instructor could not launch session. |
| 6 | **Conflict Detection** | No check for trainer overlapping Zoom sessions | Instructors could be double-booked across concurrent online batches. |

---

## 3. Preservation Invariants

In accordance with user instructions:
1. **Existing Zoom API credentials and OAuth secrets are fully preserved**.
2. **Existing webhook validation and HMAC verification remain untouched**.
3. **Existing recordings and attendance reporting logic are maintained**.
4. **Tenant isolation is strictly maintained across all new mapping tables**.

