# Route and navigation manifest

Canonical sources are `apps/web/src/app/**/page.tsx` and `apps/web/src/config/navigation.ts`. The production build baseline contains 92 routes. Existing `route-integrity.test.ts`, `navigation-rbac.test.ts`, and `back-navigation.test.ts` provide non-format-fragile contract checks.

| Route family | Purpose | Roles | Navigation / parent | Scope / reachability |
|---|---|---|---|---|
| `/platform` | tenant/platform operations | Super Admin | Platform Console | platform context; direct + nav |
| `/admin` | tenant/branch administration | tenant/branch admin, super admin | Dashboard | tenant plus branch service scope |
| `/admin/crm/**` | leads, follow-ups, admissions | permitted staff | CRM & Admissions | contextual detail routes |
| `/admin/courses/**` | course, curriculum, learners | academic staff | Courses | tenant scoped; detail/create/edit |
| `/admin/batches`, `/classes`, `/timetable`, `/attendance`, `/recordings` | academic delivery | permitted staff | separate top-level modules | tenant + branch; fragmented but reachable |
| `/admin/finance/**` | fees/payments/refunds | finance permissions | Finance | tenant + branch |
| `/admin/analytics/**` | dashboards/reports/export | analytics permissions | Analytics & Reports | server-shaped permissions and branch scope |
| `/admin/communications/**`, `/automations/**` | engagement | communication/automation grants | top-level groups | tenant + branch/audience rules |
| `/admin/organization/**`, `/cms/**`, `/settings/integrations` | configuration | admin grants | multiple settings locations | tenant scoped; website route redirects to CMS |
| `/instructor/**` | teaching workspace | Instructor | instructor shell | assigned class/batch enforcement |
| `/student/**` | learning workspace | Student | student shell | own-resource/enrollment enforcement |
| `/notifications/**`, `/sessions` | personal settings | authenticated | header/account affordances | own resource |
| `/courses/**`, public pages, certificate verify | discovery/verification | public | public header | hostname-resolved tenant |

Deep detail/create/edit pages are intentionally contextual. Confirmed duplicate destination: `/admin/organization/website` redirects to `/admin/cms`. AI is API-only. Ambiguity: Super Admin test expectation lands at `/admin` although the intended platform home is `/platform`; middleware also redirects any authenticated user visiting login to `/student` before client resolution.

No route was renamed or removed in Wave 0. A complete generated build-route table is available in the `pnpm build` output; future CI should serialize Next routes plus normalized navigation objects as JSON.
