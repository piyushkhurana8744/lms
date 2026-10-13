import { Response } from 'express';
import { CourseModuleService } from '../services/courseModule.service';
import { ApiResponse } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { CreateModuleSchema, UpdateModuleSchema, ReorderModulesSchema } from '@edtech/validation';

export class CourseModuleController {
  public static async listModules(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const courseId = req.params.courseId as string;
    const modules = await CourseModuleService.listModules(courseId);
    return ApiResponse.success(res, modules, 'Course modules fetched successfully');
  }

  public static async getModuleById(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const courseId = req.params.courseId as string;
    const moduleId = req.params.moduleId as string;
    const module = await CourseModuleService.getModuleById(courseId, moduleId);
    return ApiResponse.success(res, module, 'Module details fetched successfully');
  }

  public static async createModule(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const courseId = req.params.courseId as string;
    const validatedBody = CreateModuleSchema.parse(req.body);
    const module = await CourseModuleService.createModule(courseId, validatedBody);
    return ApiResponse.success(res, module, 'Course module created successfully', 201);
  }

  public static async updateModule(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const courseId = req.params.courseId as string;
    const moduleId = req.params.moduleId as string;
    const validatedBody = UpdateModuleSchema.parse(req.body);
    const module = await CourseModuleService.updateModule(courseId, moduleId, validatedBody);
    return ApiResponse.success(res, module, 'Course module updated successfully');
  }

  public static async archiveModule(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const courseId = req.params.courseId as string;
    const moduleId = req.params.moduleId as string;
    const result = await CourseModuleService.archiveModule(courseId, moduleId);
    return ApiResponse.success(res, result, 'Course module archived successfully');
  }

  public static async reorderModules(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const courseId = req.params.courseId as string;
    const validatedBody = ReorderModulesSchema.parse(req.body);
    const modules = await CourseModuleService.reorderModules(courseId, validatedBody.moduleIds);
    return ApiResponse.success(res, modules, 'Course modules reordered successfully');
  }
}
