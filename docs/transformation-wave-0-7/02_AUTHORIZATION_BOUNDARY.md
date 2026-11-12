# Authorization boundary

`authorizeInternalSystemCaller` performs a timing-safe comparison against the server-side `INTERNAL_WORKER_SECRET`, then issues an opaque object registered in a module-private `WeakSet`. A structural lookalike cannot activate SYSTEM execution. `runAuthorizedSystemOperation` accepts only an issued capability, a registered operation kind, a reason, and a correlation ID.

The capability is created at worker bootstrap or after internal HTTP credential verification. Public request data cannot select the mode or kind. `AsyncLocalStorage.run` contains authority to the operation and removes it after completion. Nested execution cannot change mode or switch an already-bound tenant.

The Mongoose plugin's `authorizedSystemOperation` option checks the active operation kind and, for tenant-bound operations, the query tenant. It is deliberately separate from legacy raw bypass. PLATFORM execution was removed as a caller-selectable boolean API; it will return only with a verified-session adapter in its migration batch.

