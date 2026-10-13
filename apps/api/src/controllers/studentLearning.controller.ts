import { Request, Response, NextFunction } from 'express';
import { StudentLearningService } from '../services/studentLearning.service';
import { tenantContextStorage } from '@edtech/utils';

export class StudentLearningController {
  /**
   * GET /api/v1/student/dashboard
   * Returns aggregated dashboard overview for authenticated student
   */
  static async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = tenantContextStorage.getStore();
      if (!ctx?.currentUserId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
      }

      const overview = await StudentLearningService.getDashboardOverview(ctx.currentUserId);

      return res.json({
        success: true,
        data: overview
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/student/courses/:courseId/resume
   * Returns canonical resumable lesson information for a course
   */
  static async getCourseResume(req: Request, res: Response, next: NextFunction) {
    try {
      const courseId = req.params.courseId as string;
      const ctx = tenantContextStorage.getStore();
      if (!ctx?.currentUserId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
      }

      const resumeInfo = await StudentLearningService.resolveCourseResume(ctx.currentUserId, courseId);
      if (!resumeInfo) {
        return res.status(404).json({
          success: false,
          error: { code: 'ENROLLMENT_NOT_FOUND', message: 'Student is not enrolled in this course' }
        });
      }

      return res.json({
        success: true,
        data: resumeInfo
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/student/courses/:courseId/overview
   * Returns student-safe course detail with modules, lessons, and progress
   */
  static async getCourseOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const courseId = req.params.courseId as string;
      const ctx = tenantContextStorage.getStore();
      if (!ctx?.currentUserId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
      }

      const overview = await StudentLearningService.getStudentCourseOverview(ctx.currentUserId, courseId);

      return res.json({
        success: true,
        data: overview
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/student/courses/:courseId/lessons/:lessonId/player
   * Returns full player payload for active lesson with curriculum sidebar
   */
  static async getLessonPlayer(req: Request, res: Response, next: NextFunction) {
    try {
      const courseId = req.params.courseId as string;
      const lessonId = req.params.lessonId as string;
      const ctx = tenantContextStorage.getStore();
      if (!ctx?.currentUserId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
      }

      const playerData = await StudentLearningService.getStudentLessonPlayer(ctx.currentUserId, courseId, lessonId);

      return res.json({
        success: true,
        data: playerData
      });
    } catch (error) {
      next(error);
    }
  }
}
