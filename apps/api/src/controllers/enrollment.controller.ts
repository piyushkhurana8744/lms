import { Request, Response, NextFunction } from 'express';
import { EnrollmentService } from '../services/enrollment.service';
import { tenantContextStorage } from '@edtech/utils';

export class EnrollmentController {
  /**
   * POST /api/v1/courses/:courseId/enroll
   * Enrolls the authenticated student into the course
   */
  static async enrollInCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const courseId = req.params.courseId as string;
      const ctx = tenantContextStorage.getStore();

      if (!ctx?.currentUserId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
      }

      const enrollment = await EnrollmentService.enrollStudent(ctx.currentUserId, courseId);

      return res.status(201).json({
        success: true,
        data: enrollment,
        message: 'Successfully enrolled in course'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/student/enrollments
   * Returns all enrollments for authenticated student
   */
  static async getMyEnrollments(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = tenantContextStorage.getStore();
      if (!ctx?.currentUserId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
      }

      const enrollments = await EnrollmentService.getStudentEnrollments(ctx.currentUserId);

      return res.json({
        success: true,
        data: enrollments
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/student/enrollments/:courseId
   * Returns student's enrollment record for a specific course
   */
  static async getMyEnrollmentForCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const courseId = req.params.courseId as string;
      const ctx = tenantContextStorage.getStore();
      if (!ctx?.currentUserId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
      }

      const enrollment = await EnrollmentService.getStudentEnrollmentForCourse(ctx.currentUserId, courseId);
      if (!enrollment) {
        return res.status(404).json({
          success: false,
          error: { code: 'ENROLLMENT_NOT_FOUND', message: 'Not enrolled in this course' }
        });
      }

      return res.json({
        success: true,
        data: enrollment
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/courses/:courseId/enrollments
   * Admin view for listing enrollments in a course
   */
  static async getCourseEnrollments(req: Request, res: Response, next: NextFunction) {
    try {
      const courseId = req.params.courseId as string;
      const enrollments = await EnrollmentService.getCourseEnrollments(courseId);

      return res.json({
        success: true,
        data: enrollments
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/courses/:courseId/enrollments/:enrollmentId
   * Cancels an enrollment
   */
  static async cancelEnrollment(req: Request, res: Response, next: NextFunction) {
    try {
      const enrollmentId = req.params.enrollmentId as string;
      const ctx = tenantContextStorage.getStore();

      const cancelled = await EnrollmentService.cancelEnrollment(enrollmentId, ctx?.currentUserId || 'system');

      return res.json({
        success: true,
        data: cancelled,
        message: 'Enrollment cancelled successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}
