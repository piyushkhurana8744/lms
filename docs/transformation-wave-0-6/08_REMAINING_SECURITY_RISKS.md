# Remaining Security Risks

Critical blockers:

1. Missing workspace context still permits unscoped tenant-model queries.
2. Forty-five production raw bypass occurrences remain outside authorized execution helpers.
3. Update/delete/aggregate conflict enforcement is incomplete.
4. Most critical audit categories beyond impersonation are not yet guaranteed atomic or durably queued.
5. Audit retry, dead-letter, backlog and alerting infrastructure is absent.

The new authorized-context primitive is not a security boundary until the plugin enforces it. The current implementation must not be described as tenant-isolation certification.
