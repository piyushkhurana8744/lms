# Domain bootstrap security

Added DOMAIN_RESOLUTION public policy requiring one exact normalized customDomain or platformSubdomain predicate and allowing only status as an additional predicate. Results project tenantId only. OrganizationDomain is fail-closed for ordinary missing-context access. Forwarded-host is no longer trusted directly and first-active-tenant fallback was removed.
