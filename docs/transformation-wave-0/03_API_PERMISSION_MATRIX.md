# API permission matrix

Registration is centralized at `apps/api/src/routes/v1/index.ts`. Authentication, tenant context and RBAC are in `auth.middleware.ts`, `tenant.middleware.ts`, and `rbac.middleware.ts`.

| Prefix | Permission families | Additional scope |
|---|---|---|
| `/platform`, `/tenants` | platform tenant/audit/impersonate, Super Admin | explicit platform/bypass paths |
| `/courses`, nested modules/lessons | course/module/lesson/publish | tenant |
| `/student` | enrollment/progress/own attendance/fees/certificates | authenticated identity |
| `/students` | lifecycle/directory/actions | tenant + branch |
| `/branches` | branch view/manage/staff | allowed branch set |
| `/batches`, `/classes`, scheduling routes | batch/class/timetable/calendar/room | tenant + branch + assignment |
| `/attendance` | view/mark/finalize/correct/report | branch + class instructor |
| `/assessments` | view/create/update/submit/grade | course/batch/own submission |
| `/crm` | CRM/lead/follow-up/admission | branch and assigned actor rules |
| `/finance` | fee/payment/refund/reconcile/gateway/report | tenant + branch + webhook identity |
| `/certificates` | view/issue/revoke/retry | tenant; public verify is intentionally bypassed/read-only |
| `/communications`, `/automations` | communication/automation capability | tenant + branch/audience |
| `/analytics` | per-domain analytics/export | server-side response shaping + branch |
| `/integrations` | read/manage/sync/audit/provider grants | connection scope, class assignment, enrollment |
| `/organization/**`, `/roles`, `/users` | settings/member/role/user grants | tenant |

HTTP integration tests prove multiple cross-tenant, cross-branch, own-certificate, class-join, export and impersonation denials. UI permissions are not authoritative. Potential mismatch requiring Wave 1 guard: portal layouts use coarse role redirects and middleware initially redirects authenticated auth-route visits to `/student`; API enforcement remains correct.
