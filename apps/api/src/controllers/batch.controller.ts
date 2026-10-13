import { Request, Response, NextFunction } from 'express';
import { BatchService } from '../services/batch.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { tenantContextStorage } from '@edtech/utils';

export class BatchController {
  public static async listBatches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await BatchService.listBatches(req.query);
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

  public static async getBatchById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const batchId = req.params.batchId as string;
      const data = await BatchService.getBatchById(batchId);
      res.json({
        success: true,
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async createBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const user=(req as AuthenticatedRequest).user!;
      const data = await BatchService.createBatch(actorId, req.body, {userId:actorId,isSuperAdmin:user.isSuperAdmin});
      res.status(201).json({
        success: true,
        data,
        message: 'Batch created successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const batchId = req.params.batchId as string;
      const user=(req as AuthenticatedRequest).user!;
      const data = await BatchService.updateBatch(actorId, batchId, req.body, {userId:actorId,isSuperAdmin:user.isSuperAdmin});
      res.json({
        success: true,
        data,
        message: 'Batch updated successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const batchId = req.params.batchId as string;
      const result = await BatchService.deleteBatch(actorId, batchId);
      res.json({
        success: true,
        message: result.message,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public Batches API handler.
   */
  public static async listPublicBatches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId =
        req.publicTenantContext?.tenantId?.toString() ||
        (req as any).tenantId ||
        tenantContextStorage.getStore()?.currentTenantId ||
        '';
      const { courseSlug, courseId, mode } = req.query as { courseSlug?: string; courseId?: string; mode?: string };
      const data = await BatchService.listPublicBatches(tenantId, { courseSlug, courseId, mode });
      res.json({
        success: true,
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public Batches for a specific course slug.
   */
  public static async listCoursePublicBatches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId =
        req.publicTenantContext?.tenantId?.toString() ||
        (req as any).tenantId ||
        tenantContextStorage.getStore()?.currentTenantId ||
        '';
      const courseSlug = req.params.slug as string;
      const { mode } = req.query as { mode?: string };
      const data = await BatchService.listPublicBatches(tenantId, { courseSlug, mode });
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
