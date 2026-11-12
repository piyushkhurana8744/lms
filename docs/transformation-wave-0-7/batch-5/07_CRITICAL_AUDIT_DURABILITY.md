# Critical audit durability status

Verified evidence exists for impersonation start and exit: the session mutation and critical audit insert share a Mongo transaction; audit failure is rethrown and rolls back that transaction. Audit metadata passes through secret sanitization and records event, correlation, and idempotency identifiers.

Existing asynchronous finance, notification, integration, and automation paths use durable outbox/inbox records with identifiers, leases, retries, and dead-letter states, and the Redis proof harness passed nine recovery stages.

This is **not a repository-wide certification**. A complete inventory of critical security mutations, operator-visible persistence failures, dead-letter visibility, secret-redaction cases, and injected audit/outbox persistence failures was not completed. Exception propagation alone is not treated as durability. This remains a Wave 1 blocker.
