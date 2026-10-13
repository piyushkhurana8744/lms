import { Queue } from '../../../../worker/node_modules/bullmq';
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

      const prior = await TenantModel.findOne({ slug: marker }).setOptions({ bypassTenantFilter: true });
      if (prior) {
        await Promise.all([
          NotificationDeliveryModel.deleteMany({ tenantId: prior._id }).setOptions({ bypassTenantFilter: true }), NotificationModel.deleteMany({ tenantId: prior._id }).setOptions({ bypassTenantFilter: true }), NotificationIntentModel.deleteMany({ tenantId: prior._id }).setOptions({ bypassTenantFilter: true }), StudentLifecycleEventModel.deleteMany({ tenantId: prior._id }).setOptions({ bypassTenantFilter: true }), StudentLifecycleModel.deleteMany({ tenantId: prior._id }).setOptions({ bypassTenantFilter: true }), EnrollmentModel.deleteMany({ tenantId: prior._id }).setOptions({ bypassTenantFilter: true }), BatchModel.deleteMany({ tenantId: prior._id }).setOptions({ bypassTenantFilter: true }), CourseModel.deleteMany({ tenantId: prior._id }).setOptions({ bypassTenantFilter: true }), OrganizationMemberModel.deleteMany({ tenantId: prior._id }).setOptions({ bypassTenantFilter: true }), UserModel.deleteMany({ tenantId: prior._id }).setOptions({ bypassTenantFilter: true })
        ]);
        await TenantModel.deleteOne({ _id: prior._id }).setOptions({ bypassTenantFilter: true });
      }
      const tenant = await TenantModel.create({ name: 'Phase 16 Redis Proof', slug: marker });
      const tenantId = tenant._id; const adminId = new mongoose.Types.ObjectId(); const studentId = new mongoose.Types.ObjectId(); const courseId = new mongoose.Types.ObjectId(); const batchA = new mongoose.Types.ObjectId(); const batchB = new mongoose.Types.ObjectId();
      await UserModel.collection.insertMany([
        { _id: adminId, tenantId, allowedTenantIds: [tenantId], name: 'Proof Admin', email: 'admin@phase16-proof.test', passwordHash: 'x', status: 'ACTIVE' },
        { _id: studentId, tenantId, allowedTenantIds: [tenantId], name: 'Proof Student', email: 'student@phase16-proof.test', passwordHash: 'x', status: 'ACTIVE' }
      ]);
      await OrganizationMemberModel.create({ tenantId, userId: studentId, role: 'STUDENT', status: 'ACTIVE', joinedAt: new Date() });
      await CourseModel.create({ _id: courseId, tenantId, title: 'Proof Course', slug: marker, status: 'PUBLISHED' });
      const batchBase = { tenantId, courseId, mode: 'ONLINE', status: 'ONGOING', startDate: new Date(), maxSeats: 30, enrolledCount: 0, timing: { startTime: '10:00', endTime: '11:00', timezone: 'Asia/Kolkata' }, daysOfWeek: ['MONDAY'], showOnWebsite: false };
      await BatchModel.collection.insertMany([{ _id: batchA, ...batchBase, name: 'Proof A', batchCode: 'P16-A' }, { _id: batchB, ...batchBase, name: 'Proof B', batchCode: 'P16-B' }]);
      const enrollment = await EnrollmentModel.create({ tenantId, studentId, courseId, status: 'ACTIVE', enrolledAt: new Date(), progressPercent: 0 });
      const actor = { userId: adminId.toString(), roles: ['TENANT_ADMIN'] };
      await tenantContextStorage.run({ currentTenantId: tenantId.toString(), currentUserId: adminId.toString() }, async () => {
        const lifecycle = await StudentLifecycleService.initializeLifecycle({ tenantId: tenantId.toString(), studentUserId: studentId, currentEnrollmentId: enrollment._id, currentBatchId: batchA });
        await StudentLifecycleService.activateStudent(lifecycle._id.toString(), {}, actor);
        await StudentLifecycleService.transferStudent(lifecycle._id.toString(), { toBatchId: batchB.toString(), reason: marker, expectedRevision: 1 }, actor);
      });
      const lifecycle = await StudentLifecycleModel.findOne({ tenantId, studentUserId: studentId }).setOptions({ bypassTenantFilter: true });
      expect(lifecycle?.revision).toBe(2); expect(lifecycle?.currentBatchId?.toString()).toBe(batchB.toString());
      expect(await StudentLifecycleEventModel.countDocuments({ tenantId, lifecycleId: lifecycle!._id, eventType: 'TRANSFERRED' }).setOptions({ bypassTenantFilter: true })).toBe(1);
      expect(await NotificationIntentModel.countDocuments({ tenantId, sourceId: lifecycle!._id.toString(), type: 'student.batch_transferred' }).setOptions({ bypassTenantFilter: true })).toBe(1);
      expect(await NotificationModel.countDocuments({ tenantId, sourceId: lifecycle!._id.toString() }).setOptions({ bypassTenantFilter: true })).toBe(0);
      expect(await NotificationDeliveryModel.countDocuments({ tenantId }).setOptions({ bypassTenantFilter: true })).toBe(0);
      return;
    }

    const tenant = await TenantModel.findOne({ slug: marker }).setOptions({ bypassTenantFilter: true }); expect(tenant).not.toBeNull();
    const lifecycle = await StudentLifecycleModel.findOne({ tenantId: tenant!._id }).setOptions({ bypassTenantFilter: true }); expect(lifecycle).not.toBeNull();
    const before = { id: lifecycle!._id.toString(), revision: lifecycle!.revision, status: lifecycle!.currentStatus, batch: lifecycle!.currentBatchId!.toString(), events: await StudentLifecycleEventModel.countDocuments({ lifecycleId: lifecycle!._id }).setOptions({ bypassTenantFilter: true }) };
    const intent = await NotificationIntentModel.findOne({ tenantId: tenant!._id, type: 'student.batch_transferred' }).setOptions({ bypassTenantFilter: true }); expect(intent?.status).toBe('PENDING');
    await OrganizationEmailSettingsModel.deleteMany({ tenantId: tenant!._id }).setOptions({ bypassTenantFilter: true });
    await OrganizationEmailSettingsModel.create({ tenantId: tenant!._id, provider: 'SMTP', status: 'VERIFIED', fromName: 'Proof', fromEmail: 'proof@example.com' });
    const sendEmail = vi.fn().mockResolvedValue({ success: true, messageId: 'phase16-redis-recovered' });
    vi.spyOn(EmailService, 'createProvider').mockReturnValue({ sendEmail, verifyConnection: vi.fn(), getProviderName: () => 'DOUBLE' });
    await NotificationService.consumeOutboxEvent(intent!.eventId);
    const connection = new Redis(redisUrl, { maxRetriesPerRequest: null }); const queue = new Queue(APP_CONFIG.QUEUES.NOTIFICATIONS, { connection }); await queue.waitUntilReady();
    const delivery = await NotificationDeliveryModel.findOne({ tenantId: tenant!._id }).setOptions({ bypassTenantFilter: true }); expect(delivery).not.toBeNull();
    const publish = () => queue.add('notification.email', { deliveryId: delivery!._id.toString() }, { jobId: `notification_${delivery!._id}`, attempts: 5, backoff: { type: 'exponential', delay: 5_000 }, removeOnComplete: 1000 });
    await publish();
    expect(await queue.getJob(`notification_${delivery!._id}`)).not.toBeNull();
    await NotificationService.processDelivery(delivery!._id.toString());
    await NotificationService.consumeOutboxEvent(intent!.eventId); await publish(); await NotificationService.processDelivery(delivery!._id.toString());
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(await NotificationModel.countDocuments({ tenantId: tenant!._id, sourceId: lifecycle!._id.toString(), type: 'student.batch_transferred' }).setOptions({ bypassTenantFilter: true })).toBe(1);
    expect(await NotificationDeliveryModel.countDocuments({ tenantId: tenant!._id }).setOptions({ bypassTenantFilter: true })).toBe(1);
    expect((await NotificationDeliveryModel.findById(delivery!._id).setOptions({ bypassTenantFilter: true }))?.status).toBe('DELIVERED');
    const after = await StudentLifecycleModel.findById(lifecycle!._id).setOptions({ bypassTenantFilter: true });
    expect({ id: after!._id.toString(), revision: after!.revision, status: after!.currentStatus, batch: after!.currentBatchId!.toString(), events: await StudentLifecycleEventModel.countDocuments({ lifecycleId: after!._id }).setOptions({ bypassTenantFilter: true }) }).toEqual(before);
    await queue.close(); connection.disconnect();
  });
});
