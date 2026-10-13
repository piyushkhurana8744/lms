import http from 'http';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  StudentLifecycleModel,
  StudentLifecycleEventModel,
  StudentSequenceModel,
  UserModel,
  OrganizationMemberModel,
  EnrollmentModel,
  CourseModel,
  BatchModel,
  SessionModel,
  TenantModel,
  connectDatabase,
  disconnectDatabase
} from '@edtech/database';
import { PERMISSIONS } from '@edtech/permissions';
import { signAccessToken } from '@edtech/utils';
import { createApp } from '../../app';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;

suite('Phase 16 Student Lifecycle HTTP Authorization and Attack Matrix', () => {
  let server: http.Server;
  let port: number;
  const ids: Record<string, mongoose.Types.ObjectId> = {};
  const tokens: Record<string, string> = {};

  const request = (token: string, method: string, path: string, body?: unknown) =>
    new Promise<{ status: number; json: any }>((resolve, reject) => {
      const payload = body === undefined ? undefined : Buffer.from(JSON.stringify(body));
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method,
          headers: {
            authorization: `Bearer ${token}`,
            ...(payload ? { 'content-type': 'application/json', 'content-length': payload.length } : {})
          }
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            const raw = Buffer.concat(chunks).toString();
            resolve({ status: res.statusCode || 0, json: raw ? JSON.parse(raw) : undefined });
          });
        }
      );
      req.on('error', reject);
      req.end(payload);
    });

  async function actor(
    label: string,
    tenantId: mongoose.Types.ObjectId,
    role?: 'TENANT_ADMIN' | 'INSTRUCTOR' | 'STUDENT'
  ) {
    const userId = new mongoose.Types.ObjectId();
    const sessionId = new mongoose.Types.ObjectId();

    await UserModel.collection.insertOne({
      _id: userId,
      tenantId,
      allowedTenantIds: [tenantId],
      name: label,
      email: `${label.toLowerCase().replace(/\s+/g, '.')}@lifecycle-http.test`,
      passwordHash: 'secret_hash_value_do_not_expose',
      status: 'ACTIVE',
      emailVerified: true,
      isSuperAdmin: false,
      roles: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    if (role) {
      await OrganizationMemberModel.collection.insertOne({
        tenantId,
        userId,
        role,
        status: 'ACTIVE',
        joinedAt: new Date()
      });
    }

    await SessionModel.collection.insertOne({
      _id: sessionId,
      userId,
      tenantId,
      activeTenantId: tenantId,
      token: `session-${label.toLowerCase()}`,
      isActive: true,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000)
    });

    ids[label] = userId;
    tokens[label] = signAccessToken({
      sub: userId.toString(),
      sessionId: sessionId.toString(),
      tenantId: tenantId.toString(),
      tokenVersion: 1
    });
  }

  beforeAll(async () => {
    await connectDatabase(
      process.env.MONGO_INTEGRATION_URI ||
        'mongodb://127.0.0.1:27017/edtech_lms_test?replicaSet=rs0&directConnection=true'
    );

    for (const m of [
      StudentLifecycleModel,
      StudentLifecycleEventModel,
      StudentSequenceModel,
      SessionModel,
      EnrollmentModel,
      BatchModel,
      CourseModel,
      OrganizationMemberModel,
      UserModel,
      TenantModel
    ]) {
      await m.collection.deleteMany({});
    }

    ids.tenantA = new mongoose.Types.ObjectId();
    ids.tenantB = new mongoose.Types.ObjectId();

    await TenantModel.collection.insertMany([
      { _id: ids.tenantA, name: 'Tenant A', slug: 'tenant-a' },
      { _id: ids.tenantB, name: 'Tenant B', slug: 'tenant-b' }
    ]);

    // Setup actors
    await actor('AdminA', ids.tenantA, 'TENANT_ADMIN');
    await actor('AdminB', ids.tenantB, 'TENANT_ADMIN');
    await actor('InstructorA', ids.tenantA, 'INSTRUCTOR');
    await actor('StudentA', ids.tenantA, 'STUDENT');
    await actor('StudentB', ids.tenantB, 'STUDENT');

    // Setup Course, Batches & Enrollment in Tenant A
    ids.courseA = new mongoose.Types.ObjectId();
    ids.batchA1 = new mongoose.Types.ObjectId();
    ids.batchA2 = new mongoose.Types.ObjectId();

    await CourseModel.collection.insertOne({
      _id: ids.courseA,
      tenantId: ids.tenantA,
      title: 'Digital Marketing Mastery',
      slug: 'dmm',
      status: 'PUBLISHED'
    });

    await BatchModel.collection.insertMany([
      {
        _id: ids.batchA1,
        tenantId: ids.tenantA,
        name: 'Morning Cohort',
        batchCode: 'MC-1',
        courseId: ids.courseA,
        mode: 'ONLINE',
        status: 'ONGOING',
        startDate: new Date('2026-10-01T00:00:00Z'),
        maxSeats: 30,
        enrolledCount: 1,
        timing: { startTime: '10:00', endTime: '12:00', timezone: 'Asia/Kolkata' },
        daysOfWeek: ['MONDAY'],
        showOnWebsite: true
      },
      {
        _id: ids.batchA2,
        tenantId: ids.tenantA,
        name: 'Evening Cohort',
        batchCode: 'EC-1',
        courseId: ids.courseA,
        mode: 'ONLINE',
        status: 'ONGOING',
        startDate: new Date('2026-10-01T00:00:00Z'),
        maxSeats: 30,
        enrolledCount: 0,
        timing: { startTime: '18:00', endTime: '20:00', timezone: 'Asia/Kolkata' },
        daysOfWeek: ['MONDAY'],
        showOnWebsite: true
      }
    ]);

    ids.enrollmentA = new mongoose.Types.ObjectId();
    await EnrollmentModel.collection.insertOne({
      _id: ids.enrollmentA,
      tenantId: ids.tenantA,
      studentId: ids.StudentA,
      courseId: ids.courseA,
      status: 'ACTIVE',
      enrolledAt: new Date('2026-10-01T00:00:00Z'),
      progressPercent: 0,
      completedLessons: 0,
      totalLessons: 10
    });

    // Create StudentLifecycle document for StudentA
    ids.lifecycleA = new mongoose.Types.ObjectId();
    await StudentLifecycleModel.collection.insertOne({
      _id: ids.lifecycleA,
      tenantId: ids.tenantA,
      studentUserId: ids.StudentA,
      studentNumber: 'STU-2026-000001',
      currentEnrollmentId: ids.enrollmentA,
      currentBatchId: ids.batchA1,
      currentStatus: 'PENDING_ACTIVATION',
      lifecycleEpisode: 1,
      revision: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const app = createApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    port = (server.address() as any).port;
  });

  afterAll(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    await disconnectDatabase();
  });

  it('1. Tenant Admin can access student directory and view student academic profile', async () => {
    const listRes = await request(tokens.AdminA, 'GET', '/api/v1/students');
    expect(listRes.status).toBe(200);
    expect(listRes.json.success).toBe(true);
    expect(listRes.json.data.data.length).toBeGreaterThan(0);

    const profileRes = await request(tokens.AdminA, 'GET', `/api/v1/students/profile/${ids.StudentA}`);
    expect(profileRes.status).toBe(200);
    expect(profileRes.json.data.identity.name).toBe('StudentA');
    expect(profileRes.json.data.lifecycle.currentStatus).toBe('PENDING_ACTIVATION');

    // Strict DTO Privacy: Ensure no passwordHash or auth internals are exposed
    expect(JSON.stringify(profileRes.json)).not.toContain('secret_hash_value_do_not_expose');
    expect(JSON.stringify(profileRes.json)).not.toContain('passwordHash');
  });

  it('2. Tenant Admin can activate a student', async () => {
    const actRes = await request(tokens.AdminA, 'POST', `/api/v1/students/${ids.lifecycleA}/activate`, {
      notes: 'Verified enrollment'
    });
    expect(actRes.status).toBe(200);
    expect(actRes.json.data.currentStatus).toBe('ACTIVE');
  });

  it('3. Instructor cannot perform student lifecycle mutations (403 Forbidden)', async () => {
    const actRes = await request(tokens.InstructorA, 'POST', `/api/v1/students/${ids.lifecycleA}/transfer`, {
      toBatchId: ids.batchA2.toString(),
      reason: 'Unauthorized instructor change'
    });
    expect(actRes.status).toBe(403);
  });

  it('4. Student can access own profile and timeline but cannot access directory or admin mutations', async () => {
    // Access own profile via self endpoint
    const ownRes = await request(tokens.StudentA, 'GET', '/api/v1/students/self/profile');
    expect(ownRes.status).toBe(200);
    expect(ownRes.json.data.identity.id).toBe(ids.StudentA.toString());

    // Access own timeline
    const timelineRes = await request(tokens.StudentA, 'GET', '/api/v1/students/self/timeline');
    expect(timelineRes.status).toBe(200);

    // Attempt admin directory listing -> 403 Forbidden
    const dirRes = await request(tokens.StudentA, 'GET', '/api/v1/students');
    expect(dirRes.status).toBe(403);

    // Attempt admin lifecycle transition -> 403 Forbidden
    const mutateRes = await request(tokens.StudentA, 'POST', `/api/v1/students/${ids.lifecycleA}/hold`, {
      reason: 'Self hold attempt'
    });
    expect(mutateRes.status).toBe(403);
  });

  it('5. Cross-Tenant Attack Matrix: Tenant B Admin cannot view or mutate Tenant A student lifecycle', async () => {
    // Attempt view Tenant A profile from Tenant B
    const viewRes = await request(tokens.AdminB, 'GET', `/api/v1/students/profile/${ids.StudentA}`);
    expect(viewRes.status).toBe(404);

    // Attempt mutation on Tenant A lifecycle from Tenant B
    const mutRes = await request(tokens.AdminB, 'POST', `/api/v1/students/${ids.lifecycleA}/hold`, {
      reason: 'Cross-tenant hold attack'
    });
    expect(mutRes.status).toBe(404);

    // Verify ZERO mutation occurred on Tenant A lifecycle
    const freshDoc = await StudentLifecycleModel.findById(ids.lifecycleA);
    expect(freshDoc?.currentStatus).toBe('ACTIVE');
  });

  it('6. Validates request schemas strictly and rejects malformed inputs with 400 Bad Request', async () => {
    // Missing reason on hold
    const badHold = await request(tokens.AdminA, 'POST', `/api/v1/students/${ids.lifecycleA}/hold`, {});
    expect(badHold.status).toBe(400);

    // Invalid batch ID format on transfer
    const badTransfer = await request(tokens.AdminA, 'POST', `/api/v1/students/${ids.lifecycleA}/transfer`, {
      toBatchId: 'invalid-id',
      reason: 'Valid reason'
    });
    expect(badTransfer.status).toBe(400);
  });

  it('7. Enforces optimistic concurrency revision control (409 Conflict on stale revision)', async () => {
    // Current revision is 1. Provide expectedRevision: 0 -> 409 Conflict
    const staleRes = await request(tokens.AdminA, 'POST', `/api/v1/students/${ids.lifecycleA}/hold`, {
      reason: 'Valid hold reason',
      expectedRevision: 0
    });
    expect(staleRes.status).toBe(409);
  });
});
