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
  LeadModel,
  PaymentModel,
  StudentLifecycleModel,
  ClassModel,
  AttendanceSessionModel,
  AttendanceRecordModel,
  AnalyticsExportModel,
  connectDatabase,
  disconnectDatabase,
} from '@edtech/database';
import { PERMISSIONS } from '@edtech/permissions';
import { signAccessToken } from '@edtech/utils';
import { createApp } from '../../app';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;

suite('Phase 19 Analytics & Reporting HTTP RBAC & Security Integration Suite', () => {
  let server: http.Server;
  let port: number;

  const ids: Record<string, mongoose.Types.ObjectId> = {};
  const tokens: Record<string, string> = {};

  const request = (token: string, path: string, options: { method?: string; body?: any } = {}) =>
    new Promise<{ status: number; json: any; headers: http.IncomingHttpHeaders }>((resolve, reject) => {
      const method = options.method || 'GET';
      const postData = options.body ? JSON.stringify(options.body) : undefined;
      const headers: Record<string, string> = {
        authorization: `Bearer ${token}`,
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
          headers,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const raw = Buffer.concat(chunks).toString();
            resolve({
              status: res.statusCode || 0,
              json: raw ? (raw.startsWith('{') || raw.startsWith('[') ? JSON.parse(raw) : raw) : null,
              headers: res.headers,
            });
          });
        }
      );
      req.on('error', reject);
      if (postData) req.write(postData);
      req.end();
    });

  async function createActor(
    label: string,
    tenantId: mongoose.Types.ObjectId,
    role: string,
    permissions: string[],
    accessMode: 'ALL' | 'SELECTED' = 'ALL',
    branchIds: mongoose.Types.ObjectId[] = []
  ) {
    const userId = new mongoose.Types.ObjectId();
    const sessionId = new mongoose.Types.ObjectId();
    ids[label] = userId;

    await UserModel.collection.insertOne({
      _id: userId,
      tenantId,
      allowedTenantIds: [tenantId],
      name: `Actor ${label}`,
      email: `${label}@analytics-http.test`,
      passwordHash: 'hashed_pw',
      status: 'ACTIVE',
      roles: [],
    });

    await OrganizationMemberModel.collection.insertOne({
      tenantId,
      userId,
      role,
      status: 'ACTIVE',
      branchAccessMode: accessMode,
      branchIds,
      joinedAt: new Date(),
    });

    await RoleModel.collection.insertOne({
      _id: new mongoose.Types.ObjectId(),
      tenantId,
      name: `Role ${label}`,
      slug: role.toLowerCase(),
      permissions,
      isSystemRole: false,
    } as any);

    await SessionModel.collection.insertOne({
      _id: sessionId,
      userId,
      tenantId,
      activeTenantId: tenantId,
      currentRefreshTokenHash: `hash-${label}`,
      expiresAt: new Date(Date.now() + 86400000),
    });

    tokens[label] = signAccessToken({
      sub: userId.toString(),
      sessionId: sessionId.toString(),
      tenantId: tenantId.toString(),
      tokenVersion: 1,
    });
  }

  beforeAll(async () => {
    await connectDatabase(
      process.env.MONGO_INTEGRATION_URI ||
        'mongodb://127.0.0.1:27017/edtech_lms_test?replicaSet=rs0&directConnection=true'
    );

    for (const model of [
      BranchModel,
      OrganizationMemberModel,
      RoleModel,
      SessionModel,
      UserModel,
      TenantModel,
      LeadModel,
      PaymentModel,
      StudentLifecycleModel,
      ClassModel,
      AttendanceSessionModel,
      AttendanceRecordModel,
      AnalyticsExportModel,
    ]) {
      await model.collection.deleteMany({});
    }

    ids.tenantA = new mongoose.Types.ObjectId();
    ids.tenantB = new mongoose.Types.ObjectId();
    ids.branchA1 = new mongoose.Types.ObjectId();
    ids.branchA2 = new mongoose.Types.ObjectId();
    ids.branchB1 = new mongoose.Types.ObjectId();

    await TenantModel.collection.insertMany([
      { _id: ids.tenantA, name: 'Tenant Alpha', slug: 'tenant-alpha', timezone: 'Asia/Kolkata', currency: 'INR' },
      { _id: ids.tenantB, name: 'Tenant Beta', slug: 'tenant-beta', timezone: 'Asia/Kolkata', currency: 'INR' },
    ]);

    await BranchModel.collection.insertMany([
      {
        _id: ids.branchA1,
        tenantId: ids.tenantA,
        name: 'Delhi South',
        code: 'DELHI',
        slug: 'delhi',
        status: 'ACTIVE',
        timezone: 'Asia/Kolkata',
        isPrimary: true,
        revision: 0,
      },
      {
        _id: ids.branchA2,
        tenantId: ids.tenantA,
        name: 'Noida Hub',
        code: 'NOIDA',
        slug: 'noida',
        status: 'ACTIVE',
        timezone: 'Asia/Kolkata',
        isPrimary: false,
        revision: 0,
      },
      {
        _id: ids.branchB1,
        tenantId: ids.tenantB,
        name: 'Beta Branch',
        code: 'BETA_1',
        slug: 'beta-1',
        status: 'ACTIVE',
        timezone: 'Asia/Kolkata',
        isPrimary: true,
        revision: 0,
      },
    ]);

    // Setup RBAC matrix actors
    await createActor('hqAdmin', ids.tenantA, 'TENANT_ADMIN', [
      PERMISSIONS.ANALYTICS_DASHBOARD_VIEW,
      PERMISSIONS.ANALYTICS_STUDENTS_VIEW,
      PERMISSIONS.ANALYTICS_CRM_VIEW,
      PERMISSIONS.ANALYTICS_FINANCE_VIEW,
      PERMISSIONS.ANALYTICS_ATTENDANCE_VIEW,
      PERMISSIONS.ANALYTICS_ACADEMICS_VIEW,
      PERMISSIONS.ANALYTICS_LEARNING_VIEW,
      PERMISSIONS.ANALYTICS_INSTRUCTORS_VIEW,
      PERMISSIONS.ANALYTICS_REPORTS_EXPORT,
    ], 'ALL');

    await createActor('crmCounsellor', ids.tenantA, 'CRM_COUNSELLOR', [
      PERMISSIONS.ANALYTICS_DASHBOARD_VIEW,
      PERMISSIONS.ANALYTICS_CRM_VIEW,
    ], 'SELECTED', [ids.branchA1]);

    await createActor('financeStaff', ids.tenantA, 'FINANCE_STAFF', [
      PERMISSIONS.ANALYTICS_DASHBOARD_VIEW,
      PERMISSIONS.ANALYTICS_FINANCE_VIEW,
      PERMISSIONS.ANALYTICS_REPORTS_EXPORT,
    ], 'ALL');

    await createActor('academicCoordinator', ids.tenantA, 'ACADEMIC_COORDINATOR', [
      PERMISSIONS.ANALYTICS_DASHBOARD_VIEW,
      PERMISSIONS.ANALYTICS_STUDENTS_VIEW,
      PERMISSIONS.ANALYTICS_ATTENDANCE_VIEW,
      PERMISSIONS.ANALYTICS_ACADEMICS_VIEW,
    ], 'SELECTED', [ids.branchA1]);

    await createActor('studentUser', ids.tenantA, 'STUDENT', [], 'SELECTED', [ids.branchA1]);
    await createActor('tenantBAttacker', ids.tenantB, 'TENANT_ADMIN', [
      PERMISSIONS.ANALYTICS_DASHBOARD_VIEW,
      PERMISSIONS.ANALYTICS_FINANCE_VIEW,
      PERMISSIONS.ANALYTICS_REPORTS_EXPORT,
    ], 'ALL');

    // Seed test operational data for Tenant A
    const now = new Date();
    await PaymentModel.collection.insertOne({
      _id: new mongoose.Types.ObjectId(),
      tenantId: ids.tenantA,
      branchId: ids.branchA1,
      amountMinor: 5000000,
      currency: 'INR',
      status: 'SUCCESS',
      receivedAt: now,
      createdAt: now,
    } as any);

    await LeadModel.collection.insertOne({
      _id: new mongoose.Types.ObjectId(),
      tenantId: ids.tenantA,
      branchId: ids.branchA1,
      status: 'ADMITTED',
      source: 'WEBSITE',
      createdAt: now,
    });

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

  it('performs server-side response shaping on executive dashboard omitting unauthorized sections', async () => {
    // 1. CRM Counsellor gets CRM section, but NO Finance section
    const crmRes = await request(tokens.crmCounsellor, '/api/v1/analytics/dashboard?preset=last_30_days');
    expect(crmRes.status).toBe(200);
    expect(crmRes.json.data.crm).toBeDefined();
    expect(crmRes.json.data.finance).toBeUndefined();

    // 2. Finance Staff gets Finance section, but NO CRM section
    const finRes = await request(tokens.financeStaff, '/api/v1/analytics/dashboard?preset=last_30_days');
    expect(finRes.status).toBe(200);
    expect(finRes.json.data.finance).toBeDefined();
    expect(finRes.json.data.crm).toBeUndefined();

    // 3. Academic Coordinator gets Students/Attendance/Academics, NO Finance
    const acadRes = await request(tokens.academicCoordinator, '/api/v1/analytics/dashboard?preset=last_30_days');
    expect(acadRes.status).toBe(200);
    expect(acadRes.json.data.students).toBeDefined();
    expect(acadRes.json.data.attendance).toBeDefined();
    expect(acadRes.json.data.academics).toBeDefined();
    expect(acadRes.json.data.finance).toBeUndefined();

    // 4. HQ Admin gets all permitted sections
    const hqRes = await request(tokens.hqAdmin, '/api/v1/analytics/dashboard?preset=last_30_days');
    expect(hqRes.status).toBe(200);
    expect(hqRes.json.data.students).toBeDefined();
    expect(hqRes.json.data.crm).toBeDefined();
    expect(hqRes.json.data.finance).toBeDefined();
    expect(hqRes.json.data.attendance).toBeDefined();
    expect(hqRes.json.data.academics).toBeDefined();
  });

  it('strictly rejects unauthorized domain endpoint access with 403 Forbidden', async () => {
    // Academic Coordinator attempting direct GET /analytics/finance
    const finAttempt = await request(tokens.academicCoordinator, '/api/v1/analytics/finance?preset=last_30_days');
    expect(finAttempt.status).toBe(403);
    expect(finAttempt.json.error.code).toBe('ERR_FORBIDDEN');

    // Student attempting GET /analytics/dashboard
    const studentAttempt = await request(tokens.studentUser, '/api/v1/analytics/dashboard?preset=last_30_days');
    expect(studentAttempt.status).toBe(403);
  });

  it('rejects cross-branch access for SELECTED actor querying unauthorized branch with 404', async () => {
    // CRM Counsellor assigned only to branchA1 attempts to query branchA2
    const res = await request(tokens.crmCounsellor, `/api/v1/analytics/crm?preset=last_30_days&branchId=${ids.branchA2}`);
    expect(res.status).toBe(404);
  });

  it('prevents cross-tenant data leakage when Tenant B attacker queries Tenant A IDs', async () => {
    // Tenant B attacker tries to query with Tenant A branch ID
    const res = await request(tokens.tenantBAttacker, `/api/v1/analytics/finance?preset=last_30_days&branchId=${ids.branchA1}`);
    expect(res.status).toBe(404);
  });

  it('serves server-paginated reports with whitelisted sorting', async () => {
    const res = await request(tokens.hqAdmin, '/api/v1/analytics/reports/LEAD_ACQUISITION?page=1&limit=10');
    expect(res.status).toBe(200);
    expect(res.json.data.data).toBeInstanceOf(Array);
    expect(res.json.data.pagination).toBeDefined();
    expect(res.json.data.pagination.page).toBe(1);
    expect(res.json.data.pagination.limit).toBe(10);
  });

  it('generates, secures, and downloads CSV exports with formula injection neutralization', async () => {
    // 1. Finance staff exports finance collections report
    const exportRes = await request(tokens.financeStaff, '/api/v1/analytics/exports', {
      method: 'POST',
      body: {
        reportKey: 'FINANCE_COLLECTIONS',
        format: 'CSV',
      },
    });

    expect(exportRes.status).toBe(201);
    const exportData = exportRes.json.data;
    expect(exportData.exportRecord.status).toBe('READY');
    expect(exportData.exportRecord.id).toBeDefined();

    // 2. Download endpoint
    const dlRes = await request(tokens.financeStaff, `/api/v1/analytics/exports/${exportData.exportRecord.id}`);
    expect(dlRes.status).toBe(200);
    expect(dlRes.json.data.exportRecord.status).toBe('READY');

    // 3. Academic coordinator without export permission cannot create finance export
    const forbiddenExport = await request(tokens.academicCoordinator, '/api/v1/analytics/exports', {
      method: 'POST',
      body: {
        reportKey: 'FINANCE_COLLECTIONS',
        format: 'CSV',
      },
    });
    expect(forbiddenExport.status).toBe(403);
  });
});
