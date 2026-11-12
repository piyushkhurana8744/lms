# Proposed information architecture

## Product hierarchy

```text
Platform
└── Tenant
    ├── Branch
    ├── Admissions & Learners
    ├── Academics
    │   ├── Course
    │   │   ├── Curriculum
    │   │   ├── Batches
    │   │   └── Outcomes
    │   └── Batch
    │       ├── People
    │       ├── Schedule / Classes
    │       ├── Attendance
    │       ├── Assessments
    │       └── Performance
    ├── Finance
    ├── Engagement
    ├── Insights
    └── Settings
```

## After navigation

Admin: Home; Admissions (Leads, Follow-ups, Admissions); Learners (Students, Enrollments); Academics (Courses, Batches, Schedule, Classes); Outcomes (Attendance, Assessments, Certificates); Finance; Engagement (Announcements, Conversations, Automations); Insights; Settings. Branch selection is global context. Media is contextual plus available under Settings/Assets.

Instructor: Today; Teaching (Classes, Batches, Calendar); Learners; Assess & Grade; Messages; Profile & Availability. Recordings live in Class/Batch and an optional roll-up filter.

Student: Home; My Learning; Calendar; Assessments; Messages; More (Attendance, Fees, Certificates, Profile). Recordings and progress are course-contextual, with global summaries under More.

Super Admin: Overview; Tenants; Platform Health; Audit & Security; Platform Settings. Tenant workspaces open in a visibly distinct context.

## Page templates

- Overview: priorities, exceptions, progress, recent activity, next actions.
- List: PageHeader, search/filter, saved scope, table/cards, bulk actions, resilient empty/error/loading.
- Detail workspace: breadcrumb, identity/status header, primary action, tabs, activity/history.
- Create/edit: clear prerequisites, progressive sections, validation summary, save state and next action.
- Learning workspace: curriculum rail, content, progress, resources, assessment and next lesson.
- Settings: status summary, configuration, test connection, audit history and danger zone.

## Contextual next actions

Course created → Build curriculum → Publish/readiness → Create batch. Batch created → Assign instructor → Add learners → Publish timetable. Class scheduled → Provision meeting → Notify roster. Class ended → Finalize attendance → Review recording. Assessment graded → Publish feedback → Review batch performance. Admission converted → Confirm enrollment → Fee plan → Batch → invite learner.

## Canonical terminology

Use Course, Curriculum, Module, Lesson, Batch, Class, Instructor, Student, Assessment (with Quiz/Assignment type), Submission, Recording, Enrollment and Certificate. Keep database names stable; update labels and documentation first, then migrate only where technically necessary.

## Onboarding

Tenant checklist: organization, branch, team/roles, course, provider/storage/email, first batch and launch. Instructor checklist: profile/availability, assigned batches, next class, attendance/grading. Student checklist: profile, enrolled course, next class, resume lesson. Checklists remain dismissible and contextual.
