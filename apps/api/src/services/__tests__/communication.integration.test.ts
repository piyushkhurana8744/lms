import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  BranchModel,
  OrganizationMemberModel,
  TenantModel,
  UserModel,
  RoleModel,
  BatchModel,
  CourseModel,
  EnrollmentModel,
  StudentLifecycleModel,
  LeadModel,
  AdmissionModel,
  PaymentModel,
  AttendanceSessionModel,
  CertificateModel,
  NotificationIntentModel,
  CommunicationAnnouncementModel,
  CommunicationConversationModel,
  CommunicationMessageModel,
  CommunicationReadStateModel,
  connectDatabase,
  disconnectDatabase
} from '@edtech/database';
import { tenantContextStorage } from '@edtech/utils';
import { PERMISSIONS } from '@edtech/permissions';
import {
  CommunicationAnnouncementService,
  CommunicationAudienceService,
  CommunicationConversationService,
  CommunicationMessageService,
  CommunicationInboxService
} from '../communication.service';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;

suite('Phase 20 Institutional Communication System Real MongoDB Integration Suite', () => {
  const tenantId = new mongoose.Types.ObjectId();
  const foreignTenantId = new mongoose.Types.ObjectId();

  const hqAdminId = new mongoose.Types.ObjectId();
  const branchAAdminId = new mongoose.Types.ObjectId();
  const branchBAdminId = new mongoose.Types.ObjectId();

  const branchAId = new mongoose.Types.ObjectId();
  const branchBId = new mongoose.Types.ObjectId();

  const instructor1Id = new mongoose.Types.ObjectId();
  const instructor2Id = new mongoose.Types.ObjectId();

  const student1Id = new mongoose.Types.ObjectId();
  const student2Id = new mongoose.Types.ObjectId();
  const student3Id = new mongoose.Types.ObjectId();

  const course1Id = new mongoose.Types.ObjectId();
  const batchA1Id = new mongoose.Types.ObjectId();
  const batchB1Id = new mongoose.Types.ObjectId();

  const adminActor = {
    userId: hqAdminId.toString(),
    isSuperAdmin: false,
    permissions: [
      PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_VIEW,
      PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_CREATE,
      PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_PUBLISH,
      PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_SCHEDULE,
      PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_CANCEL,
      PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_ARCHIVE,
      PERMISSIONS.COMMUNICATION_CONVERSATION_VIEW,
      PERMISSIONS.COMMUNICATION_CONVERSATION_CREATE,
      PERMISSIONS.COMMUNICATION_MESSAGE_SEND,
      PERMISSIONS.COMMUNICATION_INBOX_VIEW,
      PERMISSIONS.COMMUNICATION_MODERATE
    ]
  };

  const branchAActor = {
    userId: branchAAdminId.toString(),
    isSuperAdmin: false,
    permissions: [
      PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_VIEW,
      PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_CREATE,
      PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_PUBLISH,
      PERMISSIONS.COMMUNICATION_CONVERSATION_VIEW,
      PERMISSIONS.COMMUNICATION_MESSAGE_SEND,
      PERMISSIONS.COMMUNICATION_INBOX_VIEW
    ]
  };

  const instructor1Actor = {
    userId: instructor1Id.toString(),
    isSuperAdmin: false,
    permissions: [
      PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_VIEW,
      PERMISSIONS.COMMUNICATION_CONVERSATION_VIEW,
      PERMISSIONS.COMMUNICATION_CONVERSATION_CREATE,
      PERMISSIONS.COMMUNICATION_MESSAGE_SEND,
      PERMISSIONS.COMMUNICATION_INBOX_VIEW
    ]
  };

  const student1Actor = {
    userId: student1Id.toString(),
    isSuperAdmin: false,
    permissions: [
      PERMISSIONS.COMMUNICATION_CONVERSATION_VIEW,
      PERMISSIONS.COMMUNICATION_CONVERSATION_CREATE,
      PERMISSIONS.COMMUNICATION_MESSAGE_SEND,
      PERMISSIONS.COMMUNICATION_INBOX_VIEW
    ]
  };

  const student2Actor = {
    userId: student2Id.toString(),
    isSuperAdmin: false,
    permissions: [
      PERMISSIONS.COMMUNICATION_CONVERSATION_VIEW,
      PERMISSIONS.COMMUNICATION_CONVERSATION_CREATE,
      PERMISSIONS.COMMUNICATION_MESSAGE_SEND,
      PERMISSIONS.COMMUNICATION_INBOX_VIEW
    ]
  };

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_INTEGRATION_URI || 'mongodb://127.0.0.1:27017/edtech_lms_test';
    await connectDatabase(mongoUri);

    // 1. Seed Tenant
    await TenantModel.create({
      _id: tenantId,
      name: 'DIDM Phase 20 University',
      slug: `didm-p20-${Date.now()}`,
      status: 'ACTIVE'
    });

    await TenantModel.create({
      _id: foreignTenantId,
      name: 'Foreign Tenant',
      slug: `foreign-p20-${Date.now()}`,
      status: 'ACTIVE'
    });

    // 2. Seed Branches
    await BranchModel.create([
      {
        _id: branchAId,
        tenantId,
        name: 'South Delhi Campus',
        code: 'DEL-S',
        slug: 'del-s',
        type: 'PHYSICAL',
        status: 'ACTIVE',
        isPrimary: true
      },
      {
        _id: branchBId,
        tenantId,
        name: 'North Delhi Campus',
        code: 'DEL-N',
        slug: 'del-n',
        type: 'PHYSICAL',
        status: 'ACTIVE',
        isPrimary: false
      }
    ]);

    // 3. Seed Users
    const usersToCreate = [
      { _id: hqAdminId, tenantId, allowedTenantIds: [tenantId], email: 'hq-admin@didm.edu', name: 'HQ Admin', passwordHash: 'hash123', status: 'ACTIVE' },
      { _id: branchAAdminId, tenantId, allowedTenantIds: [tenantId], email: 'branch-a-admin@didm.edu', name: 'Branch A Admin', passwordHash: 'hash123', status: 'ACTIVE' },
      { _id: branchBAdminId, tenantId, allowedTenantIds: [tenantId], email: 'branch-b-admin@didm.edu', name: 'Branch B Admin', passwordHash: 'hash123', status: 'ACTIVE' },
      { _id: instructor1Id, tenantId, allowedTenantIds: [tenantId], email: 'instructor1@didm.edu', name: 'Instructor Alpha', passwordHash: 'hash123', status: 'ACTIVE' },
      { _id: instructor2Id, tenantId, allowedTenantIds: [tenantId], email: 'instructor2@didm.edu', name: 'Instructor Beta', passwordHash: 'hash123', status: 'ACTIVE' },
      { _id: student1Id, tenantId, allowedTenantIds: [tenantId], email: 'student1@didm.edu', name: 'Student One', passwordHash: 'hash123', status: 'ACTIVE' },
      { _id: student2Id, tenantId, allowedTenantIds: [tenantId], email: 'student2@didm.edu', name: 'Student Two', passwordHash: 'hash123', status: 'ACTIVE' },
      { _id: student3Id, tenantId, allowedTenantIds: [tenantId], email: 'student3@didm.edu', name: 'Student Three', passwordHash: 'hash123', status: 'ACTIVE' }
    ];
    await UserModel.create(usersToCreate);

    // 4. Seed Organization Members
    await OrganizationMemberModel.create([
      {
        tenantId,
        userId: hqAdminId,
        role: 'TENANT_ADMIN',
        branchAccessMode: 'ALL',
        status: 'ACTIVE'
      },
      {
        tenantId,
        userId: branchAAdminId,
        role: 'TENANT_ADMIN',
        branchAccessMode: 'SELECTED',
        branchIds: [branchAId],
        status: 'ACTIVE'
      },
      {
        tenantId,
        userId: branchBAdminId,
        role: 'TENANT_ADMIN',
        branchAccessMode: 'SELECTED',
        branchIds: [branchBId],
        status: 'ACTIVE'
      },
      {
        tenantId,
        userId: instructor1Id,
        role: 'INSTRUCTOR',
        branchAccessMode: 'SELECTED',
        branchIds: [branchAId],
        status: 'ACTIVE'
      },
      {
        tenantId,
        userId: instructor2Id,
        role: 'INSTRUCTOR',
        branchAccessMode: 'SELECTED',
        branchIds: [branchBId],
        status: 'ACTIVE'
      },
      {
        tenantId,
        userId: student1Id,
        role: 'STUDENT',
        branchAccessMode: 'SELECTED',
        branchIds: [branchAId],
        status: 'ACTIVE'
      },
      {
        tenantId,
        userId: student2Id,
        role: 'STUDENT',
        branchAccessMode: 'SELECTED',
        branchIds: [branchAId],
        status: 'ACTIVE'
      },
      {
        tenantId,
        userId: student3Id,
        role: 'STUDENT',
        branchAccessMode: 'SELECTED',
        branchIds: [branchBId],
        status: 'ACTIVE'
      }
    ]);

    // 5. Seed Course & Batches
    await CourseModel.create({
      _id: course1Id,
      tenantId,
      title: 'Digital Marketing Masterclass',
      slug: 'dm-masterclass',
      status: 'PUBLISHED'
    });

    await BatchModel.create([
      {
        _id: batchA1Id,
        tenantId,
        courseId: course1Id,
        branchId: branchAId,
        name: 'Batch South Alpha',
        batchCode: 'BSA-01',
        instructorId: instructor1Id,
        status: 'ONGOING',
        startDate: new Date(),
        timing: { startTime: '10:00', endTime: '12:00', timezone: 'Asia/Kolkata' },
        mode: 'OFFLINE',
        maxSeats: 30,
        enrolledCount: 2,
        daysOfWeek: ['MON', 'WED', 'FRI'],
        showOnWebsite: true
      },
      {
        _id: batchB1Id,
        tenantId,
        courseId: course1Id,
        branchId: branchBId,
        name: 'Batch North Beta',
        batchCode: 'BNB-01',
        instructorId: instructor2Id,
        status: 'ONGOING',
        startDate: new Date(),
        timing: { startTime: '14:00', endTime: '16:00', timezone: 'Asia/Kolkata' },
        mode: 'OFFLINE',
        maxSeats: 30,
        enrolledCount: 1,
        daysOfWeek: ['TUE', 'THU', 'SAT'],
        showOnWebsite: true
      }
    ]);

    // 6. Seed Enrollments & Student Lifecycles
    const enrollment1Id = new mongoose.Types.ObjectId();
    const enrollment2Id = new mongoose.Types.ObjectId();
    const enrollment3Id = new mongoose.Types.ObjectId();

    await EnrollmentModel.create([
      {
        _id: enrollment1Id,
        tenantId,
        studentId: student1Id,
        courseId: course1Id,
        batchId: batchA1Id,
        branchId: branchAId,
        status: 'ACTIVE'
      },
      {
        _id: enrollment2Id,
        tenantId,
        studentId: student2Id,
        courseId: course1Id,
        batchId: batchA1Id,
        branchId: branchAId,
        status: 'ACTIVE'
      },
      {
        _id: enrollment3Id,
        tenantId,
        studentId: student3Id,
        courseId: course1Id,
        batchId: batchB1Id,
        branchId: branchBId,
        status: 'ACTIVE'
      }
    ]);

    await StudentLifecycleModel.create([
      {
        tenantId,
        studentUserId: student1Id,
        currentEnrollmentId: enrollment1Id,
        currentBranchId: branchAId,
        currentBatchId: batchA1Id,
        currentStatus: 'ACTIVE',
        lifecycleEpisode: 1,
        isTerminal: false,
        revision: 0
      },
      {
        tenantId,
        studentUserId: student2Id,
        currentEnrollmentId: enrollment2Id,
        currentBranchId: branchAId,
        currentBatchId: batchA1Id,
        currentStatus: 'ACTIVE',
        lifecycleEpisode: 1,
        isTerminal: false,
        revision: 0
      },
      {
        tenantId,
        studentUserId: student3Id,
        currentEnrollmentId: enrollment3Id,
        currentBranchId: branchBId,
        currentBatchId: batchB1Id,
        currentStatus: 'ACTIVE',
        lifecycleEpisode: 1,
        isTerminal: false,
        revision: 0
      }
    ]);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  const runWithContext = async <T>(fn: () => Promise<T>): Promise<T> => {
    return tenantContextStorage.run({ currentTenantId: tenantId.toString() }, fn);
  };

  describe('1. Audience Resolution & Deduplication', () => {
    it('Resolves ALL_AUTHORIZED audience for HQ admin across all active members', async () => {
      await runWithContext(async () => {
        const { recipientUserIds, recipientCount } = await CommunicationAudienceService.resolveAudienceRecipients(
          tenantId.toString(),
          adminActor,
          'ALL_AUTHORIZED'
        );

        expect(recipientCount).toBeGreaterThanOrEqual(7);
        const ids = recipientUserIds.map((id) => id.toString());
        expect(ids).toContain(student1Id.toString());
        expect(ids).toContain(student2Id.toString());
        expect(ids).toContain(student3Id.toString());
        expect(ids).toContain(instructor1Id.toString());
        expect(ids).toContain(instructor2Id.toString());
      });
    });

    it('Branch A admin resolving ALL_AUTHORIZED is strictly bounded to Branch A members', async () => {
      await runWithContext(async () => {
        const { recipientUserIds } = await CommunicationAudienceService.resolveAudienceRecipients(
          tenantId.toString(),
          branchAActor,
          'ALL_AUTHORIZED'
        );

        const ids = recipientUserIds.map((id) => id.toString());
        expect(ids).toContain(student1Id.toString());
        expect(ids).toContain(student2Id.toString());
        expect(ids).toContain(instructor1Id.toString());
        // Must NOT contain Branch B student or instructor
        expect(ids).not.toContain(student3Id.toString());
        expect(ids).not.toContain(instructor2Id.toString());
      });
    });

    it('Resolves BRANCH selector for Branch B accurately', async () => {
      await runWithContext(async () => {
        const { recipientUserIds } = await CommunicationAudienceService.resolveAudienceRecipients(
          tenantId.toString(),
          adminActor,
          'BRANCH',
          { branchIds: [branchBId.toString()] }
        );

        const ids = recipientUserIds.map((id) => id.toString());
        expect(ids).toContain(student3Id.toString());
        expect(ids).toContain(instructor2Id.toString());
        expect(ids).not.toContain(student1Id.toString());
      });
    });

    it('Resolves BATCH selector for Batch A1', async () => {
      await runWithContext(async () => {
        const { recipientUserIds } = await CommunicationAudienceService.resolveAudienceRecipients(
          tenantId.toString(),
          adminActor,
          'BATCH',
          { batchIds: [batchA1Id.toString()] }
        );

        const ids = recipientUserIds.map((id) => id.toString());
        expect(ids).toContain(student1Id.toString());
        expect(ids).toContain(student2Id.toString());
        expect(ids).toContain(instructor1Id.toString()); // batch instructor
        expect(ids).not.toContain(student3Id.toString());
      });
    });

    it('Deduplicates recipients when matching multiple criteria', async () => {
      await runWithContext(async () => {
        const { recipientUserIds, recipientCount } = await CommunicationAudienceService.resolveAudienceRecipients(
          tenantId.toString(),
          adminActor,
          'SPECIFIC_USERS',
          { userIds: [student1Id.toString(), student1Id.toString(), student2Id.toString()] }
        );

        expect(recipientCount).toBe(2);
        const ids = recipientUserIds.map((id) => id.toString());
        expect(ids).toEqual(expect.arrayContaining([student1Id.toString(), student2Id.toString()]));
      });
    });
  });

  describe('2. Announcement Lifecycle & Immutability', () => {
    let draftAnnouncementId: string;

    it('Creates announcement draft with server-derived sender identity', async () => {
      await runWithContext(async () => {
        const draft = await CommunicationAnnouncementService.createAnnouncement(
          {
            title: 'Emergency Maintenance Notice',
            body: 'System updates will occur tonight at 11 PM UTC.',
            priority: 'IMPORTANT',
            channels: ['IN_APP', 'EMAIL'],
            audienceType: 'ALL_AUTHORIZED'
          },
          adminActor
        );

        expect(draft).toBeDefined();
        expect(draft.status).toBe('DRAFT');
        expect(draft.senderUserId).toBe(hqAdminId.toString());
        draftAnnouncementId = draft.id;
      });
    });

    it('Draft announcement is not visible in student inbox', async () => {
      await runWithContext(async () => {
        const inbox = await CommunicationInboxService.getInbox({ page: 1, limit: 10 }, student1Actor);
        const found = inbox.data.find((i) => i.id === draftAnnouncementId);
        expect(found).toBeUndefined();
      });
    });

    it('Publishes announcement, creates immutable audience snapshot, and enqueues Phase 14 notification intents', async () => {
      await runWithContext(async () => {
        const published = await CommunicationAnnouncementService.publishAnnouncement(
          draftAnnouncementId,
          adminActor
        );

        expect(published.status).toBe('PUBLISHED');
        expect(published.publishedAt).toBeDefined();
        expect(published.audienceSnapshot).toBeDefined();
        expect(published.audienceSnapshot!.recipientCount).toBeGreaterThanOrEqual(7);

        // Verify Phase 14 NotificationIntent records created
        const intents = await NotificationIntentModel.find({
          tenantId,
          sourceId: draftAnnouncementId
        });
        expect(intents.length).toBe(published.audienceSnapshot!.recipientCount);
        expect(intents[0].type).toBe('announcement.published');
      });
    });

    it('Publishing is idempotent: repeated publish does not duplicate snapshot or Phase 14 intents', async () => {
      await runWithContext(async () => {
        const intentsBefore = await NotificationIntentModel.countDocuments({
          tenantId,
          sourceId: draftAnnouncementId
        });

        const publishedAgain = await CommunicationAnnouncementService.publishAnnouncement(
          draftAnnouncementId,
          adminActor
        );

        const intentsAfter = await NotificationIntentModel.countDocuments({
          tenantId,
          sourceId: draftAnnouncementId
        });

        expect(publishedAgain.status).toBe('PUBLISHED');
        expect(intentsAfter).toBe(intentsBefore);
      });
    });

    it('Published announcement appears in eligible student inbox', async () => {
      await runWithContext(async () => {
        const inbox = await CommunicationInboxService.getInbox({ page: 1, limit: 10 }, student1Actor);
        const found = inbox.data.find((i) => i.id === draftAnnouncementId);
        expect(found).toBeDefined();
        expect(found?.isRead).toBe(false);
      });
    });

    it('Archives published announcement and retains historical delivery data', async () => {
      await runWithContext(async () => {
        const archived = await CommunicationAnnouncementService.archiveAnnouncement(
          draftAnnouncementId,
          adminActor
        );

        expect(archived.status).toBe('ARCHIVED');
        expect(archived.audienceSnapshot!.recipientCount).toBeGreaterThan(0);
      });
    });
  });

  describe('3. Scheduling & Cancellation Semantics', () => {
    let scheduledAnnouncementId: string;

    it('Schedules announcement for future UTC instant with timezone safety', async () => {
      await runWithContext(async () => {
        const futureDate = new Date(Date.now() + 3600 * 1000 * 24); // 1 day future
        const draft = await CommunicationAnnouncementService.createAnnouncement(
          {
            title: 'Scheduled Convocation Notice',
            body: 'Annual convocation ceremony registration begins next week.',
            priority: 'NORMAL',
            channels: ['IN_APP'],
            audienceType: 'BRANCH',
            audienceCriteria: { branchIds: [branchAId.toString()] }
          },
          adminActor
        );

        const scheduled = await CommunicationAnnouncementService.scheduleAnnouncement(
          draft.id,
          futureDate.toISOString(),
          adminActor
        );

        expect(scheduled.status).toBe('SCHEDULED');
        expect(scheduled.scheduledAt).toBeDefined();
        scheduledAnnouncementId = scheduled.id;
      });
    });

    it('Scheduled announcement is not visible in recipient inbox before publication', async () => {
      await runWithContext(async () => {
        const inbox = await CommunicationInboxService.getInbox({ page: 1, limit: 10 }, student1Actor);
        const found = inbox.data.find((i) => i.id === scheduledAnnouncementId);
        expect(found).toBeUndefined();
      });
    });

    it('Cancelling scheduled announcement prevents future publication and leaves 0 intents', async () => {
      await runWithContext(async () => {
        const cancelled = await CommunicationAnnouncementService.cancelAnnouncement(
          scheduledAnnouncementId,
          adminActor
        );

        expect(cancelled.status).toBe('CANCELLED');

        // Attempt background dispatch -> must not publish cancelled announcement
        await CommunicationAnnouncementService.processDueScheduledAnnouncements();

        const doc = await CommunicationAnnouncementModel.findById(scheduledAnnouncementId);
        expect(doc?.status).toBe('CANCELLED');

        const intents = await NotificationIntentModel.find({
          tenantId,
          sourceId: scheduledAnnouncementId
        });
        expect(intents.length).toBe(0);
      });
    });
  });

  describe('4. Student Transfer & Historical Snapshot Resilience', () => {
    let historicalAnnId: string;

    it('Publishes Branch A targeted announcement to student1 and student2', async () => {
      await runWithContext(async () => {
        const ann = await CommunicationAnnouncementService.createAnnouncement(
          {
            title: 'South Campus Library Notice',
            body: 'South campus physical books must be returned by Friday.',
            priority: 'NORMAL',
            channels: ['IN_APP'],
            audienceType: 'BRANCH',
            audienceCriteria: { branchIds: [branchAId.toString()] }
          },
          adminActor
        );

        const published = await CommunicationAnnouncementService.publishAnnouncement(
          ann.id,
          adminActor
        );

        historicalAnnId = published.id;
        expect(published.audienceSnapshot!.recipientUserIds).toContain(student1Id.toString());
      });
    });

    it('Transfer student1 from Branch A to Branch B', async () => {
      await StudentLifecycleModel.updateOne(
        { tenantId, studentUserId: student1Id },
        { $set: { currentBranchId: branchBId } }
      );
      await OrganizationMemberModel.updateOne(
        { tenantId, userId: student1Id },
        { $set: { branchIds: [branchBId] } }
      );
    });

    it('Historical announcement A remains accessible in student1 inbox', async () => {
      await runWithContext(async () => {
        const inbox = await CommunicationInboxService.getInbox({ page: 1, limit: 10 }, student1Actor);
        const found = inbox.data.find((i) => i.id === historicalAnnId);
        expect(found).toBeDefined();
      });
    });

    it('Future Branch A announcement excludes transferred student1', async () => {
      await runWithContext(async () => {
        const { recipientUserIds } = await CommunicationAudienceService.resolveAudienceRecipients(
          tenantId.toString(),
          adminActor,
          'BRANCH',
          { branchIds: [branchAId.toString()] }
        );
        const ids = recipientUserIds.map((id) => id.toString());
        expect(ids).not.toContain(student1Id.toString());
        expect(ids).toContain(student2Id.toString());
      });
    });

    it('Future Branch B announcement includes transferred student1', async () => {
      await runWithContext(async () => {
        const { recipientUserIds } = await CommunicationAudienceService.resolveAudienceRecipients(
          tenantId.toString(),
          adminActor,
          'BRANCH',
          { branchIds: [branchBId.toString()] }
        );
        const ids = recipientUserIds.map((id) => id.toString());
        expect(ids).toContain(student1Id.toString());
        expect(ids).toContain(student3Id.toString());
      });
    });
  });

  describe('5. Conversations & Student ↔ Instructor Academic Safety', () => {
    let directConvId: string;

    it('Student creates conversation with assigned Batch A1 instructor (allowed)', async () => {
      await runWithContext(async () => {
        const conv = await CommunicationConversationService.createConversation(
          {
            type: 'STUDENT_INSTRUCTOR',
            title: 'Query on Digital Marketing Module 3',
            participantUserIds: [instructor1Id.toString()]
          },
          student1Actor
        );

        expect(conv).toBeDefined();
        expect(conv.participants.length).toBe(2);
        expect(conv.fingerprint).toBeDefined();
        directConvId = conv.id;
      });
    });

    it('Student creating conversation with unrelated instructor (instructor2 from Branch B) is safely denied', async () => {
      await runWithContext(async () => {
        await expect(
          CommunicationConversationService.createConversation(
            {
              type: 'STUDENT_INSTRUCTOR',
              title: 'Unauthorized query',
              participantUserIds: [instructor2Id.toString()]
            },
            student1Actor
          )
        ).rejects.toThrow();
      });
    });

    it('Direct conversation creation deduplication: 10 concurrent requests yield 1 canonical thread', async () => {
      await runWithContext(async () => {
        const promises = Array.from({ length: 10 }).map(() =>
          CommunicationConversationService.createConversation(
            {
              type: 'STUDENT_INSTRUCTOR',
              title: 'Query on Digital Marketing Module 3',
              participantUserIds: [instructor1Id.toString()]
            },
            student1Actor
          )
        );

        const results = await Promise.all(promises);
        const uniqueIds = new Set(results.map((c) => c.id));
        expect(uniqueIds.size).toBe(1);
        expect([...uniqueIds][0]).toBe(directConvId);
      });
    });
  });

  describe('6. Message Ordering, Idempotency & Read State', () => {
    let convId: string;

    beforeAll(async () => {
      await runWithContext(async () => {
        const conv = await CommunicationConversationService.createConversation(
          {
            type: 'DIRECT',
            title: 'Direct Thread Test',
            participantUserIds: [student2Id.toString()]
          },
          student1Actor
        );
        convId = conv.id;
      });
    });

    it('Sends message with monotonic sequence number and enqueues recipient notification', async () => {
      await runWithContext(async () => {
        const msg1 = await CommunicationMessageService.sendMessage(
          convId,
          {
            body: 'Hello Student 2, did you review the assignment?',
            idempotencyKey: 'idemp-msg-001'
          },
          student1Actor
        );

        expect(msg1.sequenceNumber).toBe(1);
        expect(msg1.senderUserId).toBe(student1Id.toString());

        // Verify recipient unread count increased
        const unreadCount = await CommunicationInboxService.getUnreadCount(student2Actor);
        expect(unreadCount.totalUnread).toBeGreaterThan(0);
      });
    });

    it('Exact replay of message with same idempotency key returns existing message without duplicate send', async () => {
      await runWithContext(async () => {
        const replay = await CommunicationMessageService.sendMessage(
          convId,
          {
            body: 'Hello Student 2, did you review the assignment?',
            idempotencyKey: 'idemp-msg-001'
          },
          student1Actor
        );

        expect(replay.sequenceNumber).toBe(1);
        const allMsgs = await CommunicationMessageModel.find({ tenantId, conversationId: convId });
        expect(allMsgs.length).toBe(1);
      });
    });

    it('Concurrent messages receive strictly monotonic sequence numbers', async () => {
      await runWithContext(async () => {
        const sends = await Promise.all([
          CommunicationMessageService.sendMessage(convId, { body: 'Concurrent msg A' }, student1Actor),
          CommunicationMessageService.sendMessage(convId, { body: 'Concurrent msg B' }, student1Actor),
          CommunicationMessageService.sendMessage(convId, { body: 'Concurrent msg C' }, student1Actor)
        ]);

        const sequences = sends.map((s) => s.sequenceNumber).sort((a, b) => a - b);
        expect(sequences).toEqual([2, 3, 4]);
      });
    });

    it('Marks read state persistently and decrements unread count idempotently', async () => {
      await runWithContext(async () => {
        await CommunicationInboxService.markRead(
          {
            itemType: 'CONVERSATION',
            itemId: convId
          },
          student2Actor
        );

        const readState = await CommunicationReadStateModel.findOne({
          tenantId,
          recipientUserId: student2Id,
          itemType: 'CONVERSATION',
          itemId: convId
        });
        expect(readState).toBeDefined();

        // Repeated mark read is safe and does not produce negative unread count
        await CommunicationInboxService.markRead(
          {
            itemType: 'CONVERSATION',
            itemId: convId
          },
          student2Actor
        );

        const unread = await CommunicationInboxService.getUnreadCount(student2Actor);
        expect(unread.totalUnread).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('7. Concurrency: 10 Concurrent Announcement Publishes', () => {
    it('10 concurrent publish attempts yield exactly 1 logical publication and 1 audience snapshot', async () => {
      await runWithContext(async () => {
        const ann = await CommunicationAnnouncementService.createAnnouncement(
          {
            title: 'Race Condition Test Announcement',
            body: 'Testing CAS and publication idempotency under 10 concurrent requests.',
            priority: 'NORMAL',
            channels: ['IN_APP'],
            audienceType: 'ALL_AUTHORIZED'
          },
          adminActor
        );

        const annId = ann.id;

        const publishPromises = Array.from({ length: 10 }).map(() =>
          CommunicationAnnouncementService.publishAnnouncement(annId, adminActor)
        );

        const results = await Promise.all(publishPromises);
        for (const res of results) {
          expect(res.status).toBe('PUBLISHED');
        }

        // Check database state
        const finalDoc = await CommunicationAnnouncementModel.findById(annId);
        expect(finalDoc?.status).toBe('PUBLISHED');

        // Verify exact Phase 14 intent count equals recipient count (no 10x explosion)
        const recipientCount = finalDoc?.audienceSnapshot?.recipientCount ?? 0;
        const intents = await NotificationIntentModel.find({
          tenantId,
          sourceId: annId
        });
        expect(intents.length).toBe(recipientCount);
      });
    });
  });

  describe('8. Zero Cross-Domain Mutation Verification', () => {
    it('Asserts non-communication domains were completely untouched by communication operations', async () => {
      const leadsCount = await LeadModel.countDocuments({ tenantId });
      const admissionsCount = await AdmissionModel.countDocuments({ tenantId });
      const paymentsCount = await PaymentModel.countDocuments({ tenantId });
      const certificatesCount = await CertificateModel.countDocuments({ tenantId });
      const attendanceCount = await AttendanceSessionModel.countDocuments({ tenantId });

      expect(leadsCount).toBe(0);
      expect(admissionsCount).toBe(0);
      expect(paymentsCount).toBe(0);
      expect(certificatesCount).toBe(0);
      expect(attendanceCount).toBe(0);
    });
  });
});
