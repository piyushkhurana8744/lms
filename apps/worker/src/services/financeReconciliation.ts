import { PaymentModel, RefundModel, runAuthorizedSystemOperation, SystemAuthority } from '@edtech/database';
import { tenantContextStorage } from '@edtech/utils';
import { randomUUID } from 'crypto';

export type ReconciliationKind = 'payment' | 'refund';
const LEASE_MS = 60_000;

function modelFor(kind: ReconciliationKind): any { return kind === 'payment' ? PaymentModel : RefundModel; }

export async function claimReconciliation(kind: ReconciliationKind, staleMinutes: number, authority?: SystemAuthority, now = new Date()) {
  const Model = modelFor(kind);
  const status = kind === 'payment' ? 'PENDING' : 'PROCESSING';
  if (!authority) throw new Error('Trusted internal system authority is required');
  const candidate: any = await runAuthorizedSystemOperation(authority, { kind: 'FINANCE_RECONCILIATION', reason: `Discover next due ${kind} reconciliation`, correlationId: randomUUID() }, () =>
    Model.findOne(
      { status, createdAt: { $lte: new Date(now.getTime() - staleMinutes * 60_000) }, $and: [{ $or: [{ nextReconcileAt: { $exists: false } }, { nextReconcileAt: { $lte: now } }] }, { $or: [{ reconciliationLeaseUntil: { $exists: false } }, { reconciliationLeaseUntil: { $lt: now } }] }] }
    ).setOptions({ authorizedSystemOperation: 'FINANCE_RECONCILIATION' }).sort({ createdAt: 1 }).select('_id tenantId').lean()
  );
  if (!candidate?.tenantId) return null;
  const tenantId = candidate.tenantId.toString();
  return tenantContextStorage.run({ currentTenantId: tenantId, currentUserId: authority.principal, isPlatformContext: false, allowedTenantIds: [tenantId] }, () =>
    Model.findOneAndUpdate(
      { _id: candidate._id, tenantId, status, $and: [{ $or: [{ nextReconcileAt: { $exists: false } }, { nextReconcileAt: { $lte: now } }] }, { $or: [{ reconciliationLeaseUntil: { $exists: false } }, { reconciliationLeaseUntil: { $lt: now } }] }] },
      { $set: { reconciliationLeaseUntil: new Date(now.getTime() + LEASE_MS) }, $inc: { reconciliationAttempts: 1 } },
      { new: true, sort: { createdAt: 1 } }
    )
  );
}

export async function releaseReconciliation(kind: ReconciliationKind, id: string, retryDelayMs: number, anomaly?: string, authority?: SystemAuthority, tenantId?: string) {
  const Model = modelFor(kind);
  if (tenantId) {
    return tenantContextStorage.run({ currentTenantId: tenantId, currentUserId: authority?.principal || 'finance-worker', isPlatformContext: false, allowedTenantIds: [tenantId] }, () =>
      Model.updateOne({ _id: id, tenantId }, { $unset: { reconciliationLeaseUntil: 1 }, $set: { nextReconcileAt: new Date(Date.now() + retryDelayMs), ...(anomaly ? { reconciliationAnomaly: anomaly } : {}) } })
    );
  }
  if (!authority) throw new Error('Trusted internal system authority or tenantId is required');
  const binding: any = await runAuthorizedSystemOperation(authority, { kind: 'FINANCE_RECONCILIATION', reason: `Resolve ${kind} reconciliation tenant for release`, correlationId: id }, () =>
    Model.findById(id).setOptions({ authorizedSystemOperation: 'FINANCE_RECONCILIATION' }).select('_id tenantId').lean()
  );
  if (!binding?.tenantId) return;
  const resolvedTenant = binding.tenantId.toString();
  return tenantContextStorage.run({ currentTenantId: resolvedTenant, currentUserId: authority.principal, isPlatformContext: false, allowedTenantIds: [resolvedTenant] }, () =>
    Model.updateOne({ _id: id, tenantId: resolvedTenant }, { $unset: { reconciliationLeaseUntil: 1 }, $set: { nextReconcileAt: new Date(Date.now() + retryDelayMs), ...(anomaly ? { reconciliationAnomaly: anomaly } : {}) } })
  );
}

export async function enqueueReconciliationBatch(authority: SystemAuthority, queue: { add: Function }, options: { paymentStaleMinutes: number; refundStaleMinutes: number; batchSize: number }) {
  let count = 0;
  for (const kind of ['payment', 'refund'] as ReconciliationKind[]) {
    for (let index = 0; index < options.batchSize; index += 1) {
      const record = await claimReconciliation(kind, kind === 'payment' ? options.paymentStaleMinutes : options.refundStaleMinutes, authority);
      if (!record) break;
      const tenantId = record.tenantId.toString();
      try {
        await queue.add(`${kind}.reconcile`, { kind, id: record._id.toString(), tenantId }, { jobId: `${kind}-${record._id}`, attempts: 5, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: true, removeOnFail: 1000 });
        count += 1;
      } catch (error) {
        await releaseReconciliation(kind, record._id.toString(), 5_000, String((error as any)?.message || error), authority, tenantId);
        throw error;
      }
    }
  }
  return count;
}
