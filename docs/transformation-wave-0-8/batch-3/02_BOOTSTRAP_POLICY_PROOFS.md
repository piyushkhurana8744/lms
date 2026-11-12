# Bootstrap policy proofs

Inventory confirms login uses context-free User discovery in auth.service.ts, authentication middleware resolves User before tenant middleware, and hostname resolution uses OrganizationDomain before tenant context. Session itself is platform-global and does not use the tenant plugin.

Dedicated login/domain policies were not completed in this batch. Therefore User and OrganizationDomain cannot safely join the fail-closed set yet. No fake SYSTEM/PLATFORM authority or fallback tenant was introduced.
