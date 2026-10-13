import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NotificationDeliveryModel, NotificationModel, TenantModel, UserModel, connectDatabase, disconnectDatabase } from '@edtech/database';
import { APP_CONFIG } from '@edtech/config';
import { enqueuePendingNotificationDeliveries } from '../notificationDispatcher';

const mode = process.env.REDIS_RECOVERY_PROOF;
const suite = mode === 'OUTAGE' || mode === 'RECOVERY' ? describe : describe.skip;
const marker = 'phase14-real-redis-outage';

suite(`Phase 14 real Redis ${mode?.toLowerCase()} proof`, () => {
  beforeAll(async () => { await connectDatabase(process.env.MONGO_INTEGRATION_URI || 'mongodb://127.0.0.1:27017/edtech_lms_test?replicaSet=rs0&directConnection=true'); });
  afterAll(async () => { await disconnectDatabase(); });

  it(mode === 'OUTAGE' ? 'keeps durable delivery pending when BullMQ publish fails' : 'sweeps the durable delivery into BullMQ after Redis recovery', async () => {
    if (mode === 'OUTAGE') {
      const prior = await TenantModel.collection.findOne({ slug: marker }); if (prior) { await NotificationDeliveryModel.collection.deleteMany({ tenantId: prior._id }); await NotificationModel.collection.deleteMany({ tenantId: prior._id }); await UserModel.collection.deleteMany({ tenantId: prior._id }); await TenantModel.collection.deleteOne({ _id: prior._id }); }
      const tenant = await TenantModel.create({ name: 'Redis Recovery Tenant', slug: marker }); const tenantId = tenant._id;
      const user = await UserModel.create({ tenantId, allowedTenantIds: [tenantId], name: 'Redis Recovery User', email: 'redis-recovery@example.com', passwordHash: 'x', status: 'ACTIVE' }); const userId = user._id;
      const notification = await NotificationModel.create({ tenantId, recipientUserId: userId, type: 'certificate.issued', category: 'CERTIFICATE', title: 'Redis recovery', body: 'Durable before queue publish.', actionUrl: '/student/certificates', sourceType: 'Certificate', sourceId: marker, occurrenceKey: 'default', deduplicationKey: `${userId}:certificate.issued:Certificate:${marker}:default`, readAt: null });
      await NotificationDeliveryModel.create({ tenantId, notificationId: notification._id, recipientUserId: userId, channel: 'EMAIL', status: 'PENDING', attemptCount: 0, isRetryable: true, nextRetryAt: new Date(0) });
      const connection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', { lazyConnect: true, connectTimeout: 500, maxRetriesPerRequest: null, retryStrategy: () => null }); connection.on('error', () => undefined);
      const queue = new Queue(APP_CONFIG.QUEUES.NOTIFICATIONS, { connection });
      await expect(enqueuePendingNotificationDeliveries(queue)).rejects.toThrow();
      const delivery = await NotificationDeliveryModel.findOne({ tenantId }).setOptions({ bypassTenantFilter: true }); expect(delivery?.status).toBe('PENDING'); expect(delivery?.attemptCount).toBe(0);
      await queue.close().catch(() => undefined); connection.disconnect();
      return;
    }
    const tenant = await TenantModel.findOne({ slug: marker }).setOptions({ bypassTenantFilter: true }); const delivery = await NotificationDeliveryModel.findOne({ tenantId: tenant!._id, status: 'PENDING' }).setOptions({ bypassTenantFilter: true }); expect(delivery).not.toBeNull();
    const connection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', { maxRetriesPerRequest: null }); const queue = new Queue(APP_CONFIG.QUEUES.NOTIFICATIONS, { connection });
    await queue.waitUntilReady(); const count = await enqueuePendingNotificationDeliveries(queue); const job = await queue.getJob(`notification_${delivery!._id}`);
    expect(count).toBeGreaterThanOrEqual(1); expect(job?.data).toEqual({ deliveryId: delivery!._id.toString() }); expect((await NotificationDeliveryModel.findById(delivery!._id).setOptions({ bypassTenantFilter: true }))?.status).toBe('PENDING');
    await queue.close(); connection.disconnect();
  });
});
