# Fail-closed plugin implementation

Implemented runtime hardening:

- rejects `bypassTenantFilter` and `__bypassTenantIsolation`;
- rejects conflicting tenant predicates, including nested operators;
- rejects tenant identity mutation and pipeline updates;
- covers find/delete/update/distinct/findOneAndDelete/replace hooks;
- rejects lookup, union, graph lookup, out, and merge aggregation stages;
- validates aggregate match predicates and injects the tenant match;
- protects document save tenant identity;
- shares AsyncLocalStorage through a process-global symbol so source/dist module copies cannot split request context.

PARTIAL: missing or malformed context still falls through. InsertMany, bulkWrite, population, all non-plugin tenant-bearing models, discriminators, and every bootstrap exception remain unclosed.
