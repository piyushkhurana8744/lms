import { Response } from 'express';
import { CourseService } from '../services/course.service';
import { ApiResponse } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { CreateCourseSchema, UpdateCourseSchema, CourseQueryFilterSchema } from '@edtech/validation';

export class CourseController {
  public static async listCourses(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const validatedQuery = CourseQueryFilterSchema.parse(req.query);
    const result = await CourseService.listCourses(validatedQuery);
    return ApiResponse.success(res, result.courses, 'Courses list fetched successfully', 200, result.meta);
  }

  public static async getCourseById(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const courseId = req.params.courseId as string;
    const course = await CourseService.getCourseById(courseId);
    return ApiResponse.success(res, course, 'Course details fetched successfully');
  }

  public static async createCourse(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const validatedBody = CreateCourseSchema.parse(req.body);
    const course = await CourseService.createCourse(validatedBody);
    return ApiResponse.success(res, course, 'Course created successfully', 201);
  }

  public static async updateCourse(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const courseId = req.params.courseId as string;
    const validatedBody = UpdateCourseSchema.parse(req.body);
    const course = await CourseService.updateCourse(courseId, validatedBody);
    return ApiResponse.success(res, course, 'Course updated successfully');
  }

  public static async archiveCourse(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const courseId = req.params.courseId as string;
    const result = await CourseService.deleteCourse(courseId);
    return ApiResponse.success(res, result, 'Course archived successfully');
  }
}
