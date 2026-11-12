# Bypass Migration Register

Fresh production TypeScript count: 45 textual sites, unchanged from Wave 0.5. None is represented as migrated merely because the authorization primitive exists.

| Domain | Current disposition |
|---|---|
| Authentication/impersonation | Raw bypass remains; impersonation audit/state is now atomic |
| Workers, claims, leases | Awaiting SYSTEM wrapper and tenant re-entry |
| Outbox/notifications | Awaiting SYSTEM wrapper and tenant re-entry |
| Finance/webhooks | Awaiting signed-identifier discovery wrapper and collision tests |
| Automation recovery | Awaiting registered recovery wrapper |
| Provider/Zoom webhooks | Awaiting signature-first ownership resolver |
| Certificate/receipt artifacts | Awaiting minimum identifier+tenant handoff wrapper |
| Public verification | Awaiting explicit public policy and response-minimization enforcement |

Static rejection of new raw bypass is not enabled because existing production sites have not been migrated. This remains a blocker, not an accepted exception.
