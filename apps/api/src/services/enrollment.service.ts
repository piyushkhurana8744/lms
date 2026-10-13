import { EnrollmentModel, CourseModel, LessonModel, AuditLogModel } from '@edtech/database';
import { tenantContextStorage } from '@edtech/utils';
import { ClientSession, Types } from 'mongoose';

export class EnrollmentService {
  /**
   * Enroll a student into a published workspace course.
   */
  static async enrollStudent(studentId: string, courseId: string, session?: ClientSession) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) {
      throw new Error('Tenant context required');
    }

    const tenantId = ctx.currentTenantId;

    // 1. Verify course exists in active tenant context and is PUBLISHED
    const course = await CourseModel.findOne({
      _id: courseId,
      tenantId,
      status: 'PUBLISHED'
    }).session(session || null).lean();

    if (!course) {
      const err = new Error('Course not found or not published');
      (err as any).statusCode = 404;
      (err as any).code = 'COURSE_NOT_FOUND';
      throw err;
    }

    // 2. Prevent duplicate active enrollment
    const existing = await EnrollmentModel.findOne({
      tenantId,
      studentId,
      courseId
    }).session(session || null).lean();

    if (existing) {
      if (existing.status === 'CANCELLED') {
        // Reactivate cancelled enrollment
        const reactivated = await EnrollmentModel.findByIdAndUpdate(
          existing._id,
          { $set: { status: 'ACTIVE', enrolledAt: new Date() } },
          { new: true, session }
        ).lean();

        await AuditLogModel.create([{
          tenantId,
          actorId: studentId,
          action: 'enrollment.created',
          resource: 'Enrollment',
          resourceId: existing._id.toString(),
          metadata: { courseId }
        }], { session });

        return reactivated;
      }
      return existing;
    }

    // 3. Count total active lessons in the course
    const totalLessons = await LessonModel.countDocuments({
      tenantId,
      courseId,
      status: 'ACTIVE'
    }).session(session || null);

    // 4. Create new Enrollment
    const [enrollment] = await EnrollmentModel.create([{
      tenantId,
      studentId,
      courseId,
      status: 'ACTIVE',
      enrolledAt: new Date(),
      progressPercent: 0,
      completedLessons: 0,
      totalLessons
    }], { session });

    // 5. Write Audit Log
    await AuditLogModel.create([{
      tenantId,
      actorId: studentId,
      action: 'enrollment.created',
      resource: 'Enrollment',
      resourceId: enrollment._id.toString(),
      metadata: { courseId, totalLessons }
    }], { session });

    return enrollment.toObject();
  }

  /**
   * Get all active enrollments for a specific student in current tenant.
   */
  static async getStudentEnrollments(studentId: string) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');

    const enrollments = await EnrollmentModel.find({
      tenantId: ctx.currentTenantId,
      studentId,
      status: { $ne: 'CANCELLED' }
    })
      .populate('courseId', 'title slug shortDescription thumbnailUrl level durationMinutes status')
      .sort({ updatedAt: -1 })
      .lean();

    return enrollments.map((e) => ({
      id: e._id.toString(),
      status: e.status,
      enrolledAt: e.enrolledAt,
      completedAt: e.completedAt,
      lastAccessedAt: e.lastAccessedAt,
      lastLessonId: e.lastLessonId?.toString() || null,
      progressPercent: e.progressPercent || 0,
      completedLessons: e.completedLessons || 0,
      totalLessons: e.totalLessons || 0,
      course: e.courseId ? {
        id: (e.courseId as any)._id.toString(),
        title: (e.courseId as any).title,
        slug: (e.courseId as any).slug,
        shortDescription: (e.courseId as any).shortDescription || '',
        thumbnailUrl: (e.courseId as any).thumbnailUrl || '',
        level: (e.courseId as any).level,
        durationMinutes: (e.courseId as any).durationMinutes || 0,
        status: (e.courseId as any).status
      } : null
    }));
  }

  /**
   * Get a single student enrollment for a specific course.
   */
  static async getStudentEnrollmentForCourse(studentId: string, courseId: string) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');

    const enrollment = await EnrollmentModel.findOne({
      tenantId: ctx.currentTenantId,
      studentId,
      courseId
    }).lean();

    if (!enrollment) return null;

    return {
      id: enrollment._id.toString(),
      tenantId: enrollment.tenantId.toString(),
      studentId: enrollment.studentId.toString(),
      courseId: enrollment.courseId.toString(),
      status: enrollment.status,
      enrolledAt: enrollment.enrolledAt,
      completedAt: enrollment.completedAt,
      lastAccessedAt: enrollment.lastAccessedAt,
      lastLessonId: enrollment.lastLessonId?.toString() || null,
      progressPercent: enrollment.progressPercent || 0,
      completedLessons: enrollment.completedLessons || 0,
      totalLessons: enrollment.totalLessons || 0
    };
  }

  /**
   * Get all enrollments for a course (Admin view).
   */
  static async getCourseEnrollments(courseId: string) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');

    const enrollments = await EnrollmentModel.find({
      tenantId: ctx.currentTenantId,
      courseId
    })
      .populate('studentId', 'name email avatarUrl')
      .sort({ createdAt: -1 })
      .lean();

    return enrollments.map((e) => ({
      id: e._id.toString(),
      status: e.status,
      enrolledAt: e.enrolledAt,
      completedAt: e.completedAt,
      lastAccessedAt: e.lastAccessedAt,
      progressPercent: e.progressPercent || 0,
      completedLessons: e.completedLessons || 0,
      totalLessons: e.totalLessons || 0,
      student: e.studentId ? {
        id: (e.studentId as any)._id.toString(),
        name: (e.studentId as any).name,
        email: (e.studentId as any).email,
        avatarUrl: (e.studentId as any).avatarUrl || ''
      } : null
    }));
  }

  /**
   * Cancel an enrollment (Admin or Student).
   */
  static async cancelEnrollment(enrollmentId: string, actorId: string) {
    const ctx = tenantContextStorage.getStore();
    if (!ctx?.currentTenantId) throw new Error('Tenant context required');

    const updated = await EnrollmentModel.findOneAndUpdate(
      { _id: enrollmentId, tenantId: ctx.currentTenantId },
      { $set: { status: 'CANCELLED' } },
      { new: true }
    ).lean();

    if (!updated) {
      const err = new Error('Enrollment record not found');
      (err as any).statusCode = 404;
      (err as any).code = 'ENROLLMENT_NOT_FOUND';
      throw err;
    }

    await AuditLogModel.create({
      tenantId: ctx.currentTenantId,
      actorId,
      action: 'enrollment.cancelled',
      resourceType: 'Enrollment',
      resourceId: enrollmentId,
      metadata: { courseId: updated.courseId.toString() }
    });

    return updated;
  }
}
