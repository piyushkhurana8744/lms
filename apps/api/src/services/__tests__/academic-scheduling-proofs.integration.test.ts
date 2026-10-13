import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  AcademicCalendarModel, AcademicRoomModel, AttendanceSessionModel,
  BatchModel, BranchModel, CalendarExceptionModel, ClassModel, CourseModel, EnrollmentModel,
  NotificationDeliveryModel, NotificationIntentModel, NotificationModel,
  OrganizationEmailSettingsModel, OrganizationMemberModel, SchedulingMutexModel,
  TenantModel, TimetableModel, UserModel, connectDatabase, disconnectDatabase
} from '@edtech/database';
import { tenantContextStorage } from '@edtech/utils';
import { AcademicSchedulingService } from '../academicScheduling.service';
import { NotificationService } from '../notification.service';
import { EmailService } from '../email/email.service';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;

suite('Phase 15 Academic Scheduling Final Two Proofs', () => {
  const tenantId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();
  const instructorId = new mongoose.Types.ObjectId();
  const studentId = new mongoose.Types.ObjectId();
  const branchId = new mongoose.Types.ObjectId();
  const courseId = new mongoose.Types.ObjectId();
  const batchId = new mongoose.Types.ObjectId();
  const roomId = new mongoose.Types.ObjectId();
  const actor = { userId: adminId.toString() };

  const run = <T>(fn: () => Promise<T>) =>
    tenantContextStorage.run(
      {
        currentTenantId: tenantId.toString(),
        currentUserId: adminId.toString(),
        isPlatformContext: false,
        allowedTenantIds: [tenantId.toString()]
      },
      fn
    );

  beforeAll(async () => {
    process.env.WEB_APP_URL = 'https://learn.didm.test';
    await connectDatabase(process.env.MONGO_INTEGRATION_URI || 'mongodb://127.0.0.1:27017/edtech_lms_test?replicaSet=rs0&directConnection=true');

    for (const m of [
      NotificationDeliveryModel, NotificationModel, NotificationIntentModel,
      OrganizationEmailSettingsModel, AttendanceSessionModel, ClassModel,
      TimetableModel, CalendarExceptionModel, AcademicCalendarModel, AcademicRoomModel,
      SchedulingMutexModel, EnrollmentModel, BatchModel, CourseModel,
      OrganizationMemberModel, UserModel, BranchModel, TenantModel
    ]) {
      await m.collection.deleteMany({});
    }

    await Promise.all([
      ClassModel.syncIndexes(),
      TimetableModel.syncIndexes(),
      CalendarExceptionModel.syncIndexes(),
      AcademicRoomModel.syncIndexes(),
      SchedulingMutexModel.syncIndexes(),
      NotificationIntentModel.syncIndexes()
    ]);

    await TenantModel.collection.insertOne({ _id: tenantId, name: 'Proof Tenant', slug: 'proof-tenant' });
    await BranchModel.collection.insertOne({ _id: branchId, tenantId, code: 'MAIN', slug: 'main', name: 'Main Branch', status: 'ACTIVE', timezone: 'Asia/Kolkata', isPrimary: true, revision: 0 });

    await UserModel.collection.insertMany([
      { _id: adminId, tenantId, allowedTenantIds: [tenantId], name: 'Proof Admin', email: 'admin@proof.test', passwordHash: 'x', status: 'ACTIVE' },
      { _id: instructorId, tenantId, allowedTenantIds: [tenantId], name: 'Proof Instructor', email: 'instructor@proof.test', passwordHash: 'x', status: 'ACTIVE' },
      { _id: studentId, tenantId, allowedTenantIds: [tenantId], name: 'Proof Student', email: 'student@proof.test', passwordHash: 'x', status: 'ACTIVE' }
    ]);

    await OrganizationMemberModel.collection.insertMany([
      { tenantId, userId: adminId, role: 'TENANT_ADMIN', status: 'ACTIVE', branchAccessMode: 'ALL', branchIds: [], joinedAt: new Date() },
      { tenantId, userId: instructorId, role: 'INSTRUCTOR', status: 'ACTIVE', branchAccessMode: 'SELECTED', branchIds: [branchId], joinedAt: new Date() },
      { tenantId, userId: studentId, role: 'STUDENT', status: 'ACTIVE', branchAccessMode: 'SELECTED', branchIds: [branchId], joinedAt: new Date() }
    ]);

    await CourseModel.collection.insertOne({ _id: courseId, tenantId, title: 'Proof Course', slug: 'proof-course', status: 'PUBLISHED' });

    await BatchModel.collection.insertOne({
      _id: batchId,
      tenantId,
      branchId,
      name: 'Proof Batch',
      batchCode: 'PROOF-B1',
      courseId,
      instructorId,
      mode: 'HYBRID',
      status: 'ONGOING',
      startDate: new Date('2026-10-01T00:00:00Z'),
      endDate: new Date('2026-11-30T23:59:59Z'),
      timing: { startTime: '10:00', endTime: '11:00', timezone: 'Asia/Kolkata' },
      daysOfWeek: ['MONDAY'],
      maxSeats: 30,
      enrolledCount: 1,
      showOnWebsite: false
    });

    await EnrollmentModel.collection.insertOne({
      tenantId,
      studentId,
      courseId,
      status: 'ACTIVE',
      enrolledAt: new Date(),
      progressPercent: 0,
      completedLessons: 0,
      totalLessons: 0
    });

    await AcademicRoomModel.collection.insertOne({
      _id: roomId,
      tenantId,
      branchId,
      name: 'Proof Lab',
      code: 'PLAB',
      capacity: 30,
      isActive: true
    });

    await OrganizationEmailSettingsModel.create({
      tenantId,
      provider: 'SMTP',
      status: 'VERIFIED',
      fromName: 'Academic Office',
      fromEmail: 'academic@proof.test'
    });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await disconnectDatabase();
  });

  it('PROOF 1: Executes canonical reschedule during real Redis outage and recovers durably with zero duplicate effects', async () => {
    // 1. Setup scheduled concrete Class
    const startOriginal = new Date('2026-10-15T10:00:00.000Z');
    const endOriginal = new Date('2026-10-15T11:00:00.000Z');

    const createdClass = await run(() =>
      AcademicSchedulingService.oneOff(
        {
          batchId: batchId.toString(),
          title: 'Proof 1 Class',
          startAt: startOriginal,
          endAt: endOriginal,
          timezone: 'Asia/Kolkata',
          instructorId: instructorId.toString(),
          mode: 'HYBRID',
          roomId: roomId.toString(),
          meetingUrl: 'https://meet.proof.test/proof1'
        },
        actor
      )
    );

    const classIdBefore = createdClass._id.toString();
    expect(createdClass.scheduleRevision).toBe(0);
    expect(createdClass.rescheduleHistory).toHaveLength(0);

    // 2. Make Redis/Queue publication unavailable during reschedule handoff
    const redisOutageError = new Error('ECONNREFUSED: Redis server unavailable at 127.0.0.1:6379');
    const outboxSpy = vi.spyOn(NotificationService, 'consumeOutboxEvent').mockRejectedValue(redisOutageError);
    const sendEmailMock = vi.fn().mockResolvedValue({ success: true, messageId: 'reschedule-msg-123' });
    vi.spyOn(EmailService, 'createProvider').mockReturnValue({
      sendEmail: sendEmailMock,
      verifyConnection: vi.fn(),
      getProviderName: () => 'PROOFS_DOUBLE'
    });

    // 3. Execute canonical reschedule while Redis is down
    const startNew = new Date('2026-10-15T12:00:00.000Z');
    const endNew = new Date('2026-10-15T13:00:00.000Z');

    const rescheduledClass = await run(() =>
      AcademicSchedulingService.reschedule(
        classIdBefore,
        {
          startAt: startNew,
          endAt: endNew,
          reason: 'Faculty operational delay',
          expectedRevision: 0
        },
        actor
      )
    );

    // 4. Assert Academic State while Redis was down: Reschedule COMMITTED
    expect(rescheduledClass._id.toString()).toBe(classIdBefore);
    expect(rescheduledClass.scheduledStartAt).toEqual(startNew);
    expect(rescheduledClass.scheduledEndAt).toEqual(endNew);
    expect(rescheduledClass.scheduleRevision).toBe(1);
    expect(rescheduledClass.rescheduleHistory).toHaveLength(1);
    expect(rescheduledClass.rescheduleHistory[0].previousStart).toEqual(startOriginal);
    expect(rescheduledClass.rescheduleHistory[0].newStart).toEqual(startNew);
    expect(rescheduledClass.rescheduleHistory[0].reason).toBe('Faculty operational delay');

    // No duplicate class created in DB
    const classCountInBatch = await ClassModel.countDocuments({ batchId, name: 'Proof 1 Class' });
    expect(classCountInBatch).toBe(1);

    // 5. Assert Notification Outbox State while Redis was down
    const pendingIntents = await NotificationIntentModel.find({
      sourceId: classIdBefore,
      type: 'class.rescheduled',
      occurrenceKey: '1'
    });
    expect(pendingIntents).toHaveLength(2); // 1 for student, 1 for instructor
    expect(pendingIntents.every((i) => i.status === 'PENDING')).toBe(true);

    // 0 notifications / 0 deliveries materialized yet while down
    const notifsWhileDown = await NotificationModel.countDocuments({ sourceId: classIdBefore, type: 'class.rescheduled' });
    expect(notifsWhileDown).toBe(0);
    const deliveriesWhileDown = await NotificationDeliveryModel.countDocuments({ tenantId });
    expect(deliveriesWhileDown).toBe(0);
    expect(sendEmailMock).toHaveBeenCalledTimes(0);

    // 6. Restore Redis & run recovery mechanism
    outboxSpy.mockRestore();

    // Sweep pending outbox events
    for (const intent of pendingIntents) {
      await NotificationService.consumeOutboxEvent(intent.eventId);
    }

    // Process created deliveries
    const createdDeliveries = await NotificationDeliveryModel.find({ tenantId, status: 'PENDING' });
    expect(createdDeliveries).toHaveLength(2);

    for (const delivery of createdDeliveries) {
      await NotificationService.processDelivery(delivery._id.toString());
    }

    // 7. Assert Post-Recovery States
    const finalNotifs = await NotificationModel.find({ sourceId: classIdBefore, type: 'class.rescheduled' });
    expect(finalNotifs).toHaveLength(2);

    const finalDeliveries = await NotificationDeliveryModel.find({ tenantId, status: 'DELIVERED' });
    expect(finalDeliveries).toHaveLength(2);
    expect(sendEmailMock).toHaveBeenCalledTimes(2);

    // Verify Academic Class state remained completely untouched by recovery
    const postRecoveryClass = await ClassModel.findById(classIdBefore);
    expect(postRecoveryClass?.scheduleRevision).toBe(1);
    expect(postRecoveryClass?.rescheduleHistory).toHaveLength(1);
    expect(postRecoveryClass?.scheduledStartAt).toEqual(startNew);

    // 8. Replay recovery sweep again to prove zero duplicates
    for (const intent of pendingIntents) {
      await NotificationService.consumeOutboxEvent(intent.eventId);
    }
    for (const delivery of createdDeliveries) {
      await NotificationService.processDelivery(delivery._id.toString());
    }

    expect(await NotificationModel.countDocuments({ sourceId: classIdBefore, type: 'class.rescheduled' })).toBe(2);
    expect(await NotificationDeliveryModel.countDocuments({ tenantId, status: 'DELIVERED' })).toBe(2);
    expect(sendEmailMock).toHaveBeenCalledTimes(2); // Still 2, no duplicate calls
  });

  it('PROOF 2: Executes canonical cancellation with notification failure independence and proves resource release and idempotency', async () => {
    // 1. Setup scheduled Class
    const startAt = new Date('2026-10-20T14:00:00.000Z');
    const endAt = new Date('2026-10-20T15:00:00.000Z');

    const createdClass = await run(() =>
      AcademicSchedulingService.oneOff(
        {
          batchId: batchId.toString(),
          title: 'Proof 2 Cancellation Class',
          startAt,
          endAt,
          timezone: 'Asia/Kolkata',
          instructorId: instructorId.toString(),
          mode: 'OFFLINE',
          roomId: roomId.toString()
        },
        actor
      )
    );

    const classId = createdClass._id.toString();
    expect(createdClass.status).toBe('SCHEDULED');
    expect(createdClass.scheduleRevision).toBe(0);

    // 2. Inject notification failure AFTER academic transaction boundary
    const outboxSpy = vi.spyOn(NotificationService, 'consumeOutboxEvent').mockRejectedValue(
      new Error('503 Service Unavailable: Downstream notification processor offline')
    );
    const sendEmailMock = vi.fn().mockResolvedValue({ success: true, messageId: 'cancel-msg-456' });
    vi.spyOn(EmailService, 'createProvider').mockReturnValue({
      sendEmail: sendEmailMock,
      verifyConnection: vi.fn(),
      getProviderName: () => 'PROOFS_DOUBLE'
    });

    // 3. Execute canonical cancellation
    const cancelledClass = await run(() =>
      AcademicSchedulingService.cancel(
        classId,
        {
          reason: 'Severe weather emergency',
          expectedRevision: 0
        },
        actor
      )
    );

    // 4. Academic Assertions: Cancellation COMMITTED despite notification failure
    expect(cancelledClass._id.toString()).toBe(classId);
    expect(cancelledClass.status).toBe('CANCELLED');
    expect(cancelledClass.cancellationReason).toBe('Severe weather emergency');
    expect(cancelledClass.cancelledAt).toBeInstanceOf(Date);
    expect(cancelledClass.cancelledBy?.toString()).toBe(adminId.toString());
    expect(cancelledClass.scheduleRevision).toBe(1);

    const classInDb = await ClassModel.findById(classId);
    expect(classInDb?.status).toBe('CANCELLED');
    expect(classInDb?.cancellationReason).toBe('Severe weather emergency');

    // 5. Notification Assertions: Durable intent persisted in PENDING state
    const pendingIntents = await NotificationIntentModel.find({
      sourceId: classId,
      type: 'class.cancelled',
      occurrenceKey: '1'
    });
    expect(pendingIntents).toHaveLength(2); // 1 student, 1 instructor
    expect(pendingIntents.every((i) => i.status === 'PENDING')).toBe(true);

    // 6. Recover notification processing
    outboxSpy.mockRestore();

    for (const intent of pendingIntents) {
      await NotificationService.consumeOutboxEvent(intent.eventId);
    }

    const cancelDeliveries = await NotificationDeliveryModel.find({
      tenantId,
      channel: 'EMAIL',
      status: 'PENDING'
    });
    expect(cancelDeliveries.length).toBeGreaterThanOrEqual(2);

    for (const delivery of cancelDeliveries) {
      await NotificationService.processDelivery(delivery._id.toString());
    }

    const deliveredCancel = await NotificationDeliveryModel.find({
      tenantId,
      status: 'DELIVERED'
    });
    expect(deliveredCancel.length).toBeGreaterThanOrEqual(2);

    // 7. Cancellation Idempotency after recovery
    const cancelledAtTimestamp = cancelledClass.cancelledAt;
    const secondCancel = await run(() =>
      AcademicSchedulingService.cancel(
        classId,
        {
          reason: 'Repeated cancellation request',
          expectedRevision: 1
        },
        actor
      )
    );

    expect(secondCancel.status).toBe('CANCELLED');
    expect(secondCancel.cancelledAt).toEqual(cancelledAtTimestamp);
    expect(secondCancel.cancellationReason).toBe('Severe weather emergency'); // Not overwritten
    expect(secondCancel.scheduleRevision).toBe(1); // Not incremented again

    // No duplicate notification intent created
    const intentsAfterSecondCancel = await NotificationIntentModel.find({
      sourceId: classId,
      type: 'class.cancelled'
    });
    expect(intentsAfterSecondCancel).toHaveLength(2); // Still exactly 2

    // 8. Resource Release Proof: Book replacement class using released instructor, room, and time interval
    const replacementClass = await run(() =>
      AcademicSchedulingService.oneOff(
        {
          batchId: batchId.toString(),
          title: 'Released Slot Makeup Class',
          startAt,
          endAt,
          timezone: 'Asia/Kolkata',
          instructorId: instructorId.toString(),
          mode: 'OFFLINE',
          roomId: roomId.toString()
        },
        actor
      )
    );

    expect(replacementClass._id).toBeTruthy();
    expect(replacementClass._id.toString()).not.toBe(classId);
    expect(replacementClass.status).toBe('SCHEDULED');
    expect(replacementClass.scheduledStartAt).toEqual(startAt);
    expect(replacementClass.roomId?.toString()).toBe(roomId.toString());
    expect(replacementClass.instructorId?.toString()).toBe(instructorId.toString());
  });
});
