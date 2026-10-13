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
- Capabilities/scopes: user identity; create/read/update/delete the authorized user's meetings; past participant report; and recording metadata. Existing classic apps commonly use `user:read`, `meeting:read`, `meeting:write`, `report:read:admin`, and `recording:read`. New apps should select the endpoint-specific granular equivalents shown by Zoom's build flow (for example meeting create/read/update/delete and past participants) rather than adding unrelated account-wide access.
- Consent: activate the app for local testing and allow the intended Zoom account users. Publishing/security review is required for broader external distribution. Report access can require an account admin role and suitable plan.
- Verify: connect, confirm the identity, then create/get/update/delete a dedicated test meeting. Confirm the student payload contains `join_url` only; `start_url` is returned only to an authorized instructor/admin and is not persisted as a credential.

Official references: [Create a Zoom OAuth app](https://developers.zoom.us/docs/integrations/create/) and [Zoom OAuth scopes](https://developers.zoom.us/docs/integrations/oauth-scopes-overview/).

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
