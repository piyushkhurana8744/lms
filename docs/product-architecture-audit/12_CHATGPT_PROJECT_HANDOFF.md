# DIDM LMS — AI architect project handoff

## Product and users

DIDM LMS is a multi-tenant education operating system for organizations and branches that market courses, convert leads, enroll students, collect fees, author learning, schedule and deliver classes, assess outcomes, communicate and report. The canonical system roles are SUPER_ADMIN, TENANT_ADMIN, BRANCH_ADMIN, INSTRUCTOR and STUDENT; tenants may add custom roles/permissions.

## Repository and stack

`apps/web` is Next.js 14.2.35 App Router with React 18, TanStack Query, Tailwind/CSS tokens and three authenticated shells. `apps/api` is Express 4.21 with Mongoose 8.10, JWT/cookie sessions, Zod, Socket.IO dependencies, security middleware and versioned `/api/v1` routes. `apps/worker` uses BullMQ/Redis for outbox, notification, finance and integration processing. Shared packages provide config, database/models, permissions, types, UI, utilities and validation. MongoDB 7 and Redis 7.2 are the documented infrastructure targets; Dockerfiles, compose and nginx deployment material exist.

## Architecture boundaries

Frontend routes are physical `apps/web/src/app/**/page.tsx` files; 92 routes build. Navigation is centralized in `apps/web/src/config/navigation.ts`. API composition is in `apps/api/src/routes/v1/index.ts`, controllers are thin adapters, services hold domain rules, and more than 70 Mongoose models live in `packages/database/src/models`. Background orchestration uses OutboxEvent/IntegrationOperation/NotificationIntent records and internal worker endpoints protected by a shared secret.

Authentication verifies JWT and live Session, loads User and active OrganizationMember, combines system and custom-role permissions, and sets tenant workspace context. API RBAC uses `requirePermission`; UI navigation uses the same constants. Tenant isolation is implemented by AsyncLocalStorage workspace context plus a Mongoose query/aggregate plugin. Branch isolation is additional domain scope through branch access services. Never weaken either to solve UX.

Important security constraint: the tenant plugin only injects a tenant predicate when a valid context exists and allows explicit bypass. Treat missing context and every `bypassTenantFilter` call as high-risk. Platform operations, background jobs, exports and aggregates require dedicated cross-tenant tests.

## Modules and maturity

Implemented domains: authentication/sessions; tenants/platform/impersonation; branches; organization members/roles; onboarding/settings/branding/domain/email/storage/website; CMS/public site; media; courses/publishing; modules/lessons; enrollment/progress; batches; academic calendar/rooms/timetable; classes; attendance; assessments/submissions/grading; certificates; CRM/leads/follow-ups/admissions; student lifecycle; finance/payments/refunds/receipts; notifications; communications; automations; analytics/exports; AI backend; Google Classroom; Zoom/Meet/Teams orchestration; recordings; provider-neutral storage.

Maturity must not be summarized as “complete.” The 2026-10-28 baseline produced:

- `pnpm build`: 10/10 workspaces passed; 92 Next routes.
- `pnpm test`: 774 passed, 358 skipped (46 passing files, 41 skipped files).
- Passing evidence includes security, permission navigation, route integrity, domain/unit, publishing, learning, certificate credentials, provider contracts and organization configuration.
- Skipped evidence includes most Mongo/Redis/HTTP/worker/failure integration suites for scheduling, attendance, student lifecycle, branches, analytics, communications, automations, notifications, finance, certificates and integrations.
- No browser role exploration or real provider certification was performed in this audit.

Use these labels: build/unit-proven features are IMPLEMENTED_AND_VERIFIED only within that boundary; database/Redis workflows are generally IMPLEMENTED_NOT_VERIFIED; real integration/live recording readiness is PARTIALLY_IMPLEMENTED; AI is BACKEND_ONLY from product discoverability perspective.

## Business workflows

Admission: Lead → activities/follow-up → Admission → conversion → User/StudentLifecycle → Enrollment → FeePlan → Batch → learner access. The early conversion exists, but downstream readiness spans independent modules.

Academic: Course → Modules/Lessons → Batch + instructor + learners → Timetable publish → Class → meeting provider → attendance → recording. Canonical services/models exist; UI is fragmented across top-level lists.

Learning: Student dashboard → next class/resume → course player → assessment/submission → feedback/progress → certificate. The dashboard is strong; course-related outcomes fragment into global modules.

Teaching: Instructor dashboard → class/batch → meeting → attendance → assessment/grading → learner performance/communication. Action data exists; a unified class/batch workspace is missing.

Finance/events: fee plan → payment/ledger → receipt/refund/reconciliation → outbox → notifications/automation. Idempotency/recovery concepts exist but infrastructure proofs are skipped.

## Current product experience

The admin sidebar has roughly 20 top-level concepts and mixes operations, reporting, platform links and settings. Instructor has 11 destinations and Student 12. Deep routes are generally appropriately contextual, but the core Course–Batch–Class chain is not represented as a workspace hierarchy. Settings are scattered. Analytics labels duplicate operational labels. Terminology varies: Trainer/Instructor, Course/Program, Assessments/Quizzes & Assignments, Recorded Classes/Class Recordings.

The desired IA is Platform → Tenant → Branch → Admissions/Learners + Academics → Course → Batch → Class/Learning Activity → Outcome, with Finance, Engagement, Insights and Settings as supporting domains. Preserve current URLs and permissions; reorganize navigation first, then add contextual tabs/actions.

## Integrations and certification

Adapters/orchestrators exist for Google Classroom, Google Meet, Zoom and Microsoft Teams. IntegrationConnection, OAuthState, Operation, SyncRun and WebhookEvent models provide lifecycle state. Zoom recording sync has a service and role libraries. Razorpay, email providers and S3/R2/Cloudinary/local storage are abstracted. Deterministic provider contracts pass, but no real OAuth, token refresh, webhook, meeting, recording, payment, DNS, email or cloud-storage flow was certified here. Never call these production-certified without staging evidence.

## Non-negotiable constraints

- Keep API RBAC authoritative and tenant/branch scope fail-safe.
- Preserve canonical URLs, direct links and business rules during IA migration.
- Do not rename database entities just to change user-facing terminology.
- Preserve audit/idempotency/outbox semantics and provider abstractions.
- Do not assume a passing build proves workflows or external services.
- The repository was already dirty; inspect diffs before editing and do not overwrite user work.

## Recommended sequence and exact next steps

1. Run Wave 0: make all skipped Mongo/Redis suites intentionally runnable in CI and publish a test matrix.
2. Validate demo seed and create five safe test personas with branch-specific data.
3. Run Playwright at 1440, 430 and 375 widths; log in as every role, traverse every permitted destination, and capture screenshots/error/empty/loading states.
4. Add tenant, branch, own-resource and `bypassTenantFilter` security tests; inventory all exports/aggregates/background paths.
5. Freeze current route, permission and navigation snapshots.
6. Implement role-based IA behind a feature flag without changing URLs: reduce admin primary groups and introduce clear Settings/Insights separation.
7. Add breadcrumbs and context-preserving return links.
8. Transform dashboards into exception/action queues with reconciled definitions.
9. Introduce Course, Batch and Class workspaces using existing APIs; connect next actions incrementally.
10. Consolidate shared page/list/detail/form/async patterns and run accessibility/visual regression.
11. Certify real providers, payments, workers, observability, load and recovery before production approval.

Read the other files in this directory for the feature table, role matrix, navigation, journey diagrams, dependency graph, issue register, target IA, design system, production gaps and phased roadmap. The safest first implementation remains **Wave 0 baseline and safety**, not a navigation rewrite.
