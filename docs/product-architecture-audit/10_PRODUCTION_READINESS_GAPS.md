# Production readiness gaps

## Verification record

- `pnpm build`: PASS, 10/10 workspaces, Next 14.2.35 generated 92 routes.
- `pnpm test`: PASS, 46 files / 774 tests; 41 files / 358 tests skipped.
- Browser/Playwright: NOT RUN in this audit; a running seeded environment and safe persona credentials were not established.
- Real Zoom/Meet/Teams/Classroom, Razorpay, email, DNS and cloud storage: NOT VERIFIED.

## Security and isolation

Strengths: live session lookup, HttpOnly cookie/bearer support, permissions rebuilt from membership, Helmet/CORS/rate limiting, tenant context, granular RBAC, audit service and secret encryption. Gaps: prove every aggregate/export and worker path under tenant and branch isolation; enumerate all `bypassTenantFilter` use; test IDOR/own-resource rules; rotate and manage internal-worker secret; validate webhook replay/signatures; certify impersonation audit and exit behavior.

The tenant plugin only adds a filter when valid context exists. A missing context is therefore fail-open at the model-plugin layer. The application relies on authenticated middleware/service discipline; add fail-closed repository invariants or explicit platform-context requirements where feasible.

## Data correctness and jobs

Run the skipped Mongo/Redis suites in CI, including transactions, idempotency, outbox retries, notification recovery, finance reconciliation, integration operations and branch transfers. Define dead-letter handling, dashboards, retention, reconciliation runbooks and restore tests. Confirm indexes and migration execution (`migratePhase18BranchAccess`, `migratePhase22IntegrationIndexes`).

## External readiness

Provider adapters and deterministic contracts are not certification. Test OAuth consent/revocation, scope loss, token refresh, rate limits, webhook replay/out-of-order delivery, meeting reschedule/cancel, recording delay/deletion, gateway signature/refund states, email bounce, storage credential expiry and custom-domain DNS/SSL.

## Performance and operations

Add load budgets for dashboards, analytics, exports, public catalog, class join and large rosters. Instrument request/job correlation IDs, queue lag, provider latency/error categories, tenant/branch dimensions without leaking PII, alert thresholds and SLOs. Establish backup/restore, retention/deletion, vulnerability/dependency scans and browser compatibility matrix.

## UX/accessibility

Run keyboard/screen-reader/contrast testing, 375/430/768/1440 responsive passes, slow network and offline/error states. Validate notification deep links, breadcrumb/back behavior, empty states and expired sessions for all personas.

Production approval requires evidence across code correctness, workflow completeness, UI usability, real-provider behavior and deployment operations; a green build alone satisfies only the first category.
