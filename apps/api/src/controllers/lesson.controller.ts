import { Response } from 'express';
import { LessonService } from '../services/lesson.service';
import { ApiResponse } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { CreateLessonSchema, UpdateLessonSchema, ReorderLessonsSchema } from '@edtech/validation';

export class LessonController {
  public static async listLessons(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const courseId = req.params.courseId as string;
    const moduleId = req.params.moduleId as string;
    const lessons = await LessonService.listLessons(courseId, moduleId);
    return ApiResponse.success(res, lessons, 'Module lessons fetched successfully');
  }

  public static async getLessonById(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const courseId = req.params.courseId as string;
    const moduleId = req.params.moduleId as string;
    const lessonId = req.params.lessonId as string;
    const lesson = await LessonService.getLessonById(courseId, moduleId, lessonId);
    return ApiResponse.success(res, lesson, 'Lesson details fetched successfully');
  }

  public static async createLesson(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const courseId = req.params.courseId as string;
    const moduleId = req.params.moduleId as string;
    const validatedBody = CreateLessonSchema.parse(req.body);
    const lesson = await LessonService.createLesson(courseId, moduleId, validatedBody);
    return ApiResponse.success(res, lesson, 'Lesson created successfully', 201);
  }

  public static async updateLesson(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const courseId = req.params.courseId as string;
    const moduleId = req.params.moduleId as string;
    const lessonId = req.params.lessonId as string;
    const validatedBody = UpdateLessonSchema.parse(req.body);
    const lesson = await LessonService.updateLesson(courseId, moduleId, lessonId, validatedBody);
    return ApiResponse.success(res, lesson, 'Lesson updated successfully');
  }

  public static async archiveLesson(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const courseId = req.params.courseId as string;
    const moduleId = req.params.moduleId as string;
    const lessonId = req.params.lessonId as string;
    const result = await LessonService.archiveLesson(courseId, moduleId, lessonId);
    return ApiResponse.success(res, result, 'Lesson archived successfully');
  }

  public static async reorderLessons(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const courseId = req.params.courseId as string;
    const moduleId = req.params.moduleId as string;
    const validatedBody = ReorderLessonsSchema.parse(req.body);
    const lessons = await LessonService.reorderLessons(courseId, moduleId, validatedBody.lessonIds);
    return ApiResponse.success(res, lessons, 'Lessons reordered successfully');
  }
}
