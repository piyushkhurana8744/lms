# UX/UI problem register

| ID | Severity | Role / route | Confirmed current behavior and evidence | Expected / repair |
|---|---|---|---|---|
| UX-001 | High | Admin shell | `ADMIN_NAVIGATION_CONFIG` has about 20 top-level destinations mixing work and settings | Group into Home, Admissions, Academics, Learners, Finance, Engagement, Insights; move setup to Settings |
| UX-002 | High | Admin academic journey | Course, Batch, Timetable, Class, Attendance and Recording are independent top-level modules | Add contextual workspaces and next actions while retaining authorized direct URLs |
| UX-003 | High | Branch Admin | Shares generic admin home/navigation; scope is mainly represented by a switcher | persistent branch scope label, branch-specific dashboard and server-tested filters |
| UX-004 | High | Integrations | provider configuration and Google Classroom sync are split; operation failures are not a primary queue | unified Integrations area with Connections, Syncs, Failures, Audit |
| UX-005 | Medium | All roles | terminology mixes trainer/instructor, program/course, recorded classes/class recordings, assessments/quizzes/assignments | adopt canonical glossary and type labels |
| UX-006 | Medium | Student | course-adjacent attendance, recordings, assessments and certificates are separate top-level modules | provide course workspace tabs plus global roll-up pages |
| UX-007 | Medium | Instructor | classes, attendance, recordings and preparation are fragmented | class workspace with pre/live/post-class stages |
| UX-008 | Medium | Admin analytics | child labels duplicate operational destinations (Students, Attendance, Finance) | prefix/report context or consolidate under Insights |
| UX-009 | Medium | Settings | Organization, Website CMS, Finance gateway and Integrations settings are dispersed | one Settings hub with Organization, People & Access, Website, Finance, Integrations |
| UX-010 | Medium | UI system | pages repeatedly hand-build cards, loaders, error boxes and page headings | enforce shared PageHeader, AsyncState, DataTable, EmptyState, StatusBadge and form patterns |
| UX-011 | Medium | All | many deep pages rely on bespoke back buttons/links; breadcrumb coverage is not systematic | route-aware breadcrumbs and return-to-filter state |
| UX-012 | Medium | Admin assessments | build reports a 253 B page while the domain is broad | browser-audit whether this is a shell/composition; expose clear assessment-type workflows |
| UX-013 | Medium | Website | `/admin/organization/website` and `/admin/cms` overlap | make CMS the operational editor; organization page contains configuration/status link |
| UX-014 | High | Platform/Admin | Super Admin may traverse platform and tenant shells | persistent tenant/impersonation banner and explicit exit-context action |
| UX-015 | High | All | default suite skips 358 integration tests, so empty/error/recovery behavior is not proven | Wave 0 browser + infrastructure certification before visual redesign |

No claim of a broken clickable link is made without browser proof. These findings are code-confirmed architecture/usability risks; runtime defects must be added after the E2E evidence pass.
