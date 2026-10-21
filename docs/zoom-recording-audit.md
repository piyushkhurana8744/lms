# Zoom integration and recording audit

Audit date: 2026-10-17. This report distinguishes source/contract evidence from live Zoom certification.

## Gap matrix

| Feature | Existing implementation | Required / confirmed gap | Risk | Repair and verification |
|---|---|---|---|---|
| User-managed OAuth | Authorization-code flow, PKCE, encrypted refresh token, identity lookup | Deployment credentials and exact redirect remain operator-owned | High | Exact callback validation and contract tests; live consent is BLOCKED without credentials |
| Meeting CRUD | Phase 22 adapters and durable idempotent operations | Zoom 400 responses previously discarded provider code/message | High | Sanitized Zoom error mapping now retains status/code/correlation/retryability; contract test covers code 300 |
| Automatic recording | Create payload supported meetings but did not verify eligibility | Never request cloud recording when scope/policy is unverified | High | Capability check requires recording scope and reads `/users/me/settings`; create uses `auto_recording=cloud` only after READY |
| Recording lifecycle | `/recordings` fetched Zoom synchronously and returned provider URLs | No durable state, idempotency, retries, or availability distinction | Critical | `live_class_recordings` state/version model; webhook signals, BullMQ sync operation, scheduled reconciliation |
| Webhooks | Signed endpoint and event persistence existed | URL validation was answered before signature validation; meeting event lookup lacked owner binding | Critical | Raw-body HMAC, five-minute replay window, account-to-connection binding, duplicate key, tenant/connection meeting lookup |
| Recording sync | None | Webhooks must not transfer files; missing delivery must recover | Critical | Lightweight event creates durable operation; worker/reconciliation fetch metadata with bounded attempts/backoff |
| Private storage | Tenant R2/S3/Cloudinary/local abstraction exists | Upload contract requires an entire `Buffer`, unsafe for large videos | Critical | Production-safe provider-hosted mode implemented. LMS transfer remains BLOCKED pending streaming/multipart abstraction |
| Student playback | No durable library | Provider download/play URLs could be exposed by direct metadata response | Critical | Enrollment/tenant/branch authorization, sanitized DTO, audited HTTPS Zoom-only redirect, student library |
| Instructor controls | Meeting console existed | No recording status/retry and create did not request recording | Medium | Auto-record option, asynchronous status, errors, playback and authorized resync |
| Admin operations | Integration operations audit exists | No dedicated storage/retention dashboard | Medium | Recording operations appear in integration audit; dedicated quota/retention UI remains missing |
| Secrets | Tokens encrypted; start URL stored on external meeting | Generic class DTO exposed `zoomDetails`, including host URL/passcode | Critical | Generic DTO now omits host URL and passcode; host URL only leaves authorized join endpoint |
| Retention/deletion | No recording retention service | Provider deletion and LMS cleanup not defined | High | Documented as BLOCKED; do not delete production recordings until policy and API path are reviewed |
| Real provider E2E | No evidence artifact found | Mock/contract tests cannot certify Zoom behavior | Critical | Follow runbook certification with licensed synthetic account and public HTTPS endpoint |

## Confirmed historical failure causes

- OAuth error 4700: no reproducible live response is available in this checkout. The source shows exact redirect URI, public HTTPS, app activation/allow-list and OAuth app configuration are external prerequisites. Operator evidence is required to attribute a specific 4700 occurrence.
- Missing deployment credentials: provider readiness explicitly reports named missing server variables; values are never returned.
- Tunnel failures: Zoom callbacks/webhooks require an exact public HTTPS API URL. A frontend URL, changing tunnel hostname, callback-path mismatch, or stopped tunnel prevents completion.
- HTTP 400: contract reproduction confirms the prior adapter reduced Zoom errors to a generic status. The repaired adapter safely exposes Zoom code and sanitized message. A mocked code `300` invalid-timezone response is verified; the historical production payload is unavailable, so its exact root cause is not claimed.
- Generic UI messages: provider errors now carry safe actionable messages and correlation IDs through the standard API error envelope.

## Implemented architecture

`Class -> Zoom create(auto_recording=cloud) -> Zoom processes recording -> signed recording.completed webhook -> persisted event -> idempotent SYNC_RECORDING operation -> BullMQ worker -> Zoom recording manifest -> durable recording/files -> authorized LMS library -> audited Zoom-hosted playback`

`meeting.ended` only moves the record to `AWAITING_PROCESSING`. It never makes playback available. Duplicate webhook and queue delivery converge through unique provider meeting identity and deterministic operation keys. Reconciliation polls due retryable rows to recover missed webhooks and worker restarts.

## Security and remaining limitations

- Tenant, branch, assigned-instructor/admin and active-enrollment checks guard listing, retry and playback.
- Raw Zoom download URLs, OAuth tokens, start URLs and passcodes are not returned by recording/class DTOs.
- Provider-hosted playback is restricted to HTTPS Zoom domains and audited.
- File metadata supports MP4, M4A, transcript/caption and chat artifacts. Only provider-completed files make the recording available.
- Consent/notice is explicit in instructor UI and runbook, but institution-specific acceptance capture is not yet modeled.
- Recording-based viewing is not counted as live attendance.
- LMS-private transfer, quota accounting, retention deletion and checksum verification remain BLOCKED by the buffer-only storage contract and missing approved policy.

## Certification matrix

| Capability | Status | Evidence |
|---|---|---|
| ZOOM_OAUTH | BLOCKED | Contract-tested; no real credentials/consent evidence |
| ZOOM_MEETING_CREATE | BLOCKED | Adapter test/build pass; no live provider call |
| ZOOM_MEETING_UPDATE | BLOCKED | Contract adapter exists; no live provider call |
| ZOOM_MEETING_DELETE | BLOCKED | Contract adapter exists; no live provider call |
| ZOOM_CLOUD_RECORDING_CAPABILITY | BLOCKED | Scope/policy detection implemented; requires licensed host |
| ZOOM_AUTO_RECORDING_CONFIGURATION | PASS | Payload contract test proves explicit `cloud` setting after capability gate |
| ZOOM_RECORDING_WEBHOOK | PASS | Raw HMAC/replay/idempotency/account binding implemented; real delivery remains uncertified |
| ZOOM_RECORDING_METADATA_SYNC | PASS | Durable model, operation worker, retries and reconciliation implemented; provider contract mocked |
| ZOOM_RECORDING_DOWNLOAD | BLOCKED | Deliberately not implemented through unsafe buffer-only storage API |
| LMS_PRIVATE_STORAGE | BLOCKED | Existing adapter cannot safely stream large recordings |
| STUDENT_RECORDING_PLAYBACK | PASS | Enrollment-aware library and authorized provider-hosted playback route |
| RECORDING_ACCESS_CONTROL | PASS | Tenant/branch/enrollment/instructor checks and safe DTOs |
| RECORDING_RETRY_RECOVERY | PASS | Versioned state, bounded attempts, backoff, BullMQ recovery and reconciliation |
| RECORDING_RETENTION | FAIL | No approved retention/deletion implementation |
| ZOOM_REAL_PROVIDER_E2E | BLOCKED | No credentials, eligible test account, public endpoint or evidence supplied |
| OVERALL_ZOOM_RECORDING_READINESS | BLOCKED | Provider-hosted workflow is implemented but real Zoom certification and retention remain mandatory |
