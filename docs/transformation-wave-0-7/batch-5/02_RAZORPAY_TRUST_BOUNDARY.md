# Razorpay trust boundary

The route uses a 1 MiB-limited raw body and passes the exact Buffer to verification. A bounded provider identifier performs only an identifier-only routing lookup. That lookup is unauthenticated routing, not webhook authentication.

After routing, execution re-enters the tenant context, loads that tenant's secret, and verifies the signature before inbox or financial mutation. Public client errors collapse to `Webhook rejected`; the route is rate-limited and input fields are bounded.

The unsafe default internal secret was removed. A concurrent duplicate already in `PROCESSING` no longer re-enters finance processing; processed duplicates return idempotently and failed events may retry.

Focused deterministic evidence covers exact bytes, byte/whitespace changes, wrong and cross-tenant secrets, unknown IDs, repeated and 10-way concurrent delivery, and callback/reconciliation races. No live provider certification is claimed.
