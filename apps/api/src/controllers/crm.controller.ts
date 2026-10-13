import { Request, Response, NextFunction } from 'express';
import { CRMService } from '../services/crm.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { tenantContextStorage } from '@edtech/utils';
import {
  CreateLeadSchema,
  UpdateLeadSchema,
  ChangeLeadStageSchema,
  AssignLeadSchema,
  AddLeadNoteSchema,
  ScheduleFollowUpSchema,
  CompleteFollowUpSchema,
  CreateAdmissionSchema,
  ConvertAdmissionSchema,
  LeadFilterSchema,
  FollowUpFilterSchema,
  AdmissionFilterSchema,
  PublicLeadInquirySchema
} from '@edtech/validation';
import { BadRequestError } from '../errors/appError';

export class CRMController {
  public static async reassignLeadBranch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const user=(req as AuthenticatedRequest).user!; const branchId=String(req.body?.branchId||''); const reason=String(req.body?.reason||'').trim(); if(!branchId||reason.length<2) throw new BadRequestError('branchId and reason are required'); const data=await CRMService.reassignLeadBranch(String(req.params.leadId),branchId,reason,{userId:user.userId,isSuperAdmin:user.isSuperAdmin}); res.json({success:true,data,error:null}); } catch(err){next(err);}
  }
  /**
   * GET /api/v1/crm/dashboard
   * Operational summary metrics for CRM Command Center
   */
  public static async getDashboardMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await CRMService.getDashboardMetrics();
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
   * GET /api/v1/crm/leads
   * Paginated list of leads with filters & next follow-ups
   */
  public static async getLeads(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const validatedFilters = LeadFilterSchema.parse(req.query);
      const user = (req as AuthenticatedRequest).user!;
      const result = await CRMService.getLeads(validatedFilters as any, actorId, { userId: actorId, isSuperAdmin: user.isSuperAdmin });
      res.json({
        success: true,
        data: result.leads,
        pagination: result.pagination,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/crm/leads
   * Create a new lead with duplicate conflict validation
   */
  public static async createLead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const validatedPayload = CreateLeadSchema.parse(req.body);
      const user = (req as AuthenticatedRequest).user!;
      const data = await CRMService.createLead(validatedPayload as any, actorId, { userId: actorId, isSuperAdmin: user.isSuperAdmin });
      res.status(201).json({
        success: true,
        data,
        message: 'Lead created successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/crm/leads/:leadId
   * Single lead detail with chronological activity timeline & follow-ups
   */
  public static async getLeadById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const leadId = req.params.leadId as string;
      const user = (req as AuthenticatedRequest).user!;
      const data = await CRMService.getLeadById(leadId, { userId: user.userId, isSuperAdmin: user.isSuperAdmin });
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
   * PATCH /api/v1/crm/leads/:leadId
   * Update lead profile details
   */
  public static async updateLead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const leadId = req.params.leadId as string;
      const validatedPayload = UpdateLeadSchema.parse(req.body);
      const user = (req as AuthenticatedRequest).user!;
      const data = await CRMService.updateLead(leadId, validatedPayload as any, actorId, { userId: actorId, isSuperAdmin: user.isSuperAdmin });
      res.json({
        success: true,
        data,
        message: 'Lead updated successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/crm/leads/:leadId/stage
   * Change lead pipeline stage (validates lostReason if LOST)
   */
  public static async changeStage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const leadId = req.params.leadId as string;
      const validatedPayload = ChangeLeadStageSchema.parse(req.body);
      const data = await CRMService.changeStage(leadId, validatedPayload as any, actorId);
      res.json({
        success: true,
        data,
        message: `Lead stage changed to ${validatedPayload.stage}`,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/crm/leads/:leadId/assign
   * Assign or reassign lead counsellor ownership
   */
  public static async assignCounsellor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const leadId = req.params.leadId as string;
      const validatedPayload = AssignLeadSchema.parse(req.body);
      const data = await CRMService.assignCounsellor(leadId, validatedPayload as any, actorId);
      res.json({
        success: true,
        data,
        message: 'Counsellor assigned successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/crm/leads/:leadId/notes
   * Add a note / call log / interaction to lead timeline
   */
  public static async addNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const leadId = req.params.leadId as string;
      const validatedPayload = AddLeadNoteSchema.parse(req.body);
      const data = await CRMService.addNote(leadId, validatedPayload as any, actorId);
      res.status(201).json({
        success: true,
        data,
        message: 'Activity note added successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/crm/leads/:leadId/follow-ups
   * Schedule a future follow-up task
   */
  public static async scheduleFollowUp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const leadId = req.params.leadId as string;
      const validatedPayload = ScheduleFollowUpSchema.parse(req.body);
      const data = await CRMService.scheduleFollowUp(leadId, validatedPayload as any, actorId);
      res.status(201).json({
        success: true,
        data,
        message: 'Follow-up scheduled successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/crm/follow-ups/:followUpId/complete
   * Mark a follow-up completed with structured outcome
   */
  public static async completeFollowUp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const followUpId = req.params.followUpId as string;
      const validatedPayload = CompleteFollowUpSchema.parse(req.body);
      const data = await CRMService.completeFollowUp(followUpId, validatedPayload as any, actorId);
      res.json({
        success: true,
        data,
        message: 'Follow-up marked completed',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/crm/leads/:leadId/admissions
   * Start an admission application from a qualified lead
   */
  public static async createAdmission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const leadId = req.params.leadId as string;
      const validatedPayload = CreateAdmissionSchema.parse(req.body);
      const data = await CRMService.createAdmission(leadId, validatedPayload as any, actorId);
      res.status(201).json({
        success: true,
        data,
        message: 'Admission application created successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/crm/admissions/:admissionId/convert
   * Finalize admission: create/reuse Student identity + enroll into course/batch
   */
  public static async convertAdmissionToStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const admissionId = req.params.admissionId as string;
      const validatedPayload = ConvertAdmissionSchema.parse(req.body || {});
      const data = await CRMService.convertAdmissionToStudent(admissionId, validatedPayload as any, actorId);
      res.json({
        success: true,
        data,
        message: 'Student admitted and enrolled successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/public/inquiry
   * Public website lead inquiry capture with tenant resolution & deduplication
   */
  public static async capturePublicInquiry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId =
        req.publicTenantContext?.tenantId?.toString() ||
        (req as any).tenantId ||
        tenantContextStorage.getStore()?.currentTenantId ||
        '';

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant context could not be identified'
        });
        return;
      }

      const validatedPayload = PublicLeadInquirySchema.parse(req.body);
      const result = await CRMService.capturePublicInquiry(tenantId, validatedPayload as any);
      res.status(201).json({
        success: true,
        data: result,
        message: result.isNew ? 'Thank you! Your inquiry has been received.' : 'Inquiry recorded successfully.',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }
}
