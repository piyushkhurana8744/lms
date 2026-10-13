import http from 'http';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  BranchModel,
  OrganizationMemberModel,
  RoleModel,
  SessionModel,
  TenantModel,
  UserModel,
  BatchModel,
  CourseModel,
  EnrollmentModel,
  StudentLifecycleModel,
  CommunicationAnnouncementModel,
  CommunicationConversationModel,
  CommunicationMessageModel,
  connectDatabase,
  disconnectDatabase
} from '@edtech/database';
import { PERMISSIONS } from '@edtech/permissions';
import { signAccessToken } from '@edtech/utils';
import { createApp } from '../../app';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;

suite('Phase 20 Institutional Communication System HTTP RBAC & Security Integration Suite', () => {
  let server: http.Server;
  let port: number;

  const tenantAId = new mongoose.Types.ObjectId();
  const tenantBId = new mongoose.Types.ObjectId();

  const branchAId = new mongoose.Types.ObjectId();
  const branchBId = new mongoose.Types.ObjectId();

  const hqAdminId = new mongoose.Types.ObjectId();
  const branchAManagerId = new mongoose.Types.ObjectId();
  const instructor1Id = new mongoose.Types.ObjectId();
  const student1Id = new mongoose.Types.ObjectId();
  const suspendedUserId = new mongoose.Types.ObjectId();
  const tenantBAdminId = new mongoose.Types.ObjectId();

  const tokens: Record<string, string> = {};

  const request = (token: string, path: string, options: { method?: string; body?: any } = {}) =>
    new Promise<{ status: number; json: any; headers: http.IncomingHttpHeaders }>((resolve, reject) => {
      const method = options.method || 'GET';
      const postData = options.body ? JSON.stringify(options.body) : undefined;
      const headers: Record<string, string> = {
        authorization: `Bearer ${token}`
      };
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
            resolve({
              status: res.statusCode || 0,
              json: raw ? JSON.parse(raw) : null,
              headers: res.headers
            });
          });
        }
      );
      req.on('error', reject);
      if (postData) req.write(postData);
      req.end();
    });

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_INTEGRATION_URI || 'mongodb://127.0.0.1:27017/edtech_lms_test';
    await connectDatabase(mongoUri);

    // 1. Tenants
    await TenantModel.create([
      { _id: tenantAId, name: 'Tenant A Primary', slug: `tenant-a-${Date.now()}`, status: 'ACTIVE' },
      { _id: tenantBId, name: 'Tenant B Foreign', slug: `tenant-b-${Date.now()}`, status: 'ACTIVE' }
    ]);

    // 2. Branches
    await BranchModel.create([
      { _id: branchAId, tenantId: tenantAId, name: 'Campus Alpha', code: 'ALP', slug: 'alp', type: 'PHYSICAL', status: 'ACTIVE', isPrimary: true },
      { _id: branchBId, tenantId: tenantAId, name: 'Campus Beta', code: 'BET', slug: 'bet', type: 'PHYSICAL', status: 'ACTIVE', isPrimary: false }
    ]);

    // 3. Roles
    await RoleModel.create([
      {
        tenantId: tenantAId,
        name: 'TENANT_ADMIN',
        slug: 'tenant_admin',
        displayName: 'Tenant Admin',
        permissions: Object.values(PERMISSIONS),
        isSystem: true
      },
      {
        tenantId: tenantAId,
        name: 'BRANCH_MANAGER',
        slug: 'branch_manager',
        displayName: 'Branch Manager',
        permissions: [
          PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_VIEW,
          PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_CREATE,
          PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_PUBLISH,
          PERMISSIONS.COMMUNICATION_INBOX_VIEW,
          PERMISSIONS.COMMUNICATION_CONVERSATION_VIEW,
          PERMISSIONS.COMMUNICATION_MESSAGE_SEND
        ],
        isSystem: true
      },
      {
        tenantId: tenantAId,
        name: 'INSTRUCTOR',
        slug: 'instructor',
        displayName: 'Instructor',
        permissions: [
          PERMISSIONS.COMMUNICATION_ANNOUNCEMENT_VIEW,
          PERMISSIONS.COMMUNICATION_INBOX_VIEW,
          PERMISSIONS.COMMUNICATION_CONVERSATION_VIEW,
          PERMISSIONS.COMMUNICATION_CONVERSATION_CREATE,
          PERMISSIONS.COMMUNICATION_MESSAGE_SEND
        ],
        isSystem: true
      },
      {
        tenantId: tenantAId,
        name: 'STUDENT',
        slug: 'student',
        displayName: 'Student',
        permissions: [
          PERMISSIONS.COMMUNICATION_INBOX_VIEW,
          PERMISSIONS.COMMUNICATION_CONVERSATION_VIEW,
          PERMISSIONS.COMMUNICATION_CONVERSATION_CREATE,
          PERMISSIONS.COMMUNICATION_MESSAGE_SEND
        ],
        isSystem: true
      }
    ]);

    // 4. Users
    const users = [
      { _id: hqAdminId, tenantId: tenantAId, allowedTenantIds: [tenantAId], email: 'hq@didm.edu', name: 'HQ Admin', passwordHash: 'hash123', status: 'ACTIVE' },
      { _id: branchAManagerId, tenantId: tenantAId, allowedTenantIds: [tenantAId], email: 'bm-a@didm.edu', name: 'Branch A Manager', passwordHash: 'hash123', status: 'ACTIVE' },
      { _id: instructor1Id, tenantId: tenantAId, allowedTenantIds: [tenantAId], email: 'inst1@didm.edu', name: 'Instructor 1', passwordHash: 'hash123', status: 'ACTIVE' },
      { _id: student1Id, tenantId: tenantAId, allowedTenantIds: [tenantAId], email: 'stud1@didm.edu', name: 'Student 1', passwordHash: 'hash123', status: 'ACTIVE' },
      { _id: suspendedUserId, tenantId: tenantAId, allowedTenantIds: [tenantAId], email: 'susp@didm.edu', name: 'Suspended User', passwordHash: 'hash123', status: 'SUSPENDED' },
      { _id: tenantBAdminId, tenantId: tenantBId, allowedTenantIds: [tenantBId], email: 'admin@foreign.edu', name: 'Tenant B Admin', passwordHash: 'hash123', status: 'ACTIVE' }
    ];
    await UserModel.create(users);

    // 5. Org Members
    await OrganizationMemberModel.create([
      { tenantId: tenantAId, userId: hqAdminId, role: 'TENANT_ADMIN', branchAccessMode: 'ALL', status: 'ACTIVE' },
      { tenantId: tenantAId, userId: branchAManagerId, role: 'INSTRUCTOR', branchAccessMode: 'SELECTED', branchIds: [branchAId], status: 'ACTIVE' },
      { tenantId: tenantAId, userId: instructor1Id, role: 'INSTRUCTOR', branchAccessMode: 'SELECTED', branchIds: [branchAId], status: 'ACTIVE' },
      { tenantId: tenantAId, userId: student1Id, role: 'STUDENT', branchAccessMode: 'SELECTED', branchIds: [branchAId], status: 'ACTIVE' },
      { tenantId: tenantAId, userId: suspendedUserId, role: 'STUDENT', branchAccessMode: 'SELECTED', branchIds: [branchAId], status: 'SUSPENDED' },
      { tenantId: tenantBId, userId: tenantBAdminId, role: 'TENANT_ADMIN', branchAccessMode: 'ALL', status: 'ACTIVE' }
    ]);

    // 6. Student Lifecycle & Academic Enrollment
    const course = await CourseModel.create({
      tenantId: tenantAId,
      title: 'HTTP Test Course',
      slug: `http-course-${Date.now()}`,
      status: 'PUBLISHED'
    });

    const batch = await BatchModel.create({
      tenantId: tenantAId,
      branchId: branchAId,
      courseId: course._id,
      name: 'Batch HTTP 101',
      batchCode: `BH-${Date.now()}`,
      instructorId: instructor1Id,
      mode: 'OFFLINE',
      status: 'ONGOING',
      maxSeats: 50,
      enrolledCount: 1,
      timing: { startTime: '10:00', endTime: '12:00', timezone: 'Asia/Kolkata' },
      daysOfWeek: ['MONDAY', 'WEDNESDAY', 'FRIDAY'],
      startDate: new Date()
    });

    const enrollment = await EnrollmentModel.create({
      tenantId: tenantAId,
      studentId: student1Id,
      courseId: course._id,
      status: 'ACTIVE',
      enrolledAt: new Date(),
      progressPercent: 0
    });

    await StudentLifecycleModel.create({
      tenantId: tenantAId,
      studentUserId: student1Id,
      currentEnrollmentId: enrollment._id,
      currentBranchId: branchAId,
      currentBatchId: batch._id,
      currentStatus: 'ACTIVE',
      lifecycleEpisode: 1,
      isTerminal: false,
      revision: 0
    });

    // 7. Tokens
    const sign = async (uid: mongoose.Types.ObjectId, tid: mongoose.Types.ObjectId) => {
      const sessionId = new mongoose.Types.ObjectId();
      await SessionModel.create({
        _id: sessionId,
        userId: uid,
        tenantId: tid,
        activeTenantId: tid,
        currentRefreshTokenHash: `hash-${sessionId}`,
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1',
        isValid: true,
        expiresAt: new Date(Date.now() + 86400000)
      });
      return signAccessToken({
        sub: uid.toString(),
        sessionId: sessionId.toString(),
        tenantId: tid.toString(),
        tokenVersion: 1
      });
    };

    tokens.hq = await sign(hqAdminId, tenantAId);
    tokens.branchA = await sign(branchAManagerId, tenantAId);
    tokens.instructor = await sign(instructor1Id, tenantAId);
    tokens.student = await sign(student1Id, tenantAId);
    tokens.suspended = await sign(suspendedUserId, tenantAId);
    tokens.tenantB = await sign(tenantBAdminId, tenantBId);

    // Start Express Server
    const app = createApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        port = typeof addr === 'object' && addr ? addr.port : 0;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    await disconnectDatabase();
  });

  describe('1. Announcements HTTP Endpoints & RBAC', () => {
    let announcementId: string;

    it('POST /api/v1/communications/announcements creates a draft', async () => {
      const res = await request(tokens.hq, '/api/v1/communications/announcements', {
        method: 'POST',
        body: {
          title: 'Campus Winter Closure',
          body: 'Campus will be closed for winter holidays Dec 24 - Jan 2.',
          priority: 'IMPORTANT',
          channels: ['IN_APP', 'EMAIL'],
          audienceType: 'ALL_AUTHORIZED'
        }
      });

      expect(res.status).toBe(201);
      expect(res.json.data.status).toBe('DRAFT');
      expect(res.json.data.title).toBe('Campus Winter Closure');
      announcementId = res.json.data.id || res.json.data._id;
    });

    it('POST /api/v1/communications/announcements/preview-audience previews recipient counts', async () => {
      const res = await request(tokens.hq, '/api/v1/communications/announcements/preview-audience', {
        method: 'POST',
        body: {
          audienceType: 'ALL_AUTHORIZED'
        }
      });

      expect(res.status).toBe(200);
      expect(res.json.data.recipientCount).toBeGreaterThan(0);
    });

    it('POST /api/v1/communications/announcements/:id/publish publishes announcement', async () => {
      const res = await request(tokens.hq, `/api/v1/communications/announcements/${announcementId}/publish`, {
        method: 'POST'
      });

      expect(res.status).toBe(200);
      expect(res.json.data.status).toBe('PUBLISHED');
      expect(res.json.data.publishedAt).toBeDefined();
    });

    it('GET /api/v1/communications/announcements lists announcements', async () => {
      const res = await request(tokens.hq, '/api/v1/communications/announcements');

      expect(res.status).toBe(200);
      expect(res.json.data.length).toBeGreaterThan(0);
    });
  });

  describe('2. Inbox & Read State HTTP Endpoints', () => {
    it('GET /api/v1/communications/inbox returns items for authenticated student', async () => {
      const res = await request(tokens.student, '/api/v1/communications/inbox');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.json.data)).toBe(true);
    });

    it('GET /api/v1/communications/unread-count returns canonical unread counters', async () => {
      const res = await request(tokens.student, '/api/v1/communications/unread-count');

      expect(res.status).toBe(200);
      expect(typeof res.json.data.totalUnread).toBe('number');
    });
  });

  describe('3. Security: Cross-Tenant Attack Matrix', () => {
    let tenantAAnnouncementId: string;

    beforeAll(async () => {
      const doc = await CommunicationAnnouncementModel.create({
        tenantId: tenantAId,
        senderUserId: hqAdminId,
        title: 'Secret Tenant A Memo',
        body: 'Strictly internal to Tenant A',
        status: 'PUBLISHED',
        priority: 'NORMAL',
        channels: ['IN_APP'],
        audienceType: 'ALL_AUTHORIZED',
        audienceSnapshot: { recipientCount: 1, recipientUserIds: [hqAdminId], resolvedAt: new Date() }
      });
      tenantAAnnouncementId = doc._id.toString();
    });

    it('Tenant B actor accessing Tenant A announcement is denied (404/403 zero leakage)', async () => {
      const res = await request(tokens.tenantB, `/api/v1/communications/announcements/${tenantAAnnouncementId}`);

      expect(res.status).toBe(404);
    });

    it('Tenant B actor attempting to publish Tenant A announcement is denied', async () => {
      const res = await request(tokens.tenantB, `/api/v1/communications/announcements/${tenantAAnnouncementId}/publish`, {
        method: 'POST'
      });

      expect(res.status).toBe(404);
    });
  });

  describe('4. Security: Cross-Branch Attack Matrix', () => {
    it('Branch A Manager targeting unauthorized Branch B is denied', async () => {
      const res = await request(tokens.branchA, '/api/v1/communications/announcements', {
        method: 'POST',
        body: {
          title: 'Cross Branch Intrusion',
          body: 'Attempting to broadcast to Branch B',
          priority: 'NORMAL',
          channels: ['IN_APP'],
          audience: { selector: 'BRANCH', branchIds: [branchBId.toString()] }
        }
      });

      expect(res.status).toBe(403);
    });
  });

  describe('5. Security: Suspended User Access Rejection', () => {
    it('Suspended user cannot view inbox or send communications', async () => {
      const res = await request(tokens.suspended, '/api/v1/communications/inbox');

      expect([401, 403]).toContain(res.status);
    });
  });

  describe('6. Conversations & Messaging HTTP Endpoints', () => {
    let convId: string;

    it('POST /api/v1/communications/conversations creates academic conversation', async () => {
      const res = await request(tokens.student, '/api/v1/communications/conversations', {
        method: 'POST',
        body: {
          type: 'STUDENT_INSTRUCTOR',
          recipientUserIds: [instructor1Id.toString()],
          title: 'HTTP Doubt Session'
        }
      });

      expect(res.status).toBe(201);
      expect(res.json.data.type).toBe('STUDENT_INSTRUCTOR');
      convId = (res.json.data._id || res.json.data.id)?.toString();
    });

    it('POST /api/v1/communications/conversations/:id/messages sends message with sequence', async () => {
      const res = await request(tokens.student, `/api/v1/communications/conversations/${convId}/messages`, {
        method: 'POST',
        body: {
          body: 'Hello instructor from HTTP API test'
        }
      });

      expect(res.status).toBe(201);
      expect(res.json.data.body).toBe('Hello instructor from HTTP API test');
      expect(res.json.data.sequenceNumber).toBe(1);
    });

    it('GET /api/v1/communications/conversations/:id/messages lists messages with cursor', async () => {
      const res = await request(tokens.instructor, `/api/v1/communications/conversations/${convId}/messages`);

      expect(res.status).toBe(200);
      expect(res.json.data.length).toBe(1);
    });

    it('POST /api/v1/communications/mark-read marks conversation read', async () => {
      const res = await request(tokens.instructor, '/api/v1/communications/mark-read', {
        method: 'POST',
        body: {
          itemType: 'CONVERSATION',
          itemId: convId
        }
      });

      expect(res.status).toBe(200);
      expect(res.json.data.success).toBe(true);
    });

    it('Tenant B actor accessing Tenant A conversation or messages is denied (404/403 zero leakage)', async () => {
      const resConv = await request(tokens.tenantB, `/api/v1/communications/conversations/${convId}`);
      expect(resConv.status).toBe(404);

      const resMsg = await request(tokens.tenantB, `/api/v1/communications/conversations/${convId}/messages`);
      expect(resMsg.status).toBe(404);
    });

    it('Foreign non-participant actor accessing private conversation is denied', async () => {
      const res = await request(tokens.branchA, `/api/v1/communications/conversations/${convId}`);
      expect([403, 404]).toContain(res.status);
    });
  });
});

