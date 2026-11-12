# Observability baseline

Available: structured logger, request method/path/status/duration, centralized error classification, audit records, health live/ready/summary endpoints, worker startup/shutdown and job failure logs, integration operation states/categories/attempts, BullMQ retries/backoff and worker heartbeat.

Gaps: no consistent request/correlation ID is added at ingress and propagated through domain event, queue job and provider operation; logs can include user IDs and email recipients; queue lag/dead-letter operational dashboards are absent; audit logging catches failures and allows the transaction to continue; health does not constitute end-to-end provider readiness.

Minimum next instrumentation: generate/redact a request ID, propagate it as correlation ID, log tenant/branch only as safe identifiers, add queue lag/failed-count health, alert on audit-write failures, and expose no token, credential, payment secret or student payload.
