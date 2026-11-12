# Batch 3 handoff

Recommended Batch 3: finance reconciliation and the authenticated internal finance route, followed by certificate/receipt artifact handoff. These paths already use worker-secret authentication and tenant re-entry patterns but retain raw lookup/lease bypasses.

After finance/artifacts, migrate automation recovery, provider webhooks and Zoom recordings. PLATFORM authentication/bootstrap should be a dedicated batch with a verified-session authority adapter rather than restoring the old caller-provided boolean.

Continue extending `security:check:wave07` only when a production module is completely raw-bypass-free. Do not globally enable fail-closed behavior until bootstrap, public verification, webhook, and remaining worker paths are migrated.
