import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ApiResponse } from '../utils/apiResponse';
import { analyticsService } from '../services/analytics.service';
import {
  ExecutiveDashboardQuerySchema,
  StudentsAnalyticsQuerySchema,
  CRMAnalyticsQuerySchema,
  FinanceAnalyticsQuerySchema,
  AnalyticsAttendanceQuerySchema,
  AcademicsAnalyticsQuerySchema,
  LearningAnalyticsQuerySchema,
  InstructorsAnalyticsQuerySchema,
  BranchComparisonQuerySchema,
  AnalyticsReportQuerySchema,
  AnalyticsExportSchema,
} from '@edtech/validation';

export class AnalyticsController {
  private static extractContext(req: AuthenticatedRequest) {
    const tenantId = req.user?.activeTenantId || req.user?.tenantId || '';
    const actor = {
      userId: req.user?.userId || req.user?.id || '',
      isSuperAdmin: req.user?.isSuperAdmin || false,
      permissions: req.user?.permissions || [],
      roles: req.user?.roles || [],
    };
    return { tenantId, actor };
  }

  public static async getExecutiveDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, actor } = AnalyticsController.extractContext(req as AuthenticatedRequest);
      const query = ExecutiveDashboardQuerySchema.parse(req.query);
      const result = await analyticsService.getExecutiveDashboard(tenantId, actor, query as any);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  public static async getStudentsAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, actor } = AnalyticsController.extractContext(req as AuthenticatedRequest);
      const query = StudentsAnalyticsQuerySchema.parse(req.query);
      const result = await analyticsService.getStudentsAnalytics(tenantId, actor, query as any);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  public static async getCRMAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, actor } = AnalyticsController.extractContext(req as AuthenticatedRequest);
      const query = CRMAnalyticsQuerySchema.parse(req.query);
      const result = await analyticsService.getCRMAnalytics(tenantId, actor, query as any);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  public static async getFinanceAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, actor } = AnalyticsController.extractContext(req as AuthenticatedRequest);
      const query = FinanceAnalyticsQuerySchema.parse(req.query);
      const result = await analyticsService.getFinanceAnalytics(tenantId, actor, query as any);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  public static async getAttendanceAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, actor } = AnalyticsController.extractContext(req as AuthenticatedRequest);
      const query = AnalyticsAttendanceQuerySchema.parse(req.query);
      const result = await analyticsService.getAttendanceAnalytics(tenantId, actor, query as any);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  public static async getAcademicsAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, actor } = AnalyticsController.extractContext(req as AuthenticatedRequest);
      const query = AcademicsAnalyticsQuerySchema.parse(req.query);
      const result = await analyticsService.getAcademicsAnalytics(tenantId, actor, query as any);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  public static async getLearningAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, actor } = AnalyticsController.extractContext(req as AuthenticatedRequest);
      const query = LearningAnalyticsQuerySchema.parse(req.query);
      const result = await analyticsService.getLearningAnalytics(tenantId, actor, query as any);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  public static async getInstructorsAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, actor } = AnalyticsController.extractContext(req as AuthenticatedRequest);
      const query = InstructorsAnalyticsQuerySchema.parse(req.query);
      const result = await analyticsService.getInstructorsAnalytics(tenantId, actor, query as any);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  public static async getBranchComparison(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, actor } = AnalyticsController.extractContext(req as AuthenticatedRequest);
      const query = BranchComparisonQuerySchema.parse(req.query);
      const result = await analyticsService.getBranchComparison(tenantId, actor, query as any);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  public static async getReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, actor } = AnalyticsController.extractContext(req as AuthenticatedRequest);
      const rawKey = String(req.params.reportKey || '').toUpperCase();
      const query = AnalyticsReportQuerySchema.parse({ ...req.query, reportKey: rawKey });
      const result = await analyticsService.getReport(tenantId, actor, rawKey, query as any);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  public static async createExport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, actor } = AnalyticsController.extractContext(req as AuthenticatedRequest);
      const rawKey = String(req.body.reportKey || '').toUpperCase();
      const payload = AnalyticsExportSchema.parse({ ...req.body, reportKey: rawKey });
      const result = await analyticsService.createExport(tenantId, actor, payload as any);
      ApiResponse.success(res, result, 'Export generated successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  public static async getExport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, actor } = AnalyticsController.extractContext(req as AuthenticatedRequest);
      const exportId = String(req.params.exportId);
      const result = await analyticsService.getExport(tenantId, actor, exportId);
      
      // If client requests raw download via query param or header
      if (req.query.download === 'true' && result.csv) {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${(result.exportRecord?.reportKey || 'export').toLowerCase()}_export.csv"`);
        res.status(200).send(result.csv);
        return;
      }

      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  public static async listExports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, actor } = AnalyticsController.extractContext(req as AuthenticatedRequest);
      const result = await analyticsService.listExports(tenantId, actor);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }
}
