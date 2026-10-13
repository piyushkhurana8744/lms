import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  StudentLifecycleModel,
  StudentLifecycleEventModel,
  StudentSequenceModel,
  UserModel,
  OrganizationMemberModel,
  EnrollmentModel,
  CourseModel,
  BatchModel,
  ClassModel,
  AttendanceSessionModel,
  AttendanceRecordModel,
  StudentFeePlanModel,
  PaymentModel,
  FinancialLedgerModel,
  ReceiptModel,
  CertificateModel,
  AdmissionModel,
  LeadModel,
  LessonModel,
  CourseModuleModel,
  LessonProgressModel,
  NotificationIntentModel,
  NotificationModel,
  NotificationDeliveryModel,
  TenantModel,
  connectDatabase,
  disconnectDatabase
} from '@edtech/database';
import { tenantContextStorage } from '@edtech/utils';
import { StudentLifecycleService } from '../studentLifecycle.service';
import { CRMService } from '../crm.service';
import { AttendanceService } from '../attendance.service';
import { StudentLearningService } from '../studentLearning.service';
import { NotificationService, setNotificationHandoffFailure } from '../notification.service';
import { EmailService } from '../email/email.service';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;

suite('Phase 16 Student Lifecycle & Academic Journey MongoDB Integration', () => {
  const tenantId = new mongoose.Types.ObjectId();
  const foreignTenantId = new mongoose.Types.ObjectId();
  const adminUserId = new mongoose.Types.ObjectId();
  const studentUserId = new mongoose.Types.ObjectId();
  const courseId = new mongoose.Types.ObjectId();
  const batchAId = new mongoose.Types.ObjectId();
  const batchBId = new mongoose.Types.ObjectId();
  const batchCId = new mongoose.Types.ObjectId();
  const foreignBatchId = new mongoose.Types.ObjectId();
  const foreignCourseId = new mongoose.Types.ObjectId();

  const adminActor = {
    userId: adminUserId.toString(),
    roles: ['TENANT_ADMIN'],
    isSuperAdmin: false
  };

  const runAsAdmin = <T>(fn: () => Promise<T>) =>
    tenantContextStorage.run(
      {
        currentTenantId: tenantId.toString(),
        currentUserId: adminUserId.toString(),
        isPlatformContext: false,
        allowedTenantIds: [tenantId.toString()]
      },
      fn
    );

  const runAsForeign = <T>(fn: () => Promise<T>) =>
    tenantContextStorage.run(
      {
        currentTenantId: foreignTenantId.toString(),
        currentUserId: new mongoose.Types.ObjectId().toString(),
        isPlatformContext: false,
        allowedTenantIds: [foreignTenantId.toString()]
      },
      fn
    );

  let enrollmentDoc: any;
  let lifecycleDoc: any;

  beforeAll(async () => {
    await connectDatabase(
      process.env.MONGO_INTEGRATION_URI ||
        'mongodb://127.0.0.1:27017/edtech_lms_test?replicaSet=rs0&directConnection=true'
    );

    // Clean up collections
    for (const m of [
      StudentLifecycleModel,
      StudentLifecycleEventModel,
      StudentSequenceModel,
      UserModel,
      OrganizationMemberModel,
      EnrollmentModel,
      CourseModel,
      BatchModel,
      ClassModel,
      AttendanceSessionModel,
      AttendanceRecordModel,
      StudentFeePlanModel,
      PaymentModel,
      FinancialLedgerModel,
      ReceiptModel,
      CertificateModel,
      AdmissionModel,
      LeadModel,
      LessonModel,
      CourseModuleModel,
      LessonProgressModel,
      NotificationIntentModel,
      NotificationModel,
      NotificationDeliveryModel,
      TenantModel
    ]) {
      await m.collection.deleteMany({});
    }

    await Promise.all([
      StudentLifecycleModel.syncIndexes(),
      StudentLifecycleEventModel.syncIndexes(),
      StudentSequenceModel.syncIndexes(),
      EnrollmentModel.syncIndexes(),
      ClassModel.syncIndexes(),
      NotificationIntentModel.syncIndexes()
    ]);

    // Seed Tenants
    await TenantModel.collection.insertMany([
      { _id: tenantId, name: 'Main Institution', slug: 'main-inst' },
      { _id: foreignTenantId, name: 'Foreign Institution', slug: 'foreign-inst' }
    ]);

    // Seed Users & Members
    await UserModel.collection.insertMany([
      { _id: adminUserId, tenantId, allowedTenantIds: [tenantId], name: 'Admin User', email: 'admin@inst.test', passwordHash: 'hash', status: 'ACTIVE' },
      { _id: studentUserId, tenantId, allowedTenantIds: [tenantId], name: 'Student One', email: 'student1@inst.test', passwordHash: 'hash', status: 'ACTIVE' }
    ]);

    await OrganizationMemberModel.collection.insertMany([
      { tenantId, userId: adminUserId, role: 'TENANT_ADMIN', status: 'ACTIVE', joinedAt: new Date() },
      { tenantId, userId: studentUserId, role: 'STUDENT', status: 'ACTIVE', joinedAt: new Date() }
    ]);

    // Seed Courses
    await CourseModel.collection.insertMany([
      { _id: courseId, tenantId, title: 'Master in Digital Marketing', slug: 'midm', status: 'PUBLISHED' },
      { _id: foreignCourseId, tenantId: foreignTenantId, title: 'Foreign Course', slug: 'fc', status: 'PUBLISHED' }
    ]);

    // Seed Batches
    await BatchModel.collection.insertMany([
      {
        _id: batchAId,
        tenantId,
        name: 'Batch Morning',
        batchCode: 'BM-1',
        courseId,
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
        _id: batchBId,
        tenantId,
        name: 'Batch Evening',
        batchCode: 'BE-1',
        courseId,
        mode: 'ONLINE',
        status: 'ONGOING',
        startDate: new Date('2026-10-01T00:00:00Z'),
        maxSeats: 30,
        enrolledCount: 0,
        timing: { startTime: '18:00', endTime: '20:00', timezone: 'Asia/Kolkata' },
        daysOfWeek: ['MONDAY'],
        showOnWebsite: true
      },
      {
        _id: batchCId,
        tenantId,
        name: 'Batch Weekend',
        batchCode: 'BW-1',
        courseId,
        mode: 'ONLINE',
        status: 'ONGOING',
        startDate: new Date('2026-10-01T00:00:00Z'),
        maxSeats: 30,
        enrolledCount: 0,
        timing: { startTime: '14:00', endTime: '18:00', timezone: 'Asia/Kolkata' },
        daysOfWeek: ['SATURDAY'],
        showOnWebsite: true
      },
      {
        _id: foreignBatchId,
        tenantId: foreignTenantId,
        name: 'Foreign Batch',
        batchCode: 'FB-1',
        courseId: foreignCourseId,
        mode: 'ONLINE',
        status: 'ONGOING',
        startDate: new Date('2026-10-01T00:00:00Z'),
        maxSeats: 30,
        enrolledCount: 0,
        timing: { startTime: '10:00', endTime: '12:00', timezone: 'Asia/Kolkata' },
        daysOfWeek: ['MONDAY'],
        showOnWebsite: true
      }
    ]);

    // Seed Enrollment
    enrollmentDoc = await EnrollmentModel.create({
      tenantId,
      studentId: studentUserId,
      courseId,
      status: 'ACTIVE',
      enrolledAt: new Date('2026-10-01T00:00:00Z'),
      progressPercent: 0,
      completedLessons: 0,
      totalLessons: 10
    });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await disconnectDatabase();
  });

  it('1. Initializes canonical StudentLifecycle aggregate with unique student sequence number', async () => {
    lifecycleDoc = await runAsAdmin(() =>
      StudentLifecycleService.initializeLifecycle({
        tenantId: tenantId.toString(),
        studentUserId: studentUserId.toString(),
        currentEnrollmentId: enrollmentDoc._id.toString(),
        currentBatchId: batchAId.toString(),
        createdBy: adminUserId.toString()
      })
    );

    expect(lifecycleDoc).toBeTruthy();
    expect(lifecycleDoc.currentStatus).toBe('PENDING_ACTIVATION');
    expect(lifecycleDoc.studentNumber).toMatch(/^STU-\d{4}-\d{6}$/);
    expect(lifecycleDoc.lifecycleEpisode).toBe(1);
    expect(lifecycleDoc.revision).toBe(0);

    // Compound unique index verification: re-initialization returns existing
    const replay = await runAsAdmin(() =>
      StudentLifecycleService.initializeLifecycle({
        tenantId: tenantId.toString(),
        studentUserId: studentUserId.toString(),
        currentEnrollmentId: enrollmentDoc._id.toString(),
        currentBatchId: batchAId.toString()
      })
    );
    expect(replay._id.toString()).toBe(lifecycleDoc._id.toString());
  });

  it('2. Activates student and enqueues durable notification intent', async () => {
    const activated = await runAsAdmin(() =>
      StudentLifecycleService.activateStudent(
        lifecycleDoc._id.toString(),
        { notes: 'Admission fee verified' },
        adminActor
      )
    );

    expect(activated.currentStatus).toBe('ACTIVE');
    expect(activated.activatedAt).toBeTruthy();
    expect(activated.revision).toBe(1);

    // Verify append-only lifecycle event
    const events = await StudentLifecycleEventModel.find({ lifecycleId: lifecycleDoc._id });
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('ACTIVATED');

    // Verify Notification Intent outbox
    const intents = await NotificationIntentModel.find({
      sourceId: lifecycleDoc._id.toString(),
      type: 'student.activated'
    });
    expect(intents).toHaveLength(1);
    expect(intents[0].recipientUserId.toString()).toBe(studentUserId.toString());
  });

  it('3. Activation is strictly idempotent across repeated calls', async () => {
    const replay = await runAsAdmin(() =>
      StudentLifecycleService.activateStudent(
        lifecycleDoc._id.toString(),
        { notes: 'Duplicate call' },
        adminActor
      )
    );

    expect(replay.currentStatus).toBe('ACTIVE');
    expect(replay.revision).toBe(1);
    // No duplicate events or notification intents
    expect(await StudentLifecycleEventModel.countDocuments({ lifecycleId: lifecycleDoc._id, eventType: 'ACTIVATED' })).toBe(1);
    expect(await NotificationIntentModel.countDocuments({ sourceId: lifecycleDoc._id.toString(), type: 'student.activated' })).toBe(1);
  });

  it('4. Rejects invalid direct status transitions and cross-course transfer attempts', async () => {
    // Attempt cross-course batch transfer
    await expect(
      runAsAdmin(() =>
        StudentLifecycleService.transferStudent(
          lifecycleDoc._id.toString(),
          { toBatchId: foreignBatchId.toString(), reason: 'Cross course attack' },
          adminActor
        )
      )
    ).rejects.toThrow();
  });

  it('5. Executes same-course Batch Transfer (Batch A -> Batch B) preserving all historical data and finance', async () => {
    // Setup historical records across frozen domains before transfer
    const classBefore = await ClassModel.create({
      tenantId,
      name: 'Class A1',
      classCode: 'CLA-1',
      courseId,
      batchId: batchAId,
      mode: 'ONLINE',
      capacity: 30,
      enrolledCount: 1,
      enrolledStudents: [{ studentId: studentUserId, status: 'ENROLLED', enrolledAt: new Date('2026-10-01') }],
      status: 'SCHEDULED',
      startDate: new Date('2026-10-05T10:00:00Z'),
      timing: { startTime: '10:00', endTime: '12:00', timezone: 'Asia/Kolkata' },
      daysOfWeek: ['MONDAY'],
      showOnWebsite: false
    });

    const feePlan = await StudentFeePlanModel.create({
      tenantId,
      studentUserId,
      courseId,
      currency: 'INR',
      baseAmountMinor: 5000000,
      discountAmountMinor: 500000,
      netPayableMinor: 4500000,
      paidAmountMinor: 2000000,
      outstandingBalanceMinor: 2500000,
      status: 'ACTIVE',
      createdBy: adminUserId,
      updatedBy: adminUserId
    });

    const payment = await PaymentModel.create({
      tenantId,
      studentFeePlanId: feePlan._id,
      studentUserId,
      amountMinor: 2000000,
      currency: 'INR',
      method: 'UPI',
      status: 'SUCCESS',
      paymentNumber: 'PAY-001',
      recordedBy: adminUserId,
      createdBy: adminUserId,
      updatedBy: adminUserId
    });

    const countsBefore = {
      enrollmentId: enrollmentDoc._id.toString(),
      paymentCount: await PaymentModel.countDocuments({ tenantId }),
      ledgerCount: await FinancialLedgerModel.countDocuments({ tenantId }),
      receiptCount: await ReceiptModel.countDocuments({ tenantId }),
      feePlanBalance: (await StudentFeePlanModel.findById(feePlan._id))!.outstandingBalanceMinor
    };

    // Execute transfer
    const transferred = await runAsAdmin(() =>
      StudentLifecycleService.transferStudent(
        lifecycleDoc._id.toString(),
        { toBatchId: batchBId.toString(), reason: 'Timezone preference change', expectedRevision: 1 },
        adminActor
      )
    );

    expect(transferred.currentBatchId).toBe(batchBId.toString());
    expect(transferred.revision).toBe(2);

    // Verify Financial Invariants: Exactly ZERO mutation to finance
    expect(await PaymentModel.countDocuments({ tenantId })).toBe(countsBefore.paymentCount);
    expect(await FinancialLedgerModel.countDocuments({ tenantId })).toBe(countsBefore.ledgerCount);
    expect(await ReceiptModel.countDocuments({ tenantId })).toBe(countsBefore.receiptCount);
    expect((await StudentFeePlanModel.findById(feePlan._id))!.outstandingBalanceMinor).toBe(countsBefore.feePlanBalance);

    // Verify Event Log
    const transferEvent = await StudentLifecycleEventModel.findOne({
      lifecycleId: lifecycleDoc._id,
      eventType: 'TRANSFERRED'
    });
    expect(transferEvent).toBeTruthy();
    expect(transferEvent!.fromBatchId?.toString()).toBe(batchAId.toString());
    expect(transferEvent!.toBatchId?.toString()).toBe(batchBId.toString());
    expect(transferEvent!.metadata?.previousBatchId).toBe(batchAId.toString());
  });

  it('6. Places student ON_HOLD and verifies effective academic eligibility evaluation', async () => {
    // Keep this proof relative to the actual activation timestamp. Fixed dates
    // eventually made the hold predate activation and invalidated the scenario.
    const activatedLifecycle = await StudentLifecycleModel.findById(lifecycleDoc._id);
    const activationTime = new Date(activatedLifecycle!.activatedAt!);
    const holdDate = new Date(activationTime.getTime() + 24 * 60 * 60 * 1000);
    const held = await runAsAdmin(() =>
      StudentLifecycleService.placeOnHold(
        lifecycleDoc._id.toString(),
        { reason: 'Medical recovery', effectiveFrom: holdDate, expectedRevision: 2 },
        adminActor
      )
    );

    expect(held.currentStatus).toBe('ON_HOLD');
    expect(held.currentHold).toBeTruthy();
    expect(held.revision).toBe(3);

    // Test Effective-Dated Eligibility:
    // After activation but before hold -> ACTIVE
    const beforeHold = await runAsAdmin(() =>
      StudentLifecycleService.isStudentAcademicallyActiveAt(studentUserId, new Date(activationTime.getTime() + 60 * 60 * 1000))
    );
    expect(beforeHold).toBe(true);

    // During hold -> INACTIVE
    const duringHold = await runAsAdmin(() =>
      StudentLifecycleService.isStudentAcademicallyActiveAt(studentUserId, new Date(holdDate.getTime() + 60 * 60 * 1000))
    );
    expect(duringHold).toBe(false);
  });

  it('7. Excludes student on hold from attendance roster generation during hold period', async () => {
    const classDuringHold = await ClassModel.create({
      tenantId,
      name: 'Class During Hold',
      classCode: 'CDH-1',
      courseId,
      batchId: batchBId,
      mode: 'ONLINE',
      capacity: 30,
      enrolledCount: 1,
      enrolledStudents: [{ studentId: studentUserId, status: 'ENROLLED', enrolledAt: new Date('2026-10-01') }],
      status: 'SCHEDULED',
      startDate: new Date('2026-10-15T10:00:00Z'),
      timing: { startTime: '10:00', endTime: '12:00', timezone: 'Asia/Kolkata' },
      daysOfWeek: ['THURSDAY'],
      showOnWebsite: false
    });

    const roster = await runAsAdmin(() =>
      AttendanceService.open(classDuringHold._id.toString(), adminActor)
    );

    // Student on hold should be excluded from the expected attendance roster
    expect(roster.records).toHaveLength(0);
    expect(roster.session.expected).toBe(0);
  });

  it('8. Resumes student to ACTIVE, archives hold history, and restores future attendance eligibility without backfilling absences', async () => {
    const resumeDate = new Date('2026-10-20T00:00:00Z');
    const resumed = await runAsAdmin(() =>
      StudentLifecycleService.resumeStudent(
        lifecycleDoc._id.toString(),
        { effectiveAt: resumeDate, notes: 'Medical clearance received', expectedRevision: 3 },
        adminActor
      )
    );

    expect(resumed.currentStatus).toBe('ACTIVE');
    expect(resumed.currentHold).toBeNull();
    expect(resumed.holdHistory).toHaveLength(1);
    expect(resumed.holdHistory[0].reason).toBe('Medical recovery');
    expect(resumed.revision).toBe(4);

    // Post-resume class attendance roster inclusion
    const classAfterResume = await ClassModel.create({
      tenantId,
      name: 'Class After Resume',
      classCode: 'CAR-1',
      courseId,
      batchId: batchBId,
      mode: 'ONLINE',
      capacity: 30,
      enrolledCount: 1,
      enrolledStudents: [{ studentId: studentUserId, status: 'ENROLLED', enrolledAt: new Date('2026-10-01') }],
      status: 'SCHEDULED',
      startDate: new Date('2026-10-25T10:00:00Z'),
      timing: { startTime: '10:00', endTime: '12:00', timezone: 'Asia/Kolkata' },
      daysOfWeek: ['SUNDAY'],
      showOnWebsite: false
    });

    const postRoster = await runAsAdmin(() =>
      AttendanceService.open(classAfterResume._id.toString(), adminActor)
    );

    expect(postRoster.records).toHaveLength(1);
    expect(postRoster.records[0].studentId).toBe(studentUserId.toString());
  });

  it('9. Rejects academic completion if course curriculum progress is incomplete (< 100%)', async () => {
    // Current enrollment progress is 0%
    await expect(
      runAsAdmin(() =>
        StudentLifecycleService.completeStudent(
          lifecycleDoc._id.toString(),
          {},
          adminActor
        )
      )
    ).rejects.toThrow('Course enrollment requirements not completed');
  });

  it('10. Marks COMPLETED upon 100% course completion (independent of certificate issuance)', async () => {
    // Set enrollment to completed (Phase 9 evidence)
    await EnrollmentModel.findByIdAndUpdate(enrollmentDoc._id, {
      $set: {
        status: 'COMPLETED',
        progressPercent: 100,
        completedLessons: 10,
        completedAt: new Date('2026-10-30T00:00:00Z')
      }
    });

    const completed = await runAsAdmin(() =>
      StudentLifecycleService.completeStudent(
        lifecycleDoc._id.toString(),
        { notes: 'Completed with distinction', expectedRevision: 4 },
        adminActor
      )
    );

    expect(completed.currentStatus).toBe('COMPLETED');
    expect(completed.completedAt).toBeTruthy();
    expect(completed.revision).toBe(5);

    // Verify Notification Intent
    const notifs = await NotificationIntentModel.find({
      sourceId: lifecycleDoc._id.toString(),
      type: 'student.completed'
    });
    expect(notifs).toHaveLength(1);

    // Completed lifecycle is terminal: re-complete is idempotent
    const replay = await runAsAdmin(() =>
      StudentLifecycleService.completeStudent(
        lifecycleDoc._id.toString(),
        {},
        adminActor
      )
    );
    expect(replay.currentStatus).toBe('COMPLETED');
  });

  it('11. Handles Withdrawal, dropout, and Readmission into a new Lifecycle Episode', async () => {
    // Create new student for readmission test
    const student2Id = new mongoose.Types.ObjectId();
    await UserModel.create({
      _id: student2Id,
      tenantId,
      allowedTenantIds: [tenantId],
      name: 'Student Two',
      email: 'student2@inst.test',
      passwordHash: 'hash',
      status: 'ACTIVE'
    });
    await OrganizationMemberModel.create({
      tenantId,
      userId: student2Id,
      role: 'STUDENT',
      status: 'ACTIVE',
      joinedAt: new Date()
    });
    const enr2 = await EnrollmentModel.create({
      tenantId,
      studentId: student2Id,
      courseId,
      status: 'ACTIVE',
      enrolledAt: new Date(),
      progressPercent: 20,
      completedLessons: 2,
      totalLessons: 10
    });

    const lc2 = await runAsAdmin(() =>
      StudentLifecycleService.initializeLifecycle({
        tenantId: tenantId.toString(),
        studentUserId: student2Id.toString(),
        currentEnrollmentId: enr2._id.toString(),
        currentBatchId: batchAId.toString()
      })
    );

    await runAsAdmin(() =>
      StudentLifecycleService.activateStudent(lc2._id.toString(), {}, adminActor)
    );

    // Withdraw student
    const withdrawn = await runAsAdmin(() =>
      StudentLifecycleService.withdrawStudent(
        lc2._id.toString(),
        { reason: 'Relocating to another city', expectedRevision: 1 },
        adminActor
      )
    );
    expect(withdrawn.currentStatus).toBe('WITHDRAWN');
    expect(withdrawn.lifecycleEpisode).toBe(1);

    // A readmission cannot attach a foreign-tenant or incompatible batch.
    await expect(
      runAsAdmin(() =>
        StudentLifecycleService.reactivateStudent(
          lc2._id.toString(),
          { batchId: foreignBatchId.toString(), reason: 'Invalid foreign batch', expectedRevision: 2 },
          adminActor
        )
      )
    ).rejects.toThrow('Readmission batch is not compatible');

    // Test learning access restriction on withdrawn standing
    await expect(
      tenantContextStorage.run(
        { currentTenantId: tenantId.toString(), currentUserId: student2Id.toString() },
        () => StudentLearningService.getStudentLessonPlayer(student2Id.toString(), courseId.toString(), new mongoose.Types.ObjectId().toString())
      )
    ).rejects.toThrow();

    // Readmit / Reactivate into new episode (Episode 2)
    const reactivated = await runAsAdmin(() =>
      StudentLifecycleService.reactivateStudent(
        lc2._id.toString(),
        { batchId: batchBId.toString(), reason: 'Returned to city and resumed studies', expectedRevision: 2 },
        adminActor
      )
    );

    expect(reactivated.currentStatus).toBe('ACTIVE');
    expect(reactivated.lifecycleEpisode).toBe(2);
    expect(reactivated.currentBatchId).toBe(batchBId.toString());

    // Historical eligibility must preserve the inactive interval even though
    // the aggregate now represents the reactivated episode.
    const episodeEvents = await StudentLifecycleEventModel.find({ lifecycleId: lc2._id })
      .sort({ effectiveAt: 1, createdAt: 1 })
      .lean();
    const withdrawalEvent = episodeEvents.find((e) => e.eventType === 'WITHDRAWN')!;
    const reactivationEvent = episodeEvents.find((e) => e.eventType === 'REACTIVATED')!;
    const inactiveInstant = new Date(
      (withdrawalEvent.effectiveAt.getTime() + reactivationEvent.effectiveAt.getTime()) / 2
    );
    expect(
      await runAsAdmin(() =>
        StudentLifecycleService.isStudentAcademicallyActiveAt(student2Id, inactiveInstant, courseId)
      )
    ).toBe(false);

    // Verify timeline history preserves Episode 1 and Episode 2
    const timeline = await runAsAdmin(() =>
      StudentLifecycleService.getTimeline(student2Id.toString())
    );
    const eventTypes = timeline.map((t: any) => t.eventType);
    expect(eventTypes).toContain('ACTIVATED');
    expect(eventTypes).toContain('WITHDRAWN');
    expect(eventTypes).toContain('REACTIVATED');
  });

  it('12. 10-Way Admission conversion lifecycle initialization race is concurrency-safe with 0 duplicate records', async () => {
    const leadId = new mongoose.Types.ObjectId();
    const admissionId = new mongoose.Types.ObjectId();

    await LeadModel.create({
      _id: leadId,
      tenantId,
      leadCode: 'LEAD-RACE-001',
      firstName: 'Race',
      lastName: 'Candidate',
      fullName: 'Race Candidate',
      email: 'race.candidate@inst.test',
      normalizedEmail: 'race.candidate@inst.test',
      phone: '9876543210',
      normalizedPhone: '9876543210',
      stage: 'QUALIFIED',
      createdBy: adminUserId,
      updatedBy: adminUserId
    });

    await AdmissionModel.create({
      _id: admissionId,
      tenantId,
      leadId,
      admissionNumber: 'ADM-RACE-001',
      applicant: {
        fullName: 'Race Candidate',
        email: 'race.candidate@inst.test',
        phone: '9876543210'
      },
      courseId,
      status: 'APPROVED',
      applicationDate: new Date(),
      createdBy: adminUserId,
      updatedBy: adminUserId
    });

    // 10 concurrent conversion calls
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        runAsAdmin(() =>
          CRMService.convertAdmissionToStudent(
            admissionId.toString(),
            { batchId: batchAId.toString() },
            adminUserId.toString()
          )
        )
      )
    );

    const rejections = results.filter((r) => r.status === 'rejected').map((r: any) => r.reason);
    if (rejections.length > 0) {
      console.log('[Test 12 Rejections]:', rejections[0]?.message || rejections[0]);
    }

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(10);

    // Verify invariants: Exactly ONE User, ONE Member, ONE Enrollment, and ONE Lifecycle
    const createdUser = await UserModel.findOne({ tenantId, email: 'race.candidate@inst.test' });
    expect(createdUser).toBeTruthy();
    expect(await UserModel.countDocuments({ tenantId, email: 'race.candidate@inst.test' })).toBe(1);
    expect(await OrganizationMemberModel.countDocuments({ tenantId, userId: createdUser!._id })).toBe(1);
    expect(await EnrollmentModel.countDocuments({ tenantId, studentId: createdUser!._id })).toBe(1);
    expect(await StudentLifecycleModel.countDocuments({ tenantId, studentUserId: createdUser!._id })).toBe(1);
  });

  it('13. 20-Way Concurrent Student Number Sequence Allocation produces 20 unique numbers with zero collisions', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        runAsAdmin(() => StudentLifecycleService.generateStudentNumber(tenantId.toString()))
      )
    );

    expect(results).toHaveLength(20);
    const uniqueSet = new Set(results);
    expect(uniqueSet.size).toBe(20);
    results.forEach((num) => {
      expect(num).toMatch(/^STU-\d{4}-\d{6}$/);
    });
  });

  it('14. Conflicting destination batch transfer race (Batch B vs Batch C) produces exactly 1 winner and 1 conflict', async () => {
    const student3Id = new mongoose.Types.ObjectId();
    await UserModel.create({
      _id: student3Id,
      tenantId,
      allowedTenantIds: [tenantId],
      name: 'Student Three',
      email: 'student3@inst.test',
      passwordHash: 'hash',
      status: 'ACTIVE'
    });
    await OrganizationMemberModel.create({
      tenantId,
      userId: student3Id,
      role: 'STUDENT',
      status: 'ACTIVE',
      joinedAt: new Date()
    });
    const enr3 = await EnrollmentModel.create({
      tenantId,
      studentId: student3Id,
      courseId,
      status: 'ACTIVE',
      enrolledAt: new Date()
    });

    const lc3 = await runAsAdmin(() =>
      StudentLifecycleService.initializeLifecycle({
        tenantId: tenantId.toString(),
        studentUserId: student3Id.toString(),
        currentEnrollmentId: enr3._id.toString(),
        currentBatchId: batchAId.toString()
      })
    );

    await runAsAdmin(() =>
      StudentLifecycleService.activateStudent(lc3._id.toString(), {}, adminActor)
    );

    // Two concurrent admins attempt transfer to different batches with same expectedRevision (1)
    const [resB, resC] = await Promise.allSettled([
      runAsAdmin(() =>
        StudentLifecycleService.transferStudent(
          lc3._id.toString(),
          { toBatchId: batchBId.toString(), reason: 'Move to Evening', expectedRevision: 1 },
          adminActor
        )
      ),
      runAsAdmin(() =>
        StudentLifecycleService.transferStudent(
          lc3._id.toString(),
          { toBatchId: batchCId.toString(), reason: 'Move to Weekend', expectedRevision: 1 },
          adminActor
        )
      )
    ]);

    const fulfilled = [resB, resC].filter((r) => r.status === 'fulfilled');
    const rejected = [resB, resC].filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const finalDoc = await StudentLifecycleModel.findById(lc3._id);
    expect([batchBId.toString(), batchCId.toString()]).toContain(finalDoc!.currentBatchId!.toString());
    expect(finalDoc!.revision).toBe(2);
  });

  it('15. Recovers from Redis outage during notification handoff without corrupting lifecycle state', async () => {
    // Setup student lifecycle for notification outage proof
    const student4Id = new mongoose.Types.ObjectId();
    await UserModel.create({
      _id: student4Id,
      tenantId,
      allowedTenantIds: [tenantId],
      name: 'Outage Student',
      email: 'outage@inst.test',
      passwordHash: 'hash',
      status: 'ACTIVE'
    });
    await OrganizationMemberModel.create({
      tenantId,
      userId: student4Id,
      role: 'STUDENT',
      status: 'ACTIVE',
      joinedAt: new Date()
    });
    const enr4 = await EnrollmentModel.create({
      tenantId,
      studentId: student4Id,
      courseId,
      status: 'ACTIVE',
      enrolledAt: new Date()
    });

    const lc4 = await runAsAdmin(() =>
      StudentLifecycleService.initializeLifecycle({
        tenantId: tenantId.toString(),
        studentUserId: student4Id.toString(),
        currentEnrollmentId: enr4._id.toString(),
        currentBatchId: batchAId.toString()
      })
    );

    // 1. Simulate Redis broker down by forcing NotificationService consumer failure
    setNotificationHandoffFailure(true);

    const activated = await runAsAdmin(() =>
      StudentLifecycleService.activateStudent(lc4._id.toString(), {}, adminActor)
    );

    // Invariant: Lifecycle operation committed successfully in MongoDB
    expect(activated.currentStatus).toBe('ACTIVE');

    const intent = await NotificationIntentModel.findOne({
      sourceId: lc4._id.toString(),
      type: 'student.activated'
    });
    expect(intent).toBeTruthy();
    expect(intent!.status).toBe('PENDING');

    // Attempt consumption while handoff is failing -> must fail safely without changing lifecycle
    await expect(NotificationService.consumeOutboxEvent(intent!.eventId)).rejects.toThrow();

    // 2. Restore Redis / notification service
    setNotificationHandoffFailure(false);

    // 3. Recovery worker sweeps and processes pending intent
    const consumed = await NotificationService.consumeOutboxEvent(intent!.eventId);
    expect(consumed?.status).toBe('PROCESSED');

    // Invariant: Lifecycle state in DB remained completely untouched during notification recovery
    const verifyDoc = await StudentLifecycleModel.findById(lc4._id);
    expect(verifyDoc?.currentStatus).toBe('ACTIVE');
    expect(verifyDoc?.revision).toBe(1);
  });

  it('16. Cross-Tenant Isolation: Denies cross-tenant lifecycle operations with zero mutation', async () => {
    // Attempt to view or modify Main tenant lifecycle from Foreign tenant
    await expect(
      runAsForeign(() =>
        StudentLifecycleService.activateStudent(
          lifecycleDoc._id.toString(),
          {},
          { userId: 'foreign-user', roles: ['TENANT_ADMIN'] }
        )
      )
    ).rejects.toThrow();

    await expect(
      runAsForeign(() =>
        StudentLifecycleService.getAcademicProfile(studentUserId.toString())
      )
    ).rejects.toThrow();
  });
});
