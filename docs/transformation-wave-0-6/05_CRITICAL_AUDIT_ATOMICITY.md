# Critical Audit Atomicity

Impersonation start now creates the privileged session and `SUPERADMIN_IMPERSONATION_STARTED` audit record in the same Mongo transaction. Exit now compare-and-set revokes the impersonation session, creates the restored SuperAdmin session and writes `SUPERADMIN_IMPERSONATION_ENDED` in one transaction. Any mandatory audit failure aborts the state transition.

Audit records now include event ID, correlation ID, classification and unique idempotency key. Impersonation supplies stable operation-derived idempotency keys and is classified SECURITY_CRITICAL. Metadata still passes through `sanitizeData`.

Evidence: focused real-Mongo impersonation HTTP suite passed 19/19; mocked service suite passed 11/11; full Mongo suite passed 1,042 with five intentional skips; four-viewport browser impersonation flow passed in the 36/36 E2E run.

Remaining scope: role/permission changes, token reuse, security configuration and privileged exports have not all been converted to mandatory transactional audit writes.
