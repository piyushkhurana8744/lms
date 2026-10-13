"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueuePendingNotificationDeliveries = enqueuePendingNotificationDeliveries;
exports.recoverNotificationIntents = recoverNotificationIntents;
const database_1 = require("@edtech/database");
async function enqueuePendingNotificationDeliveries(queue, limit = 50, now = new Date()) {
    const deliveries = await database_1.NotificationDeliveryModel.find({ attemptCount: { $lt: 5 }, isRetryable: { $ne: false }, nextRetryAt: { $lte: now }, $or: [{ status: { $in: ['PENDING', 'FAILED'] } }, { status: 'PROCESSING', leaseUntil: { $lt: now } }] }).setOptions({ bypassTenantFilter: true }).sort({ createdAt: 1 }).limit(limit).select('_id').lean();
    for (const delivery of deliveries) {
        const id = delivery._id.toString();
        await queue.add('notification.email', { deliveryId: id }, { jobId: `notification_${id}`, attempts: 5, backoff: { type: 'exponential', delay: 5_000 }, removeOnComplete: 1000 });
    }
    return deliveries.length;
}
async function recoverNotificationIntents(consume, limit = 50, now = new Date()) { const intents = await database_1.NotificationIntentModel.find({ attemptCount: { $lt: 5 }, availableAt: { $lte: now }, $or: [{ status: { $in: ['PENDING', 'FAILED'] } }, { status: 'PROCESSING', leaseUntil: { $lt: now } }] }).sort({ createdAt: 1 }).limit(limit).select('eventId').lean(); for (const intent of intents)
    await consume(intent.eventId); return intents.length; }
//# sourceMappingURL=notificationDispatcher.js.map