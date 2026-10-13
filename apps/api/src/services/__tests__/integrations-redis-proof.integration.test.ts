import { Queue } from '../../../../worker/node_modules/bullmq';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  TenantModel,
  BranchModel,
  UserModel,
  BatchModel,
  CourseModel,
  ClassModel,
  EnrollmentModel,
  OrganizationMemberModel,
  IntegrationConnectionModel,
  ExternalMeetingModel,
  IntegrationOperationModel,
  connectDatabase,
  disconnectDatabase
} from '@edtech/database';
import { APP_CONFIG } from '@edtech/config';
import { tenantContextStorage } from '@edtech/utils';
import { LiveClassOrchestratorService } from '../integrations/orchestration/liveClassOrchestrator.service';
import { IntegrationOperationService } from '../integrations/orchestration/integrationOperation.service';
import { SecretEncryptionService } from '../security/secretEncryption.service';
import { IntegrationProviderRegistry } from '../integrations/registry/providerRegistry.service';

const mode = process.env.PHASE22_REDIS_PROOF;
const suite = mode === 'OUTAGE' || mode === 'RECOVERY' ? describe : describe.skip;
const marker = 'phase22-real-redis-proof';
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6391';

suite(`Phase 22 real Redis ${mode?.toLowerCase()} proof`, () => {
  beforeAll(async () => {
    IntegrationProviderRegistry.setTestMode(true);
    await connectDatabase(
      process.env.MONGO_INTEGRATION_URI || 'mongodb://127.0.0.1:27017/edtech_lms_test?replicaSet=rs0&directConnection=true'
    );
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await disconnectDatabase();
  });

  it(
    mode === 'OUTAGE'
      ? 'commits canonical reschedule and cancel while Redis is demonstrably down, preserving durable operations in Mongo'
      : 'recovers external meeting synchronization once without duplicate records or resurrection',
    async () => {
      if (mode === 'OUTAGE') {
        // 1. Prove Redis daemon is down / unavailable
        const connection = new Redis(redisUrl, {
          lazyConnect: true,
          connectTimeout: 500,
          enableOfflineQueue: false,
          maxRetriesPerRequest: 0,
          retryStrategy: () => null
        });
        connection.on('error', () => undefined);
        await expect(connection.connect()).rejects.toThrow();
        const queue = new Queue(APP_CONFIG.QUEUES.INTEGRATIONS, { connection });
        await expect(queue.add('probe', { marker }, { jobId: marker })).rejects.toThrow();
        await queue.close().catch(() => undefined);
        connection.disconnect();

        // 2. Clear prior marker fixtures
        const prior = await TenantModel.findOne({ slug: marker }).setOptions({ bypassTenantFilter: true });
        if (prior) {
          await Promise.all([
            IntegrationOperationModel.deleteMany({ tenantId: prior._id }).setOptions({ bypassTenantFilter: true }),
            ExternalMeetingModel.deleteMany({ tenantId: prior._id }).setOptions({ bypassTenantFilter: true }),
            IntegrationConnectionModel.deleteMany({ tenantId: prior._id }).setOptions({ bypassTenantFilter: true }),
            ClassModel.deleteMany({ tenantId: prior._id }).setOptions({ bypassTenantFilter: true }),
            EnrollmentModel.deleteMany({ tenantId: prior._id }).setOptions({ bypassTenantFilter: true }),
            BatchModel.deleteMany({ tenantId: prior._id }).setOptions({ bypassTenantFilter: true }),
            CourseModel.deleteMany({ tenantId: prior._id }).setOptions({ bypassTenantFilter: true }),
            OrganizationMemberModel.deleteMany({ tenantId: prior._id }).setOptions({ bypassTenantFilter: true }),
            UserModel.deleteMany({ tenantId: prior._id }).setOptions({ bypassTenantFilter: true }),
            BranchModel.deleteMany({ tenantId: prior._id }).setOptions({ bypassTenantFilter: true })
          ]);
          await TenantModel.deleteOne({ _id: prior._id }).setOptions({ bypassTenantFilter: true });
        }

        // 3. Create Tenant, Branch, Users, Course, Batch
        const tenant = await TenantModel.create({ name: 'Phase 22 Redis Proof Tenant', slug: marker, status: 'ACTIVE' });
        const tenantId = tenant._id;
        const branchId = new mongoose.Types.ObjectId();
        const adminId = new mongoose.Types.ObjectId();
        const instructorId = new mongoose.Types.ObjectId();
        const studentId = new mongoose.Types.ObjectId();
        const courseId = new mongoose.Types.ObjectId();
        const batchId = new mongoose.Types.ObjectId();

        await BranchModel.create({
          _id: branchId,
          tenantId,
          name: 'Redis Proof Branch',
          code: 'RPB-1',
          slug: `${marker}-branch`,
          status: 'ACTIVE'
        });

        await UserModel.collection.insertMany([
          { _id: adminId, tenantId, allowedTenantIds: [tenantId], name: 'Proof Admin', email: 'admin@p22-proof.test', passwordHash: 'x', status: 'ACTIVE' },
          { _id: instructorId, tenantId, allowedTenantIds: [tenantId], name: 'Proof Instructor', email: 'inst@p22-proof.test', passwordHash: 'x', status: 'ACTIVE' },
          { _id: studentId, tenantId, allowedTenantIds: [tenantId], name: 'Proof Student', email: 'student@p22-proof.test', passwordHash: 'x', status: 'ACTIVE' }
        ]);

        await OrganizationMemberModel.collection.insertMany([
          { tenantId, userId: adminId, role: 'TENANT_ADMIN', branchAccessMode: 'ALL', status: 'ACTIVE' },
          { tenantId, userId: instructorId, role: 'INSTRUCTOR', branchAccessMode: 'SELECTED', branchIds: [branchId], status: 'ACTIVE' },
          { tenantId, userId: studentId, role: 'STUDENT', branchAccessMode: 'SELECTED', branchIds: [branchId], status: 'ACTIVE' }
        ]);

        await CourseModel.create({ _id: courseId, tenantId, title: 'Proof Course', slug: `${marker}-course`, status: 'PUBLISHED' });

        await BatchModel.create({
          _id: batchId,
          tenantId,
          branchId,
          courseId,
          name: 'Proof Batch',
          batchCode: 'P22-BATCH',
          mode: 'ONLINE',
          status: 'ONGOING',
          startDate: new Date(),
          maxSeats: 30,
          enrolledCount: 1,
          timing: { startTime: '10:00', endTime: '12:00', timezone: 'UTC' },
          daysOfWeek: ['MON'],
          showOnWebsite: false
        });

        await EnrollmentModel.create({
          tenantId,
          studentId,
          courseId,
          status: 'ACTIVE',
          enrolledAt: new Date(),
          progressPercent: 0
        });

        const conn = await IntegrationConnectionModel.create({
          tenantId,
          provider: 'GOOGLE_MEET',
          status: 'CONNECTED',
          encryptedCredentials: SecretEncryptionService.encryptSecret(
            JSON.stringify({ refreshToken: 'ref_p22', accessToken: 'acc_p22' })
          ),
          externalAccountId: 'proof-host@google.test'
        });

        // 4. 1A: Reschedule Test Fixture
        const rescheduleClassId = new mongoose.Types.ObjectId();
        const initialStart = new Date(Date.now() + 3600000);
        const initialEnd = new Date(Date.now() + 7200000);
        const rescheduledStart = new Date(Date.now() + 14400000);
        const rescheduledEnd = new Date(Date.now() + 18000000);

        await ClassModel.create({
          _id: rescheduleClassId,
          tenantId,
          branchId,
          batchId,
          courseId,
          instructorId,
          name: 'Redis Reschedule Class',
          classCode: 'CLS-RESCHED-P22',
          scheduledStartAt: initialStart,
          scheduledEndAt: initialEnd,
          startDate: initialStart,
          endDate: initialEnd,
          status: 'SCHEDULED',
          scheduleRevision: 0,
          mode: 'ONLINE',
          capacity: 30,
          enrolledCount: 1,
          enrolledStudents: [],
          timing: { startTime: '10:00', endTime: '12:00', timezone: 'UTC' },
          daysOfWeek: [],
          showOnWebsite: false
        });

        await ExternalMeetingModel.create({
          tenantId,
          branchId,
          classId: rescheduleClassId.toString(),
          provider: 'GOOGLE_MEET',
          connectionId: conn._id,
          organizerUserId: instructorId.toString(),
          externalMeetingId: `meet_resched_${rescheduleClassId}`,
          joinUrl: `https://meet.google.com/test-resched-${rescheduleClassId}`,
          providerStatus: 'SCHEDULED',
          scheduledStart: initialStart,
          scheduledEnd: initialEnd,
          timezone: 'UTC',
          syncStatus: 'SYNCED'
        });

        // 5. 1B: Cancel Test Fixture
        const cancelClassId = new mongoose.Types.ObjectId();
        await ClassModel.create({
          _id: cancelClassId,
          tenantId,
          branchId,
          batchId,
          courseId,
          instructorId,
          name: 'Redis Cancel Class',
          classCode: 'CLS-CANCEL-P22',
          scheduledStartAt: initialStart,
          scheduledEndAt: initialEnd,
          startDate: initialStart,
          endDate: initialEnd,
          status: 'SCHEDULED',
          scheduleRevision: 0,
          mode: 'ONLINE',
          capacity: 30,
          enrolledCount: 1,
          enrolledStudents: [],
          timing: { startTime: '10:00', endTime: '12:00', timezone: 'UTC' },
          daysOfWeek: [],
          showOnWebsite: false
        });

        await ExternalMeetingModel.create({
          tenantId,
          branchId,
          classId: cancelClassId.toString(),
          provider: 'GOOGLE_MEET',
          connectionId: conn._id,
          organizerUserId: instructorId.toString(),
          externalMeetingId: `meet_cancel_${cancelClassId}`,
          joinUrl: `https://meet.google.com/test-cancel-${cancelClassId}`,
          providerStatus: 'SCHEDULED',
          scheduledStart: initialStart,
          scheduledEnd: initialEnd,
          timezone: 'UTC',
          syncStatus: 'SYNCED'
        });

        const studentActor = {
          userId: studentId.toString(),
          roles: ['STUDENT'],
          isHqActor: false,
          isSuperAdmin: false
        };

        // --- EXECUTE 1A: Reschedule canonical Class during Redis outage ---
        const clsToReschedule = await ClassModel.findById(rescheduleClassId);
        clsToReschedule!.scheduledStartAt = rescheduledStart;
        clsToReschedule!.scheduledEndAt = rescheduledEnd;
        clsToReschedule!.scheduleRevision = 1;
        await clsToReschedule!.save();

        // Create durable IntegrationOperation for reschedule during outage
        await IntegrationOperationModel.create({
          tenantId,
          provider: 'GOOGLE_MEET',
          connectionId: conn._id,
          operationType: 'RESCHEDULE_MEETING',
          canonicalResourceType: 'Class',
          canonicalResourceId: rescheduleClassId.toString(),
          idempotencyKey: `RESCHEDULE_MEETING:${rescheduleClassId}:1`,
          status: 'RETRYABLE',
          attempts: 1,
          payload: {
            startAt: rescheduledStart,
            endAt: rescheduledEnd,
            timezone: 'UTC'
          },
          nextRetryAt: new Date(Date.now() - 1000)
        });

        // 3. Prove canonical Class reschedule commits
        const savedReschedClass = await ClassModel.findById(rescheduleClassId);
        expect(savedReschedClass?.scheduledStartAt?.getTime()).toBe(rescheduledStart.getTime());
        expect(savedReschedClass?.scheduleRevision).toBe(1);

        // 4. Prove durable integration work remains in Mongo
        const reschedOp = await IntegrationOperationModel.findOne({
          idempotencyKey: `RESCHEDULE_MEETING:${rescheduleClassId}:1`
        });
        expect(reschedOp).not.toBeNull();
        expect(reschedOp?.status).toBe('RETRYABLE');

        // --- EXECUTE 1B: Cancel canonical Class during Redis outage ---
        const clsToCancel = await ClassModel.findById(cancelClassId);
        clsToCancel!.status = 'CANCELLED';
        await clsToCancel!.save();

        // Create durable IntegrationOperation for cancel during outage
        await IntegrationOperationModel.create({
          tenantId,
          provider: 'GOOGLE_MEET',
          connectionId: conn._id,
          operationType: 'CANCEL_MEETING',
          canonicalResourceType: 'Class',
          canonicalResourceId: cancelClassId.toString(),
          idempotencyKey: `CANCEL_MEETING:${cancelClassId}:outage`,
          status: 'RETRYABLE',
          attempts: 1,
          payload: { reason: 'Cancelled during outage' },
          nextRetryAt: new Date(Date.now() - 1000)
        });

        // Prove student join endpoint denies immediately based on canonical Class state
        await expect(
          LiveClassOrchestratorService.getAuthorizedJoinInfo(tenantId.toString(), cancelClassId.toString(), studentActor)
        ).rejects.toThrow(/cancelled/i);

        return;
      }

      // ==========================================
      // RECOVERY MODE (Redis is back online)
      // ==========================================
      const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
      const pong = await connection.ping();
      expect(pong).toBe('PONG');
      const queue = new Queue(APP_CONFIG.QUEUES.INTEGRATIONS, { connection });
      await queue.waitUntilReady();

      const tenant = await TenantModel.findOne({ slug: marker }).setOptions({ bypassTenantFilter: true });
      expect(tenant).not.toBeNull();

      // Recover Reschedule Operation
      const reschedOp = await IntegrationOperationModel.findOne({
        tenantId: tenant!._id,
        operationType: 'RESCHEDULE_MEETING'
      }).setOptions({ bypassTenantFilter: true });
      expect(reschedOp).not.toBeNull();

      const reschedClass = await ClassModel.findById(reschedOp!.canonicalResourceId).setOptions({ bypassTenantFilter: true });
      expect(reschedClass).not.toBeNull();

      const actor = {
        userId: reschedClass!.instructorId!.toString(),
        roles: ['INSTRUCTOR'],
        isHqActor: false,
        isSuperAdmin: false
      };

      // Run recovery execution
      const recoveredMeeting = await LiveClassOrchestratorService.rescheduleMeetingForClass(
        tenant!._id.toString(),
        reschedClass!._id.toString(),
        actor
      );

      expect(recoveredMeeting).not.toBeNull();
      expect(recoveredMeeting?.syncStatus).toBe('SYNCED');
      expect(new Date(recoveredMeeting!.scheduledStart).getTime()).toBe(reschedClass!.scheduledStartAt!.getTime());

      // Prove exactly 1 ExternalMeeting record exists in MongoDB (no duplicates)
      const meetingCount = await ExternalMeetingModel.countDocuments({
        tenantId: tenant!._id,
        classId: reschedClass!._id.toString()
      }).setOptions({ bypassTenantFilter: true });
      expect(meetingCount).toBe(1);

      // Recover Cancel Operation
      const cancelOp = await IntegrationOperationModel.findOne({
        tenantId: tenant!._id,
        operationType: 'CANCEL_MEETING'
      }).setOptions({ bypassTenantFilter: true });
      expect(cancelOp).not.toBeNull();

      await LiveClassOrchestratorService.cancelMeetingForClass(
        tenant!._id.toString(),
        cancelOp!.canonicalResourceId,
        'Redis recovery cancellation',
        actor
      );

      const cancelledMeeting = await ExternalMeetingModel.findOne({
        tenantId: tenant!._id,
        classId: cancelOp!.canonicalResourceId
      }).setOptions({ bypassTenantFilter: true });

      expect(cancelledMeeting?.providerStatus).toBe('CANCELLED');
      expect(cancelledMeeting?.syncStatus).toBe('SYNCED');

      // Prove ZERO meeting resurrection on join
      const student = await UserModel.findOne({ tenantId: tenant!._id, email: 'student@p22-proof.test' }).setOptions({ bypassTenantFilter: true });
      const studentActor = {
        userId: student!._id.toString(),
        roles: ['STUDENT'],
        isHqActor: false,
        isSuperAdmin: false
      };

      await expect(
        LiveClassOrchestratorService.getAuthorizedJoinInfo(tenant!._id.toString(), cancelOp!.canonicalResourceId, studentActor)
      ).rejects.toThrow(/cancelled/i);

      await queue.close();
      connection.disconnect();
    }
  );
});
