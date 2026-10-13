import { NotificationDeliveryModel, NotificationIntentModel } from '@edtech/database';
export interface NotificationQueue { add(name: string, data: { deliveryId: string }, options: Record<string, unknown>): Promise<unknown>; }
export async function enqueuePendingNotificationDeliveries(queue: NotificationQueue, limit = 50, now = new Date()) {
  const deliveries = await NotificationDeliveryModel.find({ attemptCount: { $lt: 5 }, isRetryable: { $ne: false }, nextRetryAt: { $lte: now }, $or: [{ status: { $in: ['PENDING', 'FAILED'] } }, { status: 'PROCESSING', leaseUntil: { $lt: now } }] }).setOptions({ bypassTenantFilter: true }).sort({ createdAt: 1 }).limit(limit).select('_id').lean();
  for (const delivery of deliveries) { const id = delivery._id.toString(); await queue.add('notification.email', { deliveryId: id }, { jobId: `notification_${id}`, attempts: 5, backoff: { type: 'exponential', delay: 5_000 }, removeOnComplete: 1000 }); }
  return deliveries.length;
}
export async function recoverNotificationIntents(consume: (eventId: string) => Promise<void>, limit = 50, now = new Date()) { const intents = await NotificationIntentModel.find({ attemptCount: { $lt: 5 }, availableAt: { $lte: now }, $or: [{ status: { $in: ['PENDING', 'FAILED'] } }, { status: 'PROCESSING', leaseUntil: { $lt: now } }] }).sort({ createdAt: 1 }).limit(limit).select('eventId').lean(); for (const intent of intents) await consume(intent.eventId); return intents.length; }
