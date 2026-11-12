# Platform authorization status

Impersonation routes are authenticated and SuperAdmin-gated and pass the authenticated session ID into the service. The service checks revocation, expiry, nesting, active actor status, target status, and peer-SuperAdmin protection. Start/exit mutations and critical audit records share Mongo transactions.

The raw cross-tenant lookups were replaced with WeakSet-backed `PlatformAuthority` and an AsyncLocalStorage PLATFORM context carrying actor, reason, and correlation ID.

This boundary is improved but **not finally certified**: `issuePlatformAuthority(actorId)` can still be called independently of active-session verification, and the service's `originalSessionId` parameter remains optional for direct callers. A follow-up must make verified session proof mandatory at capability issuance and add missing/nonexistent/mismatched-session negative tests. Wave 1 remains blocked.
