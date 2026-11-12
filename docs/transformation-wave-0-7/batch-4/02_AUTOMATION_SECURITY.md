# Automation Security & Tenant Boundary Architecture

## Overview
`AutomationService` (`apps/api/src/services/automation.service.ts`) orchestrates asynchronous event consumption, trigger evaluation, multi-step workflow execution, retry scheduling, and expired lease recovery. In Wave 0.7 Batch 4, all raw tenant isolation bypasses were eliminated and replaced with authorized system operations and strict tenant context re-entry.

---

## Migrated Operations

### 1. Event Processing (`processNextEvent`)
- **Previous State:** Used `bypassTenantFilter: true` on `AutomationEventModel.findOne` and `AutomationEventModel.findOneAndUpdate`.
- **Batch 4 Implementation:**
  - Requires valid `SystemAuthority` with `principal` authorized by `INTERNAL_WORKER_SECRET`.
  - Discovers candidate due events (`availableAt <= now`, `status` in `['PENDING', 'FAILED']` or `status: 'PROCESSING', leaseUntil < now`) via `runAuthorizedSystemOperation` under `AuthorizedSystemOperationType.AUTOMATION_RECOVERY`.
  - Global query projects **strictly** `_id tenantId`.
  - Validates `expectedTenantId` against candidate tenant ID. If mismatched, throws an explicit tenant mismatch rejection (`Automation event tenant binding rejected`).
  - Enters `tenantContextStorage.run` with `currentTenantId = candidate.tenantId`.
  - Atomically claims the event with compare-and-swap lease semantics:
    ```typescript
    AutomationEventModel.findOneAndUpdate(
      {
        _id: candidate._id,
        tenantId,
        availableAt: { $lte: now },
        $or: [
          { status: { $in: ['PENDING', 'FAILED'] } },
          { status: 'PROCESSING', leaseUntil: { $lt: now } }
        ]
      },
      {
        $set: { status: 'PROCESSING', leaseUntil: new Date(now.getTime() + LEASE_MS) },
        $inc: { attemptCount: 1 }
      },
      { new: true }
    );
    ```

### 2. Execution Run (`runExecution`)
- **Previous State:** Used `bypassTenantFilter: true` on `AutomationExecutionModel.findById` and `AutomationStepExecutionModel.findOneAndUpdate`.
- **Batch 4 Implementation:**
  - Requires active workspace tenant context OR valid `SystemAuthority`.
  - If executed outside tenant context, queries execution tenant ID via `runAuthorizedSystemOperation` with minimal projection `_id tenantId`.
  - Re-enters tenant context for `execution.tenantId` before fetching automation definition, evaluating condition DAGs, executing actions, and creating step executions.

### 3. Stale Lease & Step Recovery (`recoverDue`)
- **Previous State:** Used `bypassTenantFilter: true` on `AutomationStepExecutionModel.find` and `AutomationExecutionModel.find`.
- **Batch 4 Implementation:**
  - Discovers stale step executions (`status: 'RUNNING'`, `leaseUntil < now`) and due executions (`status: 'SCHEDULED'`, `nextRetryAt <= now`) under `runAuthorizedSystemOperation` with minimal projections `_id tenantId`.
  - Groups candidates by `tenantId`.
  - Re-enters `tenantContextStorage.run` per-tenant to fail stale steps, increment retry counts, transition execution statuses, and schedule retries.

---

## Security Invariants Enforced
1. **No Ambient System Authority:** Forged system capabilities without a valid cryptographic seal or registered principal fail immediately.
2. **Tenant-Bound Claims:** A worker claiming an event must be scoped to the originating tenant or operate under a verified internal worker secret.
3. **Ten-Way Concurrency Safety:** MongoDB compare-and-swap update filters guarantee that exactly one worker claims a pending event in concurrent races; other workers receive `null` or skip to the next candidate.
4. **Lease Expiry Recovery:** Crashed or halted workers that abandon processing leases are recovered after `LEASE_MS` expiration without cross-tenant leakage.
5. **Payload and Depth Limits:** `MAX_DEPTH = 3` and 64 KiB payload size limits prevent infinite automation loops or resource exhaustion attacks.

