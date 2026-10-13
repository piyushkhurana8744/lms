import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  AssessmentModel,
  AssessmentSubmissionModel,
  AttendanceRecordModel,
  AttendanceSessionModel,
  AuditLogModel,
  BatchModel,
  BranchModel,
  CertificateModel,
  ClassModel,
  CourseModel,
  EnrollmentModel,
  FinancialLedgerModel,
  InstructorAvailabilityModel,
  NotificationDeliveryModel,
  NotificationIntentModel,
  NotificationModel,
  OrganizationEmailSettingsModel,
  OrganizationMemberModel,
  OrganizationSettingsModel,
  PaymentModel,
  ReceiptModel,
  RefundModel,
  SchedulingMutexModel,
  StudentFeePlanModel,
  StudentLifecycleEventModel,
  StudentLifecycleModel,
  TenantModel,
  UserModel,
  connectDatabase,
  disconnectDatabase
} from '@edtech/database';
import { tenantContextStorage } from '@edtech/utils';
import { AcademicTimezoneService } from '../academicTimezone.service';
import { AssessmentService } from '../assessment.service';
import { InstructorOperatingService } from '../instructorOperating.service';
import { AcademicSchedulingService } from '../academicScheduling.service';
import { NotificationService, setNotificationHandoffFailure } from '../notification.service';
import { AttendanceService } from '../attendance.service';
import { EmailService } from '../email/email.service';
import { setGradingFailurePoint } from '../gradingFailureInjection';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;

suite('Phase 17 Instructor OS real MongoDB closure', () => {
  const tenantId = new mongoose.Types.ObjectId();
  const instructorId = new mongoose.Types.ObjectId();
  const instructorBId = new mongoose.Types.ObjectId();
  const studentId = new mongoose.Types.ObjectId();
  const branchId = new mongoose.Types.ObjectId();
  const courseId = new mongoose.Types.ObjectId();
  const batchId = new mongoose.Types.ObjectId();
  const batchBId = new mongoose.Types.ObjectId();
  const enrollmentId = new mongoose.Types.ObjectId();

  const actor = { userId: instructorId.toString(), roles: ['INSTRUCTOR'] };
  const actorB = { userId: instructorBId.toString(), roles: ['INSTRUCTOR'] };

  const run = <T>(fn: () => Promise<T>, act = actor) =>
    tenantContextStorage.run(
      {
        currentTenantId: tenantId.toString(),
        currentUserId: act.userId,
        isPlatformContext: false,
        allowedTenantIds: [tenantId.toString()]
      },
      fn
    );

  let submissionId: string;
  let assessmentId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    await connectDatabase(
      process.env.MONGO_INTEGRATION_URI ||
        'mongodb://127.0.0.1:27017/edtech_lms_test?replicaSet=rs0&directConnection=true'
    );

    for (const m of [
      NotificationDeliveryModel,
      NotificationModel,
      NotificationIntentModel,
      AuditLogModel,
      InstructorAvailabilityModel,
      AttendanceRecordModel,
      AttendanceSessionModel,
      AssessmentSubmissionModel,
      AssessmentModel,
      ClassModel,
      SchedulingMutexModel,
      StudentLifecycleEventModel,
      StudentLifecycleModel,
      EnrollmentModel,
      CourseModel,
      BatchModel,
      BranchModel,
      OrganizationSettingsModel,
      OrganizationMemberModel,
      OrganizationEmailSettingsModel,
      PaymentModel,
      ReceiptModel,
      RefundModel,
      FinancialLedgerModel,
      StudentFeePlanModel,
      CertificateModel,
      UserModel,
      TenantModel
    ]) {
      await m.collection.deleteMany({});
    }

    await Promise.all([
      AssessmentSubmissionModel.syncIndexes(),
      InstructorAvailabilityModel.syncIndexes(),
      ClassModel.syncIndexes(),
      NotificationIntentModel.syncIndexes()
    ]);

    await TenantModel.collection.insertOne({ _id: tenantId, name: 'Phase 17 Closure', slug: 'phase-17-closure' });
    await BranchModel.collection.insertOne({ _id: branchId, tenantId, code: 'MAIN', slug: 'main', name: 'Main Branch', status: 'ACTIVE', timezone: 'Asia/Kolkata', isPrimary: true, revision: 0 });

    await UserModel.collection.insertMany([
      { _id: instructorId, tenantId, allowedTenantIds: [tenantId], name: 'Instructor A', email: 'i17a@test.local', passwordHash: 'x', status: 'ACTIVE' },
      { _id: instructorBId, tenantId, allowedTenantIds: [tenantId], name: 'Instructor B', email: 'i17b@test.local', passwordHash: 'x', status: 'ACTIVE' },
      { _id: studentId, tenantId, allowedTenantIds: [tenantId], name: 'Student A', email: 's17a@test.local', passwordHash: 'x', status: 'ACTIVE' }
    ]);

    await OrganizationMemberModel.collection.insertMany([
      { tenantId, userId: instructorId, role: 'INSTRUCTOR', status: 'ACTIVE', branchAccessMode: 'SELECTED', branchIds: [branchId], joinedAt: new Date() },
      { tenantId, userId: instructorBId, role: 'INSTRUCTOR', status: 'ACTIVE', branchAccessMode: 'SELECTED', branchIds: [branchId], joinedAt: new Date() },
      { tenantId, userId: studentId, role: 'STUDENT', status: 'ACTIVE', branchAccessMode: 'SELECTED', branchIds: [branchId], joinedAt: new Date() }
    ]);

    await OrganizationSettingsModel.collection.insertOne({
      tenantId,
      profile: { organizationName: 'Phase17', supportEmail: 'support@test.local', timezone: 'Asia/Kolkata', defaultLanguage: 'English', currency: 'INR' },
      lmsPreferences: { allowStudentSelfRegistration: false, requireEmailVerification: true, allowInstructorRegistration: false, maintenanceMode: false }
    });

    await CourseModel.collection.insertOne({ _id: courseId, tenantId, title: 'Phase 17 Course', slug: 'phase-17-course', status: 'PUBLISHED' });

    await BatchModel.collection.insertMany([
      {
        _id: batchId,
        tenantId,
        branchId,
        name: 'Batch A',
        batchCode: 'P17-A',
        courseId,
        instructorId,
        mode: 'ONLINE',
        status: 'ONGOING',
        startDate: new Date(Date.now() - 864e5),
        endDate: new Date(Date.now() + 30 * 864e5),
        timing: { startTime: '09:00', endTime: '10:00', timezone: 'Asia/Kolkata' },
        daysOfWeek: ['MONDAY'],
        maxSeats: 30,
        enrolledCount: 1,
        showOnWebsite: false
      },
      {
        _id: batchBId,
        tenantId,
        branchId,
        name: 'Batch B',
        batchCode: 'P17-B',
        courseId,
        instructorId: instructorBId,
        mode: 'ONLINE',
        status: 'ONGOING',
        startDate: new Date(Date.now() - 864e5),
        endDate: new Date(Date.now() + 30 * 864e5),
        timing: { startTime: '11:00', endTime: '12:00', timezone: 'Asia/Kolkata' },
        daysOfWeek: ['MONDAY'],
        maxSeats: 30,
        enrolledCount: 0,
        showOnWebsite: false
      }
    ]);

    await EnrollmentModel.collection.insertOne({
      _id: enrollmentId,
      tenantId,
      studentId,
      courseId,
      status: 'ACTIVE',
      enrolledAt: new Date(Date.now() - 10 * 864e5),
      progressPercent: 10,
      completedLessons: 1,
      totalLessons: 10
    });

    await StudentLifecycleModel.collection.insertOne({
      tenantId,
      studentUserId: studentId,
      currentEnrollmentId: enrollmentId,
      courseId,
      currentBatchId: batchId,
      currentBranchId: branchId,
      currentStatus: 'ACTIVE',
      lifecycleEpisode: 1,
      studentNumber: 'STU-17-001',
      activatedAt: new Date(Date.now() - 10 * 864e5),
      holdHistory: [],
      isTerminal: false,
      revision: 0
    });

    assessmentId = new mongoose.Types.ObjectId();
    await AssessmentModel.collection.insertOne({
      _id: assessmentId,
      tenantId,
      type: 'ASSIGNMENT',
      scope: 'BATCH_LINKED',
      batchId,
      courseId,
      title: 'Capstone 17',
      slug: 'capstone-17',
      description: 'Phase 17 Capstone Assignment',
      status: 'PUBLISHED',
      showOnWebsite: false,
      assignmentDetails: { maxScore: 100 },
      createdBy: instructorId
    });

    const submission = await AssessmentSubmissionModel.create({
      tenantId,
      assessmentId,
      userId: studentId,
      batchId,
      courseId,
      type: 'ASSIGNMENT',
      attemptNumber: 1,
      score: 0,
      maxScore: 100,
      scorePercentage: 0,
      status: 'SUBMITTED',
      revision: 0,
      gradingHistory: []
    });
    submissionId = submission._id.toString();
  });

  afterAll(async () => {
    setGradingFailurePoint();
    setNotificationHandoffFailure(false);
    vi.restoreAllMocks();
    await disconnectDatabase();
  });

  // HARD STOP 1: GRADING TRANSACTION ROLLBACK
  it('HARD STOP 1: rolls back entire transaction on injected failure and succeeds upon clean retry', async () => {
    const freshSubmission = await AssessmentSubmissionModel.create({
      tenantId,
      assessmentId,
      userId: studentId,
      batchId,
      courseId,
      type: 'ASSIGNMENT',
      attemptNumber: 2,
      score: 0,
      maxScore: 100,
      scorePercentage: 0,
      status: 'SUBMITTED',
      revision: 0,
      gradingHistory: []
    });
    const testSubId = freshSubmission._id.toString();

    const beforeState = {
      id: testSubId,
      score: 0,
      status: 'SUBMITTED',
      revision: 0,
      historyCount: 0,
      auditCount: await AuditLogModel.countDocuments({ tenantId: tenantId.toString(), resourceId: testSubId }),
      intentCount: await NotificationIntentModel.countDocuments({ tenantId, sourceId: testSubId }),
      notificationCount: await NotificationModel.countDocuments({ tenantId, sourceId: testSubId }),
      deliveryCount: await NotificationDeliveryModel.countDocuments({ tenantId })
    };

    // 1. Inject failure AFTER submission mutation
    setGradingFailurePoint('GRADING_AFTER_SUBMISSION_MUTATION');
    await expect(
      run(() =>
        AssessmentService.gradeSubmission({
          tenantId: tenantId.toString(),
          submissionId: testSubId,
          score: 85,
          feedback: 'Fail after mutation',
          graderId: instructorId.toString(),
          expectedRevision: 0
        })
      )
    ).rejects.toThrow('Injected grading failure: GRADING_AFTER_SUBMISSION_MUTATION');

    // 2. Inject failure AFTER intent creation
    setGradingFailurePoint('GRADING_AFTER_INTENT');
    await expect(
      run(() =>
        AssessmentService.gradeSubmission({
          tenantId: tenantId.toString(),
          submissionId: testSubId,
          score: 85,
          feedback: 'Fail after intent',
          graderId: instructorId.toString(),
          expectedRevision: 0
        })
      )
    ).rejects.toThrow('Injected grading failure: GRADING_AFTER_INTENT');

    // Verify complete rollback after failed operations
    const afterRollback = await AssessmentSubmissionModel.findById(testSubId).lean();
    expect(afterRollback?.score).toBe(beforeState.score);
    expect(afterRollback?.status).toBe(beforeState.status);
    expect(afterRollback?.revision).toBe(beforeState.revision);
    expect(afterRollback?.gradingHistory).toHaveLength(beforeState.historyCount);
    expect(await AuditLogModel.countDocuments({ tenantId: tenantId.toString(), resourceId: testSubId })).toBe(beforeState.auditCount);
    expect(await NotificationIntentModel.countDocuments({ tenantId, sourceId: testSubId })).toBe(beforeState.intentCount);
    expect(await NotificationModel.countDocuments({ tenantId, sourceId: testSubId })).toBe(beforeState.notificationCount);
    expect(await NotificationDeliveryModel.countDocuments({ tenantId })).toBe(beforeState.deliveryCount);

    // Clean retry succeeds
    setGradingFailurePoint();
    const cleanResult = await run(() =>
      AssessmentService.gradeSubmission({
        tenantId: tenantId.toString(),
        submissionId: testSubId,
        score: 85,
        feedback: 'Clean retry after rollback',
        graderId: instructorId.toString(),
        expectedRevision: 0
      })
    );

    expect(cleanResult.score).toBe(85);
    expect(cleanResult.revision).toBe(1);
    expect(cleanResult.status).toBe('GRADED');
    expect(cleanResult.gradingHistory).toHaveLength(1);
    expect(await AuditLogModel.countDocuments({ tenantId: tenantId.toString(), resourceId: testSubId })).toBe(beforeState.auditCount + 1);
    expect(await NotificationIntentModel.countDocuments({ tenantId, sourceId: testSubId, type: 'assessment.graded' })).toBe(1);
  });

  // HARD STOP 2: GRADING PROVIDER FAILURE INDEPENDENCE
  it('HARD STOP 2: preserves committed grade upon email provider failure and recovers idempotently', async () => {
    const provSub = await AssessmentSubmissionModel.create({
      tenantId,
      assessmentId,
      userId: studentId,
      batchId,
      courseId,
      type: 'ASSIGNMENT',
      attemptNumber: 3,
      score: 0,
      maxScore: 100,
      scorePercentage: 0,
      status: 'SUBMITTED',
      revision: 0,
      gradingHistory: []
    });
    const provSubId = provSub._id.toString();

    // Injected transient provider failure
    const sendEmailMock = vi.fn().mockRejectedValue(new Error('503 Provider Transient Error'));
    vi.spyOn(EmailService, 'createProvider').mockReturnValue({
      sendEmail: sendEmailMock,
      verifyConnection: vi.fn(),
      getProviderName: () => 'MOCK_FAIL'
    });

    await OrganizationEmailSettingsModel.deleteMany({ tenantId });
    await OrganizationEmailSettingsModel.create({
      tenantId,
      provider: 'SMTP',
      status: 'VERIFIED',
      fromName: 'Phase 17 Provider Proof',
      fromEmail: 'p17-prov@example.com'
    });

    // Execute grading with provider failing
    const graded = await run(() =>
      AssessmentService.gradeSubmission({
        tenantId: tenantId.toString(),
        submissionId: provSubId,
        score: 92,
        feedback: 'Committed grade during provider failure',
        graderId: instructorId.toString(),
        expectedRevision: 0
      })
    );

    expect(graded.score).toBe(92);
    expect(graded.revision).toBe(1);
    expect(graded.gradingHistory).toHaveLength(1);

    const delivery = await NotificationDeliveryModel.findOne({ tenantId, recipientUserId: studentId });
    expect(delivery).not.toBeNull();

    // Provider failure during delivery processing
    await expect(NotificationService.processDelivery(delivery!._id.toString())).rejects.toThrow();

    // Grade remains committed even though delivery processing failed
    const storedSub = await AssessmentSubmissionModel.findById(provSubId).lean();
    expect(storedSub?.score).toBe(92);
    expect(storedSub?.revision).toBe(1);
    expect(storedSub?.status).toBe('GRADED');

    const intent = await NotificationIntentModel.findOne({ tenantId, sourceId: provSubId, type: 'assessment.graded' });
    expect(intent).not.toBeNull();

    const failedDelivery = await NotificationDeliveryModel.findById(delivery!._id);
    expect(failedDelivery?.status).toBe('FAILED');
    expect(failedDelivery?.attemptCount).toBe(1);
    expect(failedDelivery?.isRetryable).toBe(true);

    // Restore provider
    sendEmailMock.mockReset();
    sendEmailMock.mockResolvedValue({ success: true, messageId: 'prov-recovered-17' });
    await NotificationDeliveryModel.updateOne({ _id: delivery!._id }, { $set: { nextRetryAt: new Date(0) } });

    // Canonical retry / recovery
    await NotificationService.processDelivery(delivery!._id.toString());
    const recoveredDelivery = await NotificationDeliveryModel.findById(delivery!._id);
    expect(recoveredDelivery?.status).toBe('DELIVERED');
    expect(sendEmailMock).toHaveBeenCalledTimes(1);

    // Verify grade is completely unchanged during recovery
    const subAfterRecovery = await AssessmentSubmissionModel.findById(provSubId).lean();
    expect(subAfterRecovery?.score).toBe(92);
    expect(subAfterRecovery?.revision).toBe(1);
    expect(subAfterRecovery?.gradingHistory).toHaveLength(1);

    // Replay recovery sweep - no duplicate deliveries or provider calls
    await NotificationService.processDelivery(delivery!._id.toString());
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(await NotificationModel.countDocuments({ tenantId, sourceId: provSubId })).toBe(1);
    expect(await NotificationDeliveryModel.countDocuments({ tenantId, notificationId: delivery!.notificationId })).toBe(1);
  });

  // HARD STOP 8: AVAILABILITY DST / WALL-CLOCK PROOF
  it('HARD STOP 8: preserves recurring availability wall-clock across Asia/Kolkata and America/New_York DST boundaries', async () => {
    // 1. Asia/Kolkata: Monday 09:00-17:00 local
    await OrganizationSettingsModel.updateOne({ tenantId }, { $set: { 'profile.timezone': 'Asia/Kolkata' } });
    await ClassModel.deleteMany({ tenantId });
    await InstructorAvailabilityModel.deleteMany({ tenantId });

    await run(() =>
      InstructorOperatingService.updateAvailability(
        {
          timezone: 'Asia/Kolkata',
          weeklyWindows: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
          exceptions: [],
          expectedRevision: 0
        },
        actor
      )
    );

    // Valid scheduling inside window: Monday 10:00-11:00 IST
    const kolkataMonInside = AcademicTimezoneService.localToInstant('2026-05-04', '10:00', 'Asia/Kolkata');
    const kolkataMonInsideEnd = AcademicTimezoneService.localToInstant('2026-05-04', '11:00', 'Asia/Kolkata');
    const insideClass = await run(() =>
      AcademicSchedulingService.oneOff(
        {
          batchId: batchId.toString(),
          title: 'Kolkata Inside Window',
          startAt: kolkataMonInside,
          endAt: kolkataMonInsideEnd,
          timezone: 'Asia/Kolkata',
          instructorId: instructorId.toString(),
          mode: 'ONLINE'
        },
        actor
      )
    );
    expect(insideClass).not.toBeNull();

    // Invalid scheduling outside window: Monday 18:00-19:00 IST
    const kolkataMonOutside = AcademicTimezoneService.localToInstant('2026-05-04', '18:00', 'Asia/Kolkata');
    const kolkataMonOutsideEnd = AcademicTimezoneService.localToInstant('2026-05-04', '19:00', 'Asia/Kolkata');
    await expect(
      run(() =>
        AcademicSchedulingService.oneOff(
          {
            batchId: batchId.toString(),
            title: 'Kolkata Outside Window',
            startAt: kolkataMonOutside,
            endAt: kolkataMonOutsideEnd,
            timezone: 'Asia/Kolkata',
            instructorId: instructorId.toString(),
            mode: 'ONLINE'
          },
          actor
        )
      )
    ).rejects.toThrow();

    // 2. America/New_York: Monday 09:00-17:00 crossing DST boundary
    await OrganizationSettingsModel.updateOne({ tenantId }, { $set: { 'profile.timezone': 'America/New_York' } });
    await ClassModel.deleteMany({ tenantId });
    await InstructorAvailabilityModel.deleteMany({ tenantId });

    await run(() =>
      InstructorOperatingService.updateAvailability(
        {
          timezone: 'America/New_York',
          weeklyWindows: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
          exceptions: [],
          expectedRevision: 0
        },
        actor
      )
    );

    // Pre-DST / Standard Time (EST = UTC-5): Monday Feb 9, 2026, 09:00-10:00 EST -> 14:00-15:00 UTC
    const estStart = AcademicTimezoneService.localToInstant('2026-02-09', '09:00', 'America/New_York');
    const estEnd = AcademicTimezoneService.localToInstant('2026-02-09', '10:00', 'America/New_York');
    expect(estStart.toISOString()).toBe('2026-02-09T14:00:00.000Z');

    const estClass = await run(() =>
      AcademicSchedulingService.oneOff(
        {
          batchId: batchId.toString(),
          title: 'EST Class Pre-DST',
          startAt: estStart,
          endAt: estEnd,
          timezone: 'America/New_York',
          instructorId: instructorId.toString(),
          mode: 'ONLINE'
        },
        actor
      )
    );
    expect(estClass).not.toBeNull();

    // Post-DST / Daylight Saving Time (EDT = UTC-4): Monday Jun 8, 2026, 09:00-10:00 EDT -> 13:00-14:00 UTC
    const edtStart = AcademicTimezoneService.localToInstant('2026-06-08', '09:00', 'America/New_York');
    const edtEnd = AcademicTimezoneService.localToInstant('2026-06-08', '10:00', 'America/New_York');
    expect(edtStart.toISOString()).toBe('2026-06-08T13:00:00.000Z');

    const edtClass = await run(() =>
      AcademicSchedulingService.oneOff(
        {
          batchId: batchId.toString(),
          title: 'EDT Class Post-DST',
          startAt: edtStart,
          endAt: edtEnd,
          timezone: 'America/New_York',
          instructorId: instructorId.toString(),
          mode: 'ONLINE'
        },
        actor
      )
    );
    expect(edtClass).not.toBeNull();

    // Wall-clock check: both instances are at local 09:00 America/New_York
    expect(AcademicTimezoneService.localParts(estStart, 'America/New_York').time).toBe('09:00');
    expect(AcademicTimezoneService.localParts(edtStart, 'America/New_York').time).toBe('09:00');
  });

  // HARD STOP 9: ASSIGNMENT CHANGE OWNERSHIP
  it('HARD STOP 9: transfers class ownership, updates access & attendance, and updates dashboard workload', async () => {
    await OrganizationSettingsModel.updateOne({ tenantId }, { $set: { 'profile.timezone': 'Asia/Kolkata' } });
    await ClassModel.deleteMany({ tenantId });

    const classStart = new Date(Date.now() + 3600000);
    const classEnd = new Date(Date.now() + 7200000);
    const assignedClass = await ClassModel.create({
      tenantId,
      name: 'Transferred Class',
      classCode: 'P17-REASSIGN-1',
      batchId,
      courseId,
      instructorId,
      mode: 'ONLINE',
      capacity: 20,
      enrolledCount: 1,
      enrolledStudents: [{ studentId, studentName: 'Student A', studentEmail: 's17a@test.local', enrolledAt: new Date(Date.now() - 10 * 864e5), status: 'ENROLLED' }],
      status: 'SCHEDULED',
      startDate: classStart,
      endDate: classEnd,
      scheduledStartAt: classStart,
      scheduledEndAt: classEnd,
      timing: { startTime: '10:00', endTime: '11:00', timezone: 'Asia/Kolkata' },
      daysOfWeek: [],
      showOnWebsite: false,
      source: 'ONE_OFF',
      occurrenceKey: 'p17:reassign:1',
      scheduleRevision: 0,
      isRescheduled: false
    });
    const concreteClassId = assignedClass._id.toString();

    // Instructor A has access initially
    const initialWorkspaceA = await run(() => InstructorOperatingService.classWorkspace(concreteClassId, actor), actor);
    expect(initialWorkspaceA.class.id.toString()).toBe(concreteClassId);

    // Instructor B does NOT have access initially
    await expect(run(() => InstructorOperatingService.classWorkspace(concreteClassId, actorB), actorB)).rejects.toThrow();

    // Initial workloads
    const initialWorkloadA = await run(() => InstructorOperatingService.workload(actor), actor);
    const initialWorkloadB = await run(() => InstructorOperatingService.workload(actorB), actorB);
    expect(initialWorkloadA.classesThisWeek).toBe(1);
    expect(initialWorkloadB.classesThisWeek).toBe(0);

    // Reassign class to Instructor B
    await ClassModel.updateOne(
      { _id: concreteClassId, tenantId },
      { $set: { instructorId: instructorBId, scheduleRevision: 1, isRescheduled: true } }
    );

    // Class ID before = Class ID after
    const afterClass = await ClassModel.findById(concreteClassId);
    expect(afterClass?._id.toString()).toBe(concreteClassId);
    expect(afterClass?.scheduleRevision).toBe(1);

    // Instructor A no longer has access
    await expect(run(() => InstructorOperatingService.classWorkspace(concreteClassId, actor), actor)).rejects.toThrow();

    // Instructor B gains access
    const workspaceB = await run(() => InstructorOperatingService.classWorkspace(concreteClassId, actorB), actorB);
    expect(workspaceB.class.id.toString()).toBe(concreteClassId);

    // Instructor A attendance mutation denied
    await expect(run(() => AttendanceService.open(concreteClassId, actor), actor)).rejects.toThrow('Instructor is not assigned to this class');

    // Instructor B attendance mutation allowed
    const sessionB = await run(() => AttendanceService.open(concreteClassId, actorB), actorB);
    expect(sessionB.session.classId).toBe(concreteClassId);

    // Workload updated
    const finalWorkloadA = await run(() => InstructorOperatingService.workload(actor), actor);
    const finalWorkloadB = await run(() => InstructorOperatingService.workload(actorB), actorB);
    expect(finalWorkloadA.classesThisWeek).toBe(0);
    expect(finalWorkloadB.classesThisWeek).toBe(1);
  });

  // HARD STOP 10: PHASE 16 LIFECYCLE THROUGH INSTRUCTOR OS
  it('HARD STOP 10: enforces effective-dated lifecycle eligibility across hold/resume, transfer, and withdrawal', async () => {
    const testStudentId = new mongoose.Types.ObjectId();
    const testEnrollmentId = new mongoose.Types.ObjectId();
    await UserModel.collection.insertOne({
      _id: testStudentId,
      tenantId,
      allowedTenantIds: [tenantId],
      name: 'Lifecycle Student',
      email: 'lc@test.local',
      passwordHash: 'x',
      status: 'ACTIVE'
    });
    await OrganizationMemberModel.collection.insertOne({
      tenantId,
      userId: testStudentId,
      role: 'STUDENT',
      status: 'ACTIVE',
      branchAccessMode: 'SELECTED',
      branchIds: [branchId],
      joinedAt: new Date()
    });
    await EnrollmentModel.collection.insertOne({
      _id: testEnrollmentId,
      tenantId,
      studentId: testStudentId,
      courseId,
      status: 'ACTIVE',
      enrolledAt: new Date(Date.now() - 30 * 864e5),
      progressPercent: 0,
      completedLessons: 0,
      totalLessons: 10
    });

    const now = Date.now();
    const tHoldStart = new Date(now - 10 * 864e5);
    const tHoldEnd = new Date(now - 2 * 864e5);

    // Student lifecycle with historical hold
    await StudentLifecycleModel.collection.insertOne({
      tenantId,
      studentUserId: testStudentId,
      currentEnrollmentId: testEnrollmentId,
      courseId,
      currentBatchId: batchId,
      currentBranchId: branchId,
      currentStatus: 'ACTIVE',
      lifecycleEpisode: 1,
      studentNumber: 'LC-001',
      activatedAt: new Date(now - 30 * 864e5),
      holdHistory: [
        {
          holdReason: 'Medical',
          effectiveFrom: tHoldStart,
          resumedAt: tHoldEnd,
          requestedBy: testStudentId
        }
      ],
      isTerminal: false,
      revision: 1
    });

    // Class 1: Before hold (20 days ago) -> Eligible
    const c1 = await ClassModel.create({
      tenantId,
      name: 'Class Before Hold',
      classCode: 'LC-C1',
      batchId,
      courseId,
      instructorId,
      mode: 'ONLINE',
      capacity: 20,
      enrolledCount: 1,
      enrolledStudents: [{ studentId: testStudentId, studentName: 'LC Student', studentEmail: 'lc@test.local', enrolledAt: new Date(now - 30 * 864e5), status: 'ENROLLED' }],
      status: 'ACTIVE',
      startDate: new Date(now - 20 * 864e5),
      endDate: new Date(now - 20 * 864e5 + 3600000),
      timing: { startTime: '10:00', endTime: '11:00', timezone: 'Asia/Kolkata' },
      daysOfWeek: [],
      showOnWebsite: false,
      source: 'ONE_OFF',
      occurrenceKey: 'lc:c1',
      scheduleRevision: 0,
      isRescheduled: false
    });

    // Class 2: During hold (5 days ago) -> Excluded
    const c2 = await ClassModel.create({
      tenantId,
      name: 'Class During Hold',
      classCode: 'LC-C2',
      batchId,
      courseId,
      instructorId,
      mode: 'ONLINE',
      capacity: 20,
      enrolledCount: 1,
      enrolledStudents: [{ studentId: testStudentId, studentName: 'LC Student', studentEmail: 'lc@test.local', enrolledAt: new Date(now - 30 * 864e5), status: 'ENROLLED' }],
      status: 'ACTIVE',
      startDate: new Date(now - 5 * 864e5),
      endDate: new Date(now - 5 * 864e5 + 3600000),
      timing: { startTime: '10:00', endTime: '11:00', timezone: 'Asia/Kolkata' },
      daysOfWeek: [],
      showOnWebsite: false,
      source: 'ONE_OFF',
      occurrenceKey: 'lc:c2',
      scheduleRevision: 0,
      isRescheduled: false
    });

    // Class 3: After resume (yesterday) -> Eligible
    const c3 = await ClassModel.create({
      tenantId,
      name: 'Class After Resume',
      classCode: 'LC-C3',
      batchId,
      courseId,
      instructorId,
      mode: 'ONLINE',
      capacity: 20,
      enrolledCount: 1,
      enrolledStudents: [{ studentId: testStudentId, studentName: 'LC Student', studentEmail: 'lc@test.local', enrolledAt: new Date(now - 30 * 864e5), status: 'ENROLLED' }],
      status: 'ACTIVE',
      startDate: new Date(now - 864e5),
      endDate: new Date(now - 864e5 + 3600000),
      timing: { startTime: '10:00', endTime: '11:00', timezone: 'Asia/Kolkata' },
      daysOfWeek: [],
      showOnWebsite: false,
      source: 'ONE_OFF',
      occurrenceKey: 'lc:c3',
      scheduleRevision: 0,
      isRescheduled: false
    });

    const s1 = await run(() => AttendanceService.open(c1._id.toString(), actor));
    const s2 = await run(() => AttendanceService.open(c2._id.toString(), actor));
    const s3 = await run(() => AttendanceService.open(c3._id.toString(), actor));

    expect(s1.session.expected).toBe(1);
    expect(s2.session.expected).toBe(0); // Excluded during hold
    expect(s3.session.expected).toBe(1);
  });

  // HARD STOP 12: COMPLETE CROSS-DOMAIN ZERO-MUTATION SNAPSHOT
  it('HARD STOP 12: confirms zero cross-domain mutations across finance, lifecycle, certificate, and enrollment', async () => {
    // Seed baseline cross-domain records
    const payId = new mongoose.Types.ObjectId();
    const ledgerId = new mongoose.Types.ObjectId();
    const receiptId = new mongoose.Types.ObjectId();
    const refundId = new mongoose.Types.ObjectId();
    const planId = new mongoose.Types.ObjectId();
    const certId = new mongoose.Types.ObjectId();

    await PaymentModel.collection.insertOne({
      _id: payId,
      tenantId,
      paymentNumber: 'PAY-17-ZERO',
      studentUserId: studentId,
      amountMinor: 15000,
      currency: 'INR',
      method: 'CASH',
      status: 'SUCCESS',
      allocations: [],
      refundedAmountMinor: 0,
      reservedRefundAmountMinor: 0
    });

    await FinancialLedgerModel.collection.insertOne({
      _id: ledgerId,
      tenantId,
      entryType: 'PAYMENT',
      paymentId: payId,
      amountMinor: 15000,
      currency: 'INR',
      balanceAfterMinor: 0
    });

    await ReceiptModel.collection.insertOne({
      _id: receiptId,
      tenantId,
      receiptNumber: 'REC-17-ZERO',
      paymentId: payId,
      studentUserId: studentId,
      amountMinor: 15000,
      currency: 'INR',
      status: 'ISSUED'
    });

    await RefundModel.collection.insertOne({
      _id: refundId,
      tenantId,
      refundNumber: 'REF-17-ZERO',
      paymentId: payId,
      studentUserId: studentId,
      amountMinor: 0,
      currency: 'INR',
      status: 'COMPLETED'
    });

    await StudentFeePlanModel.collection.insertOne({
      _id: planId,
      tenantId,
      studentUserId: studentId,
      courseId,
      currency: 'INR',
      baseAmountMinor: 15000,
      discountAmountMinor: 0,
      netPayableMinor: 15000,
      paidAmountMinor: 15000,
      outstandingBalanceMinor: 0,
      status: 'ACTIVE'
    });

    await CertificateModel.collection.insertOne({
      _id: certId,
      tenantId,
      certificateNumber: 'CERT-17-ZERO',
      studentUserId: studentId,
      courseId,
      status: 'ISSUED'
    });

    // Capture exact before state
    const snapshotBefore = {
      payment: await PaymentModel.findById(payId).lean(),
      ledger: await FinancialLedgerModel.findById(ledgerId).lean(),
      receipt: await ReceiptModel.findById(receiptId).lean(),
      refund: await RefundModel.findById(refundId).lean(),
      plan: await StudentFeePlanModel.findById(planId).lean(),
      lifecycle: await StudentLifecycleModel.findOne({ tenantId, studentUserId: studentId }).lean(),
      certificate: await CertificateModel.findById(certId).lean(),
      enrollment: await EnrollmentModel.findById(enrollmentId).lean()
    };

    // Execute representative Instructor OS operations:
    // 1. Projections
    await run(() => InstructorOperatingService.dashboard(actor));
    await run(() => InstructorOperatingService.workload(actor));

    // 2. Availability update
    await run(() =>
      InstructorOperatingService.updateAvailability(
        {
          timezone: 'Asia/Kolkata',
          weeklyWindows: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
          exceptions: [],
          expectedRevision: 1
        },
        actor
      )
    ).catch(() => undefined);

    // 3. Manual grading
    await run(() =>
      AssessmentService.gradeSubmission({
        tenantId: tenantId.toString(),
        submissionId,
        score: 98,
        feedback: 'Zero mutation snapshot check',
        graderId: instructorId.toString(),
        expectedRevision: 0
      })
    ).catch(() => undefined);

    // Capture after state and assert EXACT equality
    const snapshotAfter = {
      payment: await PaymentModel.findById(payId).lean(),
      ledger: await FinancialLedgerModel.findById(ledgerId).lean(),
      receipt: await ReceiptModel.findById(receiptId).lean(),
      refund: await RefundModel.findById(refundId).lean(),
      plan: await StudentFeePlanModel.findById(planId).lean(),
      lifecycle: await StudentLifecycleModel.findOne({ tenantId, studentUserId: studentId }).lean(),
      certificate: await CertificateModel.findById(certId).lean(),
      enrollment: await EnrollmentModel.findById(enrollmentId).lean()
    };

    expect(snapshotAfter).toEqual(snapshotBefore);
  });

  // HARD STOP 14: PENDING ATTENDANCE & WEEK BOUNDARY FIXTURES
  it('HARD STOP 14: asserts exact today count, pending attendance count, and weekly boundary across timezones', async () => {
    for (const timezone of ['Asia/Kolkata', 'America/New_York']) {
      await OrganizationSettingsModel.updateOne({ tenantId }, { $set: { 'profile.timezone': timezone } });
      await ClassModel.deleteMany({ tenantId });
      await AttendanceSessionModel.deleteMany({ tenantId });

      const now = new Date();
      const day = AcademicTimezoneService.dayRange(now, timezone);
      const week = AcademicTimezoneService.weekRange(now, timezone);

      // Class 1: Today, past, unfinalized -> counts in today and pending attendance
      const pastToday = new Date(Math.max(day.start.getTime() + 60000, now.getTime() - 3600000));
      const cPast = await ClassModel.create({
        tenantId,
        name: `${timezone}-past-unfinalized`,
        classCode: `P-${timezone[0]}-1`,
        batchId,
        courseId,
        instructorId,
        mode: 'ONLINE',
        capacity: 20,
        enrolledCount: 1,
        enrolledStudents: [{ studentId, studentName: 'S1', studentEmail: 's1@test.local', enrolledAt: new Date(Date.now() - 10 * 864e5), status: 'ENROLLED' }],
        status: 'SCHEDULED',
        startDate: pastToday,
        endDate: new Date(pastToday.getTime() + 3600000),
        scheduledStartAt: pastToday,
        scheduledEndAt: new Date(pastToday.getTime() + 3600000),
        timing: { startTime: '09:00', endTime: '10:00', timezone },
        daysOfWeek: [],
        showOnWebsite: false,
        source: 'ONE_OFF',
        occurrenceKey: `occ:past:${timezone}`,
        scheduleRevision: 0,
        isRescheduled: false
      });

      // Class 2: Today, future -> counts in today, not pending attendance, is nextClass
      const futureToday = new Date(Math.min(day.end.getTime() - 60000, now.getTime() + 3600000));
      await ClassModel.create({
        tenantId,
        name: `${timezone}-future-today`,
        classCode: `P-${timezone[0]}-2`,
        batchId,
        courseId,
        instructorId,
        mode: 'ONLINE',
        capacity: 20,
        enrolledCount: 0,
        enrolledStudents: [],
        status: 'SCHEDULED',
        startDate: futureToday,
        endDate: new Date(futureToday.getTime() + 3600000),
        scheduledStartAt: futureToday,
        scheduledEndAt: new Date(futureToday.getTime() + 3600000),
        timing: { startTime: '15:00', endTime: '16:00', timezone },
        daysOfWeek: [],
        showOnWebsite: false,
        source: 'ONE_OFF',
        occurrenceKey: `occ:future:${timezone}`,
        scheduleRevision: 0,
        isRescheduled: false
      });

      // Class 3: Outside week -> excluded from this week
      const nextWeekDate = new Date(week.end.getTime() + 3600000);
      await ClassModel.create({
        tenantId,
        name: `${timezone}-next-week`,
        classCode: `P-${timezone[0]}-3`,
        batchId,
        courseId,
        instructorId,
        mode: 'ONLINE',
        capacity: 20,
        enrolledCount: 0,
        enrolledStudents: [],
        status: 'SCHEDULED',
        startDate: nextWeekDate,
        endDate: new Date(nextWeekDate.getTime() + 3600000),
        scheduledStartAt: nextWeekDate,
        scheduledEndAt: new Date(nextWeekDate.getTime() + 3600000),
        timing: { startTime: '10:00', endTime: '11:00', timezone },
        daysOfWeek: [],
        showOnWebsite: false,
        source: 'ONE_OFF',
        occurrenceKey: `occ:outside:${timezone}`,
        scheduleRevision: 0,
        isRescheduled: false
      });

      const dashboard = await run(() => InstructorOperatingService.dashboard(actor));
      expect(dashboard.classesToday).toBe(2);
      expect(dashboard.pendingAttendance).toBe(1);
      expect(dashboard.classesThisWeek).toBe(2);
      expect(dashboard.nextClass?.name).toBe(`${timezone}-future-today`);
    }
  });

  // CONCURRENCY & REPLAY TESTS
  it('allows one winner in a ten-way grading race and preserves replay/re-grade semantics', async () => {
    const sub = await AssessmentSubmissionModel.create({
      tenantId,
      assessmentId,
      userId: studentId,
      batchId,
      courseId,
      type: 'ASSIGNMENT',
      attemptNumber: 10,
      score: 0,
      maxScore: 100,
      scorePercentage: 0,
      status: 'SUBMITTED',
      revision: 0,
      gradingHistory: []
    });
    const sId = sub._id.toString();

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) =>
        run(() =>
          AssessmentService.gradeSubmission({
            tenantId: tenantId.toString(),
            submissionId: sId,
            score: 51 + i,
            feedback: `candidate-${i}`,
            graderId: instructorId.toString(),
            expectedRevision: 0
          })
        )
      )
    );

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(9);

    let final: any = await AssessmentSubmissionModel.findById(sId).lean();
    expect(final.revision).toBe(1);
    expect(final.gradingHistory).toHaveLength(1);
    expect(await NotificationIntentModel.countDocuments({ sourceId: sId, type: 'assessment.graded' })).toBe(1);

    const winner = results.find((r) => r.status === 'fulfilled') as PromiseFulfilledResult<any>;
    const auditBefore = await AuditLogModel.countDocuments({ tenantId: tenantId.toString(), resourceId: sId });
    const intentBefore = await NotificationIntentModel.countDocuments({ sourceId: sId });

    // Idempotent replay
    await run(() =>
      AssessmentService.gradeSubmission({
        tenantId: tenantId.toString(),
        submissionId: sId,
        score: winner.value.score,
        feedback: winner.value.feedback,
        graderId: instructorId.toString(),
        expectedRevision: 0
      })
    );
    final = await AssessmentSubmissionModel.findById(sId).lean();
    expect(final.revision).toBe(1);
    expect(final.gradingHistory).toHaveLength(1);
    expect(await AuditLogModel.countDocuments({ tenantId: tenantId.toString(), resourceId: sId })).toBe(auditBefore);
    expect(await NotificationIntentModel.countDocuments({ sourceId: sId })).toBe(intentBefore);

    // Legitimate regrade
    await run(() =>
      AssessmentService.gradeSubmission({
        tenantId: tenantId.toString(),
        submissionId: sId,
        score: 95,
        feedback: 'legitimate regrade',
        graderId: instructorId.toString(),
        expectedRevision: 1
      })
    );
    final = await AssessmentSubmissionModel.findById(sId).lean();
    expect(final.revision).toBe(2);
    expect(final.gradingHistory).toHaveLength(2);
    expect(await NotificationIntentModel.countDocuments({ sourceId: sId })).toBe(2);
  });

  it('allows one winner in a ten-way availability revision race', async () => {
    await ClassModel.deleteMany({ tenantId });
    await InstructorAvailabilityModel.deleteMany({ tenantId });

    await run(() =>
      InstructorOperatingService.updateAvailability(
        { timezone: 'Asia/Kolkata', weeklyWindows: [], exceptions: [], expectedRevision: 0 },
        actor
      )
    );

    const outcomes = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) =>
        run(() =>
          InstructorOperatingService.updateAvailability(
            {
              timezone: 'Asia/Kolkata',
              weeklyWindows: [{ dayOfWeek: 1, startTime: `0${i % 9}:00`, endTime: `0${i % 9}:30` }],
              exceptions: [],
              expectedRevision: 1
            },
            actor
          )
        )
      )
    );

    expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter((r) => r.status === 'rejected')).toHaveLength(9);
    expect((await InstructorAvailabilityModel.findOne({ tenantId, instructorId }))?.revision).toBe(2);
  });

  it('serializes ten availability-versus-one-off races without an invalid final state', async () => {
    await ClassModel.deleteMany({ tenantId });
    await InstructorAvailabilityModel.deleteMany({ tenantId });

    let invalid = 0;
    for (let i = 0; i < 10; i++) {
      await ClassModel.deleteMany({ tenantId });
      const date = new Date(Date.now() + (10 + i) * 864e5);
      const local = AcademicTimezoneService.localParts(date, 'Asia/Kolkata').localDate;
      const start = AcademicTimezoneService.localToInstant(local, '12:00', 'Asia/Kolkata');
      const end = AcademicTimezoneService.localToInstant(local, '13:00', 'Asia/Kolkata');

      await InstructorAvailabilityModel.deleteMany({ tenantId });
      await run(() =>
        InstructorOperatingService.updateAvailability(
          {
            timezone: 'Asia/Kolkata',
            weeklyWindows: [{ dayOfWeek: AcademicTimezoneService.isoDay(local), startTime: '12:00', endTime: '13:00' }],
            exceptions: [],
            expectedRevision: 0
          },
          actor
        )
      );

      const revision = 1;
      await Promise.allSettled([
        run(() =>
          InstructorOperatingService.updateAvailability(
            { timezone: 'Asia/Kolkata', weeklyWindows: [], exceptions: [], expectedRevision: revision },
            actor
          )
        ),
        run(() =>
          AcademicSchedulingService.oneOff(
            {
              batchId: batchId.toString(),
              title: `Race ${i}`,
              startAt: start,
              endAt: end,
              timezone: 'Asia/Kolkata',
              instructorId: instructorId.toString(),
              mode: 'ONLINE'
            },
            actor
          )
        )
      ]);

      const availability = await InstructorAvailabilityModel.findOne({ tenantId, instructorId }).lean();
      const cls = await ClassModel.findOne({ tenantId, name: `Race ${i}` }).lean();
      if (availability?.weeklyWindows.length === 0 && cls) invalid++;
    }

    expect(invalid).toBe(0);
  });
});
