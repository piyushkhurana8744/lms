"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.claimReconciliation = claimReconciliation;
exports.releaseReconciliation = releaseReconciliation;
exports.enqueueReconciliationBatch = enqueueReconciliationBatch;
const database_1 = require("@edtech/database");
const LEASE_MS = 60_000;
function modelFor(kind) { return kind === 'payment' ? database_1.PaymentModel : database_1.RefundModel; }
async function claimReconciliation(kind, staleMinutes, now = new Date()) {
    const Model = modelFor(kind);
    const status = kind === 'payment' ? 'PENDING' : 'PROCESSING';
    return Model.findOneAndUpdate({ status, createdAt: { $lte: new Date(now.getTime() - staleMinutes * 60_000) }, $and: [{ $or: [{ nextReconcileAt: { $exists: false } }, { nextReconcileAt: { $lte: now } }] }, { $or: [{ reconciliationLeaseUntil: { $exists: false } }, { reconciliationLeaseUntil: { $lt: now } }] }] }, { $set: { reconciliationLeaseUntil: new Date(now.getTime() + LEASE_MS) }, $inc: { reconciliationAttempts: 1 } }, { new: true, sort: { createdAt: 1 }, bypassTenantFilter: true });
}
async function releaseReconciliation(kind, id, retryDelayMs, anomaly) {
    const Model = modelFor(kind);
    await Model.updateOne({ _id: id }, { $unset: { reconciliationLeaseUntil: 1 }, $set: { nextReconcileAt: new Date(Date.now() + retryDelayMs), ...(anomaly ? { reconciliationAnomaly: anomaly } : {}) } }, { bypassTenantFilter: true });
}
async function enqueueReconciliationBatch(queue, options) {
    let count = 0;
    for (const kind of ['payment', 'refund']) {
        for (let index = 0; index < options.batchSize; index += 1) {
            const record = await claimReconciliation(kind, kind === 'payment' ? options.paymentStaleMinutes : options.refundStaleMinutes);
            if (!record)
                break;
            try {
                await queue.add(`${kind}.reconcile`, { kind, id: record._id.toString() }, { jobId: `${kind}-${record._id}`, attempts: 5, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: true, removeOnFail: 1000 });
                count += 1;
            }
            catch (error) {
                await releaseReconciliation(kind, record._id.toString(), 5_000, String(error?.message || error));
                throw error;
            }
        }
    }
    return count;
}
//# sourceMappingURL=financeReconciliation.js.map