# Security Architecture Decision

Date: 2026-10-29. Decision status: partially implemented; Wave 1 remains blocked.

The approved target remains three explicit modes: TENANT for valid tenant workspace operations, PLATFORM for verified SuperAdmin operations with actor/reason/correlation, and SYSTEM for registered background/provider operation kinds with reason/correlation and optional resolved tenant ownership. Nested PLATFORM↔SYSTEM escalation is rejected.

`packages/database/src/authorizedExecutionContext.ts` implements the typed PLATFORM and SYSTEM primitives with AsyncLocalStorage, registered operation kinds, ObjectId validation and nested-mode rejection. It is intentionally not connected to the Mongoose bypass gate yet: enabling it before migrating all discovery paths caused legitimate worker/bootstrap fixtures to fail, so that unsafe half-state was removed.

No request parameter can directly activate these helpers. Callers must first establish trusted application authority. This primitive is necessary but not sufficient until every raw bypass is migrated and the plugin consumes the authorized context.
