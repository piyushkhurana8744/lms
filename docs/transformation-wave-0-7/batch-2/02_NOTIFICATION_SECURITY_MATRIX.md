# Notification security matrix

| Path | Authentication | Tenant proof | Processing scope | Negative evidence |
|---|---|---|---|---|
| Domain composition | Existing workspace context | Intent tenant must equal workspace tenant | TENANT | Cross-tenant recipient denied |
| Intent worker consumption | Opaque SYSTEM capability | Queue/header tenant equals persisted binding | Identifier discovery, then TENANT | Missing/invalid secret and mismatched tenant denied |
| Delivery claim | Opaque SYSTEM capability | Queue/header tenant equals delivery binding | Atomic TENANT CAS | Concurrent claim delivers once |
| Delivery content/provider reads | Claimed delivery authority | Notification, recipient, settings share tenant | TENANT | Cross-tenant finalization denied |
| Retry/recovery | Same capability and binding | Persisted delivery tenant | TENANT | Expired lease recovers; five-attempt bound preserved |

Error responses do not expose recipient email or provider credentials.

