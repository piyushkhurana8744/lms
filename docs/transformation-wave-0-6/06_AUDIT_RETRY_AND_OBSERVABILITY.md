# Audit Retry and Observability

Critical impersonation events do not require asynchronous retry because protected state and audit persistence are atomic in Mongo. Duplicate prevention is provided by unique idempotency keys.

No general durable audit dispatch queue, bounded exponential retry, dead-letter state, backlog metric or terminal-failure alert was added. Ordinary non-transactional `AuditService.logEvent` writes remain best-effort unless `critical` or a Mongo session is supplied. Critical callers now throw on failure; ordinary telemetry behavior is unchanged.

This closes the unaudited impersonation-session flaw but not the broader audit recovery/observability requirement.
