import http from 'http';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  AssessmentModel,
  AssessmentSubmissionModel,
  AttendanceRecordModel,
  AttendanceSessionModel,
  BatchModel,
  ClassModel,
  CourseModel,
  EnrollmentModel,
  FinancialLedgerModel,
  InstructorAvailabilityModel,
  NotificationDeliveryModel,
  NotificationIntentModel,
  NotificationModel,
  OrganizationMemberModel,
  OrganizationSettingsModel,
  PaymentModel,
  ReceiptModel,
  RefundModel,
  SessionModel,
  StudentFeePlanModel,
  StudentLifecycleModel,
  TenantModel,
  UserModel,
  connectDatabase,
  disconnectDatabase
} from '@edtech/database';
import { signAccessToken } from '@edtech/utils';
import { createApp } from '../../app';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;

suite('Phase 17 Instructor OS real HTTP closure', () => {
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
          res.on('data', (c) => chunks.push(c));
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
    name: string,
    tenantId: mongoose.Types.ObjectId,
    role: 'INSTRUCTOR' | 'STUDENT' | 'TENANT_ADMIN',
    memberStatus = 'ACTIVE'
  ) {
    const userId = new mongoose.Types.ObjectId();
    const sessionId = new mongoose.Types.ObjectId();
    await UserModel.collection.insertOne({
      _id: userId,
      tenantId,
      allowedTenantIds: [tenantId],
      name,
      email: `${name.toLowerCase()}@p17.local`,
      passwordHash: 'secret-never-return',
      status: 'ACTIVE',
      roles: []
    });
    await OrganizationMemberModel.collection.insertOne({
      tenantId,
      userId,
      role,
      status: memberStatus,
      joinedAt: new Date()
    });
    await SessionModel.collection.insertOne({
      _id: sessionId,
      userId,
      tenantId,
      activeTenantId: tenantId,
      currentRefreshTokenHash: 'x',
      tokenVersion: 1,
      lastUsedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
      revokedAt: null
    });
    ids[name] = userId;
    tokens[name] = signAccessToken({
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
      NotificationDeliveryModel,
      NotificationModel,
      NotificationIntentModel,
      InstructorAvailabilityModel,
      AttendanceRecordModel,
      AttendanceSessionModel,
      AssessmentSubmissionModel,
      AssessmentModel,
      StudentLifecycleModel,
      EnrollmentModel,
      ClassModel,
      BatchModel,
      CourseModel,
      OrganizationSettingsModel,
      OrganizationMemberModel,
      SessionModel,
      UserModel,
      TenantModel,
      PaymentModel,
      ReceiptModel,
      RefundModel,
      FinancialLedgerModel,
      StudentFeePlanModel
    ]) {
      await m.collection.deleteMany({});
    }

    ids.tenantA = new mongoose.Types.ObjectId();
    ids.tenantB = new mongoose.Types.ObjectId();
    await TenantModel.collection.insertMany([
      { _id: ids.tenantA, name: 'P17 A', slug: 'p17-a' },
      { _id: ids.tenantB, name: 'P17 B', slug: 'p17-b' }
    ]);

    await actor('InstructorA', ids.tenantA, 'INSTRUCTOR');
    await actor('InstructorB', ids.tenantA, 'INSTRUCTOR');
    await actor('Suspended', ids.tenantA, 'INSTRUCTOR', 'SUSPENDED');
    await actor('StudentA', ids.tenantA, 'STUDENT');
    await actor('AdminA', ids.tenantA, 'TENANT_ADMIN');
    await actor('Foreign', ids.tenantB, 'INSTRUCTOR');

    // Unrelated student in Tenant A with NO classes with Instructor B
    ids.unrelatedStudent = new mongoose.Types.ObjectId();
    await UserModel.collection.insertOne({
      _id: ids.unrelatedStudent,
      tenantId: ids.tenantA,
      allowedTenantIds: [ids.tenantA],
      name: 'Unrelated Student',
      email: 'unrelated@p17.local',
      passwordHash: 'x',
      status: 'ACTIVE',
      roles: []
    });
    await OrganizationMemberModel.collection.insertOne({
      tenantId: ids.tenantA,
      userId: ids.unrelatedStudent,
      role: 'STUDENT',
      status: 'ACTIVE',
      joinedAt: new Date()
    });

    await OrganizationSettingsModel.collection.insertMany([
      { tenantId: ids.tenantA, profile: { organizationName: 'A', supportEmail: 'a@x', timezone: 'Asia/Kolkata', defaultLanguage: 'English', currency: 'INR' }, lmsPreferences: {} },
      { tenantId: ids.tenantB, profile: { organizationName: 'B', supportEmail: 'b@x', timezone: 'UTC', defaultLanguage: 'English', currency: 'USD' }, lmsPreferences: {} }
    ]);

    ids.courseA = new mongoose.Types.ObjectId();
    ids.batchA = new mongoose.Types.ObjectId();
    ids.enrollmentA = new mongoose.Types.ObjectId();

    await CourseModel.collection.insertOne({ _id: ids.courseA, tenantId: ids.tenantA, title: 'Course A', slug: 'course-a', status: 'PUBLISHED' });
    await BatchModel.collection.insertOne({
      _id: ids.batchA,
      tenantId: ids.tenantA,
      name: 'Batch A',
      batchCode: 'P17-HTTP',
      courseId: ids.courseA,
      instructorId: ids.InstructorA,
      mode: 'ONLINE',
      status: 'ONGOING',
      startDate: new Date(Date.now() - 864e5),
      endDate: new Date(Date.now() + 30 * 864e5),
      timing: { startTime: '09:00', endTime: '10:00', timezone: 'Asia/Kolkata' },
      daysOfWeek: ['MONDAY'],
      maxSeats: 30,
      enrolledCount: 1,
      showOnWebsite: false
    });

    await EnrollmentModel.collection.insertOne({
      _id: ids.enrollmentA,
      tenantId: ids.tenantA,
      studentId: ids.StudentA,
      courseId: ids.courseA,
      status: 'ACTIVE',
      enrolledAt: new Date(),
      progressPercent: 20,
      completedLessons: 1,
      totalLessons: 5
    });

    await StudentLifecycleModel.collection.insertOne({
      tenantId: ids.tenantA,
      studentUserId: ids.StudentA,
      currentEnrollmentId: ids.enrollmentA,
      courseId: ids.courseA,
      currentBatchId: ids.batchA,
      currentStatus: 'ACTIVE',
      lifecycleEpisode: 1,
      studentNumber: 'P17-S1',
      activatedAt: new Date(Date.now() - 10 * 864e5),
      holdHistory: [],
      isTerminal: false,
      revision: 0,
      withdrawalReason: 'private',
      currentHold: null
    });

    ids.classA = new mongoose.Types.ObjectId();
    ids.classB = new mongoose.Types.ObjectId();

    const baseClass = {
      tenantId: ids.tenantA,
      batchId: ids.batchA,
      courseId: ids.courseA,
      mode: 'ONLINE',
      capacity: 20,
      enrolledCount: 1,
      enrolledStudents: [{ studentId: ids.StudentA, studentName: 'Student A', studentEmail: 'student-private@example.test', enrolledAt: new Date(Date.now() - 10 * 864e5), status: 'ENROLLED' }],
      status: 'ACTIVE',
      startDate: new Date(Date.now() - 3600000),
      endDate: new Date(),
      scheduledStartAt: new Date(Date.now() - 3600000),
      scheduledEndAt: new Date(),
      timing: { startTime: '09:00', endTime: '10:00', timezone: 'Asia/Kolkata' },
      daysOfWeek: [],
      showOnWebsite: false,
      source: 'ONE_OFF',
      scheduleRevision: 0,
      isRescheduled: false
    };

    await ClassModel.collection.insertMany([
      { _id: ids.classA, ...baseClass, name: 'Class A', classCode: 'P17-CA', instructorId: ids.InstructorA, occurrenceKey: 'p17-ca', zoomDetails: { meetingUrl: 'https://secret.example/a' } },
      { _id: ids.classB, ...baseClass, name: 'Concrete B', classCode: 'P17-CB', instructorId: ids.InstructorB, occurrenceKey: 'p17-cb' }
    ]);

    // Assessment Quiz with questions & options having isCorrect flags
    ids.quiz = new mongoose.Types.ObjectId();
    await AssessmentModel.collection.insertOne({
      _id: ids.quiz,
      tenantId: ids.tenantA,
      type: 'QUIZ',
      scope: 'BATCH_LINKED',
      batchId: ids.batchA,
      courseId: ids.courseA,
      title: 'Secret Quiz',
      slug: 'secret-quiz-http',
      description: 'Test Quiz',
      status: 'PUBLISHED',
      showOnWebsite: true,
      durationMinutes: 30,
      passingScorePercent: 60,
      questions: [
        {
          questionText: 'What is 2+2?',
          questionType: 'MCQ',
          options: [
            { text: '3', isCorrect: false },
            { text: '4', isCorrect: true }
          ],
          points: 1
        }
      ],
      createdBy: ids.InstructorA
    });

    ids.assessment = new mongoose.Types.ObjectId();
    ids.submission = new mongoose.Types.ObjectId();
    await AssessmentModel.collection.insertOne({
      _id: ids.assessment,
      tenantId: ids.tenantA,
      type: 'ASSIGNMENT',
      scope: 'BATCH_LINKED',
      batchId: ids.batchA,
      courseId: ids.courseA,
      title: 'Assignment',
      slug: 'assignment-http',
      description: 'x',
      status: 'PUBLISHED',
      showOnWebsite: false,
      assignmentDetails: { maxScore: 100 },
      createdBy: ids.InstructorA
    });

    await AssessmentSubmissionModel.collection.insertOne({
      _id: ids.submission,
      tenantId: ids.tenantA,
      assessmentId: ids.assessment,
      userId: ids.StudentA,
      batchId: ids.batchA,
      courseId: ids.courseA,
      type: 'ASSIGNMENT',
      attemptNumber: 1,
      assignmentSubmission: { submissionText: 'student capstone work' },
      score: 0,
      maxScore: 100,
      scorePercentage: 0,
      status: 'SUBMITTED',
      submittedAt: new Date(),
      revision: 0,
      gradingHistory: []
    });

    server = createApp().listen(0, '127.0.0.1');
    await new Promise<void>((r) => server.once('listening', r));
    port = (server.address() as any).port;
  });

  afterAll(async () => {
    if (server) await new Promise<void>((r, j) => server.close((e) => (e ? j(e) : r())));
    await disconnectDatabase();
  });

  // HARD STOP 11: STUDENT ANSWER-KEY HTTP SECURITY
  it('HARD STOP 11: hides quiz solution data from student while authorized instructor gets grading context', async () => {
    // 1. Authenticate as Student -> fetch assessment
    const studentRes = await request(tokens.StudentA, 'GET', `/api/v1/assessments/${ids.quiz}`);
    expect(studentRes.status).toBe(200);

    const studentJson = JSON.stringify(studentRes.json);
    expect(studentJson).not.toContain('isCorrect');
    expect(studentJson).not.toContain('correctAnswer');
    expect(studentJson).not.toContain('answerKey');
    expect(studentJson).not.toContain('solution');

    // 2. Authenticate as assigned Instructor A -> fetch grading context
    const instructorRes = await request(tokens.InstructorA, 'GET', `/api/v1/instructor/grading/${ids.submission}`);
    expect(instructorRes.status).toBe(200);
    expect(instructorRes.json.data.assignmentSubmission.submissionText).toBe('student capstone work');

    // 3. Cross-instructor fetch denied
    const crossInstructorRes = await request(tokens.InstructorB, 'GET', `/api/v1/instructor/grading/${ids.submission}`);
    expect([403, 404]).toContain(crossInstructorRes.status);
  });

  // HARD STOP 13: COMPLETE REMAINING HTTP SECURITY ASSERTIONS
  it('HARD STOP 13: enforces cross-tenant, suspended, cross-instructor, and student learning protections', async () => {
    // 1. Cross-tenant attendance attempt -> 403/404, 0 mutation
    const foreignAtt = await request(tokens.Foreign, 'POST', `/api/v1/attendance/classes/${ids.classA}/open`);
    expect([403, 404]).toContain(foreignAtt.status);

    // 2. Cross-tenant assessment access -> 403/404, 0 mutation
    const foreignAss = await request(tokens.Foreign, 'GET', `/api/v1/instructor/grading/${ids.submission}`);
    expect([403, 404]).toContain(foreignAss.status);

    // 3. Cross-instructor roster/student denial where NO legitimate relationship exists -> 404
    const crossStudent = await request(tokens.InstructorB, 'GET', `/api/v1/instructor/students/${ids.unrelatedStudent}`);
    expect([403, 404]).toContain(crossStudent.status);

    // 4. Suspended instructor attendance denial -> 403/404
    const suspendedAtt = await request(tokens.Suspended, 'POST', `/api/v1/attendance/classes/${ids.classA}/open`);
    expect([403, 404]).toContain(suspendedAtt.status);

    // 5. Student canonical learning endpoint succeeds
    const studentLearn = await request(tokens.StudentA, 'GET', '/api/v1/student/enrollments');
    expect(studentLearn.status).toBe(200);

    // 6. Known-valid foreign resource IDs from Tenant B against Tenant A -> denied
    const foreignBatch = await request(tokens.Foreign, 'GET', `/api/v1/instructor/batches/${ids.batchA}`);
    expect([403, 404]).toContain(foreignBatch.status);
  });

  it('allows assigned instructor dashboard, workload, batch, class, student and grading projections', async () => {
    for (const path of [
      '/api/v1/instructor/dashboard',
      '/api/v1/instructor/workload',
      '/api/v1/instructor/batches',
      `/api/v1/instructor/batches/${ids.batchA}`,
      `/api/v1/instructor/classes/${ids.classA}`,
      '/api/v1/instructor/students',
      `/api/v1/instructor/students/${ids.StudentA}`,
      '/api/v1/instructor/grading',
      `/api/v1/instructor/grading/${ids.submission}`,
      '/api/v1/instructor/availability'
    ]) {
      const res = await request(tokens.InstructorA, 'GET', path);
      expect(res.status, path).toBe(200);
    }
  });

  it('scopifies /api/v1/instructor/students to authorized teaching relationships and denies unauthorized batches', async () => {
    // 1. Authorized instructor A fetches student roster -> sees Student A, does NOT see unrelated student
    const res = await request(tokens.InstructorA, 'GET', '/api/v1/instructor/students');
    expect(res.status).toBe(200);
    expect(res.json.data.data).toBeDefined();
    expect(res.json.data.pagination).toBeDefined();
    expect(res.json.data.data.some((s: any) => s.studentUserId === String(ids.StudentA))).toBe(true);
    expect(res.json.data.data.some((s: any) => s.studentUserId === String(ids.unrelatedStudent))).toBe(false);

    // 2. Instructor specifying an unauthorized batch ID receives 403
    const unauthorizedBatchId = new mongoose.Types.ObjectId();
    const deniedRes = await request(tokens.InstructorA, 'GET', `/api/v1/instructor/students?batchId=${unauthorizedBatchId}`);
    expect([403, 404]).toContain(deniedRes.status);

    // 3. Foreign tenant instructor accessing Tenant A batch receives 403/404
    const foreignRes = await request(tokens.Foreign, 'GET', `/api/v1/instructor/students?batchId=${ids.batchA}`);
    expect([403, 404]).toContain(foreignRes.status);
  });

  it('denies known-valid cross-instructor and cross-tenant resource IDs', async () => {
    for (const path of [`/api/v1/instructor/classes/${ids.classA}`, `/api/v1/instructor/grading/${ids.submission}`]) {
      expect([403, 404]).toContain((await request(tokens.InstructorB, 'GET', path)).status);
    }
    for (const path of [
      `/api/v1/instructor/batches/${ids.batchA}`,
      `/api/v1/instructor/classes/${ids.classA}`,
      `/api/v1/instructor/students/${ids.StudentA}`,
      `/api/v1/instructor/grading/${ids.submission}`
    ]) {
      expect([403, 404]).toContain((await request(tokens.Foreign, 'GET', path)).status);
    }
  });

  it('denies student and suspended instructor APIs', async () => {
    for (const token of [tokens.StudentA, tokens.Suspended]) {
      for (const path of ['/api/v1/instructor/dashboard', `/api/v1/instructor/classes/${ids.classA}`, '/api/v1/instructor/grading', '/api/v1/instructor/availability']) {
        expect([403, 404]).toContain((await request(token, 'GET', path)).status);
      }
    }
  });

  it('enforces concrete class attendance ownership over batch ownership', async () => {
    const denied = await request(tokens.InstructorA, 'POST', `/api/v1/attendance/classes/${ids.classB}/open`);
    const allowed = await request(tokens.InstructorB, 'POST', `/api/v1/attendance/classes/${ids.classB}/open`);
    expect(denied.status).toBe(403);
    expect(allowed.status).toBe(201);
  });

  it('returns safe student JSON without private domains or auth material', async () => {
    const response = await request(tokens.InstructorA, 'GET', `/api/v1/instructor/students/${ids.StudentA}`);
    expect(response.status).toBe(200);
    const json = JSON.stringify(response.json).toLowerCase();
    for (const key of ['password', 'withdrawalreason', 'payment', 'receipt', 'refund', 'lead', 'admission', 'providercredential', 'notificationdelivery']) {
      expect(json).not.toContain(key);
    }
  });

  it('returns 409 for stale grading and availability revisions without extra mutation', async () => {
    const grade = await request(tokens.InstructorA, 'PUT', `/api/v1/instructor/grading/${ids.submission}`, { score: 80, feedback: 'good', expectedRevision: 0 });
    expect(grade.status).toBe(200);
    const stale = await request(tokens.InstructorA, 'PUT', `/api/v1/instructor/grading/${ids.submission}`, { score: 20, feedback: 'stale', expectedRevision: 0 });
    expect(stale.status).toBe(409);
    expect((await AssessmentSubmissionModel.findById(ids.submission))?.score).toBe(80);

    const availability = await request(tokens.InstructorA, 'PUT', '/api/v1/instructor/availability', { timezone: 'Asia/Kolkata', weeklyWindows: [], exceptions: [], expectedRevision: 0 });
    expect(availability.status).toBe(200);
    expect((await request(tokens.InstructorA, 'PUT', '/api/v1/instructor/availability', { timezone: 'Asia/Kolkata', weeklyWindows: [], exceptions: [], expectedRevision: 0 })).status).toBe(409);
  });

  it('suppresses cancelled meeting URL and rejects attendance mutation', async () => {
    await ClassModel.updateOne({ _id: ids.classA }, { $set: { status: 'CANCELLED' } });
    const workspace = await request(tokens.InstructorA, 'GET', `/api/v1/instructor/classes/${ids.classA}`);
    expect(workspace.status).toBe(200);
    expect(workspace.json.data.class.meetingUrl).toBeUndefined();
    expect((await request(tokens.InstructorA, 'POST', `/api/v1/attendance/classes/${ids.classA}/open`)).status).toBe(409);
  });
});
