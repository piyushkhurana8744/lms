# Bypass migration progress

Wave 0.6 reported 45 production textual sites. The current scoped inventory reports 33: `node scripts/check-wave07-bypass.mjs --json`. That JSON output contains one record per remaining production line plus explicit migrated records and is the machine-readable inventory for this batch.

Migrated behavior includes outbox recipient lookup, notification delivery discovery, integration recording/operation discovery, integration lease recovery, worker ownership verification/finalization, and internal integration operation/class resolution. These paths now use an issued SYSTEM capability, identifier-only discovery, explicit tenant binding, or TENANT re-entry.

Remaining domains are finance reconciliation/webhooks, notification composition/delivery internals, automation recovery, authentication bootstrap/impersonation lookup, certificate/artifact handoff, provider webhooks and Zoom recording processing. They remain `PENDING`; there are no `APPROVED_EXCEPTION` classifications in Batch 1.

`pnpm security:check:wave07` prevents raw bypass from returning to the four fully migrated worker modules.

