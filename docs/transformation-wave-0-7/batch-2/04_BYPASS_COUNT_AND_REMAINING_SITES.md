# Bypass count and remaining sites

Batch 2 before: 33 production textual lines. After: 27. The authoritative machine-readable inventory is produced by:

```bash
node scripts/check-wave07-bypass.mjs --json
```

Newly protected module: `apps/api/src/services/notification.service.ts`. The static check also continues to protect all four Batch 1 worker modules.

Remaining raw-bypass domains are authentication/platform bootstrap, automation recovery, certificates and artifact handoff, finance gateway ownership lookup and reconciliation, provider webhook/Zoom recording processing, the internal finance route, and the branch migration script. These remain `PENDING`; none was classified as an approved exception in Batch 2.

