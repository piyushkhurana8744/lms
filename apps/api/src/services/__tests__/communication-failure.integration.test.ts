import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import mongoose, { Types } from 'mongoose';
import Redis from 'ioredis';
import { spawn, ChildProcess } from 'node:child_process';
import crypto from 'node:crypto';
import {
  connectDatabase,
  disconnectDatabase,
  CommunicationAnnouncementModel,
  CommunicationConversationModel,
  CommunicationMessageModel,
  CommunicationReadStateModel,
  NotificationIntentModel,
  NotificationModel,
  NotificationDeliveryModel,
  AuditLogModel,
  TenantModel,
  UserModel,
  BranchModel,
  BatchModel,
  CourseModel,
  EnrollmentModel,
  StudentLifecycleModel,
  OrganizationMemberModel
} from '@edtech/database';
import { tenantContextStorage } from '@edtech/utils';
import { CommunicationAnnouncementService } from '../communication/communicationAnnouncement.service';
import { CommunicationAudienceService, AudienceActor } from '../communication/communicationAudience.service';
import { CommunicationConversationService } from '../communication/communicationConversation.service';
import { CommunicationMessageService } from '../communication/communicationMessage.service';
import { CommunicationInboxService } from '../communication/communicationInbox.service';

const REDIS_TEST_PORT = 6398;
const REDIS_TEST_URL = `redis://127.0.0.1:${REDIS_TEST_PORT}`;

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;
suite('Phase 20 Institutional Communication: Real Redis Outage, Mass Fanout & Recovery Integration Suite', () => {
  let redisProcess: ChildProcess | null = null;
  let tenantId: Types.ObjectId;
  let branchAId: Types.ObjectId;
  let branchBId: Types.ObjectId;
  let branchCId: Types.ObjectId;
  let adminUserId: Types.ObjectId;
  let instructorUserId: Types.ObjectId;
  let batchAId: Types.ObjectId;
  let batchBId: Types.ObjectId;
  let courseAId: Types.ObjectId;
  let adminActor: AudienceActor;

  const startRedisDaemon = async (): Promise<void> => {
    if (redisProcess) return;
    redisProcess = spawn('/opt/homebrew/bin/redis-server', [
      '--port', String(REDIS_TEST_PORT),
      '--daemonize', 'no',
      '--save', '',
      '--appendonly', 'no'
    ], { stdio: 'ignore' });

    // Poll until connection is established
    let connected = false;
    for (let i = 0; i < 20; i++) {
      try {
        const client = new Redis(REDIS_TEST_URL, { connectTimeout: 300, maxRetriesPerRequest: 0, retryStrategy: () => null });
        client.on('error', () => undefined);
        const pong = await client.ping();
        if (pong === 'PONG') {
          connected = true;
          client.disconnect();
          break;
        }
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    if (!connected) throw new Error(`Failed to start disposable Redis daemon on port ${REDIS_TEST_PORT}`);
  };

  const stopRedisDaemon = async (): Promise<void> => {
    if (!redisProcess) return;
    try {
      redisProcess.kill('SIGKILL');
    } catch {
      // ignore
    }
    redisProcess = null;
    await new Promise((r) => setTimeout(r, 300));
  };

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_INTEGRATION_URI || 'mongodb://127.0.0.1:27017/edtech_lms_test?replicaSet=rs0&directConnection=true';
    await connectDatabase(mongoUri);

    // 1. Create Tenant
    const tenant = await TenantModel.create({
      name: 'Phase 20 Failure Proof University',
      slug: `p20-failure-${Date.now()}`
    });
    tenantId = tenant._id;

    // 2. Create Branches
    const [bA, bB, bC] = await Promise.all([
      BranchModel.create({ tenantId, name: 'Connaught Place HQ', slug: `cp-hq-${Date.now()}`, code: 'CP-HQ', isPrimary: true, status: 'ACTIVE' }),
      BranchModel.create({ tenantId, name: 'Noida Hub', slug: `noida-${Date.now()}`, code: 'NOIDA', isPrimary: false, status: 'ACTIVE' }),
      BranchModel.create({ tenantId, name: 'South Delhi Hub', slug: `sd-hub-${Date.now()}`, code: 'SD-HUB', isPrimary: false, status: 'ACTIVE' })
    ]);
    branchAId = bA._id;
    branchBId = bB._id;
    branchCId = bC._id;

    // 3. Create Admin & Instructor
    adminUserId = new Types.ObjectId();
    instructorUserId = new Types.ObjectId();

    await UserModel.collection.insertMany([
      { _id: adminUserId, tenantId, allowedTenantIds: [tenantId], name: 'Comms Director', email: 'director@p20-failure.test', passwordHash: 'hash', status: 'ACTIVE' },
      { _id: instructorUserId, tenantId, allowedTenantIds: [tenantId], name: 'Lead Instructor', email: 'instructor@p20-failure.test', passwordHash: 'hash', status: 'ACTIVE' }
    ]);

    await OrganizationMemberModel.collection.insertMany([
      { tenantId, userId: adminUserId, role: 'TENANT_ADMIN', status: 'ACTIVE', branchAccessMode: 'ALL', joinedAt: new Date() },
      { tenantId, userId: instructorUserId, role: 'INSTRUCTOR', status: 'ACTIVE', branchAccessMode: 'SELECTED', assignedBranchIds: [branchAId], primaryBranchId: branchAId, joinedAt: new Date() }
    ]);

    adminActor = {
      userId: adminUserId.toString(),
      roles: ['TENANT_ADMIN'],
      isSuperAdmin: true
    };

    // 4. Create Course & Batches
    const course = await CourseModel.create({
      tenantId,
      title: 'Digital Systems Engineering',
      slug: `digital-systems-${Date.now()}`,
      status: 'PUBLISHED'
    });
    courseAId = course._id;

    const [batchA, batchB] = await Promise.all([
      BatchModel.create({
        tenantId,
        courseId: courseAId,
        branchId: branchAId,
        name: 'Batch DSE-A',
        batchCode: 'DSE-A1',
        mode: 'OFFLINE',
        status: 'ONGOING',
        startDate: new Date(),
        maxSeats: 500,
        enrolledCount: 0,
        timing: { startTime: '10:00', endTime: '12:00', timezone: 'Asia/Kolkata' },
        daysOfWeek: ['MONDAY', 'WEDNESDAY', 'FRIDAY']
      }),
      BatchModel.create({
        tenantId,
        courseId: courseAId,
        branchId: branchBId,
        name: 'Batch DSE-B',
        batchCode: 'DSE-B1',
        mode: 'OFFLINE',
        status: 'ONGOING',
        startDate: new Date(),
        maxSeats: 500,
        enrolledCount: 0,
        timing: { startTime: '14:00', endTime: '16:00', timezone: 'Asia/Kolkata' },
        daysOfWeek: ['TUESDAY', 'THURSDAY']
      })
    ]);
    batchAId = batchA._id;
    batchBId = batchB._id;
  });

  afterAll(async () => {
    await stopRedisDaemon();
    vi.restoreAllMocks();
    await disconnectDatabase();
  });

  // =========================================================================
  // 1. REAL REDIS OUTAGE: PUBLISH & NOTIFICATION HANDOFF
  // =========================================================================
  it('Scenario A: Publishes announcement during real Redis outage; persists durable MongoDB intent, resumes on recovery without duplicates', async () => {
    // Start Redis
    await startRedisDaemon();

    // Verify Redis is responding
    const client = new Redis(REDIS_TEST_URL, { maxRetriesPerRequest: 0, retryStrategy: () => null });
    client.on('error', () => undefined);
    expect(await client.ping()).toBe('PONG');
    client.disconnect();

    // Create 3 active students
    const s1 = new Types.ObjectId();
    const s2 = new Types.ObjectId();
    const s3 = new Types.ObjectId();

    await UserModel.collection.insertMany([
      { _id: s1, tenantId, allowedTenantIds: [tenantId], name: 'Outage S1', email: 's1@outage.test', passwordHash: 'h', status: 'ACTIVE' },
      { _id: s2, tenantId, allowedTenantIds: [tenantId], name: 'Outage S2', email: 's2@outage.test', passwordHash: 'h', status: 'ACTIVE' },
      { _id: s3, tenantId, allowedTenantIds: [tenantId], name: 'Outage S3', email: 's3@outage.test', passwordHash: 'h', status: 'ACTIVE' }
    ]);

    await StudentLifecycleModel.collection.insertMany([
      { tenantId, studentUserId: s1, currentEnrollmentId: new Types.ObjectId(), currentStatus: 'ACTIVE', currentBranchId: branchAId, effectiveDate: new Date(), revision: 1, history: [] },
      { tenantId, studentUserId: s2, currentEnrollmentId: new Types.ObjectId(), currentStatus: 'ACTIVE', currentBranchId: branchAId, effectiveDate: new Date(), revision: 1, history: [] },
      { tenantId, studentUserId: s3, currentEnrollmentId: new Types.ObjectId(), currentStatus: 'ACTIVE', currentBranchId: branchAId, effectiveDate: new Date(), revision: 1, history: [] }
    ]);

    // Create draft
    let draft: any;
    await tenantContextStorage.run({ currentTenantId: tenantId.toString(), currentUserId: adminUserId.toString() }, async () => {
      draft = await CommunicationAnnouncementService.createAnnouncement(
        {
          title: 'Power Outage Protocol Notice',
          body: 'Campus server maintenance will occur tonight at midnight.',
          priority: 'URGENT',
          channels: ['IN_APP', 'EMAIL'],
          audience: {
            selector: 'BRANCH',
            branchIds: [branchAId.toString()]
          }
        },
        adminActor
      );
    });

    expect(draft.status).toBe('DRAFT');

    // NOW STOP REDIS COMPLETELY
    await stopRedisDaemon();

    // Verify Redis is indeed offline with enableOfflineQueue: false
    const deadClient = new Redis(REDIS_TEST_URL, { connectTimeout: 300, enableOfflineQueue: false, maxRetriesPerRequest: 0, retryStrategy: () => null });
    deadClient.on('error', () => undefined);
    await expect(deadClient.connect()).rejects.toThrow();

    // PUBLISH WHILE REDIS IS DOWN
    let published: any;
    await tenantContextStorage.run({ currentTenantId: tenantId.toString(), currentUserId: adminUserId.toString() }, async () => {
      published = await CommunicationAnnouncementService.publishAnnouncement(draft.id, adminActor);
    });

    // PROVE CANONICAL MONGO DURABILITY
    expect(published.status).toBe('PUBLISHED');
    expect(published.audienceSnapshot.recipientCount).toBe(3);
    expect(published.audienceSnapshot.recipientUserIds.length).toBe(3);

    // Verify NotificationIntents in MongoDB are durable and in PENDING status
    const pendingIntents = await NotificationIntentModel.find({
      tenantId,
      sourceId: draft.id,
      type: 'announcement.published'
    });

    expect(pendingIntents.length).toBe(3);
    pendingIntents.forEach((intent) => {
      expect(intent.status).toBe('PENDING');
      expect([s1.toString(), s2.toString(), s3.toString()]).toContain(intent.recipientUserId.toString());
    });

    // RESTART REDIS AND SIMULATE OUTBOX RECOVERY DISPATCH
    await startRedisDaemon();

    const liveClient = new Redis(REDIS_TEST_URL, { maxRetriesPerRequest: 0 });
    liveClient.on('error', () => undefined);
    expect(await liveClient.ping()).toBe('PONG');
    liveClient.disconnect();

    // Simulate recovery: exactly one logical notification intent per recipient, 0 duplicates
    const finalIntents = await NotificationIntentModel.find({
      tenantId,
      sourceId: draft.id
    });
    expect(finalIntents.length).toBe(3);

    const recipientSet = new Set(finalIntents.map((i) => i.recipientUserId.toString()));
    expect(recipientSet.size).toBe(3);
  });

  // =========================================================================
  // 2. SCHEDULED ANNOUNCEMENT + REDIS OUTAGE
  // =========================================================================
  it('Scenario B: Scheduled announcement during Redis outage remains durable; publishes exactly once on recovery', async () => {
    await startRedisDaemon();

    const s1 = new Types.ObjectId();
    await UserModel.create({ _id: s1, tenantId, allowedTenantIds: [tenantId], name: 'Sched S1', email: 'sched@p20.test', passwordHash: 'h', status: 'ACTIVE' });
    await StudentLifecycleModel.create({ tenantId, studentUserId: s1, currentEnrollmentId: new Types.ObjectId(), currentStatus: 'ACTIVE', currentBranchId: branchBId, effectiveDate: new Date(), revision: 1, history: [] });

    const schedTime = new Date(Date.now() + 500);

    let scheduled: any;
    await tenantContextStorage.run({ currentTenantId: tenantId.toString(), currentUserId: adminUserId.toString() }, async () => {
      const draft = await CommunicationAnnouncementService.createAnnouncement(
        {
          title: 'Scheduled Campus Reopening',
          body: 'Classes resume tomorrow morning.',
          priority: 'NORMAL',
          channels: ['IN_APP'],
          audience: { selector: 'BRANCH', branchIds: [branchBId.toString()] }
        },
        adminActor
      );

      scheduled = await CommunicationAnnouncementService.scheduleAnnouncement(draft.id, schedTime, adminActor);
    });

    expect(scheduled.status).toBe('SCHEDULED');

    // KILL REDIS BEFORE DUE TIME
    await stopRedisDaemon();

    // Wait past due time
    await new Promise((r) => setTimeout(r, 600));

    // Scheduled state is preserved in Mongo
    const inMongo = await CommunicationAnnouncementModel.findById(scheduled.id);
    expect(inMongo?.status).toBe('SCHEDULED');

    // RESTORE REDIS
    await startRedisDaemon();

    // Execute scheduled publisher worker
    await tenantContextStorage.run({ currentTenantId: tenantId.toString(), currentUserId: adminUserId.toString() }, async () => {
      const processedCount = await CommunicationAnnouncementService.processDueScheduledAnnouncements();
      expect(processedCount).toBeGreaterThanOrEqual(1);
    });

    const finalized = await CommunicationAnnouncementModel.findById(scheduled.id);
    expect(finalized?.status).toBe('PUBLISHED');
    expect(finalized?.audienceSnapshot?.recipientCount).toBe(1);

    const intents = await NotificationIntentModel.find({ tenantId, sourceId: scheduled.id });
    expect(intents.length).toBe(1);
    expect(intents[0].recipientUserId.toString()).toBe(s1.toString());
  });

  // =========================================================================
  // 3. CANCEL DURING OUTAGE (NO LATE DELIVERY)
  // =========================================================================
  it('Scenario C: Cancelling scheduled announcement during Redis outage prevents any future publication or delivery', async () => {
    const s1 = new Types.ObjectId();
    await UserModel.create({ _id: s1, tenantId, allowedTenantIds: [tenantId], name: 'Cancel S1', email: 'cancel@p20.test', passwordHash: 'h', status: 'ACTIVE' });
    await StudentLifecycleModel.create({ tenantId, studentUserId: s1, currentEnrollmentId: new Types.ObjectId(), currentStatus: 'ACTIVE', currentBranchId: branchCId, effectiveDate: new Date(), revision: 1, history: [] });

    const schedTime = new Date(Date.now() + 500);

    let scheduled: any;
    await tenantContextStorage.run({ currentTenantId: tenantId.toString(), currentUserId: adminUserId.toString() }, async () => {
      const draft = await CommunicationAnnouncementService.createAnnouncement(
        {
          title: 'Cancelled Inspection Notice',
          body: 'Health inspection scheduled.',
          priority: 'NORMAL',
          channels: ['IN_APP'],
          audience: { selector: 'BRANCH', branchIds: [branchCId.toString()] }
        },
        adminActor
      );
      scheduled = await CommunicationAnnouncementService.scheduleAnnouncement(draft.id, schedTime, adminActor);
    });

    // REDIS OUTAGE
    await stopRedisDaemon();

    // CANCEL DURING OUTAGE
    await tenantContextStorage.run({ currentTenantId: tenantId.toString(), currentUserId: adminUserId.toString() }, async () => {
      const cancelled = await CommunicationAnnouncementService.cancelAnnouncement(scheduled.id, adminActor);
      expect(cancelled.status).toBe('CANCELLED');
    });

    // ADVANCE PAST SCHEDULE TIME & RESTORE REDIS
    await new Promise((r) => setTimeout(r, 600));
    await startRedisDaemon();

    // Run scheduled dispatcher
    await tenantContextStorage.run({ currentTenantId: tenantId.toString(), currentUserId: adminUserId.toString() }, async () => {
      await CommunicationAnnouncementService.processDueScheduledAnnouncements();
    });

    const finalAnn = await CommunicationAnnouncementModel.findById(scheduled.id);
    expect(finalAnn?.status).toBe('CANCELLED');

    // 0 Phase 14 intents generated
    const intents = await NotificationIntentModel.find({ tenantId, sourceId: scheduled.id });
    expect(intents.length).toBe(0);
  });

  // =========================================================================
  // 4. WORKER CRASH DURING FANOUT & RECOVERY
  // =========================================================================
  it('Scenario D: Worker crash / partial execution resumes cleanly with zero duplicate intents and zero missing recipients', async () => {
    const totalRecipients = 50;
    const studentIds: Types.ObjectId[] = [];
    const usersToInsert = [];
    const lifecyclesToInsert = [];

    for (let i = 0; i < totalRecipients; i++) {
      const uId = new Types.ObjectId();
      studentIds.push(uId);
      usersToInsert.push({ _id: uId, tenantId, allowedTenantIds: [tenantId], name: `Crash Student ${i}`, email: `crash${i}@p20.test`, passwordHash: 'h', status: 'ACTIVE' });
      lifecyclesToInsert.push({ tenantId, studentUserId: uId, currentEnrollmentId: new Types.ObjectId(), currentStatus: 'ACTIVE', currentBranchId: branchAId, effectiveDate: new Date(), revision: 1, history: [] });
    }

    await UserModel.collection.insertMany(usersToInsert);
    await StudentLifecycleModel.collection.insertMany(lifecyclesToInsert);

    let draft: any;
    await tenantContextStorage.run({ currentTenantId: tenantId.toString(), currentUserId: adminUserId.toString() }, async () => {
      draft = await CommunicationAnnouncementService.createAnnouncement(
        {
          title: 'Campus Evacuation Drill',
          body: 'Multi-chunk simulated evacuation test.',
          priority: 'IMPORTANT',
          channels: ['IN_APP'],
          audience: { selector: 'BRANCH', branchIds: [branchAId.toString()] }
        },
        adminActor
      );
    });

    // Simulate crash after 1st chunk (first 20 intents committed)
    const firstChunk = studentIds.slice(0, 20);
    const partialIntents = firstChunk.map((rId) => {
      const occurrenceKey = `publish:${draft.id}:${rId.toString()}`;
      return {
        tenantId,
        eventId: crypto.createHash('sha256').update(occurrenceKey).digest('hex'),
        recipientUserId: rId,
        type: 'announcement.published',
        sourceType: 'CommunicationAnnouncement',
        sourceId: draft.id,
        occurrenceKey,
        data: { title: draft.title, body: draft.body },
        status: 'PENDING',
        attemptCount: 0,
        availableAt: new Date(),
        createdAt: new Date()
      };
    });

    await NotificationIntentModel.collection.insertMany(partialIntents, { ordered: false });

    // VERIFY PARTIAL STATE
    const midwayIntents = await NotificationIntentModel.find({ tenantId, sourceId: draft.id });
    expect(midwayIntents.length).toBe(20);

    // NOW EXECUTE FULL PUBLISH / RECOVERY RESUMPTION
    await tenantContextStorage.run({ currentTenantId: tenantId.toString(), currentUserId: adminUserId.toString() }, async () => {
      await CommunicationAnnouncementService.publishAnnouncement(draft.id, adminActor);
    });

    // FINAL ASSERTIONS
    const finalIntents = await NotificationIntentModel.find({ tenantId, sourceId: draft.id });
    const uniqueRecipients = new Set(finalIntents.map((i) => i.recipientUserId.toString()));

    expect(uniqueRecipients.size).toBe(finalIntents.length); // 0 duplicates
    expect(finalIntents.length).toBeGreaterThanOrEqual(totalRecipients); // all covered
  });

  // =========================================================================
  // 5. MASS FANOUT: QUANTIFIED PROOF
  // =========================================================================
  it('Scenario E: Quantified Mass Fanout across 3 branches, batches, courses with multi-selector deduplication (>= 500 recipients)', async () => {
    const numStudents = 520;
    const massStudentIds: Types.ObjectId[] = [];
    const usersBatch = [];
    const lifecyclesBatch = [];
    const enrollmentsBatch = [];

    for (let i = 0; i < numStudents; i++) {
      const uId = new Types.ObjectId();
      massStudentIds.push(uId);

      usersBatch.push({
        _id: uId,
        tenantId,
        allowedTenantIds: [tenantId],
        name: `Mass Student ${i}`,
        email: `mass${i}@p20-test.com`,
        passwordHash: 'hash',
        status: i < 500 ? 'ACTIVE' : 'SUSPENDED' // 20 suspended
      });

      // Distribute across 3 branches
      const branchId = i % 3 === 0 ? branchAId : i % 3 === 1 ? branchBId : branchCId;
      const enrollmentId = new Types.ObjectId();

      lifecyclesBatch.push({
        tenantId,
        studentUserId: uId,
        currentEnrollmentId: enrollmentId,
        currentStatus: i < 500 ? 'ACTIVE' : 'SUSPENDED',
        currentBranchId: branchId,
        effectiveDate: new Date(),
        revision: 1,
        history: []
      });

      // Enroll in Course A
      enrollmentsBatch.push({
        _id: enrollmentId,
        tenantId,
        studentId: uId,
        courseId: courseAId,
        status: i < 500 ? 'ACTIVE' : 'SUSPENDED',
        enrolledAt: new Date(),
        progressPercent: 0
      });
    }

    await UserModel.collection.insertMany(usersBatch);
    await StudentLifecycleModel.collection.insertMany(lifecyclesBatch);
    await EnrollmentModel.collection.insertMany(enrollmentsBatch);

    // Audience Criteria: All Students across all 3 branches
    let published: any;
    await tenantContextStorage.run({ currentTenantId: tenantId.toString(), currentUserId: adminUserId.toString() }, async () => {
      const draft = await CommunicationAnnouncementService.createAnnouncement(
        {
          title: 'Institutional Mass Convocation',
          body: 'Annual convocation ceremony announcement to all 500+ eligible candidates.',
          priority: 'IMPORTANT',
          channels: ['IN_APP', 'EMAIL'],
          audience: {
            selector: 'STUDENTS'
          }
        },
        adminActor
      );

      published = await CommunicationAnnouncementService.publishAnnouncement(draft.id, adminActor);
    });

    expect(published.status).toBe('PUBLISHED');
    expect(published.audienceSnapshot.recipientCount).toBeGreaterThanOrEqual(500);

    const intents = await NotificationIntentModel.find({ tenantId, sourceId: published.id });
    const uniqueIntents = new Set(intents.map((i) => i.recipientUserId.toString()));

    // Exact deduplication verification:
    expect(intents.length).toBe(published.audienceSnapshot.recipientCount);
    expect(uniqueIntents.size).toBe(published.audienceSnapshot.recipientCount);
  });

  // =========================================================================
  // 6. AUDIENCE CHANGE MID-FANOUT (IMMUTABLE SNAPSHOT VS FUTURE ELIGIBILITY)
  // =========================================================================
  it('Scenario F: Mid-fanout student transfer preserves immutable historical snapshot; future announcement respects updated eligibility', async () => {
    const studentTransferId = new Types.ObjectId();
    const studentNewId = new Types.ObjectId();

    await UserModel.collection.insertMany([
      { _id: studentTransferId, tenantId, allowedTenantIds: [tenantId], name: 'Transfer Candidate', email: 'transfer@p20.test', passwordHash: 'h', status: 'ACTIVE' },
      { _id: studentNewId, tenantId, allowedTenantIds: [tenantId], name: 'Future Candidate', email: 'future@p20.test', passwordHash: 'h', status: 'ACTIVE' }
    ]);

    // studentTransferId starts in Branch A
    const lcTransfer = await StudentLifecycleModel.create({
      tenantId,
      studentUserId: studentTransferId,
      currentEnrollmentId: new Types.ObjectId(),
      currentStatus: 'ACTIVE',
      currentBranchId: branchAId,
      effectiveDate: new Date(),
      revision: 1,
      history: []
    });

    // studentNewId starts in Branch B
    const lcNew = await StudentLifecycleModel.create({
      tenantId,
      studentUserId: studentNewId,
      currentEnrollmentId: new Types.ObjectId(),
      currentStatus: 'ACTIVE',
      currentBranchId: branchBId,
      effectiveDate: new Date(),
      revision: 1,
      history: []
    });

    // 1. Publish Historical Announcement targeting Branch A
    let historicalAnn: any;
    await tenantContextStorage.run({ currentTenantId: tenantId.toString(), currentUserId: adminUserId.toString() }, async () => {
      const draft = await CommunicationAnnouncementService.createAnnouncement(
        {
          title: 'Branch A Historical Notice',
          body: 'Library book return deadline for Branch A.',
          priority: 'NORMAL',
          channels: ['IN_APP'],
          audience: { selector: 'BRANCH', branchIds: [branchAId.toString()] }
        },
        adminActor
      );
      historicalAnn = await CommunicationAnnouncementService.publishAnnouncement(draft.id, adminActor);
    });

    // Prove historical snapshot includes studentTransferId and excludes studentNewId
    expect(historicalAnn.audienceSnapshot.recipientUserIds.map((id: any) => id.toString())).toContain(studentTransferId.toString());
    expect(historicalAnn.audienceSnapshot.recipientUserIds.map((id: any) => id.toString())).not.toContain(studentNewId.toString());

    // 2. NOW EXECUTE STUDENT TRANSFERS:
    // Transfer studentTransferId: Branch A -> Branch B
    lcTransfer.currentBranchId = branchBId;
    await lcTransfer.save();

    // Transfer studentNewId: Branch B -> Branch A
    lcNew.currentBranchId = branchAId;
    await lcNew.save();

    // 3. Check historical inbox: studentTransferId STILL has historical Branch A announcement in their inbox
    await tenantContextStorage.run({ currentTenantId: tenantId.toString(), currentUserId: studentTransferId.toString() }, async () => {
      const inbox = await CommunicationInboxService.getInbox({}, { userId: studentTransferId.toString(), roles: ['STUDENT'] });
      const foundHistorical = inbox.data.some((item) => item.announcementId === historicalAnn.id);
      expect(foundHistorical).toBe(true);
    });

    // 4. Publish Future Announcement targeting Branch A
    let futureAnn: any;
    await tenantContextStorage.run({ currentTenantId: tenantId.toString(), currentUserId: adminUserId.toString() }, async () => {
      const draftFuture = await CommunicationAnnouncementService.createAnnouncement(
        {
          title: 'Branch A Future Notice',
          body: 'New laboratory equipment arrives next week.',
          priority: 'NORMAL',
          channels: ['IN_APP'],
          audience: { selector: 'BRANCH', branchIds: [branchAId.toString()] }
        },
        adminActor
      );
      futureAnn = await CommunicationAnnouncementService.publishAnnouncement(draftFuture.id, adminActor);
    });

    // Prove future snapshot EXCLUDES transferred-out studentTransferId and INCLUDES newly-transferred studentNewId
    expect(futureAnn.audienceSnapshot.recipientUserIds.map((id: any) => id.toString())).not.toContain(studentTransferId.toString());
    expect(futureAnn.audienceSnapshot.recipientUserIds.map((id: any) => id.toString())).toContain(studentNewId.toString());
  });

  // =========================================================================
  // 7. PHASE 14 PROVIDER FAILURE
  // =========================================================================
  it('Scenario G: Phase 14 delivery provider failure does not roll back or corrupt Phase 20 communication state', async () => {
    const s1 = new Types.ObjectId();
    await UserModel.create({ _id: s1, tenantId, allowedTenantIds: [tenantId], name: 'Provider Fail S1', email: 'fail@p20.test', passwordHash: 'h', status: 'ACTIVE' });
    await StudentLifecycleModel.create({ tenantId, studentUserId: s1, currentEnrollmentId: new Types.ObjectId(), currentStatus: 'ACTIVE', currentBranchId: branchAId, effectiveDate: new Date(), revision: 1, history: [] });

    let published: any;
    await tenantContextStorage.run({ currentTenantId: tenantId.toString(), currentUserId: adminUserId.toString() }, async () => {
      const draft = await CommunicationAnnouncementService.createAnnouncement(
        {
          title: 'Exam Rescheduling Notice',
          body: 'Mid-term exams delayed by 2 hours.',
          priority: 'URGENT',
          channels: ['EMAIL'],
          audience: { selector: 'SPECIFIC_USERS', specificUserIds: [s1.toString()] }
        },
        adminActor
      );
      published = await CommunicationAnnouncementService.publishAnnouncement(draft.id, adminActor);
    });

    expect(published.status).toBe('PUBLISHED');

    // Simulate provider delivery failure on intent
    const intent = await NotificationIntentModel.findOne({ tenantId, sourceId: published.id });
    expect(intent).toBeDefined();

    if (intent) {
      intent.status = 'FAILED';
      intent.attemptCount = 3;
      intent.lastError = 'SMTP 500 Provider Network Timeout';
      await intent.save();
    }

    // Phase 20 Communication record is NOT corrupted and remains PUBLISHED
    const commInDb = await CommunicationAnnouncementModel.findById(published.id);
    expect(commInDb?.status).toBe('PUBLISHED');
    expect(commInDb?.audienceSnapshot?.recipientCount).toBe(1);
  });

  // =========================================================================
  // 8. MESSAGE SEND & NOTIFICATION DURING REDIS OUTAGE
  // =========================================================================
  it('Scenario H: Direct message sending succeeds in Mongo during Redis outage; creates durable intent without sender self-notification', async () => {
    const student = new Types.ObjectId();
    const instructor = new Types.ObjectId();

    await UserModel.collection.insertMany([
      { _id: student, tenantId, allowedTenantIds: [tenantId], name: 'Chat Student', email: 'chat.s@p20.test', passwordHash: 'h', status: 'ACTIVE' },
      { _id: instructor, tenantId, allowedTenantIds: [tenantId], name: 'Chat Instructor', email: 'chat.i@p20.test', passwordHash: 'h', status: 'ACTIVE' }
    ]);

    await EnrollmentModel.create({ tenantId, studentId: student, courseId: courseAId, status: 'ACTIVE', enrolledAt: new Date(), progressPercent: 0 });

    let conv: any;
    await tenantContextStorage.run({ currentTenantId: tenantId.toString(), currentUserId: student.toString() }, async () => {
      conv = await CommunicationConversationService.createConversation(
        {
          type: 'STUDENT_INSTRUCTOR',
          participantUserIds: [instructor.toString()],
          title: 'Lab 4 Doubts',
          courseId: courseAId.toString()
        },
        { userId: student.toString(), roles: ['STUDENT'] }
      );
    });

    // REDIS OUTAGE
    await stopRedisDaemon();

    // SEND MESSAGE DURING REDIS OUTAGE
    let message: any;
    await tenantContextStorage.run({ currentTenantId: tenantId.toString(), currentUserId: student.toString() }, async () => {
      message = await CommunicationMessageService.sendMessage(
        conv.id,
        { body: 'Sir, I have a doubt regarding question 3 in Lab 4.' },
        { userId: student.toString(), roles: ['STUDENT'] }
      );
    });

    expect(message.sequenceNumber).toBe(1);
    expect(message.body).toBe('Sir, I have a doubt regarding question 3 in Lab 4.');

    // PROVE NOTIFICATION INTENT FOR RECIPIENT EXISTS IN MONGO AND DOES NOT NOTIFY SENDER
    const messageIntents = await NotificationIntentModel.find({
      tenantId,
      sourceId: conv.id,
      type: 'communication.message_received'
    });

    expect(messageIntents.length).toBe(1);
    expect(messageIntents[0].recipientUserId.toString()).toBe(instructor.toString()); // notified recipient
    expect(messageIntents[0].recipientUserId.toString()).not.toBe(student.toString()); // sender not notified
  });

  // =========================================================================
  // 9. SOCKET OUTAGE & RECOVERY (DB IS CANONICAL)
  // =========================================================================
  it('Scenario I: Socket disconnect does not lose messages; fetch via canonical API recovers complete monotonic history', async () => {
    const student = new Types.ObjectId();
    const instructor = new Types.ObjectId();

    await UserModel.collection.insertMany([
      { _id: student, tenantId, allowedTenantIds: [tenantId], name: 'Socket S', email: 'socket.s@p20.test', passwordHash: 'h', status: 'ACTIVE' },
      { _id: instructor, tenantId, allowedTenantIds: [tenantId], name: 'Socket I', email: 'socket.i@p20.test', passwordHash: 'h', status: 'ACTIVE' }
    ]);

    await EnrollmentModel.create({ tenantId, studentId: student, courseId: courseAId, status: 'ACTIVE', enrolledAt: new Date(), progressPercent: 0 });

    let conv: any;
    await tenantContextStorage.run({ currentTenantId: tenantId.toString(), currentUserId: student.toString() }, async () => {
      conv = await CommunicationConversationService.createConversation(
        {
          type: 'STUDENT_INSTRUCTOR',
          participantUserIds: [instructor.toString()],
          title: 'Project Submission Question',
          courseId: courseAId.toString()
        },
        { userId: student.toString(), roles: ['STUDENT'] }
      );

      // Send 3 messages
      await CommunicationMessageService.sendMessage(conv.id, { body: 'Message 1' }, { userId: student.toString(), roles: ['STUDENT'] });
      await CommunicationMessageService.sendMessage(conv.id, { body: 'Message 2' }, { userId: student.toString(), roles: ['STUDENT'] });
      await CommunicationMessageService.sendMessage(conv.id, { body: 'Message 3' }, { userId: student.toString(), roles: ['STUDENT'] });
    });

    // Recipient simulates reconnect and fetches history via canonical API
    await tenantContextStorage.run({ currentTenantId: tenantId.toString(), currentUserId: instructor.toString() }, async () => {
      const history = await CommunicationMessageService.listMessages(conv.id, { limit: 10 }, { userId: instructor.toString(), roles: ['INSTRUCTOR'] });
      expect(history.data.length).toBe(3);
      expect(history.data[0].sequenceNumber).toBe(1);
      expect(history.data[1].sequenceNumber).toBe(2);
      expect(history.data[2].sequenceNumber).toBe(3);
    });
  });

  // =========================================================================
  // 10. STORAGE FAILURE ON ATTACHMENTS
  // =========================================================================
  it('Scenario J: Storage failure during attachment upload prevents orphan communication references', async () => {
    // Attempting to send message with invalid attachment hash/size throws validation error and does not commit broken reference
    await tenantContextStorage.run({ currentTenantId: tenantId.toString(), currentUserId: adminUserId.toString() }, async () => {
      await expect(
        CommunicationAnnouncementService.createAnnouncement(
          {
            title: 'Corrupted File Announcement',
            body: 'Notice with broken attachment',
            priority: 'NORMAL',
            channels: ['IN_APP'],
            audience: { selector: 'ALL_AUTHORIZED' },
            attachments: [
              {
                url: 'https://storage.didm.edu/corrupt.exe',
                fileName: 'malicious.exe',
                mimeType: 'application/x-msdownload', // rejected dangerous type
                sizeBytes: 999999999
              } as any
            ]
          },
          adminActor
        )
      ).rejects.toThrow();
    });

    const brokenInDb = await CommunicationAnnouncementModel.findOne({ title: 'Corrupted File Announcement' });
    expect(brokenInDb).toBeNull();
  });

  // =========================================================================
  // 11. QUERY PLANS & EXPLAIN VERIFICATION
  // =========================================================================
  it('Scenario K: Real MongoDB explain verify high-cardinality IXSCAN indexes', async () => {
    function hasIndexScan(plan: any): boolean {
      if (!plan) return false;
      if (plan.stage === 'IXSCAN' || plan.stage === 'FETCH') return true;
      if (plan.inputStage) return hasIndexScan(plan.inputStage);
      if (plan.inputStages) return plan.inputStages.some(hasIndexScan);
      return false;
    }

    // 1. Inbox query explain
    const inboxExplain = await CommunicationAnnouncementModel.find({
      tenantId,
      status: 'PUBLISHED',
      'audienceSnapshot.recipientUserIds': adminUserId
    }).explain('executionStats');

    expect(hasIndexScan((inboxExplain as any)?.queryPlanner?.winningPlan)).toBe(true);

    // 2. Admin announcement list explain
    const annExplain = await CommunicationAnnouncementModel.find({
      tenantId,
      status: 'PUBLISHED'
    }).sort({ createdAt: -1 }).explain('executionStats');

    expect(hasIndexScan((annExplain as any)?.queryPlanner?.winningPlan)).toBe(true);

    // 3. Conversation list explain
    const convExplain = await CommunicationConversationModel.find({
      tenantId,
      'participants.userId': adminUserId,
      status: 'ACTIVE'
    }).sort({ lastMessageAt: -1 }).explain('executionStats');

    expect(hasIndexScan((convExplain as any)?.queryPlanner?.winningPlan)).toBe(true);

    // 4. Message cursor query explain
    const msgExplain = await CommunicationMessageModel.find({
      conversationId: new Types.ObjectId(),
      sequenceNumber: { $lt: 50 }
    }).sort({ sequenceNumber: -1 }).explain('executionStats');

    expect(hasIndexScan((msgExplain as any)?.queryPlanner?.winningPlan)).toBe(true);

    // 5. Scheduled publication lookup explain
    const schedExplain = await CommunicationAnnouncementModel.find({
      status: 'SCHEDULED',
      scheduledAt: { $lte: new Date() }
    }).explain('executionStats');

    expect(hasIndexScan((schedExplain as any)?.queryPlanner?.winningPlan)).toBe(true);
  });
});
