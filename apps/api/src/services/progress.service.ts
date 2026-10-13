import { LessonProgressModel, EnrollmentModel, LessonModel, CourseModuleModel, AuditLogModel } from '@edtech/database';
import { tenantContextStorage } from '@edtech/utils';

export class LessonProgressService {
  /**
   * Get all lesson progress records and aggregated statistics for a student in a course.
   */
  static async getStudentCourseProgress(studentId: string, courseId: string) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');

    const tenantId = ctx.currentTenantId;

    const enrollment = await EnrollmentModel.findOne({
      tenantId,
      studentId,
      courseId
    }).lean();

    if (!enrollment) {
      const err = new Error('Enrollment not found');
      (err as any).statusCode = 404;
      (err as any).code = 'ENROLLMENT_NOT_FOUND';
      throw err;
    }

    const lessonProgresses = await LessonProgressModel.find({
      tenantId,
      studentId,
      courseId
    }).lean();

    return {
      progressPercent: enrollment.progressPercent || 0,
      completedLessons: enrollment.completedLessons || 0,
      totalLessons: enrollment.totalLessons || 0,
      lastLessonId: enrollment.lastLessonId?.toString() || null,
      lessonProgresses: lessonProgresses.map((lp) => ({
        id: lp._id.toString(),
        lessonId: lp.lessonId.toString(),
        moduleId: lp.moduleId.toString(),
        status: lp.status,
        startedAt: lp.startedAt,
        completedAt: lp.completedAt,
        lastPositionSeconds: lp.lastPositionSeconds || 0
      }))
    };
  }

  /**
   * Get progress for a single lesson.
   */
  static async getLessonProgress(studentId: string, courseId: string, lessonId: string) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');

    const lp = await LessonProgressModel.findOne({
      tenantId: ctx.currentTenantId,
      studentId,
      lessonId
    }).lean();

    if (!lp) return null;

    return {
      id: lp._id.toString(),
      lessonId: lp.lessonId.toString(),
      moduleId: lp.moduleId.toString(),
      status: lp.status,
      startedAt: lp.startedAt,
      completedAt: lp.completedAt,
      lastPositionSeconds: lp.lastPositionSeconds || 0
    };
  }

  /**
   * Update position/watch time on a lesson in progress.
   */
  static async updateLessonProgress(studentId: string, courseId: string, lessonId: string, positionSeconds: number) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');

    const tenantId = ctx.currentTenantId;

    // 1. Verify active enrollment
    const enrollment = await EnrollmentModel.findOne({
      tenantId,
      studentId,
      courseId,
      status: { $ne: 'CANCELLED' }
    }).lean();

    if (!enrollment) {
      const err = new Error('Active enrollment required to update lesson progress');
      (err as any).statusCode = 403;
      (err as any).code = 'ENROLLMENT_REQUIRED';
      throw err;
    }

    // 2. Verify lesson
    const lesson = await LessonModel.findOne({
      _id: lessonId,
      tenantId,
      courseId,
      status: 'ACTIVE'
    }).lean();

    if (!lesson) {
      const err = new Error('Lesson not found or inactive');
      (err as any).statusCode = 404;
      (err as any).code = 'LESSON_NOT_FOUND';
      throw err;
    }

    // 3. Upsert LessonProgress
    const existing = await LessonProgressModel.findOne({ tenantId, studentId, lessonId }).lean();
    const newStatus = existing?.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS';

    const updatedLp = await LessonProgressModel.findOneAndUpdate(
      { tenantId, studentId, lessonId },
      {
        $set: {
          courseId,
          moduleId: lesson.moduleId,
          status: newStatus,
          lastPositionSeconds: positionSeconds,
          startedAt: existing?.startedAt || new Date()
        }
      },
      { upsert: true, new: true }
    ).lean();

    // 4. Update lastAccessedAt and lastLessonId on Enrollment
    await EnrollmentModel.findByIdAndUpdate(enrollment._id, {
      $set: {
        lastAccessedAt: new Date(),
        lastLessonId: lessonId
      }
    });

    return {
      id: updatedLp._id.toString(),
      lessonId: updatedLp.lessonId.toString(),
      status: updatedLp.status,
      lastPositionSeconds: updatedLp.lastPositionSeconds
    };
  }

  /**
   * Mark a lesson as COMPLETED and recalculate course progress.
   */
  static async completeLesson(studentId: string, courseId: string, lessonId: string) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');

    const tenantId = ctx.currentTenantId;

    // 1. Verify active enrollment
    const enrollment = await EnrollmentModel.findOne({
      tenantId,
      studentId,
      courseId,
      status: { $ne: 'CANCELLED' }
    }).lean();

    if (!enrollment) {
      const err = new Error('Active enrollment required to complete lesson');
      (err as any).statusCode = 403;
      (err as any).code = 'ENROLLMENT_REQUIRED';
      throw err;
    }

    // 2. Verify active lesson
    const lesson = await LessonModel.findOne({
      _id: lessonId,
      tenantId,
      courseId,
      status: 'ACTIVE'
    }).lean();

    if (!lesson) {
      const err = new Error('Active lesson not found in this course');
      (err as any).statusCode = 404;
      (err as any).code = 'LESSON_NOT_FOUND';
      throw err;
    }

    // 3. Upsert LessonProgress to COMPLETED status
    await LessonProgressModel.findOneAndUpdate(
      { tenantId, studentId, lessonId },
      {
        $set: {
          courseId,
          moduleId: lesson.moduleId,
          status: 'COMPLETED',
          completedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    // 4. Recalculate Course Progress based on ACTIVE lessons only
    const activeLessons = await LessonModel.find({
      tenantId,
      courseId,
      status: 'ACTIVE'
    }).select('_id').lean();

    const totalActiveLessons = activeLessons.length;
    const activeLessonIds = activeLessons.map((l) => l._id);

    const completedCount = await LessonProgressModel.countDocuments({
      tenantId,
      studentId,
      lessonId: { $in: activeLessonIds },
      status: 'COMPLETED'
    });

    const progressPercent = totalActiveLessons > 0
      ? Math.min(100, Math.round((completedCount / totalActiveLessons) * 100))
      : 100;

    const isCourseFinished = totalActiveLessons > 0 && completedCount >= totalActiveLessons;

    const updatedEnrollment = await EnrollmentModel.findByIdAndUpdate(
      enrollment._id,
      {
        $set: {
          completedLessons: completedCount,
          totalLessons: totalActiveLessons,
          progressPercent,
          lastLessonId: lessonId,
          lastAccessedAt: new Date(),
          ...(isCourseFinished ? { status: 'COMPLETED', completedAt: new Date() } : {})
        }
      },
      { new: true }
    ).lean();

    // 5. Write Audit Log
    await AuditLogModel.create({
      tenantId,
      actorId: studentId,
      action: 'lesson.completed',
      resourceType: 'Lesson',
      resourceId: lessonId,
      metadata: { courseId, progressPercent, completedCount, totalActiveLessons }
    });

    return {
      progressPercent,
      completedLessons: completedCount,
      totalLessons: totalActiveLessons,
      isCourseCompleted: isCourseFinished,
      enrollmentStatus: updatedEnrollment?.status
    };
  }
}
