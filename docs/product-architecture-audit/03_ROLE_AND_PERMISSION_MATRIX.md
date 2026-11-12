# Role and permission matrix

Canonical system roles and grants are defined in `packages/permissions/src/index.ts`. Custom tenant roles can add permissions through Role records; the live permission set is rebuilt during authentication from OrganizationMember plus custom Role. UI filtering is not the security boundary—the API `requirePermission` middleware is.

| Role | Home | Primary responsibility | Frequent modules/actions | Scope and cautions |
|---|---|---|---|---|
| SUPER_ADMIN | `/platform` | Operate tenants and platform, inspect and impersonate | tenants, analytics/audit, tenant switch | `superadmin.all`; platform operations must remain separate from tenant context |
| TENANT_ADMIN | `/admin` | Own organization setup and all tenant operations | courses, students, CRM, finance, staffing, scheduling, reports, settings | broad tenant grants; can manage branches and roles |
| BRANCH_ADMIN | `/admin` | Operate assigned branch(es) | leads, students, batches/classes, attendance, finance/reporting within branch | general admin shell creates ambiguity; branch access must be enforced server-side, never only by switcher |
| INSTRUCTOR | `/instructor` | Deliver assigned teaching and evaluate learners | today’s classes, batches, attendance, grading, assessments, communication | must see assigned entities only; permissions include operational read/write subsets |
| STUDENT | `/student` | Learn, attend, submit and track outcomes | next class, course player, assessments, results, attendance, fees, certificates, messages | own-resource enforcement is as important as permission names |
| Custom tenant role | dashboard chosen from effective role | tenant-defined staff duties | permission-dependent admin navigation | additions are loaded from Role model; avoid name-based assumptions |

## UI/API consistency findings

- Admin, instructor and student navigation are filtered by the same permission constants used by API routes, a strong alignment mechanism.
- Portal layouts add coarse role redirects, but direct page components do not uniformly wrap every action in `PermissionGuard`; API rejection remains authoritative.
- Unpermissioned navigation entries such as Notifications and Explore Catalog are intentional common destinations, but their API calls still authenticate or use public endpoints.
- Branch scope is more nuanced than RBAC. It is handled through branch access services and workspace context; every new list, export and aggregate requires explicit branch-scope review.
- Super Admin bypass is explicit. Any use of `bypassTenantFilter` must be catalogued and tested because it crosses the default tenant guard.

## Dashboard requirements

- Super Admin: unhealthy tenants, failed jobs/providers, subscription/provisioning status, recent audit events and explicit tenant context.
- Tenant Admin: actionable setup/compliance, admission/enrollment exceptions, today’s academic operations, dues and failed integrations.
- Branch Admin: branch-labelled queues and KPIs only, with a visible scope indicator.
- Instructor: today’s classes, start/join action, attendance to finalize, grading queue, assigned batches.
- Student: next class, resume learning, due assessments, results/feedback, progress and notices.

Approval-sensitive actions already implied by permissions include admission approval/conversion, course review/publish, discount approval, refund, attendance finalization/correction, certificate issue/revoke, timetable publish, and tenant/role management.
