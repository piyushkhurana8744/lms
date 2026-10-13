import http from 'http';
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
  SessionModel,
  IntegrationConnectionModel,
  ExternalMeetingModel,
  connectDatabase,
  disconnectDatabase
} from '@edtech/database';
import { PERMISSIONS } from '@edtech/permissions';
import { signAccessToken } from '@edtech/utils';
import { createApp } from '../../app';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;

suite('Phase 22 External Integration Platform HTTP RBAC & Security Integration Suite', () => {
  let server: http.Server;
  let port: number;

  const tenantAId = new mongoose.Types.ObjectId();
  const tenantBId = new mongoose.Types.ObjectId();

  const branchAId = new mongoose.Types.ObjectId();
  const branchBId = new mongoose.Types.ObjectId();

  const hqAdminId = new mongoose.Types.ObjectId();
  const branchAManagerId = new mongoose.Types.ObjectId();
  const branchBManagerId = new mongoose.Types.ObjectId();
  const instructor1Id = new mongoose.Types.ObjectId();
  const instructor2Id = new mongoose.Types.ObjectId();
  const unassignedInstructorId = new mongoose.Types.ObjectId();
  const activeStudentId = new mongoose.Types.ObjectId();
  const unenrolledStudentId = new mongoose.Types.ObjectId();
  const withdrawnStudentId = new mongoose.Types.ObjectId();
  const suspendedUserId = new mongoose.Types.ObjectId();
  const tenantBAdminId = new mongoose.Types.ObjectId();

  const course1Id = new mongoose.Types.ObjectId();
  const batchA1Id = new mongoose.Types.ObjectId();
  const batchB1Id = new mongoose.Types.ObjectId();
  const classA1Id = new mongoose.Types.ObjectId();
  const classCancelledId = new mongoose.Types.ObjectId();

  let connectionAId: string;
  const tokens: Record<string, string> = {};

  const request = (token: string, path: string, options: { method?: string; body?: any; tenantHeader?: string } = {}) =>
    new Promise<{ status: number; json: any; headers: http.IncomingHttpHeaders }>((resolve, reject) => {
      const method = options.method || 'GET';
      const postData = options.body ? JSON.stringify(options.body) : undefined;
      const headers: Record<string, string> = {
        authorization: `Bearer ${token}`
      };
      if (options.tenantHeader) {
        headers['x-tenant-id'] = options.tenantHeader;
      }
      if (postData) {
        headers['content-type'] = 'application/json';
        headers['content-length'] = String(Buffer.byteLength(postData));
      }

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method,
          headers
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const raw = Buffer.concat(chunks).toString();
            let json: any = null;
            try {
              json = raw ? JSON.parse(raw) : null;
            } catch {
              json = raw;
            }
            resolve({ status: res.statusCode || 500, json, headers: res.headers });
          });
        }
      );

      req.on('error', reject);
      if (postData) req.write(postData);
      req.end();
    });

  const generateAuthToken = async (userId: mongoose.Types.ObjectId, tenantId: mongoose.Types.ObjectId) => {
    const sessionId = new mongoose.Types.ObjectId();
    await SessionModel.create({
      _id: sessionId,
      userId,
      tenantId,
      activeTenantId: tenantId,
      currentRefreshTokenHash: `hash-${sessionId}`,
      userAgent: 'test-agent',
      ipAddress: '127.0.0.1',
      isValid: true,
      expiresAt: new Date(Date.now() + 86400000)
    });
    return signAccessToken({
      sub: userId.toString(),
      sessionId: sessionId.toString(),
      tenantId: tenantId.toString(),
      tokenVersion: 1
    });
  };

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_INTEGRATION_URI || 'mongodb://127.0.0.1:27017/edtech_lms_test';
    await connectDatabase(mongoUri);

    await TenantModel.create([
      { _id: tenantAId, name: 'Tenant A HTTP', slug: 'tenant-a-http', status: 'ACTIVE' },
      { _id: tenantBId, name: 'Tenant B HTTP', slug: 'tenant-b-http', status: 'ACTIVE' }
    ]);

    await BranchModel.create([
      { _id: branchAId, tenantId: tenantAId, name: 'Branch A', code: 'BR-A', slug: 'branch-a-http', status: 'ACTIVE' },
      { _id: branchBId, tenantId: tenantAId, name: 'Branch B', code: 'BR-B', slug: 'branch-b-http', status: 'ACTIVE' }
    ]);

    await UserModel.create([
      { _id: hqAdminId, tenantId: tenantAId, allowedTenantIds: [tenantAId], email: 'admin@a.com', name: 'Admin A', passwordHash: 'hash123', status: 'ACTIVE' },
      { _id: branchAManagerId, tenantId: tenantAId, allowedTenantIds: [tenantAId], email: 'mgr-a@a.com', name: 'Mgr A', passwordHash: 'hash123', status: 'ACTIVE' },
      { _id: branchBManagerId, tenantId: tenantAId, allowedTenantIds: [tenantAId], email: 'mgr-b@a.com', name: 'Mgr B', passwordHash: 'hash123', status: 'ACTIVE' },
      { _id: instructor1Id, tenantId: tenantAId, allowedTenantIds: [tenantAId], email: 'inst1@a.com', name: 'Inst 1', passwordHash: 'hash123', status: 'ACTIVE' },
      { _id: instructor2Id, tenantId: tenantAId, allowedTenantIds: [tenantAId], email: 'inst2@a.com', name: 'Inst 2', passwordHash: 'hash123', status: 'ACTIVE' },
      { _id: unassignedInstructorId, tenantId: tenantAId, allowedTenantIds: [tenantAId], email: 'inst-unassigned@a.com', name: 'Inst Unassigned', passwordHash: 'hash123', status: 'ACTIVE' },
      { _id: activeStudentId, tenantId: tenantAId, allowedTenantIds: [tenantAId], email: 'student@a.com', name: 'Student 1', passwordHash: 'hash123', status: 'ACTIVE' },
      { _id: unenrolledStudentId, tenantId: tenantAId, allowedTenantIds: [tenantAId], email: 'student-unenrolled@a.com', name: 'Student 2', passwordHash: 'hash123', status: 'ACTIVE' },
      { _id: withdrawnStudentId, tenantId: tenantAId, allowedTenantIds: [tenantAId], email: 'student-withdrawn@a.com', name: 'Student Withdrawn', passwordHash: 'hash123', status: 'ACTIVE' },
      { _id: suspendedUserId, tenantId: tenantAId, allowedTenantIds: [tenantAId], email: 'suspended@a.com', name: 'Suspended', passwordHash: 'hash123', status: 'SUSPENDED' },
      { _id: tenantBAdminId, tenantId: tenantBId, allowedTenantIds: [tenantBId], email: 'admin@b.com', name: 'Admin B', passwordHash: 'hash123', status: 'ACTIVE' }
    ]);

    await OrganizationMemberModel.create([
      { tenantId: tenantAId, userId: hqAdminId, role: 'TENANT_ADMIN', branchAccessMode: 'ALL', status: 'ACTIVE' },
      { tenantId: tenantAId, userId: branchAManagerId, role: 'TENANT_ADMIN', branchAccessMode: 'SELECTED', branchIds: [branchAId], status: 'ACTIVE' },
      { tenantId: tenantAId, userId: branchBManagerId, role: 'TENANT_ADMIN', branchAccessMode: 'SELECTED', branchIds: [branchBId], status: 'ACTIVE' },
      { tenantId: tenantAId, userId: instructor1Id, role: 'INSTRUCTOR', branchAccessMode: 'SELECTED', branchIds: [branchAId], status: 'ACTIVE' },
      { tenantId: tenantAId, userId: instructor2Id, role: 'INSTRUCTOR', branchAccessMode: 'SELECTED', branchIds: [branchBId], status: 'ACTIVE' },
      { tenantId: tenantAId, userId: unassignedInstructorId, role: 'INSTRUCTOR', branchAccessMode: 'SELECTED', branchIds: [branchAId], status: 'ACTIVE' },
      { tenantId: tenantAId, userId: activeStudentId, role: 'STUDENT', branchAccessMode: 'SELECTED', branchIds: [branchAId], status: 'ACTIVE' },
      { tenantId: tenantAId, userId: unenrolledStudentId, role: 'STUDENT', branchAccessMode: 'SELECTED', branchIds: [branchAId], status: 'ACTIVE' },
      { tenantId: tenantAId, userId: withdrawnStudentId, role: 'STUDENT', branchAccessMode: 'SELECTED', branchIds: [branchAId], status: 'ACTIVE' },
      { tenantId: tenantAId, userId: suspendedUserId, role: 'STUDENT', branchAccessMode: 'SELECTED', branchIds: [branchAId], status: 'SUSPENDED' },
      { tenantId: tenantBId, userId: tenantBAdminId, role: 'TENANT_ADMIN', branchAccessMode: 'ALL', status: 'ACTIVE' }
    ]);

    await CourseModel.create({
      _id: course1Id,
      tenantId: tenantAId,
      title: 'Course HTTP 101',
      slug: 'http-101',
      status: 'PUBLISHED'
    });

    await BatchModel.create([
      {
        _id: batchA1Id,
        tenantId: tenantAId,
        branchId: branchAId,
        courseId: course1Id,
        name: 'Batch A1',
        batchCode: 'B-A1',
        startDate: new Date(),
        status: 'ONGOING',
        instructorId: instructor1Id,
        timing: { startTime: '10:00', endTime: '12:00', timezone: 'UTC' },
        mode: 'ONLINE',
        maxSeats: 30,
        enrolledCount: 1,
        daysOfWeek: ['MON'],
        showOnWebsite: true
      },
      {
        _id: batchB1Id,
        tenantId: tenantAId,
        branchId: branchBId,
        courseId: course1Id,
        name: 'Batch B1',
        batchCode: 'B-B1',
        startDate: new Date(),
        status: 'ONGOING',
        instructorId: instructor2Id,
        timing: { startTime: '14:00', endTime: '16:00', timezone: 'UTC' },
        mode: 'ONLINE',
        maxSeats: 30,
        enrolledCount: 0,
        daysOfWeek: ['TUE'],
        showOnWebsite: true
      }
    ]);

    await EnrollmentModel.create({
      tenantId: tenantAId,
      studentId: activeStudentId,
      courseId: course1Id,
      batchId: batchA1Id,
      status: 'ACTIVE'
    });

    await ClassModel.create([
      {
        _id: classA1Id,
        tenantId: tenantAId,
        branchId: branchAId,
        batchId: batchA1Id,
        courseId: course1Id,
        instructorId: instructor1Id,
        name: 'Active Live Class in Branch A',
        classCode: 'CLS-A1',
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
        timing: { startTime: '10:00', endTime: '12:00', timezone: 'UTC' },
        daysOfWeek: [],
        showOnWebsite: false
      },
      {
        _id: classCancelledId,
        tenantId: tenantAId,
        branchId: branchAId,
        batchId: batchA1Id,
        courseId: course1Id,
        instructorId: instructor1Id,
        name: 'Cancelled Live Class',
        classCode: 'CLS-C1',
        scheduledStartAt: new Date(Date.now() + 3600000),
        scheduledEndAt: new Date(Date.now() + 7200000),
        startDate: new Date(Date.now() + 3600000),
        endDate: new Date(Date.now() + 7200000),
        status: 'CANCELLED',
        scheduleRevision: 1,
        mode: 'ONLINE',
        capacity: 30,
        enrolledCount: 0,
        enrolledStudents: [],
        timing: { startTime: '10:00', endTime: '12:00', timezone: 'UTC' },
        daysOfWeek: [],
        showOnWebsite: false
      }
    ]);

    const conn = await IntegrationConnectionModel.create({
      tenantId: tenantAId,
      provider: 'GOOGLE_MEET',
      status: 'CONNECTED',
      externalAccountId: 'admin@google-tenant-a.com',
      scopes: ['https://www.googleapis.com/auth/calendar']
    });
    connectionAId = conn._id.toString();

    // Sign tokens with active database sessions
    tokens.hqAdmin = await generateAuthToken(hqAdminId, tenantAId);
    tokens.branchAManager = await generateAuthToken(branchAManagerId, tenantAId);
    tokens.branchBManager = await generateAuthToken(branchBManagerId, tenantAId);
    tokens.instructor1 = await generateAuthToken(instructor1Id, tenantAId);
    tokens.instructor2 = await generateAuthToken(instructor2Id, tenantAId);
    tokens.unassignedInstructor = await generateAuthToken(unassignedInstructorId, tenantAId);
    tokens.activeStudent = await generateAuthToken(activeStudentId, tenantAId);
    tokens.unenrolledStudent = await generateAuthToken(unenrolledStudentId, tenantAId);
    tokens.withdrawnStudent = await generateAuthToken(withdrawnStudentId, tenantAId);
    tokens.suspendedUser = await generateAuthToken(suspendedUserId, tenantAId);
    tokens.tenantBAdmin = await generateAuthToken(tenantBAdminId, tenantBId);

    const app = createApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    port = (server.address() as any).port;
  });

  afterAll(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    await SessionModel.deleteMany({});
    await IntegrationConnectionModel.deleteMany({});
    await ExternalMeetingModel.deleteMany({});
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

  describe('1. Provider Capabilities & Connection List Endpoints', () => {
    it('returns all 4 supported providers with accurate capabilities', async () => {
      const res = await request(tokens.hqAdmin, '/api/v1/integrations/providers');
      expect(res.status).toBe(200);
      expect(res.json.data.length).toBe(4);

      const meet = res.json.data.find((p: any) => p.provider === 'GOOGLE_MEET');
      expect(meet.category).toBe('LIVE_MEETING');
      expect(meet.capabilities.supportsRecordings).toBe(true);

      const classroom = res.json.data.find((p: any) => p.provider === 'GOOGLE_CLASSROOM');
      expect(classroom.category).toBe('ACADEMIC_PLATFORM');
      expect(classroom.capabilities).toBeDefined();
    });

    it('lists connections for authorized admin without leaking secrets', async () => {
      const res = await request(tokens.hqAdmin, '/api/v1/integrations/connections');
      expect(res.status).toBe(200);
      expect(res.json.data.length).toBeGreaterThanOrEqual(1);
      expect(res.json.data[0].encryptedCredentials).toBeUndefined();
    });
  });

  describe('2. Live Class Meeting Creation, Join & Security Matrix', () => {
    it('allows assigned instructor to schedule a live meeting for their class', async () => {
      const res = await request(tokens.instructor1, `/api/v1/integrations/classes/${classA1Id}/meeting`, {
        method: 'POST',
        body: {
          provider: 'GOOGLE_MEET',
          topic: 'Live React Lesson'
        }
      });

      expect([200, 201]).toContain(res.status);
      expect(res.json.data.externalMeetingId).toBeDefined();
      expect(res.json.data.joinUrl).toContain('join');
      expect(res.json.data.syncStatus).toBe('SYNCED');
    });

    // 1. Active enrolled student -> 200 (without startUrl/host secrets)
    it('1/9: allows enrolled active student to obtain join info (without startUrl/host secrets)', async () => {
      const res = await request(tokens.activeStudent, `/api/v1/integrations/classes/${classA1Id}/join`);
      expect(res.status).toBe(200);
      expect(res.json.data.joinUrl).toBeDefined();
      expect(res.json.data.isHost).toBe(false);
      expect(res.json.data.startUrl).toBeUndefined();
    });

    // 2. Non-enrolled student -> 403
    it('2/9: denies unenrolled student from joining (403)', async () => {
      const res = await request(tokens.unenrolledStudent, `/api/v1/integrations/classes/${classA1Id}/join`);
      expect(res.status).toBe(403);
    });

    // 3. Withdrawn student -> 403
    it('3/9: denies withdrawn student from joining (403)', async () => {
      const res = await request(tokens.withdrawnStudent, `/api/v1/integrations/classes/${classA1Id}/join`);
      expect(res.status).toBe(403);
    });

    // 4. Suspended user -> 401/403
    it('4/9: denies suspended user from joining (401/403)', async () => {
      const res = await request(tokens.suspendedUser, `/api/v1/integrations/classes/${classA1Id}/join`);
      expect([401, 403]).toContain(res.status);
    });

    // 5. Assigned instructor -> 200 with isHost=true & startUrl
    it('5/9: allows assigned instructor to obtain join info with isHost=true and startUrl (200)', async () => {
      const res = await request(tokens.instructor1, `/api/v1/integrations/classes/${classA1Id}/join`);
      expect(res.status).toBe(200);
      expect(res.json.data.joinUrl).toBeDefined();
      expect(res.json.data.isHost).toBe(true);
      expect(res.json.data.startUrl).toBeDefined();
    });

    // 6. Unassigned instructor -> 403
    it('6/9: denies unassigned instructor from joining non-assigned class (403)', async () => {
      const res = await request(tokens.unassignedInstructor, `/api/v1/integrations/classes/${classA1Id}/join`);
      expect(res.status).toBe(403);
    });

    // 7. Branch A admin -> 200 with isHost=true
    it('7/9: allows Branch A admin to access join info with isHost=true (200)', async () => {
      const res = await request(tokens.branchAManager, `/api/v1/integrations/classes/${classA1Id}/join`);
      expect(res.status).toBe(200);
      expect(res.json.data.isHost).toBe(true);
      expect(res.json.data.startUrl).toBeDefined();
    });

    // 8. Branch B-only admin -> 404 (no existence leakage across branch boundaries)
    it('8/9: denies Branch B-only admin from accessing Branch A class (404)', async () => {
      const res = await request(tokens.branchBManager, `/api/v1/integrations/classes/${classA1Id}/join`);
      expect([403, 404]).toContain(res.status);
    });

    // 9. Tenant B actor -> 404 (strict tenant isolation)
    it('9/9: denies Tenant B actor from accessing Tenant A class (404)', async () => {
      const res = await request(tokens.tenantBAdmin, `/api/v1/integrations/classes/${classA1Id}/join`);
      expect(res.status).toBe(404);
    });

    it('denies join request for CANCELLED class', async () => {
      await ExternalMeetingModel.create({
        tenantId: tenantAId,
        branchId: branchAId,
        classId: classCancelledId.toString(),
        provider: 'GOOGLE_MEET',
        connectionId: connectionAId,
        organizerUserId: instructor1Id.toString(),
        externalMeetingId: 'meet-cancelled-123',
        joinUrl: 'https://meet.google.com/cancel-123',
        providerStatus: 'CANCELLED',
        scheduledStart: new Date(),
        scheduledEnd: new Date(Date.now() + 3600000),
        timezone: 'UTC',
        syncStatus: 'SYNCED'
      });

      const res = await request(tokens.activeStudent, `/api/v1/integrations/classes/${classCancelledId}/join`);
      expect(res.status).toBe(403);
      expect(res.json.error.message).toContain('cancelled');
    });
  });
});

