# Current navigation map

Source of truth: `apps/web/src/config/navigation.ts`; physical routes: `apps/web/src/app/**/page.tsx`. The build generated 92 routes.

## Admin / staff shell

```text
Platform Console (Super Admin)
Dashboard
Automations > Automations, Create Automation
Communications > Announcements, Create Announcement, Conversations
Analytics & Reports > Overview, Students, CRM, Finance, Attendance,
  Academic Operations, Learning Progress, Instructors, Branch Comparison, Reports & Exports
Branches
Students
Batches
CRM & Admissions > Dashboard, Leads Directory, Follow-Ups, Admissions
Finance & Payments > Dashboard, Student Fees, Fee Structures, Payments, Dues, Refunds, Gateway Settings
Classes
Class Recordings
Attendance
Academic Operations > Timetable, Academic Calendar
Courses > All Courses, Create Course
Quizzes & Assignments
Certificates
Media Library
Organization Settings
Website CMS
Team & Members
Roles & Permissions
Integrations > Provider Connections, Google Classroom
```

This is overloaded: daily work, analytics, configuration, website management, platform scope and advanced automation occupy the same level. Course → batch → schedule → class is not represented as a connected hierarchy.

## Instructor

```text
Trainer Dashboard
My Batches
My Classes
My Recordings
Calendar & Schedule
Grading & Submissions
Assessments
Students
Availability
Communications
Notifications
```

## Student

```text
Dashboard
Inbox & Updates
Messages
My Courses
Recorded Classes
My Fees & Receipts
My Attendance
My Calendar
Quizzes & Assignments
My Certificates
My Profile
Explore Catalog
```

## Reachability findings

- Deep detail/edit routes are correctly absent from the sidebar and should remain contextual.
- `/sessions` and notification preferences are reachable through account/notification affordances, not primary navigation.
- `/admin/onboarding` is a guided setup destination rather than steady-state navigation.
- AI APIs have no primary page and are BACKEND_ONLY/hidden.
- `/admin/organization/website` is a very small route while Website CMS also owns website operations, creating duplication risk.
- Admin Analytics duplicates labels already present as operational modules; users can confuse “Students” with “Student analytics.”
- Recordings are separate top-level entries although their primary context is a class/course/batch.

## Route naming inconsistencies

The UI mixes “Trainer” and “Instructor,” “Quizzes & Assignments” and “Assessments,” “Recorded Classes” and “Class Recordings,” and “Program” language in student copy with Course entities/routes. Canonical user-facing terms should be Course, Batch, Class, Assignment/Quiz (types beneath Assessment), Instructor, and Recording.
