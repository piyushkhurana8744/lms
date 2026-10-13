import { Request, Response, NextFunction } from 'express';
import { FinanceService } from '../services/finance.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  CreateFeeStructureSchema,
  UpdateFeeStructureSchema,
  CreateStudentFeePlanSchema,
  RecordManualPaymentSchema,
  CreateOnlineOrderSchema,
  VerifyOnlinePaymentSchema,
  RequestRefundSchema,
  UpdatePaymentGatewayConfigSchema,
  FeePlanQuerySchema,
  PaymentQuerySchema,
  DueQuerySchema
  ,ReversePaymentSchema
} from '@edtech/validation';
import { ReceiptArtifactService } from '../services/receiptArtifact.service';

export class FinanceController {
  public static async downloadReceiptArtifact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { await FinanceController.sendReceiptDownload(res, await ReceiptArtifactService.getDownload(String(req.params.id))); } catch (error) { next(error); }
  }
  public static async downloadStudentReceiptArtifact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentUserId = (req as AuthenticatedRequest).user?.userId || '';
      await FinanceController.sendReceiptDownload(res, await ReceiptArtifactService.getDownload(String(req.params.id), studentUserId));
    } catch (error) { next(error); }
  }
  private static async sendReceiptDownload(res: Response, result: any): Promise<void> {
    if (result.buffer) {
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Length', String(result.buffer.length));
      res.status(200).send(result.buffer);
      return;
    }
    res.json({ success: true, data: result, error: null });
  }
  public static async getFinanceOperations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await FinanceService.getFinanceOperations(), error: null }); } catch (error) { next(error); }
  }
  public static async getFinanceReadiness(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ success: true, data: await FinanceService.getFinanceReadiness(), error: null }); } catch (error) { next(error); }
  }
  public static async reconcilePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const actorId = (req as AuthenticatedRequest).user?.userId || ''; res.json({ success: true, data: await FinanceService.reconcilePayment(String(req.params.id), actorId), error: null }); } catch (error) { next(error); }
  }
  public static async reconcileRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const actorId = (req as AuthenticatedRequest).user?.userId || ''; res.json({ success: true, data: await FinanceService.reconcileRefund(String(req.params.id), actorId), error: null }); } catch (error) { next(error); }
  }
  public static async reverseManualPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const { reason } = ReversePaymentSchema.parse(req.body);
      const payment = await FinanceService.reverseManualPayment(String(req.params.id), reason, actorId);
      res.json({ success: true, data: payment, error: null });
    } catch (error) { next(error); }
  }
  // ==========================================
  // DASHBOARD & SUMMARY
  // ==========================================

  public static async getDashboardMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await FinanceService.getDashboardMetrics();
      res.json({
        success: true,
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // FEE STRUCTURES (TEMPLATES)
  // ==========================================

  public static async createFeeStructure(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const payload = CreateFeeStructureSchema.parse(req.body);
      const structure = await FinanceService.createFeeStructure(payload as any, actorId);
      res.status(201).json({
        success: true,
        data: structure,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async listFeeStructures(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const courseId = req.query.courseId as string | undefined;
      const structures = await FinanceService.listFeeStructures(courseId);
      res.json({
        success: true,
        data: structures,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getFeeStructureById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const structure = await FinanceService.getFeeStructureById(req.params.id as string);
      res.json({
        success: true,
        data: structure,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }


  // ==========================================
  // STUDENT FEE PLANS (CONTRACTUAL SNAPSHOTS)
  // ==========================================

  public static async createStudentFeePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const payload = CreateStudentFeePlanSchema.parse(req.body);
      const feePlan = await FinanceService.createStudentFeePlan(payload as any, actorId);
      res.status(201).json({
        success: true,
        data: feePlan,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getStudentFeePlans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = FeePlanQuerySchema.parse(req.query);
      const result = await FinanceService.getStudentFeePlans(filters as any);
      res.json({
        success: true,
        data: result.plans,
        pagination: result.pagination,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getStudentFeePlanById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const auth = (req as AuthenticatedRequest).user;
      const ownerId = auth?.roles.includes('STUDENT') ? auth.userId : undefined;
      const result = await FinanceService.getStudentFeePlanById(req.params.id as string, ownerId);
      res.json({
        success: true,
        data: result,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }


  // ==========================================
  // PAYMENT COLLECTION & VERIFICATION
  // ==========================================

  public static async recordManualPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const payload = RecordManualPaymentSchema.parse(req.body);
      const result = await FinanceService.recordManualPayment(payload as any, actorId);
      res.status(201).json({
        success: true,
        data: result,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async createOnlineOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentUserId = (req as AuthenticatedRequest).user?.userId || '';
      const payload = CreateOnlineOrderSchema.parse(req.body);
      const order = await FinanceService.createOnlinePaymentOrder(payload as any, studentUserId);
      res.status(201).json({
        success: true,
        data: order,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async verifyOnlinePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const payload = VerifyOnlinePaymentSchema.parse(req.body);
      const result = await FinanceService.verifyAndCompleteOnlinePayment(payload, actorId);
      res.json({
        success: true,
        data: result,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = PaymentQuerySchema.parse(req.query);
      const result = await FinanceService.getPayments(filters as any);
      res.json({
        success: true,
        data: result.payments,
        pagination: result.pagination,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // RECEIPTS
  // ==========================================

  public static async getReceiptById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const receipt = await FinanceService.getReceiptById(req.params.id as string);
      res.json({
        success: true,
        data: receipt,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getReceipts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentFeePlanId = req.query.studentFeePlanId as string | undefined;
      const receipts = await FinanceService.getReceipts(studentFeePlanId);
      res.json({
        success: true,
        data: receipts,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // REFUNDS
  // ==========================================

  public static async requestRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const payload = RequestRefundSchema.parse(req.body);
      const refund = await FinanceService.requestRefund(payload as any, actorId);
      res.status(201).json({
        success: true,
        data: refund,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getRefunds(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const result = await FinanceService.getRefunds(page, limit);
      res.json({
        success: true,
        data: result.refunds,
        pagination: result.pagination,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // DUES QUEUE
  // ==========================================

  public static async getDuesQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = DueQuerySchema.parse(req.query);
      const result = await FinanceService.getDuesQueue(filters as any);
      res.json({
        success: true,
        data: result.dues,
        pagination: result.pagination,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // PAYMENT GATEWAY CONFIG
  // ==========================================

  public static async getPaymentGatewayConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const config = await FinanceService.getPaymentGatewayConfig();
      res.json({
        success: true,
        data: config,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updatePaymentGatewayConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const payload = UpdatePaymentGatewayConfigSchema.parse(req.body);
      const config = await FinanceService.updatePaymentGatewayConfig(payload, actorId);
      res.json({
        success: true,
        data: config,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // STUDENT SELF-SERVICE FINANCE
  // ==========================================

  public static async getStudentFeesOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentUserId = (req as AuthenticatedRequest).user?.userId || '';
      const data = await FinanceService.getStudentSelfFinanceOverview(studentUserId);
      res.json({
        success: true,
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getStudentReceiptById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentUserId = (req as AuthenticatedRequest).user?.userId || '';
      const receipt = await FinanceService.getReceiptById(req.params.id as string, studentUserId);
      res.json({
        success: true,
        data: receipt,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }
}
