# Authorized Context Implementation

Implemented primitives:

- `runAuthorizedPlatformOperation`: requires verified `isSuperAdmin`, actor ID, reason and correlation ID.
- `runAuthorizedSystemOperation`: accepts only registered operation kinds, requires reason/correlation, validates an optional tenant ID.
- Cross-mode nested escalation is rejected.

Registered kinds cover authentication bootstrap, worker claims, outbox/notification dispatch, finance webhook/reconciliation, automation recovery, integration workers/webhooks, Zoom recording webhooks, artifact handoff and public certificate verification.

Not yet implemented: TENANT-mode enforcement in the Mongoose plugin, ownership-minimized discovery helpers, and production call-site adoption. Until those land, the primitive provides no protection to existing raw `bypassTenantFilter` calls.
