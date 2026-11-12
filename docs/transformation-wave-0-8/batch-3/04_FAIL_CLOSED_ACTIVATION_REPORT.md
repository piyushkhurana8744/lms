# Fail-closed activation report

VERIFIED for Course: missing/malformed context fails for find, update, delete, aggregate and create/validate; valid tenant operations remain isolated; legacy bypass and cross-tenant predicates remain rejected.

NOT GLOBAL: all other tenantIsolationPlugin models still accept missing context. Bootstrap, direct collection and population paths prevent safe global activation. Runtime tenant isolation is therefore PARTIAL and Wave 1 remains BLOCKED.
