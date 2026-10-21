# External provider deployment and connection

This runbook activates the existing Google Classroom, Google Meet, Zoom, and Microsoft Teams adapters. An OAuth application configured on the API server is deployment setup; a DIDM connection is created only after an authorized user completes OAuth and DIDM retrieves that user's provider identity.

## Server configuration

Copy the placeholders below into the API service's secret manager or uncommitted `.env`. Never use `NEXT_PUBLIC_*` variables for these values.

```dotenv
API_PUBLIC_URL=https://api.example.edu
WEB_APP_URL=https://lms.example.edu
OAUTH_STATE_SECRET=<at-least-32-random-characters>
STORAGE_ENCRYPTION_KEY=<at-least-32-random-characters>

GOOGLE_OAUTH_CLIENT_ID=<google-web-client-id>
GOOGLE_OAUTH_CLIENT_SECRET=<google-web-client-secret>

ZOOM_OAUTH_CLIENT_ID=<zoom-user-oauth-client-id>
ZOOM_OAUTH_CLIENT_SECRET=<zoom-user-oauth-client-secret>
ZOOM_WEBHOOK_SECRET=<zoom-secret-token>
ZOOM_WEBHOOK_URL=<optional-explicit-zoom-webhook-url>
ZOOM_CALLBACK_URL=<optional-explicit-zoom-callback-url>

MICROSOFT_OAUTH_CLIENT_ID=<entra-application-client-id>
MICROSOFT_OAUTH_CLIENT_SECRET=<entra-client-secret-value>
```

Production URLs must be absolute HTTPS URLs. `WEB_APP_URL` is the post-callback destination and must be an allowed frontend origin. Keep API and web clocks synchronized because OAuth state expires after 15 minutes. Restart or redeploy the API after changing secrets, then refresh Admin → Settings → Integrations. `READY_TO_CONNECT` confirms local configuration only; click Connect and complete provider consent to create a real connection.

For local development, use `http://localhost:4000` and `http://localhost:3000` and register the localhost callbacks below. Provider webhooks cannot normally reach localhost. For Zoom webhook tests, use an operator-approved public HTTPS staging URL or authenticated tunnel and register that exact URL; never expose a developer machine without access controls.

## Google Classroom

- Console: [Google Cloud Console](https://console.cloud.google.com/apis/library/classroom.googleapis.com).
- Application: OAuth 2.0 Web application in a Google Cloud project; enable Google Classroom API and configure the OAuth consent screen.
- Callback: `${API_PUBLIC_URL}/api/v1/integrations/connections/google_classroom/callback`.
- Scopes: `openid`, `email`, `profile`, `classroom.courses`, `classroom.rosters`, `classroom.coursework.students`, and `classroom.profile.emails` (using their full `https://www.googleapis.com/auth/...` forms).
- Consent: add authorized test users while the app is in Testing. Publishing, sensitive-scope verification, Workspace admin policy, and domain restrictions may apply in production. The connecting identity needs the relevant Classroom teacher/admin roles.
- Verify: after Connect returns to DIDM, confirm the account and `CONNECTED`, use Verify Connection (a one-course list), then use Academic → Classroom Sync to list and link a dedicated test course. Grade writes must be explicitly authorized and limited to a dedicated test course.

The selected scopes cover the adapter's course creation, roster management, coursework/submission reads, and grade patch. Removing a required grant results in `MISSING_SCOPE`; revoked or unrefreshable credentials result in reconnect/error state. Official reference: [Classroom OAuth scopes](https://developers.google.com/workspace/classroom/guides/auth).

## Google Meet

- Console: [Google Cloud Console](https://console.cloud.google.com/apis/library/meet.googleapis.com); the same Google Web OAuth client may be reused if both callbacks and both scope sets are configured.
- Application/API: OAuth 2.0 Web application; enable Google Meet REST API.
- Callback: `${API_PUBLIC_URL}/api/v1/integrations/connections/google_meet/callback`.
- Scopes: `openid`, `email`, `profile`, `meetings.space.created`, `meetings.space.readonly`, and `meetings.space.settings` (full Google scope URIs).
- Consent: authorize a Workspace organizer permitted to create Meet spaces; tenant licensing and Workspace policy still govern features and artifacts.
- Verify: connect, run Verify Connection, then create a dedicated class meeting and retrieve its real space/meeting URI. DIDM owns scheduling. The adapter only ends an active conference; it does not invent a Meet delete or scheduling API.

Official reference: [Meet authentication and scopes](https://developers.google.com/workspace/meet/api/guides/authenticate-authorize).

## Zoom

- Console: [Zoom App Marketplace build flow](https://marketplace.zoom.us/develop/create).
- Application: user-managed General/OAuth app, not Server-to-Server OAuth, because DIDM connects a human host account.
- Callback/allow list: `${API_PUBLIC_URL}/api/v1/integrations/connections/zoom/callback`.
- Webhook endpoint: `${API_PUBLIC_URL}/api/v1/integrations/webhooks/zoom`; configure the Zoom secret token as `ZOOM_WEBHOOK_SECRET` and subscribe only to events used by the deployment.
- Webhook events: subscribe to `meeting.ended` and `recording.completed`. DIDM treats the first only as an asynchronous processing signal; playback is not exposed until recording metadata reports a completed file.
- Capabilities/scopes: user identity; create/read/update/delete the authorized user's meetings; past participant report; and recording metadata. Existing classic apps commonly use `user:read`, `meeting:read`, `meeting:write`, `report:read:admin`, and `recording:read`. New apps should select the endpoint-specific granular equivalents shown by Zoom's build flow (for example meeting create/read/update/delete and past participants) rather than adding unrelated account-wide access.
- Recording prerequisites: the connected host must be licensed on Zoom Pro or higher (or another plan that includes cloud recording), Cloud recording must be enabled by the account administrator and for the host, the app must have recording-read consent, and institutional notice/consent rules must be satisfied. DIDM never falls back to local recording.
- Consent: activate the app for local testing and allow the intended Zoom account users. Publishing/security review is required for broader external distribution. Report access can require an account admin role and suitable plan.
- Verify: connect, confirm the identity, then create/get/update/delete a dedicated test meeting. Confirm the student payload contains `join_url` only; `start_url` is returned only to an authorized instructor/admin and is not persisted as a credential.
- Recording delivery: the current production-safe mode is `PROVIDER_HOSTED`. DIDM stores lifecycle and file metadata, hides Zoom download URLs, re-authorizes every playback request using tenant/branch/enrollment rules, audits access, and redirects to an HTTPS `zoom.us` playback page. `LMS_PRIVATE_STORAGE` remains blocked until the storage abstraction supports bounded streaming/multipart uploads; the existing buffer-only upload API must not be used for large recordings.

### Zoom recording certification

1. Use a dedicated licensed Zoom host and synthetic participants; never use a real student recording.
2. Confirm Cloud recording is enabled in Zoom account and user settings and the OAuth grant contains meeting and recording-read scopes.
3. Apply the Phase 22 indexes with `pnpm --filter @edtech/api migrate:phase22-indexes`.
4. Configure the signed public HTTPS webhook and validate the endpoint in Zoom Marketplace.
5. Create a dedicated DIDM class with automatic cloud recording enabled. Verify Zoom receives `settings.auto_recording=cloud`; this requests recording but does not prove recording started.
6. Start and end the meeting, confirm the recording notice, then wait for Zoom processing.
7. Confirm a signed `recording.completed` delivery and a `SYNC_RECORDING` operation. The recording should move through processing to `AVAILABLE_AT_PROVIDER` without duplicate rows or files.
8. Verify the assigned instructor, tenant admin, and an actively enrolled student can use the authorized playback route. Verify a user from another tenant/branch or without active enrollment receives a denial.
9. Disable or revoke Zoom temporarily and verify retry/reconnect guidance is visible; restore it and use the authorized retry route.
10. Record evidence for retention/deletion separately. Provider-hosted retention remains governed by Zoom until DIDM implements a reviewed deletion policy.

Official references: [Create a Zoom OAuth app](https://developers.zoom.us/docs/integrations/create/) and [Zoom OAuth scopes](https://developers.zoom.us/docs/integrations/oauth-scopes-overview/).

### Zoom local development through an HTTPS tunnel

Zoom must redirect to the Express API callback, not to the Next.js frontend. The API may keep listening locally on its configured `PORT` (normally `4000`) while an HTTPS tunnel forwards to that port.

1. Start the Express API and note its actual configured port.
2. Start an operator-approved HTTPS tunnel to that API port (for example, `ngrok http 4000`).
3. Copy the stable HTTPS tunnel origin; do not include a path or trailing callback segment.
4. Set `API_PUBLIC_URL=https://YOUR-STABLE-NGROK-DOMAIN.ngrok-free.app`.
5. Keep `WEB_APP_URL=http://localhost:3000` when the Next.js frontend is local.
6. Restart the API so the new environment is loaded, then refresh Admin → Settings → Integrations.
7. Copy the exact OAuth callback displayed on the Zoom card into the Zoom app's Development OAuth Redirect URL (or equivalent setting).
8. Add the same callback/origin to Zoom's OAuth allow list where the current app-builder interface requires it.
9. Configure the separate webhook Event Subscription endpoint and its Secret Token.
10. Keep the tunnel running and initiate Connect Zoom from the DIDM LMS Admin Integrations page.

Example values:

```text
OAuth Redirect URL:
https://YOUR-TUNNEL-DOMAIN/api/v1/integrations/connections/zoom/callback

Webhook Endpoint:
https://YOUR-TUNNEL-DOMAIN/api/v1/integrations/webhooks/zoom
```

These Zoom settings are distinct and are not interchangeable:

- **OAuth Redirect URL** is where Zoom returns the authorization code. It must exactly match the `redirect_uri` in both authorization and token exchange.
- **OAuth Allow List** limits permitted redirect origins/URLs; Zoom app-builder labels vary, so use the equivalent redirect allow-list field shown for the app type.
- **Event Subscription Endpoint URL** receives signed webhook events and uses the webhook path above, not the OAuth callback path.
- **OAuth Client Secret** authenticates authorization-code/token operations and belongs in `ZOOM_OAUTH_CLIENT_SECRET`.
- **Webhook Secret Token** verifies webhook requests and belongs in `ZOOM_WEBHOOK_SECRET`.

If the tunnel hostname changes, update `API_PUBLIC_URL`, restart the API, and update every matching Zoom redirect/allow-list/webhook setting. The callback registered in Zoom must exactly match the URL displayed by DIDM LMS. The tunnel must remain running throughout OAuth and webhook testing. The local frontend and tunneled API intentionally have different origins; browser login cookies are used only to initiate OAuth, while the callback is protected by signed, expiring, single-use state and PKCE and does not depend on an API cookie. Keep local CORS configured for the frontend origin. Public tunnels should expose only the necessary development API and must not be treated as production infrastructure.

## Microsoft Teams

- Console: [Microsoft Entra admin center](https://entra.microsoft.com/) → App registrations.
- Application: multitenant or single-tenant Web app, as appropriate for the institution, using delegated permissions and the organizational (`organizations`) authorization endpoint.
- Callback: `${API_PUBLIC_URL}/api/v1/integrations/connections/microsoft_teams/callback`.
- Delegated permissions: `openid`, `profile`, `email`, `offline_access`, `User.Read`, `OnlineMeetings.ReadWrite`, and `OnlineMeetingArtifact.Read.All`. Grant tenant admin consent where Entra marks it required.
- Consent: connect a licensed work/school organizer permitted by Teams and tenant meeting policy. This implementation deliberately calls delegated `/me/onlineMeetings`; it does not switch to application permissions.
- Verify: connect, run Verify Connection (`GET /me`), then create/get/update/delete a dedicated standalone `onlineMeeting` and confirm its real `joinWebUrl`.

A standalone Graph `onlineMeeting` does not create an Outlook calendar event. Calendar-backed meetings require a separately scoped Microsoft Graph calendar-event enhancement. Official references: [Create onlineMeeting](https://learn.microsoft.com/graph/api/application-post-onlinemeetings) and [Graph permissions](https://learn.microsoft.com/graph/permissions-reference).

## Status and live-test rules

- `DEPLOYMENT_NOT_CONFIGURED`: one or more named server variables are absent.
- `INVALID_CONFIGURATION`: URLs, HTTPS requirements, or minimum secret lengths are invalid.
- `READY_TO_CONNECT`: server configuration passes local checks; no provider user has necessarily authorized yet.
- `CONNECTED`: a real token exchange and identity lookup succeeded and the required returned scopes are present.
- `MISSING_SCOPE`, `RECONNECT_REQUIRED`, `EXPIRED`, `DISCONNECTED`, and `ERROR`: connection-level states; follow the displayed action and provider policy.

Live certification requires authorized test accounts and recorded results for identity, create/retrieve/update or sync, cancellation, join/access, and recovery. Deterministic adapters and mocked tests are regression evidence only and must never be reported as real-provider evidence.
