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
  AuditLogModel,
  connectDatabase,
  disconnectDatabase
} from '@edtech/database';
import { PERMISSIONS } from '@edtech/permissions';
import { signAccessToken } from '@edtech/utils';
import { createApp } from '../../app';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;

suite('Phase 22.5 Superadmin Impersonation & Logout HTTP Security Matrix', () => {
  let server: http.Server;
  let port: number;
  const ids: Record<string, mongoose.Types.ObjectId> = {};
  const tokens: Record<string, string> = {};

  const makeRequest = (
    token: string | null,
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ) =>
    new Promise<{ status: number; json: any }>((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : undefined;
      const headers: Record<string, string> = {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload).toString() } : {})
      };

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
            resolve({ status: res.statusCode || 0, json: raw ? JSON.parse(raw) : null });
          });
        }
      );
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });

  async function createActor(
    label: string,
    tenantId: mongoose.Types.ObjectId,
    role: 'TENANT_ADMIN' | 'INSTRUCTOR' | 'STUDENT',
    accessMode: 'ALL' | 'SELECTED' = 'ALL',
    branchIds: mongoose.Types.ObjectId[] = [],
    isSuperAdmin: boolean = false,
    status: 'ACTIVE' | 'SUSPENDED' = 'ACTIVE'
  ) {
    const userId = new mongoose.Types.ObjectId();
    const sessionId = new mongoose.Types.ObjectId();
    ids[label] = userId;
    ids[`${label}_session`] = sessionId;

    await UserModel.collection.insertOne({
      _id: userId,
      tenantId,
      allowedTenantIds: [tenantId],
      name: label,
      email: `${label}@phase225-http.test`,
      passwordHash: 'hashed_pw',
      status,
      isSuperAdmin,
      roles: []
    });

    if (role) {
      await OrganizationMemberModel.collection.insertOne({
        tenantId,
        userId,
        role,
        status: status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED',
        branchAccessMode: accessMode,
        branchIds,
        joinedAt: new Date()
      });
    }

    await SessionModel.collection.insertOne({
      _id: sessionId,
      userId,
      tenantId,
      activeTenantId: tenantId,
      currentRefreshTokenHash: `refresh-${label}`,
      expiresAt: new Date(Date.now() + 86400000)
    });

    tokens[label] = signAccessToken({
      sub: userId.toString(),
      sessionId: sessionId.toString(),
      tenantId: tenantId.toString(),
      tokenVersion: 1
    });
  }

  beforeAll(async () => {
    await connectDatabase(
      process.env.MONGO_INTEGRATION_URI || 'mongodb://127.0.0.1:27017/edtech_lms_test?replicaSet=rs0&directConnection=true'
    );

    for (const model of [
      BranchModel,
      OrganizationMemberModel,
      RoleModel,
      SessionModel,
      UserModel,
      TenantModel,
      AuditLogModel
    ]) {
      await model.collection.deleteMany({});
    }

    ids.tenantA = new mongoose.Types.ObjectId();
    ids.tenantB = new mongoose.Types.ObjectId();
    ids.branchA1 = new mongoose.Types.ObjectId();
    ids.branchA2 = new mongoose.Types.ObjectId();
    ids.branchB1 = new mongoose.Types.ObjectId();

    await TenantModel.collection.insertMany([
      { _id: ids.tenantA, name: 'Tenant A', slug: 'tenant-a-225' },
      { _id: ids.tenantB, name: 'Tenant B', slug: 'tenant-b-225' }
    ]);

    await BranchModel.collection.insertMany([
      {
        _id: ids.branchA1,
        tenantId: ids.tenantA,
        code: 'A1',
        slug: 'a1',
        name: 'Branch A1',
        status: 'ACTIVE',
        timezone: 'Asia/Kolkata',
        isPrimary: true,
        revision: 0
      },
      {
        _id: ids.branchA2,
        tenantId: ids.tenantA,
        code: 'A2',
        slug: 'a2',
        name: 'Branch A2',
        status: 'ACTIVE',
        timezone: 'Asia/Kolkata',
        isPrimary: false,
        revision: 0
      },
      {
        _id: ids.branchB1,
        tenantId: ids.tenantB,
        code: 'B1',
        slug: 'b1',
        name: 'Branch B1',
        status: 'ACTIVE',
        timezone: 'Asia/Kolkata',
        isPrimary: true,
        revision: 0
      }
    ]);

    await RoleModel.collection.insertMany([
      {
        tenantId: ids.tenantA,
        name: 'Instructor scope',
        slug: 'instructor',
        permissions: [PERMISSIONS.BRANCH_VIEW],
        isSystemRole: false
      },
      {
        tenantId: ids.tenantB,
        name: 'Instructor scope',
        slug: 'instructor',
        permissions: [PERMISSIONS.BRANCH_VIEW],
        isSystemRole: false
      }
    ]);

    // Create actors
    await createActor('superadmin', ids.tenantA, 'TENANT_ADMIN', 'ALL', [], true);
    await createActor('superadmin_peer', ids.tenantA, 'TENANT_ADMIN', 'ALL', [], true);
    await createActor('tenant_admin', ids.tenantA, 'TENANT_ADMIN', 'ALL', [], false);
    await createActor('instructor_a1', ids.tenantA, 'INSTRUCTOR', 'SELECTED', [ids.branchA1], false);
    await createActor('student_a', ids.tenantA, 'STUDENT', 'SELECTED', [ids.branchA1], false);
    await createActor('suspended_user', ids.tenantA, 'STUDENT', 'ALL', [], false, 'SUSPENDED');
    await createActor('instructor_b', ids.tenantB, 'INSTRUCTOR', 'ALL', [], false);

    await new Promise<void>((resolve) => {
      server = createApp().listen(0, '127.0.0.1', () => {
        port = (server.address() as any).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await disconnectDatabase();
  });

  describe('1. Impersonation Access Controls & Validation', () => {
    it('Tenant Admin is forbidden from starting impersonation (403)', async () => {
      const res = await makeRequest(tokens.tenant_admin, '/api/v1/platform/impersonation/start', 'POST', {
        targetUserId: ids.instructor_a1.toString(),
        reason: 'Unauthorized attempt'
      });
      expect(res.status).toBe(403);
    });

    it('Instructor is forbidden from starting impersonation (403)', async () => {
      const res = await makeRequest(tokens.instructor_a1, '/api/v1/platform/impersonation/start', 'POST', {
        targetUserId: ids.student_a.toString(),
        reason: 'Unauthorized attempt'
      });
      expect(res.status).toBe(403);
    });

    it('Student is forbidden from starting impersonation (403)', async () => {
      const res = await makeRequest(tokens.student_a, '/api/v1/platform/impersonation/start', 'POST', {
        targetUserId: ids.instructor_a1.toString(),
        reason: 'Unauthorized attempt'
      });
      expect(res.status).toBe(403);
    });

    it('Superadmin fails to start impersonation without a reason (400)', async () => {
      const res = await makeRequest(tokens.superadmin, '/api/v1/platform/impersonation/start', 'POST', {
        targetUserId: ids.instructor_a1.toString(),
        reason: '   '
      });
      expect(res.status).toBe(400);
      expect(res.json.error.message).toContain('Impersonation reason is required');
    });

    it('Superadmin fails to self-impersonate (400)', async () => {
      const res = await makeRequest(tokens.superadmin, '/api/v1/platform/impersonation/start', 'POST', {
        targetUserId: ids.superadmin.toString(),
        reason: 'Self impersonation attempt'
      });
      expect(res.status).toBe(400);
      expect(res.json.error.message).toContain('Self-impersonation is not permitted');
    });

    it('Superadmin fails to impersonate another superadmin (400)', async () => {
      const res = await makeRequest(tokens.superadmin, '/api/v1/platform/impersonation/start', 'POST', {
        targetUserId: ids.superadmin_peer.toString(),
        reason: 'Peer superadmin attempt'
      });
      expect(res.status).toBe(400);
      expect(res.json.error.message).toContain('Impersonating another platform superadmin is not permitted');
    });

    it('Superadmin fails to impersonate a suspended user (400)', async () => {
      const res = await makeRequest(tokens.superadmin, '/api/v1/platform/impersonation/start', 'POST', {
        targetUserId: ids.suspended_user.toString(),
        reason: 'Suspended user attempt'
      });
      expect(res.status).toBe(400);
      expect(res.json.error.message).toContain('Cannot impersonate an inactive or suspended user account');
    });
  });

  describe('2. Successful Impersonation Lifecycle & Authority Isolation', () => {
    let impersonatedToken: string;
    let impersonatedSessionId: string;

    it('Superadmin successfully impersonates Instructor A1', async () => {
      const res = await makeRequest(tokens.superadmin, '/api/v1/platform/impersonation/start', 'POST', {
        targetUserId: ids.instructor_a1.toString(),
        reason: 'Investigating Phase 17 branch issue'
      });

      expect(res.status).toBe(200);
      expect(res.json.data.user.id).toBe(ids.instructor_a1.toString());
      expect(res.json.data.user.email).toBe('instructor_a1@phase225-http.test');
      expect(res.json.data.user.impersonationReason).toBe('Investigating Phase 17 branch issue');
      expect(res.json.data.tokens.accessToken).toBeDefined();

      impersonatedToken = res.json.data.tokens.accessToken;
      impersonatedSessionId = res.json.data.user.sessionId;
    });

    it('Impersonation status endpoint returns active impersonation state', async () => {
      const res = await makeRequest(impersonatedToken, '/api/v1/platform/impersonation/status');
      expect(res.status).toBe(200);
      expect(res.json.data.isImpersonated).toBe(true);
      expect(res.json.data.effectiveUserId).toBe(ids.instructor_a1.toString());
      expect(res.json.data.originalActorId).toBe(ids.superadmin.toString());
      expect(res.json.data.impersonationReason).toBe('Investigating Phase 17 branch issue');
    });

    it('Nested impersonation attempt while already impersonating is rejected (400 or 403)', async () => {
      const res = await makeRequest(impersonatedToken, '/api/v1/platform/impersonation/start', 'POST', {
        targetUserId: ids.student_a.toString(),
        reason: 'Nested impersonation attempt'
      });
      // Instructor has no superadmin permission, so start is forbidden (403)
      expect([400, 403]).toContain(res.status);
    });

    it('Branch Isolation: Impersonated Instructor A1 sees ONLY Branch A1 and cannot access Branch A2 (404)', async () => {
      const list = await makeRequest(impersonatedToken, '/api/v1/branches');
      expect(list.status).toBe(200);
      expect(list.json.data.pagination.total).toBe(1);
      expect(list.json.data.items[0].code).toBe('A1');

      const detailA2 = await makeRequest(impersonatedToken, `/api/v1/branches/${ids.branchA2}`);
      expect(detailA2.status).toBe(404);
    });

    it('Cross-tenant Isolation: Impersonated Instructor A1 cannot access Branch B1 of Tenant B (404)', async () => {
      const detailB1 = await makeRequest(impersonatedToken, `/api/v1/branches/${ids.branchB1}`);
      expect(detailB1.status).toBe(404);
    });

    it('Superadmin Authority Isolation: Impersonated token cannot access superadmin platform routes (403)', async () => {
      const res = await makeRequest(impersonatedToken, '/api/v1/platform/command-center/summary');
      expect(res.status).toBe(403);
    });

    it('Audit Attribution: Verify IMPERSONATION_STARTED was logged with original and effective actors', async () => {
      const logs = await AuditLogModel.find({
        action: 'SUPERADMIN_IMPERSONATION_STARTED',
        actorId: ids.superadmin.toString()
      }).lean();

      expect(logs.length).toBeGreaterThan(0);
      expect((logs[0].metadata as any)?.targetUserId).toBe(ids.instructor_a1.toString());
      expect((logs[0].metadata as any)?.reason).toBe('Investigating Phase 17 branch issue');
    });

    it('Exit Impersonation: Successfully restores superadmin session', async () => {
      const res = await makeRequest(impersonatedToken, '/api/v1/platform/impersonation/exit', 'POST');
      expect(res.status).toBe(200);
      expect(res.json.data.impersonationEnded).toBe(true);
      expect(res.json.data.user.id).toBe(ids.superadmin.toString());
      expect(res.json.data.tokens.accessToken).toBeDefined();

      const restoredToken = res.json.data.tokens.accessToken;

      // Restored token has platform superadmin access again
      const platformRes = await makeRequest(restoredToken, '/api/v1/platform/command-center/summary');
      expect(platformRes.status).toBe(200);
    });

    it('Audit Attribution: Verify IMPERSONATION_ENDED was logged', async () => {
      const logs = await AuditLogModel.find({
        action: 'SUPERADMIN_IMPERSONATION_ENDED',
        actorId: ids.superadmin.toString()
      }).lean();

      expect(logs.length).toBeGreaterThan(0);
      expect((logs[0].metadata as any)?.targetUserId).toBe(ids.instructor_a1.toString());
    });
  });

  describe('3. Clean Logout & Session Invalidation HTTP Flow', () => {
    let testSessionToken: string;
    let testSessionId: string;

    beforeAll(async () => {
      const userId = new mongoose.Types.ObjectId();
      const sId = new mongoose.Types.ObjectId();
      testSessionId = sId.toString();

      await UserModel.collection.insertOne({
        _id: userId,
        tenantId: ids.tenantA,
        allowedTenantIds: [ids.tenantA],
        name: 'Logout Test User',
        email: 'logout_test@phase225.test',
        passwordHash: 'hashed_pw',
        status: 'ACTIVE',
        isSuperAdmin: false,
        roles: []
      });

      await SessionModel.collection.insertOne({
        _id: sId,
        userId,
        tenantId: ids.tenantA,
        activeTenantId: ids.tenantA,
        currentRefreshTokenHash: 'logout-refresh',
        expiresAt: new Date(Date.now() + 86400000)
      });

      testSessionToken = signAccessToken({
        sub: userId.toString(),
        sessionId: testSessionId,
        tenantId: ids.tenantA.toString(),
        tokenVersion: 1
      });
    });

    it('Authenticated user can access /api/v1/auth/me before logout', async () => {
      const res = await makeRequest(testSessionToken, '/api/v1/auth/me');
      expect(res.status).toBe(200);
      expect(res.json.data.user.email).toBe('logout_test@phase225.test');
    });

    it('Calling /api/v1/auth/logout succeeds and invalidates the session in MongoDB', async () => {
      const res = await makeRequest(testSessionToken, '/api/v1/auth/logout', 'POST');
      expect(res.status).toBe(200);

      // Verify session is marked revoked in DB
      const sessionInDb = await SessionModel.findById(testSessionId).setOptions({ bypassTenantFilter: true });
      expect(sessionInDb?.revokedAt).toBeDefined();
    });

    it('Subsequent protected requests with the revoked session token are rejected (401)', async () => {
      const res = await makeRequest(testSessionToken, '/api/v1/auth/me');
      expect(res.status).toBe(401);
    });
  });
});
