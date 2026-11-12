import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  TenantModel,
  BatchModel,
  ClassModel,
  AttendanceSessionModel,
  AttendanceRecordModel,
  TimetableModel,
  AcademicCalendarModel,
  AcademicRoomModel,
  CalendarExceptionModel,
  EnrollmentModel,
  CourseModel,
  CourseModuleModel,
  LessonModel,
  AssessmentModel,
  AssessmentSubmissionModel,
  connectDatabase,
  disconnectDatabase
} from '@edtech/database';
import { tenantContextStorage } from '@edtech/utils';

const suite = process.env.RUN_MONGO_INTEGRATION === '1' ? describe : describe.skip;

suite('Wave 0.8 Batch 8: Academic Cluster Fail-Closed Isolation Proofs', () => {
  const tenantAId = new mongoose.Types.ObjectId();
  const tenantBId = new mongoose.Types.ObjectId();
  const courseAId = new mongoose.Types.ObjectId();
  const courseBId = new mongoose.Types.ObjectId();
  const instructorAId = new mongoose.Types.ObjectId();
  const instructorBId = new mongoose.Types.ObjectId();
  const studentAId = new mongoose.Types.ObjectId();
  const studentBId = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_INTEGRATION_URI || 'mongodb://127.0.0.1:27017/edtech_lms_test?replicaSet=rs0';
    await connectDatabase(mongoUri);

    for (const model of [
      BatchModel, ClassModel, AttendanceSessionModel, AttendanceRecordModel,
      TimetableModel, AcademicCalendarModel, AcademicRoomModel, CalendarExceptionModel,
      EnrollmentModel, CourseModel, CourseModuleModel, LessonModel, AssessmentModel, AssessmentSubmissionModel
    ]) {
      await model.collection.deleteMany({});
      await model.syncIndexes();
    }

    await TenantModel.create([
      { _id: tenantAId, name: 'Academic Tenant A', slug: 'acad-tenant-a', status: 'ACTIVE' },
      { _id: tenantBId, name: 'Academic Tenant B', slug: 'acad-tenant-b', status: 'ACTIVE' }
    ]);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('Missing Context Rejection (Fail-Closed)', () => {
    it('rejects BatchModel query without tenant context', async () => {
      await expect(
        BatchModel.find({ name: 'Unscoped Batch' })
      ).rejects.toThrow('Tenant context is required for tenant-owned model operation (Batch)');
    });

    it('rejects ClassModel query without tenant context', async () => {
      await expect(
        ClassModel.find({ name: 'Unscoped Class' })
      ).rejects.toThrow('Tenant context is required for tenant-owned model operation (Class)');
    });

    it('rejects AttendanceSessionModel query without tenant context', async () => {
      await expect(
        AttendanceSessionModel.find({})
      ).rejects.toThrow('Tenant context is required for tenant-owned model operation (AttendanceSession)');
    });

    it('rejects AttendanceRecordModel query without tenant context', async () => {
      await expect(
        AttendanceRecordModel.find({})
      ).rejects.toThrow('Tenant context is required for tenant-owned model operation (AttendanceRecord)');
    });

    it('rejects TimetableModel query without tenant context', async () => {
      await expect(
        TimetableModel.find({})
      ).rejects.toThrow('Tenant context is required for tenant-owned model operation (Timetable)');
    });

    it('rejects AcademicCalendarModel query without tenant context', async () => {
      await expect(
        AcademicCalendarModel.find({})
      ).rejects.toThrow('Tenant context is required for tenant-owned model operation (AcademicCalendar)');
    });

    it('rejects AcademicRoomModel query without tenant context', async () => {
      await expect(
        AcademicRoomModel.find({})
      ).rejects.toThrow('Tenant context is required for tenant-owned model operation (AcademicRoom)');
    });

    it('rejects CalendarExceptionModel query without tenant context', async () => {
      await expect(
        CalendarExceptionModel.find({})
      ).rejects.toThrow('Tenant context is required for tenant-owned model operation (CalendarException)');
    });

    it('rejects EnrollmentModel query without tenant context', async () => {
      await expect(
        EnrollmentModel.find({})
      ).rejects.toThrow('Tenant context is required for tenant-owned model operation (Enrollment)');
    });

    it('rejects LessonModel query without tenant context', async () => {
      await expect(
        LessonModel.find({})
      ).rejects.toThrow('Tenant context is required for tenant-owned model operation (Lesson)');
    });

    it('rejects CourseModuleModel query without tenant context', async () => {
      await expect(
        CourseModuleModel.find({})
      ).rejects.toThrow('Tenant context is required for tenant-owned model operation (CourseModule)');
    });

    it('rejects AssessmentModel query without tenant context', async () => {
      await expect(
        AssessmentModel.find({})
      ).rejects.toThrow('Tenant context is required for tenant-owned model operation (Assessment)');
    });

    it('rejects AssessmentSubmissionModel query without tenant context', async () => {
      await expect(
        AssessmentSubmissionModel.find({})
      ).rejects.toThrow('Tenant context is required for tenant-owned model operation (AssessmentSubmission)');
    });
  });

  describe('Cross-Tenant Read/Write Isolation', () => {
    it('creates batch and class under Tenant A, invisible and unmodifiable under Tenant B', async () => {
      let batchA: any;
      let classA: any;

      // Create in Tenant A
      await tenantContextStorage.run(
        { currentTenantId: tenantAId.toString(), isPlatformContext: false, allowedTenantIds: [tenantAId.toString()] },
        async () => {
          batchA = await BatchModel.create({
            tenantId: tenantAId,
            name: 'Batch Alpha 2026',
            batchCode: 'B-ALPHA-2026',
            courseId: courseAId,
            instructorId: instructorAId,
            mode: 'ONLINE',
            status: 'ONGOING',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 86400000),
            timing: { startTime: '10:00', endTime: '11:00', timezone: 'UTC' },
            daysOfWeek: ['MONDAY']
          });

          classA = await ClassModel.create({
            tenantId: tenantAId,
            batchId: batchA._id,
            courseId: courseAId,
            instructorId: instructorAId,
            name: 'Class Alpha 1',
            classCode: 'CLS-A1',
            scheduledStartAt: new Date(),
            scheduledEndAt: new Date(Date.now() + 3600000),
            startDate: new Date(),
            endDate: new Date(Date.now() + 3600000),
            timing: { startTime: '10:00', endTime: '11:00', timezone: 'UTC' },
            status: 'SCHEDULED',
            mode: 'ONLINE',
            capacity: 30,
            enrolledCount: 0
          });

          expect(batchA).toBeDefined();
          expect(classA).toBeDefined();
        }
      );

      // Attempt to read or modify from Tenant B
      await tenantContextStorage.run(
        { currentTenantId: tenantBId.toString(), isPlatformContext: false, allowedTenantIds: [tenantBId.toString()] },
        async () => {
          const foundBatch = await BatchModel.findById(batchA._id);
          expect(foundBatch).toBeNull();

          const foundClass = await ClassModel.findById(classA._id);
          expect(foundClass).toBeNull();

          const updateResult = await BatchModel.updateOne({ _id: batchA._id }, { $set: { name: 'Hacked Batch' } });
          expect(updateResult.matchedCount).toBe(0);

          const classUpdate = await ClassModel.updateOne({ _id: classA._id }, { $set: { name: 'Hacked Class' } });
          expect(classUpdate.matchedCount).toBe(0);
        }
      );

      // Verify intact under Tenant A
      await tenantContextStorage.run(
        { currentTenantId: tenantAId.toString(), isPlatformContext: false, allowedTenantIds: [tenantAId.toString()] },
        async () => {
          const originalBatch = await BatchModel.findById(batchA._id);
          expect(originalBatch?.name).toBe('Batch Alpha 2026');

          const originalClass = await ClassModel.findById(classA._id);
          expect(originalClass?.name).toBe('Class Alpha 1');
        }
      );
    });

    it('creates attendance session and record under Tenant A, completely isolated from Tenant B', async () => {
      let sessionA: any;
      let recordA: any;

      await tenantContextStorage.run(
        { currentTenantId: tenantAId.toString(), isPlatformContext: false, allowedTenantIds: [tenantAId.toString()] },
        async () => {
          sessionA = await AttendanceSessionModel.create({
            tenantId: tenantAId,
            classId: new mongoose.Types.ObjectId(),
            batchId: new mongoose.Types.ObjectId(),
            sessionDate: new Date(),
            scheduledSnapshot: {
              name: 'Class Alpha 1',
              mode: 'ONLINE',
              startDate: new Date(),
              startTime: '10:00',
              endTime: '11:00'
            },
            status: 'OPEN',
            openedAt: new Date(),
            openedBy: instructorAId
          });

          recordA = await AttendanceRecordModel.create({
            tenantId: tenantAId,
            classId: sessionA.classId,
            attendanceSessionId: sessionA._id,
            studentId: studentAId,
            status: 'PRESENT',
            recordedBy: instructorAId,
            markedAt: new Date()
          });
        }
      );

      // Under Tenant B, session and record must be completely invisible
      await tenantContextStorage.run(
        { currentTenantId: tenantBId.toString(), isPlatformContext: false, allowedTenantIds: [tenantBId.toString()] },
        async () => {
          expect(await AttendanceSessionModel.findById(sessionA._id)).toBeNull();
          expect(await AttendanceRecordModel.findById(recordA._id)).toBeNull();

          const deleteSession = await AttendanceSessionModel.deleteOne({ _id: sessionA._id });
          expect(deleteSession.deletedCount).toBe(0);

          const deleteRecord = await AttendanceRecordModel.deleteOne({ _id: recordA._id });
          expect(deleteRecord.deletedCount).toBe(0);
        }
      );
    });

    it('rejects document save with mismatched tenantId', async () => {
      await tenantContextStorage.run(
        { currentTenantId: tenantAId.toString(), isPlatformContext: false, allowedTenantIds: [tenantAId.toString()] },
        async () => {
          const mismatchedBatch = new BatchModel({
            tenantId: tenantBId, // conflicts with context tenantAId
            name: 'Mismatched Batch',
            batchCode: 'B-MISMATCH',
            courseId: courseAId,
            instructorId: instructorAId,
            mode: 'ONLINE',
            status: 'UPCOMING',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 86400000),
            timing: { startTime: '10:00', endTime: '11:00', timezone: 'UTC' },
            daysOfWeek: ['MONDAY']
          });

          await expect(mismatchedBatch.save()).rejects.toThrow();
        }
      );
    });
  });
});
