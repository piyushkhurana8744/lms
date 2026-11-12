# Tenant and branch security audit

Positive evidence: integration suites deny cross-tenant communication, certificate, analytics, class join and branch access; deny cross-branch resources; enforce student ownership and instructor assignment; and audit Super Admin impersonation reasons/lifecycle.

`rg` found 136 textual `bypassTenantFilter` uses, including tests and generated JavaScript. Production uses cluster around internal workers, automation claims/recovery, notification dispatch, public certificate verification, payment/integration webhooks, recording sync, artifacts, migrations and impersonation. Most include tenant discovery followed by tenant-context execution or explicit tenant predicates, but each remains privileged code.

Critical architectural risk: `tenantIsolationPlugin` is fail-open when workspace context is absent. It adds no predicate rather than throwing. A globally changing fix could break legitimate platform/worker/public paths, so Wave 0 did not alter it. Required gate: repositories for tenant-owned models must require either valid tenant context or a typed, audited privileged execution reason.

Additional risks: worker-wide claims legitimately scan tenants but need correlation/audit; public certificate verification bypasses tenant by verification code and must retain a minimal DTO; webhook connection discovery bypasses tenant and depends on provider identity/signature; audit writes currently fail open.

No confirmed cross-tenant data exposure was reproduced. Security certification remains incomplete until every production bypass call is classified and missing-context negative tests cover exports, aggregates, callbacks and workers.
