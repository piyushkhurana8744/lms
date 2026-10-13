import http from 'http';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  AttendanceCorrectionModel, AttendanceRecordModel, AttendanceSessionModel, AuditLogModel,
  BatchModel, ClassModel, OrganizationMemberModel, SessionModel, TenantModel, UserModel,
  connectDatabase, disconnectDatabase
} from '@edtech/database';
import { signAccessToken } from '@edtech/utils';
import { createApp } from '../../app';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;

suite('Phase 12 attendance HTTP authorization and lifecycle', () => {
  let server: http.Server; let port: number;
  const ids: Record<string, mongoose.Types.ObjectId> = {};
  const tokens: Record<string, string> = {};

  const request = (token: string, method: string, path: string, body?: unknown) => new Promise<{ status: number; json: any }>((resolve, reject) => {
    const payload = body === undefined ? undefined : Buffer.from(JSON.stringify(body));
    const req = http.request({ hostname: '127.0.0.1', port, path, method, headers: { authorization: `Bearer ${token}`, ...(payload ? { 'content-type': 'application/json', 'content-length': payload.length } : {}) } }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => { const raw = Buffer.concat(chunks).toString(); resolve({ status: res.statusCode || 0, json: raw ? JSON.parse(raw) : undefined }); });
    });
    req.on('error', reject); req.end(payload);
  });

  async function actor(label: string, tenantId: mongoose.Types.ObjectId, role?: 'TENANT_ADMIN' | 'INSTRUCTOR' | 'STUDENT') {
    const userId = new mongoose.Types.ObjectId(), sessionId = new mongoose.Types.ObjectId();
    await UserModel.collection.insertOne({ _id: userId, tenantId, allowedTenantIds: [tenantId], name: label, email: `${label.toLowerCase()}@attendance-http.local`, passwordHash: 'test', status: 'ACTIVE', emailVerified: true, isSuperAdmin: false, roles: [], createdAt: new Date(), updatedAt: new Date() });
    if (role) await OrganizationMemberModel.collection.insertOne({ _id: new mongoose.Types.ObjectId(), tenantId, userId, role, status: 'ACTIVE', joinedAt: new Date(), createdAt: new Date(), updatedAt: new Date() });
    await SessionModel.collection.insertOne({ _id: sessionId, userId, tenantId, activeTenantId: tenantId, currentRefreshTokenHash: 'test', tokenVersion: 1, lastUsedAt: new Date(), expiresAt: new Date(Date.now() + 3600_000), revokedAt: null, createdAt: new Date(), updatedAt: new Date() });
    ids[label] = userId; tokens[label] = signAccessToken({ sub: userId.toString(), sessionId: sessionId.toString(), tenantId: tenantId.toString(), tokenVersion: 1 });
  }

  async function academicFixture(label: string, tenantId: mongoose.Types.ObjectId, instructorId: mongoose.Types.ObjectId, students: mongoose.Types.ObjectId[], status = 'ACTIVE') {
    const batchId = new mongoose.Types.ObjectId(), classId = new mongoose.Types.ObjectId();
    await BatchModel.collection.insertOne({ _id: batchId, tenantId, name: `Batch ${label}`, batchCode: `HTTP-B-${label}`, instructorId, mode: 'OFFLINE', status: 'ONGOING', startDate: new Date('2026-09-01'), timing: { startTime: '09:00', endTime: '10:00', timezone: 'Asia/Kolkata' }, daysOfWeek: ['THURSDAY'], maxSeats: 30, enrolledCount: students.length, showOnWebsite: false, createdAt: new Date(), updatedAt: new Date() });
    await ClassModel.collection.insertOne({ _id: classId, tenantId, name: `Class ${label}`, classCode: `HTTP-C-${label}`, batchId, instructorId, mode: 'OFFLINE', capacity: 30, enrolledCount: students.length, enrolledStudents: students.map((studentId, index) => ({ studentId, studentName: `Student ${label}-${index + 1}`, studentEmail: `${label}-${index + 1}@test.local`, enrolledAt: new Date('2026-09-01'), status: 'ENROLLED' })), status, startDate: new Date('2026-09-10T09:00:00Z'), timing: { startTime: '09:00', endTime: '10:00', timezone: 'Asia/Kolkata' }, daysOfWeek: ['THURSDAY'], showOnWebsite: false, classroomDetails: { branch: 'South' }, createdAt: new Date(), updatedAt: new Date() });
    return { batchId, classId };
  }

  beforeAll(async () => {
    await connectDatabase(process.env.MONGO_INTEGRATION_URI || 'mongodb://127.0.0.1:27017/edtech_lms_test?replicaSet=rs0&directConnection=true');
    for (const model of [AttendanceCorrectionModel, AttendanceRecordModel, AttendanceSessionModel, AuditLogModel, ClassModel, BatchModel, OrganizationMemberModel, SessionModel, UserModel, TenantModel]) await model.collection.deleteMany({});
    await Promise.all([AttendanceSessionModel.syncIndexes(), AttendanceRecordModel.syncIndexes(), AttendanceCorrectionModel.syncIndexes()]);
    ids.tenantA = new mongoose.Types.ObjectId(); ids.tenantB = new mongoose.Types.ObjectId();
    await TenantModel.collection.insertMany([{ _id: ids.tenantA, name: 'HTTP Tenant A', slug: 'attendance-http-a' }, { _id: ids.tenantB, name: 'HTTP Tenant B', slug: 'attendance-http-b' }]);
    await actor('AdminA', ids.tenantA, 'TENANT_ADMIN'); await actor('InstructorA', ids.tenantA, 'INSTRUCTOR'); await actor('InstructorA2', ids.tenantA, 'INSTRUCTOR'); await actor('StaffA', ids.tenantA); await actor('StudentA1', ids.tenantA, 'STUDENT'); await actor('StudentA2', ids.tenantA, 'STUDENT');
    await actor('AdminB', ids.tenantB, 'TENANT_ADMIN'); await actor('InstructorB', ids.tenantB, 'INSTRUCTOR'); await actor('StudentB1', ids.tenantB, 'STUDENT');
    Object.assign(ids, Object.fromEntries(Object.entries(await academicFixture('A', ids.tenantA, ids.InstructorA, [ids.StudentA1, ids.StudentA2])).map(([k, v]) => [`a${k}`, v])));
    Object.assign(ids, Object.fromEntries(Object.entries(await academicFixture('A2', ids.tenantA, ids.InstructorA2, [ids.StudentA2])).map(([k, v]) => [`a2${k}`, v])));
    Object.assign(ids, Object.fromEntries(Object.entries(await academicFixture('B', ids.tenantB, ids.InstructorB, [ids.StudentB1])).map(([k, v]) => [`b${k}`, v])));
    server = createApp().listen(0, '127.0.0.1'); await new Promise<void>((resolve) => server.once('listening', resolve)); port = (server.address() as any).port;
  });

  afterAll(async () => { if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); await disconnectDatabase(); });

  it('enforces the JWT/session RBAC matrix, assignment, student ownership, and tenant isolation', async () => {
    const openedA = await request(tokens.InstructorA, 'POST', `/api/v1/attendance/classes/${ids.aclassId}/open`); expect(openedA.status).toBe(201);
    const openedB = await request(tokens.AdminB, 'POST', `/api/v1/attendance/classes/${ids.bclassId}/open`); expect(openedB.status).toBe(201);
    ids.aSession = new mongoose.Types.ObjectId(openedA.json.data.session.id); ids.bSession = new mongoose.Types.ObjectId(openedB.json.data.session.id);
    expect((await request(tokens.InstructorA, 'GET', `/api/v1/attendance/classes/${ids.aclassId}`)).status).toBe(200);
    expect((await request(tokens.InstructorA, 'GET', `/api/v1/attendance/classes/${ids.a2classId}`)).status).toBe(403);
    expect((await request(tokens.InstructorA, 'GET', `/api/v1/attendance/classes/${ids.bclassId}`)).status).toBe(404);
    for (const [method, path, body] of [
      ['GET', `/api/v1/attendance/classes/${ids.aclassId}`], ['POST', `/api/v1/attendance/classes/${ids.aclassId}/open`],
      ['PUT', `/api/v1/attendance/sessions/${ids.aSession}/records`, { records: [{ studentId: ids.StudentA1.toString(), status: 'PRESENT' }] }],
      ['POST', `/api/v1/attendance/sessions/${ids.aSession}/finalize`], ['GET', `/api/v1/attendance/batches/${ids.abatchId}/analytics`]
    ] as any[]) expect((await request(tokens.StaffA, method, path, body)).status).toBe(403);
    expect((await request(tokens.StudentA1, 'GET', `/api/v1/student/attendance/summary?studentId=${ids.StudentA2}`)).status).toBe(200);
    expect((await request(tokens.StudentA1, 'GET', `/api/v1/student/attendance/history?studentId=${ids.StudentA2}`)).status).toBe(200);
    for (const [method, path, body] of [['GET', `/api/v1/attendance/classes/${ids.aclassId}`], ['POST', `/api/v1/attendance/classes/${ids.aclassId}/open`], ['PUT', `/api/v1/attendance/sessions/${ids.aSession}/records`, { records: [{ studentId: ids.StudentA1.toString(), status: 'PRESENT' }] }], ['POST', `/api/v1/attendance/sessions/${ids.aSession}/finalize`], ['GET', `/api/v1/attendance/batches/${ids.abatchId}/analytics`]] as any[]) expect((await request(tokens.StudentA1, method, path, body)).status).toBe(403);
    const bBefore = await AttendanceSessionModel.collection.findOne({ _id: ids.bSession });
    for (const [method, path, body] of [['GET', `/api/v1/attendance/classes/${ids.bclassId}`], ['POST', `/api/v1/attendance/classes/${ids.bclassId}/open`], ['PUT', `/api/v1/attendance/sessions/${ids.bSession}/records`, { records: [{ studentId: ids.StudentB1.toString(), status: 'PRESENT' }] }], ['POST', `/api/v1/attendance/sessions/${ids.bSession}/finalize`], ['GET', `/api/v1/attendance/batches/${ids.bbatchId}/analytics`]] as any[]) expect([400, 404]).toContain((await request(tokens.AdminA, method, path, body)).status);
    expect(await AttendanceSessionModel.collection.findOne({ _id: ids.bSession })).toEqual(bBefore);
    expect(await AttendanceRecordModel.collection.countDocuments({ attendanceSessionId: ids.bSession, status: { $exists: true } })).toBe(0);
  });

  it('proves HTTP bulk atomicity, finalized lifecycle enforcement, correction, and analytics', async () => {
    const adminOpened = await request(tokens.AdminA, 'POST', `/api/v1/attendance/classes/${ids.a2classId}/open`); expect(adminOpened.status).toBe(201);
    const adminSessionId = adminOpened.json.data.session.id; expect((await request(tokens.AdminA, 'GET', `/api/v1/attendance/classes/${ids.a2classId}`)).status).toBe(200);
    expect((await request(tokens.AdminA, 'PUT', `/api/v1/attendance/sessions/${adminSessionId}/records`, { records: [{ studentId: ids.StudentA2.toString(), status: 'ABSENT' }] })).status).toBe(200);
    expect((await request(tokens.AdminA, 'POST', `/api/v1/attendance/sessions/${adminSessionId}/finalize`)).status).toBe(200);
    const adminRecord: any = await AttendanceRecordModel.collection.findOne({ attendanceSessionId: new mongoose.Types.ObjectId(adminSessionId) });
    expect((await request(tokens.AdminA, 'POST', `/api/v1/attendance/records/${adminRecord._id}/correct`, { status: 'PRESENT', reason: 'Admin verified register' })).status).toBe(200);
    expect((await request(tokens.AdminA, 'GET', `/api/v1/attendance/batches/${ids.a2batchId}/analytics`)).status).toBe(200);
    const mixed = await request(tokens.AdminA, 'PUT', `/api/v1/attendance/sessions/${ids.aSession}/records`, { records: [{ studentId: ids.StudentA1.toString(), status: 'ABSENT' }, { studentId: ids.StudentB1.toString(), status: 'PRESENT' }] });
    expect(mixed.status).toBe(400); expect(await AttendanceRecordModel.collection.countDocuments({ attendanceSessionId: ids.aSession, status: { $exists: true } })).toBe(0);
    const mark = await request(tokens.InstructorA, 'PUT', `/api/v1/attendance/sessions/${ids.aSession}/records`, { records: [{ studentId: ids.StudentA1.toString(), status: 'ABSENT' }, { studentId: ids.StudentA2.toString(), status: 'PRESENT' }] }); expect(mark.status).toBe(200);
    expect((await request(tokens.InstructorA, 'POST', `/api/v1/attendance/sessions/${ids.aSession}/finalize`)).status).toBe(200);
    expect((await request(tokens.AdminA, 'PUT', `/api/v1/attendance/sessions/${ids.aSession}/records`, { records: [{ studentId: ids.StudentA1.toString(), status: 'PRESENT' }] })).status).toBe(409);
    expect((await request(tokens.AdminA, 'POST', `/api/v1/attendance/sessions/${ids.aSession}/mark-all-present`)).status).toBe(409);
    const record: any = await AttendanceRecordModel.collection.findOne({ attendanceSessionId: ids.aSession, studentId: ids.StudentA1 }); ids.aRecord = record._id;
    const corrected = await request(tokens.InstructorA, 'POST', `/api/v1/attendance/records/${record._id}/correct`, { status: 'PRESENT', reason: 'Verified classroom register', idempotencyKey: 'http-correction-a1' }); expect(corrected.status).toBe(200);
    expect((await request(tokens.AdminA, 'GET', `/api/v1/attendance/sessions/${ids.aSession}/history`)).status).toBe(200);
    expect((await request(tokens.AdminA, 'GET', `/api/v1/attendance/batches/${ids.abatchId}/analytics?threshold=101`)).status).toBe(400);
    const analytics = await request(tokens.AdminA, 'GET', `/api/v1/attendance/batches/${ids.abatchId}/analytics?threshold=100`); expect(analytics.status).toBe(200); expect(analytics.json.data.totals.present).toBe(2);
    const summary = await request(tokens.StudentA1, 'GET', '/api/v1/student/attendance/summary'); expect(summary.status).toBe(200); expect(summary.json.data.attendancePercentage).toBe(100);
    const aBefore = await AttendanceRecordModel.collection.findOne({ _id: record._id });
    expect((await request(tokens.AdminB, 'POST', `/api/v1/attendance/records/${record._id}/correct`, { status: 'ABSENT', reason: 'Cross tenant attempt' })).status).toBe(404);
    expect(await AttendanceRecordModel.collection.findOne({ _id: record._id })).toEqual(aBefore);
  });

  it('rejects cancelled-class HTTP operations while preserving records', async () => {
    const fixture = await academicFixture('CANCEL', ids.tenantA, ids.InstructorA, [ids.StudentA1]);
    const opened = await request(tokens.AdminA, 'POST', `/api/v1/attendance/classes/${fixture.classId}/open`); expect(opened.status).toBe(201);
    const sessionId = opened.json.data.session.id; const before = await AttendanceRecordModel.collection.find({ attendanceSessionId: new mongoose.Types.ObjectId(sessionId) }).toArray();
    await ClassModel.collection.updateOne({ _id: fixture.classId }, { $set: { status: 'CANCELLED' } });
    expect((await request(tokens.AdminA, 'POST', `/api/v1/attendance/classes/${fixture.classId}/open`)).status).toBe(409);
    expect((await request(tokens.AdminA, 'PUT', `/api/v1/attendance/sessions/${sessionId}/records`, { records: [{ studentId: ids.StudentA1.toString(), status: 'PRESENT' }] })).status).toBe(409);
    expect((await request(tokens.AdminA, 'POST', `/api/v1/attendance/sessions/${sessionId}/finalize`)).status).toBe(409);
    expect(await AttendanceRecordModel.collection.find({ attendanceSessionId: new mongoose.Types.ObjectId(sessionId) }).toArray()).toEqual(before);
  });

  it('keeps one attendance identity and historical roster after rescheduling', async () => {
    const fixture = await academicFixture('MOVE', ids.tenantA, ids.InstructorA, [ids.StudentA1]);
    const first = await request(tokens.AdminA, 'POST', `/api/v1/attendance/classes/${fixture.classId}/open`); expect(first.status).toBe(201);
    await ClassModel.collection.updateOne({ _id: fixture.classId }, { $set: { startDate: new Date('2026-11-20') }, $push: { enrolledStudents: { studentId: ids.StudentA2, studentName: 'Late student', studentEmail: 'late@test.local', enrolledAt: new Date('2026-11-01'), status: 'ENROLLED' } } as any });
    const second = await request(tokens.AdminA, 'POST', `/api/v1/attendance/classes/${fixture.classId}/open`); expect(second.status).toBe(201);
    expect(second.json.data.session.id).toBe(first.json.data.session.id); expect(second.json.data.records).toHaveLength(1);
    expect(await AttendanceSessionModel.collection.countDocuments({ classId: fixture.classId })).toBe(1);
  });
});
