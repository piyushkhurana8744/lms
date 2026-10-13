import { OutboxEventModel, UserModel } from '@edtech/database';

export const OUTBOX_MAX_ATTEMPTS = 5;
export const OUTBOX_LEASE_MS = 60_000;

export interface QueuePublisher {
  add(name: string, data: any, options: any): Promise<any>;
}

export async function claimOutboxEvent(now = new Date()) {
  return OutboxEventModel.findOneAndUpdate(
    { attemptCount: { $lt: OUTBOX_MAX_ATTEMPTS }, availableAt: { $lte: now }, $or: [{ status: { $in: ['PENDING', 'FAILED'] } }, { status: 'PROCESSING', leaseUntil: { $lt: now } }] },
    { $set: { status: 'PROCESSING', leaseUntil: new Date(now.getTime() + OUTBOX_LEASE_MS) }, $inc: { attemptCount: 1 } },
    { new: true, sort: { createdAt: 1 } }
  );
}

export async function dispatchClaimedEvent(event: any, queue: QueuePublisher, processReceipt?: (receiptId: string) => Promise<void>, afterPublish?: () => Promise<void>, consumeNotification?: (eventId: string, eventType: string) => Promise<void>) {
  try {
    const payload: any = event.payload || {};
    if (event.eventType === 'receipt.generated' && payload.receiptId && processReceipt) await processReceipt(payload.receiptId);
    if (consumeNotification) await consumeNotification(event.eventId, event.eventType);
    let email = payload.email;
    if (!email && payload.studentUserId) {
      const user = await UserModel.findOne({ _id: payload.studentUserId, tenantId: event.tenantId }).setOptions({ bypassTenantFilter: true }).select('email name').lean();
      email = user?.email; payload.studentName ||= user?.name;
    }
    if (email) await queue.add(event.eventType, { ...payload, email, tenantId: event.tenantId.toString(), eventId: event.eventId }, { jobId: event.eventId.replace(/[^a-zA-Z0-9_-]/g, '_'), attempts: 5, backoff: { type: 'exponential', delay: 5_000 }, removeOnComplete: 1000 });
    if (afterPublish) await afterPublish();
    event.status = 'PROCESSED'; event.processedAt = new Date(); event.leaseUntil = undefined; event.lastError = undefined; await event.save();
    return true;
  } catch (error: any) {
    event.status = event.attemptCount >= OUTBOX_MAX_ATTEMPTS ? 'FAILED' : 'PENDING';
    event.availableAt = new Date(Date.now() + Math.min(300_000, 5_000 * (2 ** event.attemptCount)));
    event.leaseUntil = undefined; event.lastError = String(error?.message || 'Outbox dispatch failed').slice(0, 500); await event.save();
    return false;
  }
}

export async function dispatchOutboxBatch(queue: QueuePublisher, processReceipt?: (receiptId: string) => Promise<void>, batchSize = 25, consumeNotification?: (eventId: string, eventType: string) => Promise<void>) {
  let processed = 0;
  for (; processed < batchSize; processed += 1) {
    const event = await claimOutboxEvent();
    if (!event) break;
    await dispatchClaimedEvent(event, queue, processReceipt, undefined, consumeNotification);
  }
  return processed;
}
