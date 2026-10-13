import http from 'http';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  AuditLogModel,
  CertificateModel,
  CertificateSequenceModel,
  CourseModel,
  EnrollmentModel,
  OrganizationBrandingModel,
  OrganizationMemberModel,
  OrganizationStorageModel,
  SessionModel,
  TenantModel,
  UserModel,
  connectDatabase,
  disconnectDatabase
} from '@edtech/database';
import { signAccessToken } from '@edtech/utils';
import { createApp } from '../../app';
import { StorageProviderFactory } from '../storage/storageProviderFactory';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;

suite('Phase 13 Certificates HTTP Authorization & Public Verification Suite', () => {
  let server: http.Server;
  let port: number;

  const ids: Record<string, mongoose.Types.ObjectId> = {};
  const tokens: Record<string, string> = {};

  const request = (token: string | null, method: string, path: string, body?: unknown) =>
    new Promise<{ status: number; json: any; buffer: Buffer }>((resolve, reject) => {
      const payload = body === undefined ? undefined : Buffer.from(JSON.stringify(body));
      const headers: Record<string, string | number> = {};
      if (token) headers['authorization'] = `Bearer ${token}`;
      if (payload) {
        headers['content-type'] = 'application/json';
        headers['content-length'] = payload.length;
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
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            const buffer = Buffer.concat(chunks);
            const isJson = String(res.headers['content-type'] || '').includes('application/json');
            resolve({
              status: res.statusCode || 0,
              json: isJson && buffer.length ? JSON.parse(buffer.toString()) : undefined,
              buffer
            });
          });
        }
      );
      req.on('error', reject);
      req.end(payload);
    });

  async function createActor(
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
      email: `${label.toLowerCase()}@cert-http.local`,
      passwordHash: 'test',
      status: 'ACTIVE',
      emailVerified: true,
      isSuperAdmin: false,
      roles: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    if (role) {
      await OrganizationMemberModel.collection.insertOne({
        _id: new mongoose.Types.ObjectId(),
        tenantId,
        userId,
        role,
        status: 'ACTIVE',
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await SessionModel.collection.insertOne({
      _id: sessionId,
      userId,
      tenantId,
      activeTenantId: tenantId,
      currentRefreshTokenHash: 'test',
      tokenVersion: 1,
      lastUsedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600_000),
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
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
      CertificateModel,
      CertificateSequenceModel,
      EnrollmentModel,
      CourseModel,
      OrganizationMemberModel,
      SessionModel,
      UserModel,
      TenantModel,
      AuditLogModel,
      OrganizationStorageModel,
      OrganizationBrandingModel
    ]) {
      await m.collection.deleteMany({});
    }

    await Promise.all([
      CertificateModel.syncIndexes(),
      CertificateSequenceModel.syncIndexes(),
      EnrollmentModel.syncIndexes()
    ]);

    ids.tenantA = new mongoose.Types.ObjectId();
    ids.tenantB = new mongoose.Types.ObjectId();

    await TenantModel.collection.insertMany([
      { _id: ids.tenantA, name: 'Cert Tenant A', slug: 'cert-tenant-a' },
      { _id: ids.tenantB, name: 'Cert Tenant B', slug: 'cert-tenant-b' }
    ]);

    await OrganizationStorageModel.collection.insertMany([
      { tenantId: ids.tenantA, provider: 'LOCAL', status: 'CONNECTED', isEnabled: true },
      { tenantId: ids.tenantB, provider: 'LOCAL', status: 'CONNECTED', isEnabled: true }
    ]);

    await OrganizationBrandingModel.collection.insertMany([
      { tenantId: ids.tenantA, organizationName: 'Academy A Official' },
      { tenantId: ids.tenantB, organizationName: 'Academy B Tech' }
    ]);

    await createActor('AdminA', ids.tenantA, 'TENANT_ADMIN');
    await createActor('StaffWithoutPermsA', ids.tenantA); // No role/perms
    await createActor('StudentA1', ids.tenantA, 'STUDENT');
    await createActor('StudentA2', ids.tenantA, 'STUDENT');

    await createActor('AdminB', ids.tenantB, 'TENANT_ADMIN');
    await createActor('StudentB1', ids.tenantB, 'STUDENT');

    // Create course and completed enrollment for Tenant A
    ids.courseA = new mongoose.Types.ObjectId();
    await CourseModel.collection.insertOne({
      _id: ids.courseA,
      tenantId: ids.tenantA,
      title: 'Fullstack Professional',
      slug: 'fullstack-pro',
      status: 'PUBLISHED',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    ids.enrollmentA1 = new mongoose.Types.ObjectId();
    await EnrollmentModel.collection.insertOne({
      _id: ids.enrollmentA1,
      tenantId: ids.tenantA,
      studentId: ids.StudentA1,
      courseId: ids.courseA,
      status: 'COMPLETED',
      progressPercent: 100,
      completedAt: new Date('2026-09-01T00:00:00Z'),
      enrolledAt: new Date('2026-08-01T00:00:00Z'),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    server = createApp().listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    port = (server.address() as any).port;
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      );
    }
    await disconnectDatabase();
  });

  it('1. Tenant Admin A can inspect eligibility and issue certificate', async () => {
    // Inspect eligibility
    const elRes = await request(
      tokens.AdminA,
      'GET',
      `/api/v1/certificates/eligibility?enrollmentId=${ids.enrollmentA1}`
    );
    expect(elRes.status).toBe(200);
    expect(elRes.json.data.eligible).toBe(true);

    // Issue certificate
    const issueRes = await request(tokens.AdminA, 'POST', '/api/v1/certificates', {
      enrollmentId: ids.enrollmentA1.toString()
    });
    expect(issueRes.status).toBe(201);
    expect(issueRes.json.data.status).toBe('ISSUED');
    expect(issueRes.json.data.certificateNumber).toMatch(/^CERT-2026-\d{6}$/);

    ids.issuedCertId = issueRes.json.data.id;
    ids.issuedCertCode = issueRes.json.data.verificationCode;
  });

  it('2. Staff without certificate permissions is denied 403 Forbidden on admin certificate endpoints', async () => {
    const res = await request(tokens.StaffWithoutPermsA, 'GET', '/api/v1/certificates');
    expect(res.status).toBe(403);
  });

  it('2a. Tenant Admin can list, download, and idempotently retry the issued artifact', async () => {
    const listRes = await request(tokens.AdminA, 'GET', '/api/v1/certificates');
    expect(listRes.status).toBe(200);
    expect(listRes.json.data.data.some((item: any) => item.id === ids.issuedCertId)).toBe(true);
    const downloadRes = await request(tokens.AdminA, 'GET', `/api/v1/certificates/${ids.issuedCertId}/download`);
    expect(downloadRes.status).toBe(200);
    expect(downloadRes.buffer.subarray(0, 8).toString()).toBe('%PDF-1.4');
    const retryRes = await request(tokens.AdminA, 'POST', `/api/v1/certificates/${ids.issuedCertId}/artifact/retry`);
    expect(retryRes.status).toBe(200);
    expect(retryRes.json.data.id).toBe(ids.issuedCertId);
    expect(retryRes.json.data.verificationCode).toBe(ids.issuedCertCode.toString());
    expect(retryRes.json.data.artifact.status).toBe('READY');
  });

  it('3. Student A1 can list and download their own issued certificate', async () => {
    const listRes = await request(tokens.StudentA1, 'GET', '/api/v1/student/certificates');
    expect(listRes.status).toBe(200);
    expect(listRes.json.data.length).toBeGreaterThan(0);
    expect(listRes.json.data[0].student.name).toBe('StudentA1');
  });

  it('4. Student A2 (same tenant) cannot download Student A1 certificate', async () => {
    const storageSpy = vi.spyOn(StorageProviderFactory, 'getTenantStorageProviderByProvider');
    const dlRes = await request(
      tokens.StudentA2,
      'GET',
      `/api/v1/student/certificates/${ids.issuedCertId}/download`
    );
    expect(dlRes.status).toBe(404);
    expect(storageSpy).not.toHaveBeenCalled();
    storageSpy.mockRestore();
  });

  it('4a. Student cannot invoke certificate administration operations', async () => {
    const listRes = await request(tokens.StudentA1, 'GET', '/api/v1/certificates');
    const revokeRes = await request(tokens.StudentA1, 'POST', `/api/v1/certificates/${ids.issuedCertId}/revoke`, { reason: 'not authorized' });
    expect(listRes.status).toBe(403);
    expect(revokeRes.status).toBe(403);
  });

  it('5. Tenant B admin cannot list, download, or revoke Tenant A certificate', async () => {
    const storageSpy = vi.spyOn(StorageProviderFactory, 'getTenantStorageProviderByProvider');
    const downloadRes = await request(tokens.AdminB, 'GET', `/api/v1/certificates/${ids.issuedCertId}/download`);
    const revokeRes = await request(
      tokens.AdminB,
      'POST',
      `/api/v1/certificates/${ids.issuedCertId}/revoke`,
      { reason: 'Cross-tenant attack attempt' }
    );
    expect(downloadRes.status).toBe(404);
    expect(revokeRes.status).toBe(404);
    expect(storageSpy).not.toHaveBeenCalled();
    storageSpy.mockRestore();
  });

  it('6. Public unauthenticated verification verifies valid certificate and leaks no private fields', async () => {
    const pubRes = await request(
      null,
      'GET',
      `/api/v1/public/certificates/verify/${ids.issuedCertCode}`
    );
    expect(pubRes.status).toBe(200);
    expect(pubRes.json.data.valid).toBe(true);
    expect(pubRes.json.data.studentName).toBe('StudentA1');
    expect(pubRes.json.data.courseTitle).toBe('Fullstack Professional');
    expect(pubRes.json.data.organizationName).toBe('Academy A Official');

    // Leak test
    expect(pubRes.json.data.tenantId).toBeUndefined();
    expect(pubRes.json.data.studentId).toBeUndefined();
    expect(pubRes.json.data.enrollmentId).toBeUndefined();
    expect(pubRes.json.data.storageKey).toBeUndefined();
  });

  it('7. Tenant Admin A revokes certificate and public verification immediately reflects REVOKED status', async () => {
    const revokeRes = await request(
      tokens.AdminA,
      'POST',
      `/api/v1/certificates/${ids.issuedCertId}/revoke`,
      { reason: 'Honor code violation after investigation' }
    );
    expect(revokeRes.status).toBe(200);
    expect(revokeRes.json.data.status).toBe('REVOKED');

    const pubRes = await request(
      null,
      'GET',
      `/api/v1/public/certificates/verify/${ids.issuedCertCode}`
    );
    expect(pubRes.status).toBe(200);
    expect(pubRes.json.data.valid).toBe(false);
    expect(pubRes.json.data.status).toBe('REVOKED');
  });

  it('8. Public verification of non-existent code returns safe 404', async () => {
    const nonExistentCode = 'non_existent_code_123456789012345678901234567890';
    const pubRes = await request(
      null,
      'GET',
      `/api/v1/public/certificates/verify/${nonExistentCode}`
    );
    expect(pubRes.status).toBe(404);
  });
});
