# Model policy register

## TENANT_OWNED
Every schema applying `tenantIsolationPlugin` is tenant-owned. This includes academic, admissions, assessment, attendance, automation, branch, certificate, class/course/content, communications, enrollment, integrations, finance, CRM, media, notification, organization configuration, roles, lifecycle, submission, timetable, user, and website schemas. Existing context-free queries do not reclassify them.

Allowed operations: tenant-bound CRUD only. Entry points: authenticated tenant middleware or explicit SYSTEM/PLATFORM/public policy. Projection: domain minimum. Negative evidence currently covers Course; complete per-domain coverage remains pending.

## PLATFORM_GLOBAL
`Tenant`, `Session`, and platform audit catalog data. Access still requires authentication/bootstrap-specific controls; “global” does not mean public.

## PUBLIC_READ_POLICY
Certificate verification only: exact verification code, read-only, minimized credential snapshot.

## BOOTSTRAP_AUTH_POLICY
User/session login and refresh lookup plus hostname/domain tenant resolution. These paths require a dedicated narrow policy before global missing-context rejection can be enabled.

## SYSTEM_DISCOVERY_POLICY
OutboxEvent, NotificationIntent, PaymentWebhookEvent, integration/automation discovery, finance sequences/reconciliation, OAuth state, scheduling mutex, analytics export, and AI quota/usage paths. Allowed only for registered operation kinds, identifier/status predicates, minimum projections, and immediate tenant re-entry.

This classification is a first register. Every non-plugin model and each population path still requires call-site-level operation/projection/negative-test completion.
