import { Request, Response, NextFunction } from 'express';
import { LessonProgressService } from '../services/progress.service';
import { tenantContextStorage } from '@edtech/utils';

export class ProgressController {
  /**
   * GET /api/v1/student/courses/:courseId/progress
   */
  static async getCourseProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const courseId = req.params.courseId as string;
      const ctx = tenantContextStorage.getStore();
      if (!ctx?.currentUserId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
      }

      const progress = await LessonProgressService.getStudentCourseProgress(ctx.currentUserId, courseId);

      return res.json({
        success: true,
        data: progress
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/student/courses/:courseId/lessons/:lessonId/progress
   */
  static async getLessonProgress(req: Request, res: Response, next: NextFunction) {
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

      const progress = await LessonProgressService.getLessonProgress(ctx.currentUserId, courseId, lessonId);

      return res.json({
        success: true,
        data: progress || { status: 'NOT_STARTED', lastPositionSeconds: 0 }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/student/courses/:courseId/lessons/:lessonId/progress
   */
  static async updateLessonProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const courseId = req.params.courseId as string;
      const lessonId = req.params.lessonId as string;
      const { positionSeconds } = req.body || {};
      const ctx = tenantContextStorage.getStore();

      if (!ctx?.currentUserId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
      }

      const updated = await LessonProgressService.updateLessonProgress(
        ctx.currentUserId,
        courseId,
        lessonId,
        positionSeconds || 0
      );

      return res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/student/courses/:courseId/lessons/:lessonId/complete
   */
  static async completeLesson(req: Request, res: Response, next: NextFunction) {
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

      const result = await LessonProgressService.completeLesson(ctx.currentUserId, courseId, lessonId);

      return res.json({
        success: true,
        data: result,
        message: 'Lesson completed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}
