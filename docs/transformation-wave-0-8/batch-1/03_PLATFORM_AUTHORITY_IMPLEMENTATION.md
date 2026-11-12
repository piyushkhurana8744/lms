# Platform authority implementation

No final PLATFORM change was made in this partial batch. Existing WeakSet capabilities reject forged objects and impersonation routes pass authenticated session IDs, but capability issuance remains separable from active-session verification and the service accepts optional session proof.

BLOCKED requirement: replace issuance with a server-side adapter that verifies session identity, expiry, revocation, SuperAdmin status/permission, and binds actor/session/reason/correlation before minting the process-local capability. Add tenant/branch-admin and missing/mismatched-session real-Mongo negatives.
