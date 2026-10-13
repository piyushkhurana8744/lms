import { Request, Response, NextFunction } from 'express';
import { CoursePublishingService } from '../services/coursePublishing.service';

export class CoursePublishingController {
  public static async getCourseReadiness(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const courseId = String(req.params.courseId);
      const readiness = await CoursePublishingService.validateCourseReadiness(courseId);

      res.json({
        success: true,
        data: readiness,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async submitForReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const courseId = String(req.params.courseId);
      const course = await CoursePublishingService.submitForReview(courseId);

      res.json({
        success: true,
        data: course,
        message: 'Course submitted for review successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async publishCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const courseId = String(req.params.courseId);
      const course = await CoursePublishingService.publishCourse(courseId);

      res.json({
        success: true,
        data: course,
        message: 'Course published successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async unpublishCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const courseId = String(req.params.courseId);
      const course = await CoursePublishingService.unpublishCourse(courseId);

      res.json({
        success: true,
        data: course,
        message: 'Course unpublished successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }
}
