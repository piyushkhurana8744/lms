import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  TenantModel,
  BranchModel,
  UserModel,
  RoleModel,
  OrganizationMemberModel,
  BatchModel,
  CourseModel,
  ClassModel,
  EnrollmentModel,
  IntegrationConnectionModel,
  ExternalAcademicResourceModel,
  ExternalMeetingModel,
  IntegrationOperationModel,
  IntegrationSyncRunModel,
  IntegrationWebhookEventModel,
  AttendanceEvidenceModel,
  connectDatabase,
  disconnectDatabase
} from '@edtech/database';
import { tenantContextStorage } from '@edtech/utils';
import { EmailCryptoService } from '../email/email.crypto';
import { IntegrationConnectionService } from '../integrations/orchestration/integrationConnection.service';
import { LiveClassOrchestratorService } from '../integrations/orchestration/liveClassOrchestrator.service';
import { AcademicClassroomSyncService } from '../integrations/orchestration/academicClassroomSync.service';
import { IntegrationOperationService } from '../integrations/orchestration/integrationOperation.service';
import { IntegrationWebhookService } from '../integrations/orchestration/integrationWebhook.service';
import { OAuthStateService } from '../integrations/security/oauthState.service';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;

suite('Phase 22 External Integration Platform Real MongoDB Integration Suite', () => {
  const tenantAId = new mongoose.Types.ObjectId();
  const tenantBId = new mongoose.Types.ObjectId();

  const branchAId = new mongoose.Types.ObjectId();
  const branchBId = new mongoose.Types.ObjectId();

  const hqAdminId = new mongoose.Types.ObjectId();
  const instructor1Id = new mongoose.Types.ObjectId();
  const student1Id = new mongoose.Types.ObjectId();

  const course1Id = new mongoose.Types.ObjectId();
  const batchA1Id = new mongoose.Types.ObjectId();
  const class1Id = new mongoose.Types.ObjectId();
  let defaultConnectionAId: mongoose.Types.ObjectId;

  const adminActor = {
    userId: hqAdminId.toString(),
    roles: ['TENANT_ADMIN'],
    isHqActor: true,
    isSuperAdmin: false
  };

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_INTEGRATION_URI || 'mongodb://127.0.0.1:27017/edtech_lms_test';
    await connectDatabase(mongoUri);

    await TenantModel.create([
      { _id: tenantAId, name: 'Tenant A', slug: 'tenant-a', status: 'ACTIVE' },
      { _id: tenantBId, name: 'Tenant B', slug: 'tenant-b', status: 'ACTIVE' }
    ]);

    await BranchModel.create([
      { _id: branchAId, tenantId: tenantAId, name: 'Branch A', code: 'BR-A', slug: 'branch-a', status: 'ACTIVE' },
      { _id: branchBId, tenantId: tenantAId, name: 'Branch B', code: 'BR-B', slug: 'branch-b', status: 'ACTIVE' }
    ]);

    await UserModel.create([
      { _id: hqAdminId, tenantId: tenantAId, allowedTenantIds: [tenantAId], email: 'admin@tenant-a.com', name: 'HQ Admin', passwordHash: 'hash123', status: 'ACTIVE' },
      { _id: instructor1Id, tenantId: tenantAId, allowedTenantIds: [tenantAId], email: 'inst1@tenant-a.com', name: 'Instructor 1', passwordHash: 'hash123', status: 'ACTIVE' },
      { _id: student1Id, tenantId: tenantAId, allowedTenantIds: [tenantAId], email: 'student1@tenant-a.com', name: 'Student 1', passwordHash: 'hash123', status: 'ACTIVE' }
    ]);

    await OrganizationMemberModel.create([
      { tenantId: tenantAId, userId: hqAdminId, role: 'TENANT_ADMIN', branchAccessMode: 'ALL', status: 'ACTIVE' },
      { tenantId: tenantAId, userId: instructor1Id, role: 'INSTRUCTOR', branchAccessMode: 'SELECTED', branchIds: [branchAId], status: 'ACTIVE' },
      { tenantId: tenantAId, userId: student1Id, role: 'STUDENT', branchAccessMode: 'SELECTED', branchIds: [branchAId], status: 'ACTIVE' }
    ]);

    await CourseModel.create({
      _id: course1Id,
      tenantId: tenantAId,
      title: 'Full Stack Web Dev',
      slug: 'fswd-101',
      status: 'PUBLISHED'
    });

    await BatchModel.create({
      _id: batchA1Id,
      tenantId: tenantAId,
      branchId: branchAId,
      courseId: course1Id,
      name: 'Batch A1',
      batchCode: 'BATCH-A1',
      startDate: new Date(),
      status: 'ONGOING',
      instructorId: instructor1Id,
      timing: { startTime: '10:00', endTime: '12:00', timezone: 'UTC' },
      mode: 'ONLINE',
      maxSeats: 30,
      enrolledCount: 1,
      daysOfWeek: ['MON'],
      showOnWebsite: true
    });

    await EnrollmentModel.create({
      tenantId: tenantAId,
      studentId: student1Id,
      courseId: course1Id,
      batchId: batchA1Id,
      status: 'ACTIVE'
    });

    await ClassModel.create({
      _id: class1Id,
      tenantId: tenantAId,
      branchId: branchAId,
      batchId: batchA1Id,
      courseId: course1Id,
      instructorId: instructor1Id,
      name: 'Live Class #1 - React Basics',
      classCode: 'CLS-101',
      scheduledStartAt: new Date(Date.now() + 3600000),
      scheduledEndAt: new Date(Date.now() + 7200000),
      startDate: new Date(Date.now() + 3600000),
      endDate: new Date(Date.now() + 7200000),
      status: 'SCHEDULED',
      scheduleRevision: 0,
      mode: 'ONLINE',
      capacity: 30,
      enrolledCount: 0,
      enrolledStudents: [],
      timing: { startTime: '10:00', endTime: '12:00', timezone: 'UTC' },
      daysOfWeek: [],
      showOnWebsite: false
    });

    defaultConnectionAId = new mongoose.Types.ObjectId();
    await IntegrationConnectionModel.create({
      _id: defaultConnectionAId,
      tenantId: tenantAId,
      provider: 'GOOGLE_CLASSROOM',
      status: 'CONNECTED',
      encryptedCredentials: EmailCryptoService.encryptSecret({
        refreshToken: 'super_secret_refresh_token_xyz_123',
        accessToken: 'temp_access_token'
      }),
      externalAccountId: 'google-user-123@gmail.com',
      scopes: ['https://www.googleapis.com/auth/classroom.courses.readonly']
    });
  });

  afterAll(async () => {
    await IntegrationConnectionModel.deleteMany({});
    await ExternalAcademicResourceModel.deleteMany({});
    await ExternalMeetingModel.deleteMany({});
    await IntegrationOperationModel.deleteMany({});
    await IntegrationSyncRunModel.deleteMany({});
    await IntegrationWebhookEventModel.deleteMany({});
    await AttendanceEvidenceModel.deleteMany({});
    await ClassModel.deleteMany({});
    await EnrollmentModel.deleteMany({});
    await BatchModel.deleteMany({});
    await CourseModel.deleteMany({});
    await OrganizationMemberModel.deleteMany({});
    await UserModel.deleteMany({});
    await BranchModel.deleteMany({});
    await TenantModel.deleteMany({});
    await disconnectDatabase();
  });

  describe('1. Secret Storage & AES-256-GCM Encryption', () => {
    it('encrypts access/refresh tokens at rest and masks them in DTOs', async () => {
      const plainSecret = 'super_secret_refresh_token_xyz_123';
      const encryptedSecret = EmailCryptoService.encryptSecret(plainSecret);
      expect(encryptedSecret).not.toBe(plainSecret);
      expect(encryptedSecret).toContain(':');

      const decryptedSecret = EmailCryptoService.decryptSecret(encryptedSecret);
      expect(decryptedSecret).toBe(plainSecret);

      const connDoc = await IntegrationConnectionModel.findById(defaultConnectionAId);
      expect(connDoc).toBeDefined();

      const dto = IntegrationConnectionService.toDTO(connDoc!);
      expect(dto.status).toBe('CONNECTED');
      expect((dto as any).encryptedCredentials).toBeUndefined();
      expect((dto as any).refreshToken).toBeUndefined();
    });
  });

  describe('2. OAuth State Security & Tamper-Proof HMAC Signatures', () => {
    it('creates, signs, and securely verifies OAuth state exactly once', async () => {
      const { state } = await OAuthStateService.generateState({
        tenantId: tenantAId.toString(),
        userId: hqAdminId.toString(),
        provider: 'ZOOM',
        redirectUrl: '/admin/settings/integrations'
      });

      expect(state).toBeDefined();
      expect(typeof state).toBe('string');

      const verified = await OAuthStateService.consumeState(state);
      expect(verified.tenantId).toBe(tenantAId.toString());
      expect(verified.provider).toBe('ZOOM');
      expect(verified.userId).toBe(hqAdminId.toString());
      await expect(OAuthStateService.consumeState(state)).rejects.toThrow();
    });

    it('rejects tampered or forged state parameters', async () => {
      const { state } = await OAuthStateService.generateState({
        tenantId: tenantAId.toString(),
        userId: hqAdminId.toString(),
        provider: 'GOOGLE_MEET'
      });

      const tampered = state.slice(0, -4) + 'abcd';
      await expect(OAuthStateService.consumeState(tampered)).rejects.toThrow();
    });
  });

  describe('3. Durable Connection Management & Tenant Isolation', () => {
    it('lists connections scoped strictly to tenant', async () => {
      await tenantContextStorage.run({ currentTenantId: tenantAId.toString() }, async () => {
        const list = await IntegrationConnectionService.listConnections(tenantAId.toString(), adminActor);
        expect(Array.isArray(list)).toBe(true);
        expect(list.length).toBeGreaterThanOrEqual(1);
      });

      await tenantContextStorage.run({ currentTenantId: tenantBId.toString() }, async () => {
        const listB = await IntegrationConnectionService.listConnections(tenantBId.toString(), {
          userId: new mongoose.Types.ObjectId().toString(),
          roles: ['TENANT_ADMIN']
        });
        expect(listB.length).toBe(0);
      });
    });

    it('prevents cross-tenant connection mutation', async () => {
      const conn = await IntegrationConnectionModel.findOne({ tenantId: tenantAId });
      expect(conn).toBeDefined();

      await expect(
        IntegrationConnectionService.disconnectConnection(tenantBId.toString(), conn!._id.toString(), adminActor)
      ).rejects.toThrow();
    });
  });

  describe('4. Durable Academic Platform (Google Classroom) Mapping & Sync Runs', () => {
    it('creates external academic resource link and sync run records', async () => {
      const link = await ExternalAcademicResourceModel.create({
        tenantId: tenantAId,
        provider: 'GOOGLE_CLASSROOM',
        resourceType: 'BATCH',
        canonicalResourceId: batchA1Id.toString(),
        externalResourceId: 'classroom-course-999',
        connectionId: defaultConnectionAId,
        branchId: branchAId,
        syncDirection: 'BIDIRECTIONAL',
        status: 'SYNCED'
      });

      expect(link._id).toBeDefined();

      const syncRun = await IntegrationSyncRunModel.create({
        tenantId: tenantAId,
        provider: 'GOOGLE_CLASSROOM',
        connectionId: defaultConnectionAId,
        scope: `batch:${batchA1Id}`,
        direction: 'BIDIRECTIONAL',
        status: 'COMPLETED',
        startedAt: new Date(),
        completedAt: new Date(),
        counts: {
          teachersSynced: 1,
          studentsSynced: 1,
          courseworkSynced: 2,
          submissionsSynced: 0,
          gradesSynced: 0,
          conflictsDetected: 0,
          errorsCount: 0
        }
      });

      expect(syncRun.status).toBe('COMPLETED');
      expect(syncRun.counts.teachersSynced).toBe(1);
    });
  });

  describe('5. Durable Live Meeting (Meet / Zoom / Teams) Mapping', () => {
    it('creates and updates ExternalMeeting mapping with versioning', async () => {
      const meeting = await ExternalMeetingModel.create({
        tenantId: tenantAId,
        branchId: branchAId,
        classId: class1Id.toString(),
        provider: 'GOOGLE_MEET',
        connectionId: defaultConnectionAId.toString(),
        organizerUserId: instructor1Id.toString(),
        externalMeetingId: 'meet-code-abc-defg-hij',
        joinUrl: 'https://meet.google.com/abc-defg-hij',
        providerStatus: 'SCHEDULED',
        scheduledStart: new Date(),
        scheduledEnd: new Date(Date.now() + 3600000),
        timezone: 'UTC',
        syncStatus: 'SYNCED',
        providerVersion: '1'
      });

      expect(meeting._id).toBeDefined();
      expect(meeting.joinUrl).toContain('meet.google.com');

      meeting.providerVersion = '2';
      meeting.scheduledStart = new Date(Date.now() + 7200000);
      await meeting.save();

      const updated = await ExternalMeetingModel.findById(meeting._id);
      expect(updated?.providerVersion).toBe('2');
    });
  });

  describe('6. Webhook Event Deduplication & Safe Persistence', () => {
    it('persists and deduplicates webhook events idempotently', async () => {
      const eventId = 'zoom-webhook-evt-unique-12345';

      const res1 = await IntegrationWebhookService.handleWebhook({
        provider: 'ZOOM',
        headers: { 'x-didm-test-webhook': 'deterministic' },
        payload: { id: eventId, event: 'meeting.started', meetingId: '123456789' }
      });

      expect(res1.status).toBe('PROCESSED');

      // Replay same event ID
      const res2 = await IntegrationWebhookService.handleWebhook({
        provider: 'ZOOM',
        headers: { 'x-didm-test-webhook': 'deterministic' },
        payload: { id: eventId, event: 'meeting.started', meetingId: '123456789' }
      });

      expect(res2.status).toBe('IGNORED');
      expect(res2.deduplicated).toBe(true);

      const count = await IntegrationWebhookEventModel.countDocuments({
        provider: 'ZOOM',
        externalEventId: eventId
      });
      expect(count).toBe(1);
    });
  });
});
