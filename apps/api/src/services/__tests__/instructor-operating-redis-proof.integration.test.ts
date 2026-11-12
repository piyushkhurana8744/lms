import { Queue } from '../../../../worker/node_modules/bullmq';
import { consumeNotificationIntent, processNotificationDelivery } from './notification-system-test-helper';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  AssessmentModel,
  AssessmentSubmissionModel,
  AuditLogModel,
  BatchModel,
  CourseModel,
  EnrollmentModel,
  NotificationDeliveryModel,
  NotificationIntentModel,
  NotificationModel,
  OrganizationEmailSettingsModel,
  OrganizationMemberModel,
  TenantModel,
  UserModel,
  connectDatabase,
  disconnectDatabase
} from '@edtech/database';
import { APP_CONFIG } from '@edtech/config';
import { tenantContextStorage } from '@edtech/utils';
import { AssessmentService } from '../assessment.service';
import { NotificationService, setNotificationHandoffFailure } from '../notification.service';
import { EmailService } from '../email/email.service';

const mode = process.env.PHASE17_REDIS_PROOF;
const suite = mode === 'OUTAGE' || mode === 'RECOVERY' ? describe : describe.skip;
const marker = 'phase17-real-redis-proof';
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6391';

suite(`Phase 17 real Redis ${mode?.toLowerCase()} proof`, () => {
  beforeAll(async () => connectDatabase(process.env.MONGO_INTEGRATION_URI || 'mongodb://127.0.0.1:27017/edtech_lms_test?replicaSet=rs0&directConnection=true'));
  afterAll(async () => { vi.restoreAllMocks(); await disconnectDatabase(); });

  it(mode === 'OUTAGE' ? 'commits canonical grading while BullMQ is unavailable' : 'recovers grading notification once without grade mutation', async () => {
    if (mode === 'OUTAGE') {
      const connection = new Redis(redisUrl, { lazyConnect: true, connectTimeout: 500, enableOfflineQueue: false, maxRetriesPerRequest: 0, retryStrategy: () => null });
      connection.on('error', () => undefined);
      await expect(connection.connect()).rejects.toThrow();
      const queue = new Queue(APP_CONFIG.QUEUES.NOTIFICATIONS, { connection });
      await expect(queue.add('probe', { marker }, { jobId: marker })).rejects.toThrow();
      await queue.close().catch(() => undefined);
      connection.disconnect();

      const prior = await TenantModel.collection.findOne({ slug: marker });
      if (prior) {
        await Promise.all([
          NotificationDeliveryModel.collection.deleteMany({ tenantId: prior._id }),
          NotificationModel.collection.deleteMany({ tenantId: prior._id }),
          NotificationIntentModel.collection.deleteMany({ tenantId: prior._id }),
          AuditLogModel.collection.deleteMany({ tenantId: prior._id }),
          AssessmentSubmissionModel.collection.deleteMany({ tenantId: prior._id }),
          AssessmentModel.collection.deleteMany({ tenantId: prior._id }),
          EnrollmentModel.collection.deleteMany({ tenantId: prior._id }),
          BatchModel.collection.deleteMany({ tenantId: prior._id }),
          CourseModel.collection.deleteMany({ tenantId: prior._id }),
          OrganizationMemberModel.collection.deleteMany({ tenantId: prior._id }),
          UserModel.collection.deleteMany({ tenantId: prior._id })
        ]);
        await TenantModel.collection.deleteOne({ _id: prior._id });
      }

      const tenant = await TenantModel.create({ name: 'Phase 17 Redis Proof', slug: marker });
      const tenantId = tenant._id;
      const instructorId = new mongoose.Types.ObjectId();
      const studentId = new mongoose.Types.ObjectId();
      const courseId = new mongoose.Types.ObjectId();
      const batchId = new mongoose.Types.ObjectId();
      const assessmentId = new mongoose.Types.ObjectId();

      await UserModel.collection.insertMany([
        { _id: instructorId, tenantId, allowedTenantIds: [tenantId], name: 'Proof Instructor', email: 'instructor@phase17-proof.test', passwordHash: 'x', status: 'ACTIVE' },
        { _id: studentId, tenantId, allowedTenantIds: [tenantId], name: 'Proof Student', email: 'student@phase17-proof.test', passwordHash: 'x', status: 'ACTIVE' }
      ]);
      await OrganizationMemberModel.collection.insertMany([
        { tenantId, userId: instructorId, role: 'INSTRUCTOR', status: 'ACTIVE', joinedAt: new Date() },
        { tenantId, userId: studentId, role: 'STUDENT', status: 'ACTIVE', joinedAt: new Date() }
      ]);
      let submission: any;
      await tenantContextStorage.run({ currentTenantId: tenantId.toString(), currentUserId: instructorId.toString() }, async () => {
        await CourseModel.create({ _id: courseId, tenantId, title: 'Proof Course', slug: marker, status: 'PUBLISHED' });
        await BatchModel.create({
          _id: batchId,
          tenantId,
          courseId,
          instructorId,
          name: 'Proof Batch',
          batchCode: 'P17-REDIS',
          mode: 'ONLINE',
          status: 'ONGOING',
          startDate: new Date(),
          maxSeats: 30,
          enrolledCount: 1,
          timing: { startTime: '10:00', endTime: '11:00', timezone: 'Asia/Kolkata' },
          daysOfWeek: ['MONDAY'],
          showOnWebsite: false
        });
        await EnrollmentModel.create({ tenantId, studentId, courseId, status: 'ACTIVE', enrolledAt: new Date(), progressPercent: 0 });
        await AssessmentModel.create({
          _id: assessmentId,
          tenantId,
          type: 'ASSIGNMENT',
          scope: 'BATCH_LINKED',
          batchId,
          courseId,
          title: 'Redis Outage Assignment',
          slug: 'redis-outage-assignment',
          description: 'Testing durable grading intent during Redis outage',
          status: 'PUBLISHED',
          showOnWebsite: false,
          assignmentDetails: { maxScore: 100 },
          createdBy: instructorId
        });

        submission = await AssessmentSubmissionModel.create({
          tenantId,
          assessmentId,
          userId: studentId,
          batchId,
          courseId,
          type: 'ASSIGNMENT',
          attemptNumber: 1,
          score: 0,
          maxScore: 100,
          scorePercentage: 0,
          status: 'SUBMITTED',
          revision: 0,
          gradingHistory: []
        });
      });

      setNotificationHandoffFailure(true);
      // Grade submission while Redis is demonstrably down
      await tenantContextStorage.run({ currentTenantId: tenantId.toString(), currentUserId: instructorId.toString() }, async () => {
        await AssessmentService.gradeSubmission({
          tenantId: tenantId.toString(),
          submissionId: submission._id.toString(),
          score: 88,
          feedback: 'Durable intent created during outage',
          graderId: instructorId.toString(),
          expectedRevision: 0
        });
      });
      setNotificationHandoffFailure(false);

      const updatedSub = await AssessmentSubmissionModel.collection.findOne({ _id: submission._id });
      expect(updatedSub?.score).toBe(88);
      expect(updatedSub?.revision).toBe(1);
      expect(updatedSub?.status).toBe('GRADED');
      expect(updatedSub?.gradingHistory).toHaveLength(1);
      expect(await AuditLogModel.collection.countDocuments({ tenantId: tenantId.toString(), resourceId: submission._id.toString() })).toBe(1);

      const intent = await NotificationIntentModel.collection.findOne({ tenantId, sourceId: submission._id.toString(), type: 'assessment.graded' });
      expect(intent).not.toBeNull();
      expect(intent?.status).toBe('PENDING');

      expect(await NotificationModel.collection.countDocuments({ tenantId })).toBe(0);
      expect(await NotificationDeliveryModel.collection.countDocuments({ tenantId })).toBe(0);
      return;
    }

    // RECOVERY
    const tenant = await TenantModel.collection.findOne({ slug: marker });
    expect(tenant).not.toBeNull();
    const submission = await AssessmentSubmissionModel.collection.findOne({ tenantId: tenant!._id });
    expect(submission).not.toBeNull();

    const before = {
      id: submission!._id.toString(),
      score: submission!.score,
      revision: submission!.revision,
      status: submission!.status,
      graderId: submission!.gradedBy?.toString(),
      historyCount: submission!.gradingHistory.length
    };

    const intent = await NotificationIntentModel.collection.findOne({ tenantId: tenant!._id, type: 'assessment.graded' });
    expect(intent).not.toBeNull();
    expect(intent?.status).toBe('PENDING');

    await OrganizationEmailSettingsModel.collection.deleteMany({ tenantId: tenant!._id });
    await OrganizationEmailSettingsModel.create({
      tenantId: tenant!._id,
      provider: 'SMTP',
      status: 'VERIFIED',
      fromName: 'Phase 17 Recovery',
      fromEmail: 'proof17@example.com'
    });

    const sendEmail = vi.fn().mockResolvedValue({ success: true, messageId: 'phase17-redis-recovered' });
    vi.spyOn(EmailService, 'createProvider').mockReturnValue({
      sendEmail,
      verifyConnection: vi.fn(),
      getProviderName: () => 'MOCK_PROVIDER'
    });

    // Redis is back up
    const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
    const pong = await connection.ping();
    expect(pong).toBe('PONG');
    const queue = new Queue(APP_CONFIG.QUEUES.NOTIFICATIONS, { connection });
    await queue.waitUntilReady();

    // Consume intent
    await consumeNotificationIntent(intent!.eventId);
    const delivery = await NotificationDeliveryModel.collection.findOne({ tenantId: tenant!._id });
    expect(delivery).not.toBeNull();

    const publish = () => queue.add('notification.email', { deliveryId: delivery!._id.toString() }, { jobId: `notification_${delivery!._id}`, attempts: 5, backoff: { type: 'exponential', delay: 5_000 }, removeOnComplete: 1000 });
    await publish();
    expect(await queue.getJob(`notification_${delivery!._id}`)).not.toBeNull();

    await processNotificationDelivery(delivery!._id.toString());

    // Second recovery sweep replay
    await consumeNotificationIntent(intent!.eventId);
    await publish();
    await processNotificationDelivery(delivery!._id.toString());

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(await NotificationModel.collection.countDocuments({ tenantId: tenant!._id, sourceId: submission!._id.toString(), type: 'assessment.graded' })).toBe(1);
    expect(await NotificationDeliveryModel.collection.countDocuments({ tenantId: tenant!._id })).toBe(1);
    expect((await NotificationDeliveryModel.collection.findOne({ _id: delivery!._id }))?.status).toBe('DELIVERED');

    // Prove ZERO grade mutation during recovery
    const after = await AssessmentSubmissionModel.collection.findOne({ _id: submission!._id });
    expect({
      id: after!._id.toString(),
      score: after!.score,
      revision: after!.revision,
      status: after!.status,
      graderId: after!.gradedBy?.toString(),
      historyCount: after!.gradingHistory.length
    }).toEqual(before);

    await queue.close();
    connection.disconnect();
  });
});
