# Test Personas and Seed

The primary deterministic tenant, DIDM Academy, supplies five browser personas: platform SuperAdmin, tenant admin, branch admin, instructor, and student. The password is read from `E2E_DEMO_PASSWORD` and is never recorded in reports.

`scripts/e2e-secondary-seed.ts` creates a second tenant (`Wave 0.5 Isolation Academy`), one branch, tenant admin, instructor, student, memberships, roles, course, batch, enrollment, class, attendance, assessment/submission, payment, and notification. IDs are deterministic and writes are idempotent upserts. This makes tenant-crossing assertions reproducible without cloning production data.

Primary browser identities:

| Persona | Login | Landing |
|---|---|---|
| SuperAdmin | `superadmin@didm.edu` | `/admin` |
| Tenant admin | `admin@didm.edu` | `/admin` |
| Branch admin | `branch.main@didm.edu` | `/admin` |
| Instructor | `aarav.sharma@didm.edu` | `/instructor` |
| Student | `aman.verma@student.didm.edu` | `/student` |

The seed is synthetic and provider integrations are simulated. It is not provider certification.
