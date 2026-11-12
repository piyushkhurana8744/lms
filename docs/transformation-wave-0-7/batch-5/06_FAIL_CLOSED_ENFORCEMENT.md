# Fail-closed enforcement status

Static raw-bypass enforcement scans all production API and worker TypeScript and reports zero sites. Approved SYSTEM, PLATFORM, and public-read options require their execution contexts.

Runtime enforcement is **not globally fail-closed**. The tenant plugin still permits `bypassTenantFilter`, permits tenant-model queries without valid workspace context, does not reject an explicit conflicting tenant predicate, does not validate aggregate public-read predicates, and does not cover every operation class such as replace/bulk paths.

A global flip was not made while legitimate bootstrap/public paths remain unresolved. Wave 1 is blocked until those paths have explicit policies and runtime tests prove missing context, conflicting predicates, aggregates, reads, writes, updates, and deletes fail closed.
