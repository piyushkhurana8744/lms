import { Queue } from '../../../../worker/node_modules/bullmq';
import { consumeNotificationIntent, processNotificationDelivery } from './notification-system-test-helper';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  BatchModel, CourseModel, EnrollmentModel, NotificationDeliveryModel,
  NotificationIntentModel, NotificationModel, OrganizationEmailSettingsModel,
  OrganizationMemberModel, StudentLifecycleEventModel, StudentLifecycleModel,
  TenantModel, UserModel, connectDatabase, disconnectDatabase
} from '@edtech/database';
import { APP_CONFIG } from '@edtech/config';
import { tenantContextStorage } from '@edtech/utils';
import { StudentLifecycleService } from '../studentLifecycle.service';
import { NotificationService } from '../notification.service';
import { EmailService } from '../email/email.service';

const mode = process.env.PHASE16_REDIS_PROOF;
const suite = mode === 'OUTAGE' || mode === 'RECOVERY' ? describe : describe.skip;
const marker = 'phase16-real-redis-proof';
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6391';

suite(`Phase 16 real Redis ${mode?.toLowerCase()} proof`, () => {
  beforeAll(async () => connectDatabase(process.env.MONGO_INTEGRATION_URI || 'mongodb://127.0.0.1:27017/edtech_lms_test?replicaSet=rs0&directConnection=true'));
  afterAll(async () => { vi.restoreAllMocks(); await disconnectDatabase(); });

  it(mode === 'OUTAGE' ? 'commits canonical transfer while BullMQ is unavailable' : 'recovers and delivers once without lifecycle mutation', async () => {
    if (mode === 'OUTAGE') {
      const connection = new Redis(redisUrl, { lazyConnect: true, connectTimeout: 500, enableOfflineQueue: false, maxRetriesPerRequest: 0, retryStrategy: () => null });
      connection.on('error', () => undefined);
      await expect(connection.connect()).rejects.toThrow();
      const queue = new Queue(APP_CONFIG.QUEUES.NOTIFICATIONS, { connection });
      await expect(queue.add('probe', { marker }, { jobId: marker })).rejects.toThrow();
      await queue.close().catch(() => undefined); connection.disconnect();

      const prior = await TenantModel.collection.findOne({ slug: marker });
      if (prior) {
        await Promise.all([
          NotificationDeliveryModel.collection.deleteMany({ tenantId: prior._id }), NotificationModel.collection.deleteMany({ tenantId: prior._id }), NotificationIntentModel.collection.deleteMany({ tenantId: prior._id }), StudentLifecycleEventModel.collection.deleteMany({ tenantId: prior._id }), StudentLifecycleModel.collection.deleteMany({ tenantId: prior._id }), EnrollmentModel.collection.deleteMany({ tenantId: prior._id }), BatchModel.collection.deleteMany({ tenantId: prior._id }), CourseModel.collection.deleteMany({ tenantId: prior._id }), OrganizationMemberModel.collection.deleteMany({ tenantId: prior._id }), UserModel.collection.deleteMany({ tenantId: prior._id })
        ]);
        await TenantModel.collection.deleteOne({ _id: prior._id });
      }
      const tenant = await TenantModel.create({ name: 'Phase 16 Redis Proof', slug: marker });
      const tenantId = tenant._id; const adminId = new mongoose.Types.ObjectId(); const studentId = new mongoose.Types.ObjectId(); const courseId = new mongoose.Types.ObjectId(); const batchA = new mongoose.Types.ObjectId(); const batchB = new mongoose.Types.ObjectId();
      await UserModel.collection.insertMany([
        { _id: adminId, tenantId, allowedTenantIds: [tenantId], name: 'Proof Admin', email: 'admin@phase16-proof.test', passwordHash: 'x', status: 'ACTIVE' },
        { _id: studentId, tenantId, allowedTenantIds: [tenantId], name: 'Proof Student', email: 'student@phase16-proof.test', passwordHash: 'x', status: 'ACTIVE' }
      ]);
      const actor = { userId: adminId.toString(), roles: ['TENANT_ADMIN'] };
      await tenantContextStorage.run({ currentTenantId: tenantId.toString(), currentUserId: adminId.toString() }, async () => {
        await OrganizationMemberModel.create({ tenantId, userId: studentId, role: 'STUDENT', status: 'ACTIVE', joinedAt: new Date() });
        await CourseModel.create({ _id: courseId, tenantId, title: 'Proof Course', slug: marker, status: 'PUBLISHED' });
        const batchBase = { tenantId, courseId, mode: 'ONLINE', status: 'ONGOING', startDate: new Date(), maxSeats: 30, enrolledCount: 0, timing: { startTime: '10:00', endTime: '11:00', timezone: 'Asia/Kolkata' }, daysOfWeek: ['MONDAY'], showOnWebsite: false };
        await BatchModel.collection.insertMany([{ _id: batchA, ...batchBase, name: 'Proof A', batchCode: 'P16-A' }, { _id: batchB, ...batchBase, name: 'Proof B', batchCode: 'P16-B' }]);
        const enrollment = await EnrollmentModel.create({ tenantId, studentId, courseId, status: 'ACTIVE', enrolledAt: new Date(), progressPercent: 0 });

        const lifecycle = await StudentLifecycleService.initializeLifecycle({ tenantId: tenantId.toString(), studentUserId: studentId, currentEnrollmentId: enrollment._id, currentBatchId: batchA });
        await StudentLifecycleService.activateStudent(lifecycle._id.toString(), {}, actor);
        await StudentLifecycleService.transferStudent(lifecycle._id.toString(), { toBatchId: batchB.toString(), reason: marker, expectedRevision: 1 }, actor);
      });
      const lifecycle = await StudentLifecycleModel.collection.findOne({ tenantId, studentUserId: studentId });
      expect(lifecycle?.revision).toBe(2); expect(lifecycle?.currentBatchId?.toString()).toBe(batchB.toString());
      expect(await StudentLifecycleEventModel.collection.countDocuments({ tenantId, lifecycleId: lifecycle!._id, eventType: 'TRANSFERRED' })).toBe(1);
      expect(await NotificationIntentModel.collection.countDocuments({ tenantId, sourceId: lifecycle!._id.toString(), type: 'student.batch_transferred' })).toBe(1);
      expect(await NotificationModel.collection.countDocuments({ tenantId, sourceId: lifecycle!._id.toString() })).toBe(0);
      expect(await NotificationDeliveryModel.collection.countDocuments({ tenantId })).toBe(0);
      return;
    }

    const tenant = await TenantModel.collection.findOne({ slug: marker }); expect(tenant).not.toBeNull();
    const lifecycle = await StudentLifecycleModel.collection.findOne({ tenantId: tenant!._id }); expect(lifecycle).not.toBeNull();
    const before = { id: lifecycle!._id.toString(), revision: lifecycle!.revision, status: lifecycle!.currentStatus, batch: lifecycle!.currentBatchId!.toString(), events: await StudentLifecycleEventModel.collection.countDocuments({ lifecycleId: lifecycle!._id }) };
    const intent = await NotificationIntentModel.collection.findOne({ tenantId: tenant!._id, type: 'student.batch_transferred' }); expect(intent?.status).toBe('PENDING');
    await OrganizationEmailSettingsModel.collection.deleteMany({ tenantId: tenant!._id });
    await OrganizationEmailSettingsModel.create({ tenantId: tenant!._id, provider: 'SMTP', status: 'VERIFIED', fromName: 'Proof', fromEmail: 'proof@example.com' });
    const sendEmail = vi.fn().mockResolvedValue({ success: true, messageId: 'phase16-redis-recovered' });
    vi.spyOn(EmailService, 'createProvider').mockReturnValue({ sendEmail, verifyConnection: vi.fn(), getProviderName: () => 'DOUBLE' });
    await consumeNotificationIntent(intent!.eventId);
    const connection = new Redis(redisUrl, { maxRetriesPerRequest: null }); const queue = new Queue(APP_CONFIG.QUEUES.NOTIFICATIONS, { connection }); await queue.waitUntilReady();
    const delivery = await NotificationDeliveryModel.collection.findOne({ tenantId: tenant!._id }); expect(delivery).not.toBeNull();
    const publish = () => queue.add('notification.email', { deliveryId: delivery!._id.toString() }, { jobId: `notification_${delivery!._id}`, attempts: 5, backoff: { type: 'exponential', delay: 5_000 }, removeOnComplete: 1000 });
    await publish();
    expect(await queue.getJob(`notification_${delivery!._id}`)).not.toBeNull();
    await processNotificationDelivery(delivery!._id.toString());
    await consumeNotificationIntent(intent!.eventId); await publish(); await processNotificationDelivery(delivery!._id.toString());
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(await NotificationModel.collection.countDocuments({ tenantId: tenant!._id, sourceId: lifecycle!._id.toString(), type: 'student.batch_transferred' })).toBe(1);
    expect(await NotificationDeliveryModel.collection.countDocuments({ tenantId: tenant!._id })).toBe(1);
    expect((await NotificationDeliveryModel.collection.findOne({ _id: delivery!._id }))?.status).toBe('DELIVERED');
    const after = await StudentLifecycleModel.collection.findOne({ _id: lifecycle!._id });
    expect({ id: after!._id.toString(), revision: after!.revision, status: after!.currentStatus, batch: after!.currentBatchId!.toString(), events: await StudentLifecycleEventModel.collection.countDocuments({ lifecycleId: after!._id }) }).toEqual(before);
    await queue.close(); connection.disconnect();
  });
});
