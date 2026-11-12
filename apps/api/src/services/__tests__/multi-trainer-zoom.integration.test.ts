import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  TenantModel,
  BranchModel,
  UserModel,
  BatchModel,
  CourseModel,
  ClassModel,
  EnrollmentModel,
  IntegrationConnectionModel,
  ExternalMeetingModel,
  LiveMeetingAssociationHistoryModel,
  OrganizationMemberModel,
  TrainerZoomAccountModel,
  connectDatabase,
  disconnectDatabase
} from '@edtech/database';
import { tenantContextStorage } from '@edtech/utils';
import { SecretEncryptionService } from '../security/secretEncryption.service';
import { LiveClassOrchestratorService } from '../integrations/orchestration/liveClassOrchestrator.service';
import { TrainerZoomAccountService } from '../integrations/orchestration/trainerZoomAccount.service';
import { IntegrationProviderRegistry } from '../integrations/registry/providerRegistry.service';
import { DeterministicLiveMeetingTestAdapter } from '../integrations/adapters/test/deterministicLiveMeetingTestAdapter';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;

suite('Multi-Trainer Zoom Host Automation & Lifecycle Integration Suite', () => {
  const tenant1Id = new mongoose.Types.ObjectId();
  const tenant2Id = new mongoose.Types.ObjectId();
  const branchId = new mongoose.Types.ObjectId();

  const trainer1Id = new mongoose.Types.ObjectId();
  const trainer2Id = new mongoose.Types.ObjectId();
  const trainerBasicId = new mongoose.Types.ObjectId();
  const studentId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();

  const courseId = new mongoose.Types.ObjectId();
  const batch1Id = new mongoose.Types.ObjectId();
  const batch2Id = new mongoose.Types.ObjectId();

  let zoomTestAdapter: DeterministicLiveMeetingTestAdapter;

  const adminActor = {
    userId: adminId.toString(),
    roles: ['TENANT_ADMIN'],
    isHqActor: false,
    isSuperAdmin: true
  };

  const trainer1Actor = {
    userId: trainer1Id.toString(),
    roles: ['INSTRUCTOR'],
    isHqActor: false,
    isSuperAdmin: false
  };

  const studentActor = {
    userId: studentId.toString(),
    roles: ['STUDENT'],
    isHqActor: false,
    isSuperAdmin: false
  };

  const runT1 = <T>(fn: () => Promise<T>): Promise<T> =>
    tenantContextStorage.run(
      {
        currentTenantId: tenant1Id.toString(),
        currentUserId: adminId.toString(),
        isPlatformContext: false,
        allowedTenantIds: [tenant1Id.toString()]
      },
      fn
    );

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_INTEGRATION_URI || 'mongodb://127.0.0.1:27017/edtech_lms_test';
    await connectDatabase(mongoUri);

    IntegrationProviderRegistry.setTestMode(true);
    zoomTestAdapter = IntegrationProviderRegistry.getLiveMeetingProvider('ZOOM') as any;

    // Register Mock Zoom Users on Adapter
    zoomTestAdapter.mockUsers.set('zoom_trainer_1', {
      id: 'zoom_trainer_1',
      email: 'rahul.trainer@didm.in',
      type: 2, // Licensed
      status: 'active',
      account_id: 'didm_zoom_account_alpha'
    });

    zoomTestAdapter.mockUsers.set('zoom_trainer_2', {
      id: 'zoom_trainer_2',
      email: 'priya.trainer@didm.in',
      type: 2, // Licensed
      status: 'active',
      account_id: 'didm_zoom_account_alpha'
    });

    zoomTestAdapter.mockUsers.set('zoom_trainer_basic', {
      id: 'zoom_trainer_basic',
      email: 'basic.unlicensed@didm.in',
      type: 1, // Basic (Free)
      status: 'active',
      account_id: 'didm_zoom_account_alpha'
    });

    zoomTestAdapter.mockUsers.set('zoom_trainer_inactive', {
      id: 'zoom_trainer_inactive',
      email: 'inactive.trainer@didm.in',
      type: 2,
      status: 'inactive',
      account_id: 'didm_zoom_account_alpha'
    });

    // 1. Tenants & Branches
    await TenantModel.create([
      { _id: tenant1Id, name: 'DIDM Primary Academy', slug: 'didm-primary', status: 'ACTIVE' },
      { _id: tenant2Id, name: 'Isolated Secondary Tenant', slug: 'didm-secondary', status: 'ACTIVE' }
    ]);

    await BranchModel.create({
      _id: branchId,
      tenantId: tenant1Id,
      name: 'South Delhi Campus',
      code: 'SD-01',
      slug: 'branch-south-delhi',
      status: 'ACTIVE'
    });

    // 2. Users & Memberships
    await runT1(async () => {
      await UserModel.create([
        { _id: adminId, tenantId: tenant1Id, allowedTenantIds: [tenant1Id], email: 'admin@didm.in', name: 'Institute Admin', passwordHash: 'hash', status: 'ACTIVE', roles: ['TENANT_ADMIN'] },
        { _id: trainer1Id, tenantId: tenant1Id, allowedTenantIds: [tenant1Id], email: 'rahul.trainer@didm.in', name: 'Rahul Sharma', passwordHash: 'hash', status: 'ACTIVE', roles: ['INSTRUCTOR'] },
        { _id: trainer2Id, tenantId: tenant1Id, allowedTenantIds: [tenant1Id], email: 'priya.trainer@didm.in', name: 'Priya Verma', passwordHash: 'hash', status: 'ACTIVE', roles: ['INSTRUCTOR'] },
        { _id: trainerBasicId, tenantId: tenant1Id, allowedTenantIds: [tenant1Id], email: 'basic.unlicensed@didm.in', name: 'Amit Basic', passwordHash: 'hash', status: 'ACTIVE', roles: ['INSTRUCTOR'] },
        { _id: studentId, tenantId: tenant1Id, allowedTenantIds: [tenant1Id], email: 'student@didm.in', name: 'Vikram Student', passwordHash: 'hash', status: 'ACTIVE', roles: ['STUDENT'] }
      ]);

      await OrganizationMemberModel.create([
        { tenantId: tenant1Id, userId: adminId, role: 'TENANT_ADMIN', branchAccessMode: 'ALL', status: 'ACTIVE' },
        { tenantId: tenant1Id, userId: trainer1Id, role: 'INSTRUCTOR', branchAccessMode: 'SELECTED', branchIds: [branchId], status: 'ACTIVE' },
        { tenantId: tenant1Id, userId: trainer2Id, role: 'INSTRUCTOR', branchAccessMode: 'SELECTED', branchIds: [branchId], status: 'ACTIVE' },
        { tenantId: tenant1Id, userId: trainerBasicId, role: 'INSTRUCTOR', branchAccessMode: 'SELECTED', branchIds: [branchId], status: 'ACTIVE' },
        { tenantId: tenant1Id, userId: studentId, role: 'STUDENT', branchAccessMode: 'SELECTED', branchIds: [branchId], status: 'ACTIVE' }
      ]);

      await CourseModel.create({
        _id: courseId,
        tenantId: tenant1Id,
        title: 'Master Digital Marketing Course',
        slug: 'mdm-2026',
        status: 'PUBLISHED'
      });

      // Batch 1 assigned to Trainer 1
      await BatchModel.create({
        _id: batch1Id,
        tenantId: tenant1Id,
        branchId,
        courseId,
        instructorId: trainer1Id,
        name: 'Digital Marketing Morning Batch',
        batchCode: 'DM-MORN-01',
        startDate: new Date(),
        status: 'ONGOING',
        timing: { startTime: '09:00', endTime: '11:00', timezone: 'Asia/Kolkata' },
        mode: 'ONLINE',
        maxSeats: 30,
        enrolledCount: 1,
        daysOfWeek: ['MON', 'WED', 'FRI'],
        showOnWebsite: true
      });

      // Batch 2 assigned to Trainer 2
      await BatchModel.create({
        _id: batch2Id,
        tenantId: tenant1Id,
        branchId,
        courseId,
        instructorId: trainer2Id,
        name: 'SEO & Performance Evening Batch',
        batchCode: 'SEO-EVE-02',
        startDate: new Date(),
        status: 'ONGOING',
        timing: { startTime: '18:00', endTime: '20:00', timezone: 'Asia/Kolkata' },
        mode: 'ONLINE',
        maxSeats: 30,
        enrolledCount: 1,
        daysOfWeek: ['TUE', 'THU'],
        showOnWebsite: true
      });

      await EnrollmentModel.create({
        tenantId: tenant1Id,
        studentId,
        courseId,
        batchId: batch1Id,
        status: 'ACTIVE'
      });

      // Institute Zoom Connection
      await IntegrationConnectionModel.create({
        tenantId: tenant1Id,
        provider: 'ZOOM',
        status: 'CONNECTED',
        scopeType: 'TENANT',
        externalAccountId: 'zoom_institute_admin_master',
        externalTenantId: 'didm_zoom_account_alpha',
        encryptedCredentials: SecretEncryptionService.encryptSecret(
          JSON.stringify({ accessToken: 'test_token', refreshToken: 'test_refresh', clientId: 'cid', clientSecret: 'sec' })
        ),
        metadata: {
          accountEmail: 'admin@didm.in',
          displayName: 'DIDM Central Zoom Workspace'
        }
      });
    });
  });

  afterAll(async () => {
    await LiveMeetingAssociationHistoryModel.collection.deleteMany({});
    await ExternalMeetingModel.collection.deleteMany({});
    await TrainerZoomAccountModel.collection.deleteMany({});
    await IntegrationConnectionModel.collection.deleteMany({});
    await ClassModel.collection.deleteMany({});
    await EnrollmentModel.collection.deleteMany({});
    await BatchModel.collection.deleteMany({});
    await CourseModel.collection.deleteMany({});
    await OrganizationMemberModel.collection.deleteMany({});
    await UserModel.collection.deleteMany({});
    await BranchModel.collection.deleteMany({});
    await TenantModel.collection.deleteMany({});
    await disconnectDatabase();
  });

  it('verifies and maps a Licensed trainer Zoom host account with active eligibility', async () => {
    await runT1(async () => {
      const mapping = await TrainerZoomAccountService.mapTrainerZoomAccount(
        tenant1Id.toString(),
        trainer1Id.toString(),
        'rahul.trainer@didm.in',
        adminActor
      );

      expect(mapping.userId).toBe(trainer1Id.toString());
      expect(mapping.zoomUserId).toBe('zoom_trainer_1');
      expect(mapping.zoomEmail).toBe('rahul.trainer@didm.in');
      expect(mapping.licenseType).toBe('LICENSED');
      expect(mapping.accountMembershipStatus).toBe('ACTIVE');
      expect(mapping.isHostEligible).toBe(true);
      expect(mapping.ineligibilityReason).toBeNull();
    });
  });

  it('verifies a Basic (free) Zoom account and correctly flags isHostEligible: false', async () => {
    await runT1(async () => {
      const mapping = await TrainerZoomAccountService.mapTrainerZoomAccount(
        tenant1Id.toString(),
        trainerBasicId.toString(),
        'basic.unlicensed@didm.in',
        adminActor
      );

      expect(mapping.userId).toBe(trainerBasicId.toString());
      expect(mapping.zoomUserId).toBe('zoom_trainer_basic');
      expect(mapping.licenseType).toBe('BASIC');
      expect(mapping.isHostEligible).toBe(false);
      expect(mapping.ineligibilityReason).toBe('BASIC_UNLICENSED_USER');
    });
  });

  it('enforces multi-tenant isolation: cannot map or resolve trainer across different tenants', async () => {
    await tenantContextStorage.run(
      {
        currentTenantId: tenant2Id.toString(),
        currentUserId: adminId.toString(),
        isPlatformContext: false,
        allowedTenantIds: [tenant2Id.toString()]
      },
      async () => {
        // Attempting to map Tenant 1's trainer in Tenant 2 must fail
        await expect(
          TrainerZoomAccountService.mapTrainerZoomAccount(
            tenant2Id.toString(),
            trainer1Id.toString(),
            'rahul.trainer@didm.in',
            adminActor
          )
        ).rejects.toThrow();
      }
    );
  });

  it('automatically resolves batch trainer and provisions meeting under Trainer 1 host ID', async () => {
    const classId = new mongoose.Types.ObjectId();
    await runT1(async () => {
      // Create class without direct instructorId (inherits batch1 trainer: trainer1Id)
      await ClassModel.create({
        _id: classId,
        tenantId: tenant1Id,
        branchId,
        batchId: batch1Id,
        courseId,
        name: 'SEO Keyword Research Class',
        classCode: 'CLS-SEO-MORN',
        scheduledStartAt: new Date(Date.now() + 3600000),
        scheduledEndAt: new Date(Date.now() + 7200000),
        startDate: new Date(Date.now() + 3600000),
        endDate: new Date(Date.now() + 7200000),
        status: 'SCHEDULED',
        scheduleRevision: 0,
        mode: 'ONLINE',
        capacity: 30,
        enrolledCount: 1,
        enrolledStudents: [],
        timing: { startTime: '09:00', endTime: '11:00', timezone: 'Asia/Kolkata' },
        daysOfWeek: ['MON'],
        showOnWebsite: false
      });

      const meetingDTO = await LiveClassOrchestratorService.createMeetingForClass(
        tenant1Id.toString(),
        classId.toString(),
        { provider: 'ZOOM', topic: 'SEO Keyword Research Class' },
        adminActor
      );

      expect(meetingDTO.provider).toBe('ZOOM');
      expect(meetingDTO.metadata?.hostExternalUserId).toBe('zoom_trainer_1');
      expect(meetingDTO.metadata?.hostTrainerUserId).toBe(trainer1Id.toString());

      const classDoc = await ClassModel.findById(classId);
      expect(classDoc?.zoomDetails?.meetingUrl).toBeDefined();
      expect(classDoc?.zoomDetails?.hostUrl).toBeDefined();
    });
  });

  it('respects a specifically assigned class trainer (Trainer 2) over the batch trainer', async () => {
    // Map Trainer 2
    await runT1(async () => {
      await TrainerZoomAccountService.mapTrainerZoomAccount(
        tenant1Id.toString(),
        trainer2Id.toString(),
        'priya.trainer@didm.in',
        adminActor
      );
    });

    const classId = new mongoose.Types.ObjectId();
    await runT1(async () => {
      // Class belongs to batch 1 (Trainer 1), but specifically assigns Trainer 2 as guest faculty
      await ClassModel.create({
        _id: classId,
        tenantId: tenant1Id,
        branchId,
        batchId: batch1Id,
        courseId,
        instructorId: trainer2Id, // Direct assignment override!
        name: 'Guest Masterclass: Conversion Rate Optimization',
        classCode: 'CLS-CRO-SPECIAL',
        scheduledStartAt: new Date(Date.now() + 10800000),
        scheduledEndAt: new Date(Date.now() + 14400000),
        startDate: new Date(Date.now() + 10800000),
        endDate: new Date(Date.now() + 14400000),
        status: 'SCHEDULED',
        scheduleRevision: 0,
        mode: 'ONLINE',
        capacity: 30,
        enrolledCount: 1,
        enrolledStudents: [],
        timing: { startTime: '12:00', endTime: '14:00', timezone: 'Asia/Kolkata' },
        daysOfWeek: ['MON'],
        showOnWebsite: false
      });

      const meetingDTO = await LiveClassOrchestratorService.createMeetingForClass(
        tenant1Id.toString(),
        classId.toString(),
        { provider: 'ZOOM', topic: 'Guest Masterclass: Conversion Rate Optimization' },
        adminActor
      );

      // Must be created under Trainer 2's Zoom host ID!
      expect(meetingDTO.metadata?.hostExternalUserId).toBe('zoom_trainer_2');
      expect(meetingDTO.metadata?.hostTrainerUserId).toBe(trainer2Id.toString());
    });
  });

  it('rejects meeting creation with clear error when assigned trainer has Basic unlicensed account', async () => {
    const classId = new mongoose.Types.ObjectId();
    await runT1(async () => {
      await ClassModel.create({
        _id: classId,
        tenantId: tenant1Id,
        branchId,
        batchId: batch1Id,
        courseId,
        instructorId: trainerBasicId, // Unlicensed trainer!
        name: 'Basic Trainer Class',
        classCode: 'CLS-BASIC-UNLICENSED',
        scheduledStartAt: new Date(Date.now() + 18000000),
        scheduledEndAt: new Date(Date.now() + 21600000),
        startDate: new Date(Date.now() + 18000000),
        endDate: new Date(Date.now() + 21600000),
        status: 'SCHEDULED',
        scheduleRevision: 0,
        mode: 'ONLINE',
        capacity: 30,
        enrolledCount: 1,
        enrolledStudents: [],
        timing: { startTime: '15:00', endTime: '17:00', timezone: 'Asia/Kolkata' },
        daysOfWeek: ['MON'],
        showOnWebsite: false
      });

      // Must reject clearly and refuse to silently schedule under SuperAdmin
      await expect(
        TrainerZoomAccountService.resolveHostForClass(tenant1Id.toString(), classId.toString(), {
          allowFallback: false
        })
      ).rejects.toThrow(/BASIC_UNLICENSED_USER/);
    });
  });

  it('handles trainer reassignment by retiring old meeting and scheduling under new trainer', async () => {
    const classId = new mongoose.Types.ObjectId();
    await runT1(async () => {
      // 1. Initially scheduled with Trainer 1
      await ClassModel.create({
        _id: classId,
        tenantId: tenant1Id,
        branchId,
        batchId: batch1Id,
        courseId,
        instructorId: trainer1Id,
        name: 'Social Media Analytics',
        classCode: 'CLS-SMA-REASSIGN',
        scheduledStartAt: new Date(Date.now() + 25200000),
        scheduledEndAt: new Date(Date.now() + 28800000),
        startDate: new Date(Date.now() + 25200000),
        endDate: new Date(Date.now() + 28800000),
        status: 'SCHEDULED',
        scheduleRevision: 0,
        mode: 'ONLINE',
        capacity: 30,
        enrolledCount: 1,
        enrolledStudents: [],
        timing: { startTime: '17:00', endTime: '19:00', timezone: 'Asia/Kolkata' },
        daysOfWeek: ['MON'],
        showOnWebsite: false
      });

      const initialMeeting = await LiveClassOrchestratorService.createMeetingForClass(
        tenant1Id.toString(),
        classId.toString(),
        { provider: 'ZOOM', topic: 'Social Media Analytics' },
        adminActor
      );
      expect(initialMeeting.metadata?.hostExternalUserId).toBe('zoom_trainer_1');

      // 2. Reassign class to Trainer 2
      const reassigned = await TrainerZoomAccountService.reassignClassTrainerMeeting(
        tenant1Id.toString(),
        classId.toString(),
        trainer2Id.toString(),
        adminActor
      );
      expect(reassigned.hostExternalUserId).toBe('zoom_trainer_2');

      // 3. Verify external meeting updated
      const updatedMeeting = await ExternalMeetingModel.findOne({
        tenantId: tenant1Id,
        classId
      });
      expect(updatedMeeting?.metadata?.hostExternalUserId).toBe('zoom_trainer_2');
      expect(updatedMeeting?.metadata?.hostTrainerUserId).toBe(trainer2Id.toString());

      // 4. Verify history association retired
      const retiredHistory = await LiveMeetingAssociationHistoryModel.findOne({
        tenantId: tenant1Id,
        classId,
        status: 'RETIRED'
      });
      expect(retiredHistory).toBeDefined();
      expect(retiredHistory?.retirementReason).toContain('REASSIGNED_TRAINER');
    });
  });

  it('guarantees idempotency on concurrent and retry meeting creations', async () => {
    const classId = new mongoose.Types.ObjectId();
    await runT1(async () => {
      await ClassModel.create({
        _id: classId,
        tenantId: tenant1Id,
        branchId,
        batchId: batch1Id,
        courseId,
        instructorId: trainer1Id,
        name: 'Concurrent Scheduling Test',
        classCode: 'CLS-CONCUR-IDEMP',
        scheduledStartAt: new Date(Date.now() + 32400000),
        scheduledEndAt: new Date(Date.now() + 36000000),
        startDate: new Date(Date.now() + 32400000),
        endDate: new Date(Date.now() + 36000000),
        status: 'SCHEDULED',
        scheduleRevision: 0,
        mode: 'ONLINE',
        capacity: 30,
        enrolledCount: 1,
        enrolledStudents: [],
        timing: { startTime: '19:00', endTime: '21:00', timezone: 'Asia/Kolkata' },
        daysOfWeek: ['MON'],
        showOnWebsite: false
      });

      // Launch 5 concurrent calls for the exact same class
      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          LiveClassOrchestratorService.createMeetingForClass(
            tenant1Id.toString(),
            classId.toString(),
            { provider: 'ZOOM', topic: 'Concurrent Scheduling Test' },
            adminActor
          )
        )
      );

      // All 5 calls return identical external meeting ID without duplicating
      const firstId = results[0].externalMeetingId;
      for (const res of results) {
        expect(res.externalMeetingId).toBe(firstId);
      }

      // Database has exactly 1 external meeting for this class
      const meetingCount = await ExternalMeetingModel.countDocuments({
        tenantId: tenant1Id,
        classId
      });
      expect(meetingCount).toBe(1);
    });
  });

  it('detects host scheduling conflicts when trainer has overlapping classes', async () => {
    const class1Id = new mongoose.Types.ObjectId();
    const class2Id = new mongoose.Types.ObjectId();
    const startTime = new Date(Date.now() + 40000000);
    const endTime = new Date(Date.now() + 43600000);

    await runT1(async () => {
      // Existing Class for Trainer 1
      await ClassModel.create({
        _id: class1Id,
        tenantId: tenant1Id,
        branchId,
        batchId: batch1Id,
        courseId,
        instructorId: trainer1Id,
        name: 'Existing Booked Class',
        classCode: 'CLS-CONFLICT-1',
        scheduledStartAt: startTime,
        scheduledEndAt: endTime,
        startDate: startTime,
        endDate: endTime,
        status: 'SCHEDULED',
        scheduleRevision: 0,
        mode: 'ONLINE',
        capacity: 30,
        enrolledCount: 1,
        enrolledStudents: [],
        timing: { startTime: '10:00', endTime: '12:00', timezone: 'Asia/Kolkata' },
        daysOfWeek: ['MON'],
        showOnWebsite: false
      });

      // New Class attempting to book same Trainer 1 at exact same time
      await ClassModel.create({
        _id: class2Id,
        tenantId: tenant1Id,
        branchId,
        batchId: batch1Id,
        courseId,
        instructorId: trainer1Id,
        name: 'Overlapping Class',
        classCode: 'CLS-CONFLICT-2',
        scheduledStartAt: startTime,
        scheduledEndAt: endTime,
        startDate: startTime,
        endDate: endTime,
        status: 'SCHEDULED',
        scheduleRevision: 0,
        mode: 'ONLINE',
        capacity: 30,
        enrolledCount: 1,
        enrolledStudents: [],
        timing: { startTime: '10:00', endTime: '12:00', timezone: 'Asia/Kolkata' },
        daysOfWeek: ['MON'],
        showOnWebsite: false
      });

      const hostResolution = await TrainerZoomAccountService.resolveHostForClass(
        tenant1Id.toString(),
        class2Id.toString()
      );

      expect(hostResolution.hasConflict).toBe(true);
      expect(hostResolution.conflictDetails).toContain('already has an overlapping class');
    });
  });

  it('protects privileged host start URLs from students while granting to assigned trainer', async () => {
    const classId = new mongoose.Types.ObjectId();
    await runT1(async () => {
      await ClassModel.create({
        _id: classId,
        tenantId: tenant1Id,
        branchId,
        batchId: batch1Id,
        courseId,
        instructorId: trainer1Id,
        name: 'Role Security Class',
        classCode: 'CLS-ROLE-SEC',
        scheduledStartAt: new Date(Date.now() + 50000000),
        scheduledEndAt: new Date(Date.now() + 53600000),
        startDate: new Date(Date.now() + 50000000),
        endDate: new Date(Date.now() + 53600000),
        status: 'SCHEDULED',
        scheduleRevision: 0,
        mode: 'ONLINE',
        capacity: 30,
        enrolledCount: 1,
        enrolledStudents: [],
        timing: { startTime: '10:00', endTime: '12:00', timezone: 'Asia/Kolkata' },
        daysOfWeek: ['MON'],
        showOnWebsite: false
      });

      await LiveClassOrchestratorService.createMeetingForClass(
        tenant1Id.toString(),
        classId.toString(),
        { provider: 'ZOOM', topic: 'Role Security Class' },
        adminActor
      );

      // Trainer Request
      const trainerJoinInfo = await LiveClassOrchestratorService.getAuthorizedJoinInfo(
        tenant1Id.toString(),
        classId.toString(),
        trainer1Actor
      );
      expect(trainerJoinInfo.isHost).toBe(true);
      expect(trainerJoinInfo.startUrl).toBeDefined();
      expect(trainerJoinInfo.joinUrl).toBeDefined();

      // Student Request
      const studentJoinInfo = await LiveClassOrchestratorService.getAuthorizedJoinInfo(
        tenant1Id.toString(),
        classId.toString(),
        studentActor
      );
      expect(studentJoinInfo.isHost).toBe(false);
      expect(studentJoinInfo.joinUrl).toBeDefined();
      expect(studentJoinInfo.startUrl).toBeUndefined(); // NEVER EXPOSED TO STUDENT
    });
  });

  it('synchronizes all mapped trainer Zoom accounts and updates eligibility counts', async () => {
    await runT1(async () => {
      const syncResult = await TrainerZoomAccountService.syncAllTrainersZoomStatus(
        tenant1Id.toString(),
        adminActor
      );

      expect(syncResult.total).toBeGreaterThanOrEqual(3);
      expect(syncResult.synced).toBeGreaterThanOrEqual(3);
      expect(syncResult.eligible).toBe(2); // Trainer 1 & Trainer 2
      expect(syncResult.ineligible).toBe(1); // Trainer Basic
    });
  });
});

