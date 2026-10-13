import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  TenantModel,
  BranchModel,
  UserModel,
  BatchModel,
  CourseModel,
  EnrollmentModel,
  AssessmentModel,
  AssessmentSubmissionModel,
  IntegrationConnectionModel,
  ExternalAcademicResourceModel,
  IntegrationSyncRunModel,
  OrganizationMemberModel,
  connectDatabase,
  disconnectDatabase
} from '@edtech/database';
import { tenantContextStorage } from '@edtech/utils';
import { SecretEncryptionService } from '../security/secretEncryption.service';
import { AcademicClassroomSyncService } from '../integrations/orchestration/academicClassroomSync.service';
import { DeterministicClassroomTestAdapter } from '../integrations/adapters/test/deterministicClassroomTestAdapter';
import { IntegrationProviderRegistry } from '../integrations/registry/providerRegistry.service';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;

suite('Phase 22 Google Classroom Composition & Conflict Integration Suite', () => {
  const tenantAId = new mongoose.Types.ObjectId();
  const tenantBId = new mongoose.Types.ObjectId();

  const branchAId = new mongoose.Types.ObjectId();
  const branchBId = new mongoose.Types.ObjectId();

  const adminId = new mongoose.Types.ObjectId();
  const instructorId = new mongoose.Types.ObjectId();
  const activeStudent1Id = new mongoose.Types.ObjectId();
  const activeStudent2Id = new mongoose.Types.ObjectId();
  const withdrawnStudentId = new mongoose.Types.ObjectId();

  const course1Id = new mongoose.Types.ObjectId();
  const batchA1Id = new mongoose.Types.ObjectId();
  const assessment1Id = new mongoose.Types.ObjectId();

  let testClassroomAdapter: DeterministicClassroomTestAdapter;
  let connectionDoc: any;

  const adminActor = {
    userId: adminId.toString(),
    roles: ['TENANT_ADMIN'],
    isHqActor: true,
    isSuperAdmin: false
  };

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_INTEGRATION_URI || 'mongodb://127.0.0.1:27017/edtech_lms_test';
    await connectDatabase(mongoUri);

    await TenantModel.create([
      { _id: tenantAId, name: 'Tenant A Classroom', slug: 'tenant-a-cl', status: 'ACTIVE' },
      { _id: tenantBId, name: 'Tenant B Classroom', slug: 'tenant-b-cl', status: 'ACTIVE' }
    ]);

    await BranchModel.create([
      { _id: branchAId, tenantId: tenantAId, name: 'Branch A', code: 'BR-A', slug: 'branch-a-cl', status: 'ACTIVE' },
      { _id: branchBId, tenantId: tenantAId, name: 'Branch B', code: 'BR-B', slug: 'branch-b-cl', status: 'ACTIVE' }
    ]);

    await UserModel.create([
      { _id: adminId, tenantId: tenantAId, allowedTenantIds: [tenantAId], email: 'admin@classroom.com', name: 'Admin', passwordHash: 'hash123', status: 'ACTIVE' },
      { _id: instructorId, tenantId: tenantAId, allowedTenantIds: [tenantAId], email: 'instructor@classroom.com', name: 'Instructor Lead', passwordHash: 'hash123', status: 'ACTIVE' },
      { _id: activeStudent1Id, tenantId: tenantAId, allowedTenantIds: [tenantAId], email: 'student1@classroom.com', name: 'Active Student 1', passwordHash: 'hash123', status: 'ACTIVE' },
      { _id: activeStudent2Id, tenantId: tenantAId, allowedTenantIds: [tenantAId], email: 'student2@classroom.com', name: 'Active Student 2', passwordHash: 'hash123', status: 'ACTIVE' },
      { _id: withdrawnStudentId, tenantId: tenantAId, allowedTenantIds: [tenantAId], email: 'withdrawn@classroom.com', name: 'Withdrawn Student', passwordHash: 'hash123', status: 'ACTIVE' }
    ]);

    await OrganizationMemberModel.create([
      { tenantId: tenantAId, userId: adminId, role: 'TENANT_ADMIN', branchAccessMode: 'ALL', status: 'ACTIVE' },
      { tenantId: tenantAId, userId: instructorId, role: 'INSTRUCTOR', branchAccessMode: 'SELECTED', branchIds: [branchAId], status: 'ACTIVE' },
      { tenantId: tenantAId, userId: activeStudent1Id, role: 'STUDENT', branchAccessMode: 'SELECTED', branchIds: [branchAId], status: 'ACTIVE' },
      { tenantId: tenantAId, userId: activeStudent2Id, role: 'STUDENT', branchAccessMode: 'SELECTED', branchIds: [branchAId], status: 'ACTIVE' },
      { tenantId: tenantAId, userId: withdrawnStudentId, role: 'STUDENT', branchAccessMode: 'SELECTED', branchIds: [branchAId], status: 'ACTIVE' }
    ]);

    await CourseModel.create({
      _id: course1Id,
      tenantId: tenantAId,
      title: 'Python For AI',
      slug: 'py-101',
      status: 'PUBLISHED'
    });

    await BatchModel.create({
      _id: batchA1Id,
      tenantId: tenantAId,
      branchId: branchAId,
      courseId: course1Id,
      name: 'Python Morning Batch',
      batchCode: 'PY-M1',
      startDate: new Date(),
      status: 'ONGOING',
      instructorId: instructorId,
      timing: { startTime: '10:00', endTime: '12:00', timezone: 'UTC' },
      mode: 'ONLINE',
      maxSeats: 30,
      enrolledCount: 2,
      daysOfWeek: ['MON'],
      showOnWebsite: true
    });

    await EnrollmentModel.create([
      { tenantId: tenantAId, studentId: activeStudent1Id, courseId: course1Id, batchId: batchA1Id, status: 'ACTIVE' },
      { tenantId: tenantAId, studentId: activeStudent2Id, courseId: course1Id, batchId: batchA1Id, status: 'ACTIVE' },
      { tenantId: tenantAId, studentId: withdrawnStudentId, courseId: course1Id, batchId: batchA1Id, status: 'CANCELLED' }
    ]);

    await AssessmentModel.create({
      _id: assessment1Id,
      tenantId: tenantAId,
      courseId: course1Id,
      createdBy: instructorId,
      title: 'Python Assignment 1 - Functions',
      slug: 'py-assign-1',
      description: 'Implement functions and recursion in Python',
      status: 'PUBLISHED',
      type: 'ASSIGNMENT'
    });

    await AssessmentSubmissionModel.create({
      tenantId: tenantAId,
      assessmentId: assessment1Id,
      courseId: course1Id,
      batchId: batchA1Id,
      userId: activeStudent1Id,
      type: 'ASSIGNMENT',
      attemptNumber: 1,
      score: 95,
      maxScore: 100,
      scorePercentage: 95,
      status: 'GRADED',
      submittedAt: new Date(),
      revision: 0
    });

    connectionDoc = await IntegrationConnectionModel.create({
      tenantId: tenantAId,
      provider: 'GOOGLE_CLASSROOM',
      status: 'CONNECTED',
      encryptedCredentials: SecretEncryptionService.encryptSecret(
        JSON.stringify({
          refreshToken: 'dummy_refresh_token',
          accessToken: 'dummy_access_token'
        })
      ),
      externalAccountId: 'admin@school.edu',
      scopes: ['https://www.googleapis.com/auth/classroom.courses']
    });

    IntegrationProviderRegistry.setTestMode(true);
    testClassroomAdapter = IntegrationProviderRegistry.getDeterministicClassroomAdapter();
  });

  afterAll(async () => {
    await IntegrationSyncRunModel.deleteMany({});
    await ExternalAcademicResourceModel.deleteMany({});
    await IntegrationConnectionModel.deleteMany({});
    await AssessmentSubmissionModel.deleteMany({});
    await AssessmentModel.deleteMany({});
    await EnrollmentModel.deleteMany({});
    await BatchModel.deleteMany({});
    await CourseModel.deleteMany({});
    await OrganizationMemberModel.deleteMany({});
    await UserModel.deleteMany({});
    await BranchModel.deleteMany({});
    await TenantModel.deleteMany({});
    await disconnectDatabase();
  });

  describe('1. External Course Discovery & Pagination Resilience', () => {
    it('discovers courses and handles multi-page results safely', async () => {
      const coursesResult = await AcademicClassroomSyncService.discoverCourses(
        tenantAId.toString(),
        { connectionId: connectionDoc._id.toString(), pageSize: 10 },
        adminActor
      );

      expect(coursesResult.courses.length).toBeGreaterThanOrEqual(1);
      expect(coursesResult.courses[0].id).toBeDefined();
      expect(coursesResult.courses[0].name).toBeDefined();
    });

    it('recovers gracefully from injected pagination error without corrupting state', async () => {
      testClassroomAdapter.setInjectedFailure({ errorType: 'FAIL_ON_PAGE_2' });

      await expect(
        AcademicClassroomSyncService.discoverCourses(
          tenantAId.toString(),
          { connectionId: connectionDoc._id.toString(), pageToken: 'page_token_2' },
          adminActor
        )
      ).rejects.toThrow();

      testClassroomAdapter.setInjectedFailure(null);

      const recovered = await AcademicClassroomSyncService.discoverCourses(
        tenantAId.toString(),
        { connectionId: connectionDoc._id.toString() },
        adminActor
      );
      expect(recovered.courses.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('2. Course/Batch Linking & Full Roster/Coursework Sync', () => {
    let linkedResourceId: string;

    it('links DIDM batch to Classroom course with unique mapping', async () => {
      const link = await AcademicClassroomSyncService.linkBatchToClassroomCourse(
        tenantAId.toString(),
        {
          connectionId: connectionDoc._id.toString(),
          batchId: batchA1Id.toString(),
          externalCourseId: 'google-classroom-ext-101',
          syncDirection: 'BIDIRECTIONAL',
          gradePolicy: 'DIDM_AUTHORITATIVE'
        },
        adminActor
      );

      expect(link.id).toBeDefined();
      expect(link.canonicalResourceId).toBe(batchA1Id.toString());
      expect(link.externalResourceId).toBe('google-classroom-ext-101');
      linkedResourceId = link.id;
    });

    it('executes full sync run (teachers, active students only, coursework) without duplicate creations', async () => {
      const syncRun = await AcademicClassroomSyncService.syncClassroomResource(
        tenantAId.toString(),
        linkedResourceId,
        {
          syncRoster: true,
          syncCoursework: true,
          syncGrades: false
        },
        adminActor
      );

      expect(syncRun.status).toBe('COMPLETED');
      expect(syncRun.counts.teachersSynced).toBe(1);
      // Active students = 2, Withdrawn student ignored
      expect(syncRun.counts.studentsSynced).toBe(2);
      expect(syncRun.counts.courseworkSynced).toBe(1);

      // Verify withdrawn student is NOT deleted from canonical DIDM database
      const withdrawnStudent = await UserModel.findById(withdrawnStudentId);
      expect(withdrawnStudent).toBeDefined();
      expect(withdrawnStudent?.status).toBe('ACTIVE');
    });
  });

  describe('3. Grade Sync Policy & Conflict Detection', () => {
    it('detects grade conflict when policy is MANUAL_MERGE without silent overwriting', async () => {
      const link = await ExternalAcademicResourceModel.findOne({
        canonicalResourceId: batchA1Id.toString(),
        tenantId: tenantAId
      });
      expect(link).toBeDefined();

      const syncRun = await AcademicClassroomSyncService.syncClassroomResource(
        tenantAId.toString(),
        link!._id.toString(),
        {
          syncRoster: false,
          syncCoursework: false,
          syncGrades: true,
          gradePolicy: 'MANUAL_MERGE'
        },
        adminActor
      );

      expect(syncRun.status).toBe('PARTIAL');
      expect(syncRun.counts.conflictsDetected).toBeGreaterThanOrEqual(1);

      const updatedLink = await ExternalAcademicResourceModel.findById(link!._id);
      expect(updatedLink?.status).toBe('CONFLICT');
      expect(updatedLink?.conflictData).toBeDefined();
      expect(updatedLink?.conflictData?.didmGrade).toBe(95);
      expect(updatedLink?.conflictData?.externalGrade).toBe(85);
    });

    it('resolves grade conflict deterministically through audit-logged workflow', async () => {
      const link = await ExternalAcademicResourceModel.findOne({
        canonicalResourceId: batchA1Id.toString(),
        tenantId: tenantAId
      });
      expect(link).toBeDefined();

      const resolved = await AcademicClassroomSyncService.resolveConflict(
        tenantAId.toString(),
        link!._id.toString(),
        { conflictKey: 'grade_conflict', resolution: 'ACCEPT_DIDM' },
        adminActor
      );

      expect(resolved.status).toBe('SYNCED');
      expect(resolved.conflictData).toBeUndefined();
    });
  });
});
