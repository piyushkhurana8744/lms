# DIDM LMS product architecture audit

Audit date: 2026-10-28. Scope: static repository inspection plus local build and default test execution. No application behavior, schema, or existing source was changed. The worktree already contained modified and untracked product files; this audit treats them as the current product snapshot.

## Executive finding

DIDM LMS is a multi-tenant education operating platform spanning public course discovery, CRM/admissions, student lifecycle, curriculum, batches and scheduling, live classes, attendance, assessment/grading, finance, certificates, communications, analytics, tenant setup, integrations, and platform administration. It serves Super Admin, Tenant Admin, Branch Admin, Instructor, and Student system roles.

The product is technically substantial, not a prototype: `pnpm build` succeeded for all 10 workspaces and Next generated 92 routes. `pnpm test` passed 774 tests in 46 files. However, 358 tests in 41 files were skipped—principally MongoDB, Redis, HTTP, worker, and integration proofs. No browser session or real external-provider certification was completed during this audit. Therefore the defensible maturity is **feature-rich beta / pre-production certification**, not production-ready.

## Architecture

- Web: Next.js 14.2.35 App Router, React 18.3.1, TypeScript 5.7.3, TanStack Query 5, Tailwind 3.4 plus CSS variables.
- API: Express 4.21, Mongoose 8.10, JWT/cookie sessions, Zod, Helmet, CORS and rate limiting.
- Worker: BullMQ 5.41 and Redis/ioredis for outbox, notification, finance and integration processing.
- Data: MongoDB 7 target, more than 70 Mongoose models, a tenant isolation plugin, explicit branch access services.
- External systems: Zoom, Google Meet, Microsoft Teams, Google Classroom, Razorpay, SMTP/Resend/Brevo, local/S3/R2/Cloudinary storage.
- Monorepo: pnpm 10 and Turborepo 2; `apps/web`, `apps/api`, `apps/worker`, and seven shared packages.

## Strengths

Canonical permissions are centralized in `packages/permissions/src/index.ts`; API routes normally enforce granular permissions; navigation is permission-filtered from `apps/web/src/config/navigation.ts`. Domain entities and services show deliberate tenant, branch, audit, idempotency, outbox, retry, and provider abstraction work. Student and instructor dashboards already use actionable data rather than static cards. Build, unit, contract, route-integrity, navigation-RBAC, and security tests provide a meaningful baseline.

## Highest-priority gaps

1. Verification gap: 358 integration tests are skipped by the normal command; real Mongo/Redis, worker recovery, provider OAuth/webhooks, payment and recording flows remain uncertified.
2. Information architecture: the admin sidebar exposes roughly 20 top-level concepts, mixing daily work, configuration, reporting and platform scope. Settings are split across Organization Settings, Website CMS, Finance settings and Integrations.
3. Workflow fragmentation: canonical relationships exist, but users still enter separate list modules for course, batch, timetable, class, attendance, recording and assessment. Contextual “next step” transitions are inconsistent.
4. Role ambiguity: Branch Admin uses the general admin shell rather than a clearly branch-scoped home; Super Admin uses `/platform` but can also enter tenant admin navigation.
5. Design fragmentation: shared primitives exist, yet many pages construct bespoke glass cards, loading/error blocks, tables, headings and colors.
6. Tenant guard caveat: the Mongoose plugin applies tenant filters only when a valid workspace context exists and permits explicit bypass. Correct middleware ordering and bypass review are security-critical.

## Production-readiness verdict

Code/build readiness: strong. Workflow certification: incomplete. External-provider readiness: unverified. UX coherence: needs restructuring. Deployment readiness: conditional on environment validation, migrations, observability, backup/restore, load testing, and completion of integration/E2E suites.

The safest first implementation wave is Wave 0: freeze a route/permission baseline, make skipped integration suites runnable in CI, seed all five personas, capture browser evidence, and add regression coverage before moving navigation.
