# Security negative tests

- Missing and incorrect internal secrets do not issue authority.
- A forged object matching the public TypeScript shape is rejected by the process-local capability registry.
- SYSTEM context disappears after the asynchronous operation finishes.
- A nested tenant switch is rejected.
- Outbox's ten-way concurrent claim retains one winner.
- Integration HTTP coverage rejects cross-tenant class access and unauthorized roles.
- Queue consumers bind operation identifiers to tenant identifiers.

Focused evidence: `authorized-system-context.test.ts` passed 2/2. The corrected focused Mongo run passed 31/31 across worker claims, notification delivery, and integration HTTP suites.

