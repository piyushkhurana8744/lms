# Phase 12 attendance

Attendance is attached to canonical `Class` identity. Opening snapshots the class schedule and all class members whose active enrollment timestamp is on or before the class date. Later membership or schedule changes do not rewrite this roster.

Sessions are `OPEN` or `FINALIZED`. Open sessions support atomic bulk marking and mark-all-present. Finalization requires every roster record to be explicitly marked. Finalized records can change only through the correction operation, which writes immutable correction history and the generic audit log in the same transaction.

Statuses are `PRESENT`, `ABSENT`, `LATE`, and `EXCUSED`. Present and late count as attended; absent counts only in the denominator; excused is excluded. Only finalized sessions for non-cancelled classes are official. Zero denominator returns `null`.

Tenant admins manage tenant attendance. Instructors can manage only classes linked to batches assigned through `Batch.instructorId`. Students receive only self-derived summary and history endpoints. Branch remains the existing classroom branch string.

Endpoints live under `/api/v1/attendance`; student self-service lives under `/api/v1/student/attendance`. Source values reserve future integrations, but Phase 12 writes only through the canonical service and implements manual marking.
