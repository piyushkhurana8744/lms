# Remaining security gaps

BLOCKED:

1. Missing/malformed tenant context remains fail-open.
2. InsertMany, bulkWrite, population and some alternative write paths lack proof.
3. Non-plugin tenant-bearing/system models require finalized policy registration.
4. PLATFORM issuance is not inseparable from verified session proof.
5. Full negative matrix and full regression are incomplete.
6. Critical audit durability remains a separate readiness gate.

Wave 1 remains blocked.
