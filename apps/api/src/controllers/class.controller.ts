import { Request, Response, NextFunction } from 'express';
import { ClassService } from '../services/class.service';
import { tenantContextStorage } from '@edtech/utils';

export class ClassController {
  public static async listClasses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ClassService.listClasses(req.query);
      res.json({
        success: true,
        data: result.data,
        stats: result.stats,
        pagination: result.pagination,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getClass(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const classId = String(req.params.id);
      const data = await ClassService.getClassById(classId);
      res.json({
        success: true,
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async createClass(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await ClassService.createClass(req.body);
      res.status(201).json({
        success: true,
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateClass(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const classId = String(req.params.id);
      const data = await ClassService.updateClass(classId, req.body);
      res.json({
        success: true,
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteClass(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const classId = String(req.params.id);
      await ClassService.deleteClass(classId);
      res.json({
        success: true,
        message: 'Class deleted successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Enroll a student into a Class with strict capacity check
   */
  public static async enrollStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const classId = String(req.params.id);
      const data = await ClassService.enrollStudent(classId, req.body);
      res.json({
        success: true,
        data,
        message: 'Student enrolled successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Unenroll a student from a Class (frees up a seat)
   */
  public static async unenrollStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const classId = String(req.params.id);
      const studentId = String(req.params.studentId || req.body.studentId);
      const data = await ClassService.unenrollStudent(classId, studentId);
      res.json({
        success: true,
        data,
        message: 'Student unenrolled successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public Classes API handler for visitors
   */
  public static async listPublicClasses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId =
        req.publicTenantContext?.tenantId?.toString() ||
        (req as any).tenantId ||
        tenantContextStorage.getStore()?.currentTenantId ||
        '';
      const { courseSlug, courseId, mode } = req.query as { courseSlug?: string; courseId?: string; mode?: string };
      const data = await ClassService.listPublicClasses(tenantId, { courseSlug, courseId, mode });
      res.json({
        success: true,
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }
}
