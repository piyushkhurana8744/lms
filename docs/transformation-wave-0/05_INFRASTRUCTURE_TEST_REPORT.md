# Infrastructure test report

## Results

- Default baseline: 774 passed, 358 skipped, 0 failed (87 files / 1,132 tests).
- Initial full Mongo integration run: 1,041 passed, 1 failed, 5 skipped (81 files / 1,047 tests).
- Failure: lifecycle resume attendance proof used a fixed class date that had become earlier than runtime activation.
- Focused corrected lifecycle run: 16/16 passed.
- Dedicated Redis proof runner: 9/9 test invocations passed across notification, lifecycle, grading and integration outage/recovery/finalization.

The full Mongo suite was not rerun after the focused fixture correction; therefore no synthetic “1,042 all passed” result is claimed. The initial sandbox attempt failed with localhost bind `EPERM`; the approved run succeeded outside that restriction.

Mongo was an ephemeral replica set owned by `mongodb-memory-server`. Redis was a disposable localhost process with persistence disabled. No Docker volumes, production databases or real provider calls were used.

One student-lifecycle Redis proof logged an AuditLog lock-acquisition failure but the audit helper swallowed it and the business proof passed. This is an observability/compliance risk: critical audit writes are best-effort and may be lost under lock pressure.
