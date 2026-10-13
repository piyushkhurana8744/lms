import { PaymentModel, RefundModel } from '@edtech/database';

export type ReconciliationKind = 'payment' | 'refund';
const LEASE_MS = 60_000;

function modelFor(kind: ReconciliationKind): any { return kind === 'payment' ? PaymentModel : RefundModel; }

export async function claimReconciliation(kind: ReconciliationKind, staleMinutes: number, now = new Date()) {
  const Model = modelFor(kind);
  const status = kind === 'payment' ? 'PENDING' : 'PROCESSING';
  return Model.findOneAndUpdate(
    { status, createdAt: { $lte: new Date(now.getTime() - staleMinutes * 60_000) }, $and: [{ $or: [{ nextReconcileAt: { $exists: false } }, { nextReconcileAt: { $lte: now } }] }, { $or: [{ reconciliationLeaseUntil: { $exists: false } }, { reconciliationLeaseUntil: { $lt: now } }] }] },
    { $set: { reconciliationLeaseUntil: new Date(now.getTime() + LEASE_MS) }, $inc: { reconciliationAttempts: 1 } },
    { new: true, sort: { createdAt: 1 }, bypassTenantFilter: true }
  );
}

export async function releaseReconciliation(kind: ReconciliationKind, id: string, retryDelayMs: number, anomaly?: string) {
  const Model = modelFor(kind);
  await Model.updateOne({ _id: id }, { $unset: { reconciliationLeaseUntil: 1 }, $set: { nextReconcileAt: new Date(Date.now() + retryDelayMs), ...(anomaly ? { reconciliationAnomaly: anomaly } : {}) } }, { bypassTenantFilter: true });
}

export async function enqueueReconciliationBatch(queue: { add: Function }, options: { paymentStaleMinutes: number; refundStaleMinutes: number; batchSize: number }) {
  let count = 0;
  for (const kind of ['payment', 'refund'] as ReconciliationKind[]) {
    for (let index = 0; index < options.batchSize; index += 1) {
      const record = await claimReconciliation(kind, kind === 'payment' ? options.paymentStaleMinutes : options.refundStaleMinutes);
      if (!record) break;
      try {
        await queue.add(`${kind}.reconcile`, { kind, id: record._id.toString() }, { jobId: `${kind}-${record._id}`, attempts: 5, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: true, removeOnFail: 1000 });
        count += 1;
      } catch (error) {
        await releaseReconciliation(kind, record._id.toString(), 5_000, String((error as any)?.message || error));
        throw error;
      }
    }
  }
  return count;
}
