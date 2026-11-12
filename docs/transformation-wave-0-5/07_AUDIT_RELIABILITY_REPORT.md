# Audit Reliability Report

`AuditService.logEvent` sanitizes metadata and writes through the caller's Mongo session when supplied. A session-backed failure is rethrown, preserving transaction atomicity. Without a session, every failure is logged and swallowed. Consequently security events can be lost, operator visibility depends on log collection, and retries/idempotency are absent. The observed lock warning is consistent with an audit write participating in transactional contention; it did not fail the corrected full Mongo run.

Security-critical events include impersonation start/stop, token-reuse detection, role/permission changes, tenant/context switching, security setting changes, and privileged exports. Ordinary page views and low-risk telemetry need not block user actions.

Required focused design:

- Add immutable `eventId`, `correlationId`, classification, and a unique idempotency key.
- Write critical events in the same transaction as the protected state change, or write a durable outbox record atomically and dispatch it with bounded retry/dead-letter handling.
- Emit a metric/alert on persistence failure and backlog age; logs alone are insufficient.
- Redact secrets/tokens/passwords before both persistence and failure logging.
- Test retry deduplication, redaction, transactional rollback, and observable terminal failure.

Impersonation currently creates a session before its best-effort audit write. Merely throwing on audit failure would leave an unaudited valid session, so a local `critical: true` flag is not a safe fix. The session and audit/outbox must be made atomic. This remains a Wave 1 blocker.
