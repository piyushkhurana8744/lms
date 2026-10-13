import http from 'http';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  AcademicCalendarModel, AcademicRoomModel, AttendanceSessionModel,
  BatchModel, BranchModel, CalendarExceptionModel, ClassModel, CourseModel, EnrollmentModel,
  OrganizationMemberModel, SchedulingMutexModel, SessionModel, TenantModel,
  TimetableModel, UserModel, connectDatabase, disconnectDatabase
} from '@edtech/database';
import { PERMISSIONS } from '@edtech/permissions';
import { signAccessToken } from '@edtech/utils';
import { createApp } from '../../app';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;

suite('Phase 15 academic scheduling HTTP authorization and attack matrix', () => {
  let server: http.Server;
  let port: number;
  const ids: Record<string, mongoose.Types.ObjectId> = {};
  const tokens: Record<string, string> = {};

  const request = (token: string, method: string, path: string, body?: unknown) => new Promise<{ status: number; json: any }>((resolve, reject) => {
    const payload = body === undefined ? undefined : Buffer.from(JSON.stringify(body));
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(payload ? { 'content-type': 'application/json', 'content-length': payload.length } : {})
      }
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        resolve({ status: res.statusCode || 0, json: raw ? JSON.parse(raw) : undefined });
      });
    });
    req.on('error', reject);
    req.end(payload);
  });

  async function actor(label: string, tenantId: mongoose.Types.ObjectId, role?: 'TENANT_ADMIN' | 'INSTRUCTOR' | 'STUDENT') {
    const userId = new mongoose.Types.ObjectId(), sessionId = new mongoose.Types.ObjectId();
    await UserModel.collection.insertOne({
      _id: userId,
      tenantId,
      allowedTenantIds: [tenantId],
      name: label,
      email: `${label.toLowerCase()}@sched-http.local`,
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
        branchAccessMode: role === 'TENANT_ADMIN' ? 'ALL' : 'SELECTED',
        branchIds: [],
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
    tokens[label] = signAccessToken({ sub: userId.toString(), sessionId: sessionId.toString(), tenantId: tenantId.toString(), tokenVersion: 1 });
  }

  beforeAll(async () => {
    await connectDatabase(process.env.MONGO_INTEGRATION_URI || 'mongodb://127.0.0.1:27017/edtech_lms_test?replicaSet=rs0&directConnection=true');
    for (const m of [
      AcademicCalendarModel, CalendarExceptionModel, AcademicRoomModel,
      TimetableModel, ClassModel, AttendanceSessionModel, BatchModel,
      CourseModel, EnrollmentModel, OrganizationMemberModel, SessionModel,
      UserModel, BranchModel, TenantModel, SchedulingMutexModel
    ]) {
      await m.collection.deleteMany({});
    }

    ids.tenantA = new mongoose.Types.ObjectId();
    ids.tenantB = new mongoose.Types.ObjectId();
    await TenantModel.collection.insertMany([
      { _id: ids.tenantA, name: 'HTTP Sched Tenant A', slug: 'sched-http-a' },
      { _id: ids.tenantB, name: 'HTTP Sched Tenant B', slug: 'sched-http-b' }
    ]);

    await actor('AdminA', ids.tenantA, 'TENANT_ADMIN');
    await actor('InstructorA', ids.tenantA, 'INSTRUCTOR');
    await actor('StudentA', ids.tenantA, 'STUDENT');

    await actor('AdminB', ids.tenantB, 'TENANT_ADMIN');
    await actor('InstructorB', ids.tenantB, 'INSTRUCTOR');
    await actor('StudentB', ids.tenantB, 'STUDENT');

    ids.branchA = new mongoose.Types.ObjectId();
    ids.branchB = new mongoose.Types.ObjectId();
    await BranchModel.collection.insertMany([
      { _id: ids.branchA, tenantId: ids.tenantA, code: 'A', slug: 'a', name: 'Branch A', status: 'ACTIVE', timezone: 'Asia/Kolkata', isPrimary: true, revision: 0 },
      { _id: ids.branchB, tenantId: ids.tenantB, code: 'B', slug: 'b', name: 'Branch B', status: 'ACTIVE', timezone: 'Asia/Kolkata', isPrimary: true, revision: 0 }
    ]);
    await OrganizationMemberModel.updateMany({ tenantId: ids.tenantA, role: { $ne: 'TENANT_ADMIN' } }, { $set: { branchIds: [ids.branchA] } });
    await OrganizationMemberModel.updateMany({ tenantId: ids.tenantB, role: { $ne: 'TENANT_ADMIN' } }, { $set: { branchIds: [ids.branchB] } });

    ids.courseA = new mongoose.Types.ObjectId();
    ids.courseB = new mongoose.Types.ObjectId();
    await CourseModel.collection.insertMany([
      { _id: ids.courseA, tenantId: ids.tenantA, title: 'Course A', slug: 'course-a', status: 'PUBLISHED' },
      { _id: ids.courseB, tenantId: ids.tenantB, title: 'Course B', slug: 'course-b', status: 'PUBLISHED' }
    ]);

    ids.batchA = new mongoose.Types.ObjectId();
    ids.batchB = new mongoose.Types.ObjectId();
    await BatchModel.collection.insertMany([
      {
        _id: ids.batchA, tenantId: ids.tenantA, branchId: ids.branchA, name: 'Batch A', batchCode: 'B-A',
        courseId: ids.courseA, instructorId: ids.InstructorA, mode: 'ONLINE', status: 'ONGOING',
        startDate: new Date('2026-10-01'), endDate: new Date('2026-11-30'),
        timing: { startTime: '10:00', endTime: '11:00', timezone: 'Asia/Kolkata' },
        daysOfWeek: ['MONDAY'], maxSeats: 30, enrolledCount: 1, showOnWebsite: false
      },
      {
        _id: ids.batchB, tenantId: ids.tenantB, branchId: ids.branchB, name: 'Batch B', batchCode: 'B-B',
        courseId: ids.courseB, instructorId: ids.InstructorB, mode: 'ONLINE', status: 'ONGOING',
        startDate: new Date('2026-10-01'), endDate: new Date('2026-11-30'),
        timing: { startTime: '10:00', endTime: '11:00', timezone: 'Asia/Kolkata' },
        daysOfWeek: ['MONDAY'], maxSeats: 30, enrolledCount: 1, showOnWebsite: false
      }
    ]);

    await EnrollmentModel.collection.insertMany([
      { tenantId: ids.tenantA, studentId: ids.StudentA, courseId: ids.courseA, status: 'ACTIVE', enrolledAt: new Date(), progressPercent: 0, completedLessons: 0, totalLessons: 0 },
      { tenantId: ids.tenantB, studentId: ids.StudentB, courseId: ids.courseB, status: 'ACTIVE', enrolledAt: new Date(), progressPercent: 0, completedLessons: 0, totalLessons: 0 }
    ]);

    server = createApp().listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    port = (server.address() as any).port;
  });

  afterAll(async () => {
    if (server) await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
    await disconnectDatabase();
  });

  it('allows Tenant Admin to create calendar, room, timetable, and publish', async () => {
    const calRes = await request(tokens.AdminA, 'POST', '/api/v1/academic-calendars', {
      name: 'Calendar A',
      timezone: 'Asia/Kolkata',
      startDate: '2026-10-01',
      endDate: '2026-11-30',
      workingDays: [1, 2, 3, 4, 5]
    });
    expect(calRes.status).toBe(201);
    ids.calendarA = new mongoose.Types.ObjectId(calRes.json.data._id);

    const roomRes = await request(tokens.AdminA, 'POST', '/api/v1/academic-rooms', {
      name: 'Lab 101',
      code: 'L101',
      branchId: ids.branchA.toString(),
      capacity: 25
    });
    expect(roomRes.status).toBe(201);
    ids.roomA = new mongoose.Types.ObjectId(roomRes.json.data._id);

    const ttRes = await request(tokens.AdminA, 'POST', '/api/v1/timetables', {
      batchId: ids.batchA.toString(),
      calendarId: ids.calendarA.toString(),
      name: 'TT Batch A',
      timezone: 'Asia/Kolkata',
      effectiveFrom: '2026-10-01',
      effectiveTo: '2026-11-30',
      slots: [{
        dayOfWeek: 1,
        localStartTime: '10:00',
        localEndTime: '11:00',
        instructorId: ids.InstructorA.toString(),
        mode: 'OFFLINE',
        roomId: ids.roomA.toString()
      }]
    });
    expect(ttRes.status).toBe(201);
    ids.timetableA = new mongoose.Types.ObjectId(ttRes.json.data._id);

    const pubRes = await request(tokens.AdminA, 'POST', `/api/v1/timetables/${ids.timetableA}/publish`, {
      expectedRevision: 0
    });
    expect(pubRes.status).toBe(200);
    expect(pubRes.json.data.status).toBe('PUBLISHED');
  });

  it('prevents students and instructors from publishing or managing timetables without permissions', async () => {
    const pubRes = await request(tokens.StudentA, 'POST', `/api/v1/timetables/${ids.timetableA}/publish`, { expectedRevision: 0 });
    expect(pubRes.status).toBe(403);

    const instPubRes = await request(tokens.InstructorA, 'POST', `/api/v1/timetables/${ids.timetableA}/publish`, { expectedRevision: 0 });
    expect(instPubRes.status).toBe(403);

    const ttCreateRes = await request(tokens.StudentA, 'POST', '/api/v1/timetables', {
      batchId: ids.batchA.toString(),
      calendarId: ids.calendarA.toString(),
      name: 'Hacked',
      timezone: 'Asia/Kolkata',
      effectiveFrom: '2026-10-01',
      effectiveTo: '2026-11-30',
      slots: []
    });
    expect(ttCreateRes.status).toBe(403);
  });

  it('serves student and instructor self calendars based strictly on auth identity', async () => {
    const studentRes = await request(tokens.StudentA, 'GET', '/api/v1/student/calendar?from=2026-10-01T00:00:00Z&to=2026-11-30T23:59:59Z');
    expect(studentRes.status).toBe(200);
    expect(studentRes.json.data.length).toBeGreaterThan(0);
    expect(studentRes.json.data.every((c: any) => c.courseId === ids.courseA.toString())).toBe(true);

    const instRes = await request(tokens.InstructorA, 'GET', '/api/v1/instructor/calendar?from=2026-10-01T00:00:00Z&to=2026-11-30T23:59:59Z');
    expect(instRes.status).toBe(200);
    expect(instRes.json.data.length).toBeGreaterThan(0);
    expect(instRes.json.data.every((c: any) => c.instructorId._id === ids.InstructorA.toString())).toBe(true);
  });

  it('enforces strict cross-tenant isolation and prevents resource substitution attacks', async () => {
    // Tenant B admin attempts to view Tenant A timetables
    const bViewRes = await request(tokens.AdminB, 'GET', '/api/v1/timetables');
    expect(bViewRes.status).toBe(200);
    expect(bViewRes.json.data).toHaveLength(0); // Cannot see Tenant A's timetable

    // Tenant B admin attempts to publish Tenant A's timetable
    const bPubRes = await request(tokens.AdminB, 'POST', `/api/v1/timetables/${ids.timetableA}/publish`, { expectedRevision: 0 });
    expect([404, 409]).toContain(bPubRes.status);

    // Tenant B admin attempts to schedule with Tenant A's instructor or room
    const badCal = await request(tokens.AdminB, 'POST', '/api/v1/academic-calendars', {
      name: 'Cal B', timezone: 'Asia/Kolkata', startDate: '2026-10-01', endDate: '2026-11-30', workingDays: [1, 2]
    });
    expect(badCal.status).toBe(201);
    const calBId = badCal.json.data._id;

    const attackTT = await request(tokens.AdminB, 'POST', '/api/v1/timetables', {
      batchId: ids.batchB.toString(),
      calendarId: calBId,
      name: 'Attack TT',
      timezone: 'Asia/Kolkata',
      effectiveFrom: '2026-10-01',
      effectiveTo: '2026-11-30',
      slots: [{
        dayOfWeek: 1,
        localStartTime: '10:00',
        localEndTime: '11:00',
        instructorId: ids.InstructorA.toString(), // Tenant A instructor!
        mode: 'ONLINE',
        meetingUrl: 'https://meet.example.test/att'
      }]
    });
    expect(attackTT.status).toBe(404); // Eligible instructor not found in Tenant B

    // Tenant B student querying calendar sees nothing from Tenant A
    const bStudentRes = await request(tokens.StudentB, 'GET', '/api/v1/student/calendar?from=2026-10-01T00:00:00Z&to=2026-11-30T23:59:59Z');
    expect(bStudentRes.status).toBe(200);
    expect(bStudentRes.json.data.every((c: any) => c.courseId !== ids.courseA.toString())).toBe(true);
  });

  it('supports canonical rescheduling and cancellation via HTTP', async () => {
    const listRes = await request(tokens.AdminA, 'GET', '/api/v1/academic-calendar/classes?from=2026-10-01T00:00:00Z&to=2026-11-30T23:59:59Z');
    expect(listRes.status).toBe(200);
    const targetClass = listRes.json.data[0];

    const nextStart = new Date(new Date(targetClass.scheduledStartAt).getTime() + 7200000);
    const nextEnd = new Date(new Date(targetClass.scheduledEndAt).getTime() + 7200000);

    const reschedRes = await request(tokens.AdminA, 'POST', `/api/v1/classes/${targetClass._id}/reschedule`, {
      startAt: nextStart.toISOString(),
      endAt: nextEnd.toISOString(),
      reason: 'HTTP Reschedule test',
      expectedRevision: 0
    });
    expect(reschedRes.status).toBe(200);
    expect(reschedRes.json.data._id).toBe(targetClass._id);
    expect(reschedRes.json.data.isRescheduled).toBe(true);

    const cancelRes = await request(tokens.AdminA, 'POST', `/api/v1/classes/${targetClass._id}/cancel`, {
      reason: 'HTTP Cancellation test',
      expectedRevision: 1
    });
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.json.data.status).toBe('CANCELLED');
  });
});
