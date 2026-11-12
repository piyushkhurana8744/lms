# Model policy register

Tenant-owned: every schema using tenantIsolationPlugin. Platform-global: Tenant and Session, with authenticated/bootstrap constraints. Public: certificate exact-code read only. Bootstrap: login User lookup, refresh/revocation Session lookup, hostname/domain resolution. SYSTEM discovery: outbox, notification intent, webhook inbox, worker leases, OAuth state, mutex, sequences and analytics/AI operational records.

The register is not complete at call-site/projection level; direct Model.collection and population inventory remains open.
