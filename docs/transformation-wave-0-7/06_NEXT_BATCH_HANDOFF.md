# Next batch handoff

Recommended Batch 2: migrate notification composition, delivery claims, internal notification routes, and finance outbox consumption together. They share queue identity and tenant re-entry requirements and currently account for several dense raw-bypass lines.

Then migrate finance reconciliation/webhook lookup, automation recovery, provider webhooks/Zoom recordings, artifact handoff, and finally verified PLATFORM authentication paths. Extend `security:check:wave07` only when each module has no raw bypass.

Do not globally reject legacy bypass until these pending domains and bootstrap/public verification paths are classified and tested.
