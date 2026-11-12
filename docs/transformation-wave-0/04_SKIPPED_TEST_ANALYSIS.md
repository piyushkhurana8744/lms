# Skipped-test analysis

The historical 358 skips came from 41 files. They are predominantly conditional suites, not deleted tests.

| Condition | Suites/domains | Requirement | Wave 0 result | Risk |
|---|---|---|---|---|
| `RUN_MONGO_INTEGRATION=1` | scheduling, attendance, branch, lifecycle, finance, certificate, communications, automation, analytics, integrations, HTTP and worker | replica-set Mongo | executed via ephemeral replica set | one clock-stale fixture found/fixed |
| `REDIS_RECOVERY_PROOF=OUTAGE/RECOVERY/FINALIZE` | notification queue/delivery | disposable Redis + persistent ephemeral Mongo across phases | 3/3 invocations passed | audit log emitted a transient lock warning in another proof |
| `PHASE16_REDIS_PROOF` | lifecycle handoff | same | 2/2 passed | durable state proved |
| `PHASE17_REDIS_PROOF` | grading handoff | same | 2/2 passed | durable state proved |
| `PHASE22_REDIS_PROOF` | integration operation handoff | same | 2/2 passed | mocked provider only |

The default command intentionally omits infrastructure proofs for speed. Do not remove guards; CI should add separate Mongo and Redis jobs. Five Redis-mode files remain skipped during the generic Mongo run because they require ordered outage/recovery modes; the dedicated runner covers them.

Real external providers remain excluded by design. Deterministic adapters are not Zoom/Google/Microsoft/Razorpay certification.
