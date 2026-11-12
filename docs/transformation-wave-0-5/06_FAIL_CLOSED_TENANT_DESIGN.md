# Fail-Closed Tenant Design

## Finding

`tenantIsolationPlugin` currently adds a tenant predicate only when valid workspace context exists. With missing or invalid context it silently executes the original query. Raw `bypassTenantFilter` also skips filtering without proving caller authority. A global fail-closed flip cannot be made safely in this wave: login/session bootstrap, public credential verification, provider webhooks, worker claims, artifact handoffs, and SuperAdmin operations intentionally begin without ordinary tenant request context.

## Proposed decision

Adopt three explicit modes:

1. `TENANT`: requires a valid ObjectId tenant and injects/validates the predicate.
2. `PLATFORM`: requires authenticated SuperAdmin/platform capability and a correlation/reason record.
3. `SYSTEM`: requires a typed operation kind; global discovery may return only identifiers plus tenant ID, after which processing re-enters `TENANT` mode.

The plugin should throw `TenantContextMissingError` by default for tenant models. Raw `bypassTenantFilter` should become private/forbidden by lint and code review. Bootstrap/public models need an explicit model policy, not an implicit absence of context. Aggregations must reject a conflicting initial tenant match. Webhooks must authenticate first, resolve one owned connection, and re-enter tenant context. Worker queues must carry tenant ID and correlation ID.

## Required regression matrix

- Missing and malformed context fail.
- A query cannot override the active tenant.
- Unauthorized platform/system mode fails.
- Valid tenant, authorized SuperAdmin, webhook ownership, and worker claim paths succeed.
- Transactions retain context; exports and aggregations remain scoped.

## Decision status

Approval and a staged migration of 45 production call sites are required. No unsafe global behavior change was introduced. Because silent unscoped behavior remains possible, this is a Wave 1 blocker.
