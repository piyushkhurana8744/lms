"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OUTBOX_LEASE_MS = exports.OUTBOX_MAX_ATTEMPTS = void 0;
exports.claimOutboxEvent = claimOutboxEvent;
exports.dispatchClaimedEvent = dispatchClaimedEvent;
exports.dispatchOutboxBatch = dispatchOutboxBatch;
const database_1 = require("@edtech/database");
exports.OUTBOX_MAX_ATTEMPTS = 5;
exports.OUTBOX_LEASE_MS = 60_000;
async function claimOutboxEvent(now = new Date()) {
    return database_1.OutboxEventModel.findOneAndUpdate({ attemptCount: { $lt: exports.OUTBOX_MAX_ATTEMPTS }, availableAt: { $lte: now }, $or: [{ status: { $in: ['PENDING', 'FAILED'] } }, { status: 'PROCESSING', leaseUntil: { $lt: now } }] }, { $set: { status: 'PROCESSING', leaseUntil: new Date(now.getTime() + exports.OUTBOX_LEASE_MS) }, $inc: { attemptCount: 1 } }, { new: true, sort: { createdAt: 1 } });
}
async function dispatchClaimedEvent(event, queue, processReceipt, afterPublish) {
    try {
        const payload = event.payload || {};
        if (event.eventType === 'receipt.generated' && payload.receiptId && processReceipt)
            await processReceipt(payload.receiptId);
        let email = payload.email;
        if (!email && payload.studentUserId) {
            const user = await database_1.UserModel.findOne({ _id: payload.studentUserId, tenantId: event.tenantId }).setOptions({ bypassTenantFilter: true }).select('email name').lean();
            email = user?.email;
            payload.studentName ||= user?.name;
        }
        if (email)
            await queue.add(event.eventType, { ...payload, email, tenantId: event.tenantId.toString(), eventId: event.eventId }, { jobId: event.eventId.replace(/[^a-zA-Z0-9_-]/g, '_'), attempts: 5, backoff: { type: 'exponential', delay: 5_000 }, removeOnComplete: 1000 });
        if (afterPublish)
            await afterPublish();
        event.status = 'PROCESSED';
        event.processedAt = new Date();
        event.leaseUntil = undefined;
        event.lastError = undefined;
        await event.save();
        return true;
    }
    catch (error) {
        event.status = event.attemptCount >= exports.OUTBOX_MAX_ATTEMPTS ? 'FAILED' : 'PENDING';
        event.availableAt = new Date(Date.now() + Math.min(300_000, 5_000 * (2 ** event.attemptCount)));
        event.leaseUntil = undefined;
        event.lastError = String(error?.message || 'Outbox dispatch failed').slice(0, 500);
        await event.save();
        return false;
    }
}
async function dispatchOutboxBatch(queue, processReceipt, batchSize = 25) {
    let processed = 0;
    for (; processed < batchSize; processed += 1) {
        const event = await claimOutboxEvent();
        if (!event)
            break;
        await dispatchClaimedEvent(event, queue, processReceipt);
    }
    return processed;
}
//# sourceMappingURL=outboxDispatcher.js.map