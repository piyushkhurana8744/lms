import { Request, Response, NextFunction } from 'express';
import { AssessmentService } from '../services/assessment.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { tenantContextStorage } from '@edtech/utils';

export class AssessmentController {
  public static async getAssessments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.user?.tenantId || tenantContextStorage.getStore()?.currentTenantId || '';
      const { type, scope, courseId, batchId, showOnWebsite, status } = req.query as any;

      const data = await AssessmentService.getAssessments({
        tenantId,
        type,
        scope,
        courseId,
        batchId,
        showOnWebsite: showOnWebsite !== undefined ? showOnWebsite === 'true' : undefined,
        status
      });

      res.json({
        success: true,
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getAssessmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.user?.tenantId || tenantContextStorage.getStore()?.currentTenantId || '';
      const id = req.params.id as string;
      const hasGradePermission = authReq.user?.permissions?.includes('assessment.grade') || authReq.user?.permissions?.includes('assessment.create');
      const isStudent = !hasGradePermission || req.query.studentView === 'true';

      const data = await AssessmentService.getAssessmentById(tenantId, id, isStudent);

      res.json({
        success: true,
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async createAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.user?.tenantId || tenantContextStorage.getStore()?.currentTenantId || '';
      const actorId = authReq.user?.userId || '';

      const data = await AssessmentService.createAssessment(tenantId, req.body, actorId);

      res.status(201).json({
        success: true,
        data,
        message: 'Assessment created successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.user?.tenantId || tenantContextStorage.getStore()?.currentTenantId || '';
      const actorId = authReq.user?.userId || '';
      const id = req.params.id as string;

      const data = await AssessmentService.updateAssessment(tenantId, id, req.body, actorId);

      res.json({
        success: true,
        data,
        message: 'Assessment updated successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteAssessment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.user?.tenantId || tenantContextStorage.getStore()?.currentTenantId || '';
      const actorId = authReq.user?.userId || '';
      const id = req.params.id as string;

      const result = await AssessmentService.deleteAssessment(tenantId, id, actorId);

      res.json({
        success: true,
        message: 'Assessment deleted successfully',
        data: result,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async submitQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.user?.tenantId || tenantContextStorage.getStore()?.currentTenantId || '';
      const userId = authReq.user?.userId || '';
      const assessmentId = req.params.id as string;
      const { answers, timeSpentSeconds } = req.body;

      const result = await AssessmentService.submitQuiz({
        tenantId,
        assessmentId,
        userId,
        answers,
        timeSpentSeconds
      });

      res.json({
        success: true,
        data: result,
        message: 'Quiz submitted successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async submitAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.user?.tenantId || tenantContextStorage.getStore()?.currentTenantId || '';
      const userId = authReq.user?.userId || '';
      const assessmentId = req.params.id as string;
      const { submissionText, fileUrl, fileName, linkUrl } = req.body;

      const data = await AssessmentService.submitAssignment({
        tenantId,
        assessmentId,
        userId,
        submissionText,
        fileUrl,
        fileName,
        linkUrl
      });

      res.status(201).json({
        success: true,
        data,
        message: 'Assignment submitted successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async gradeSubmission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.user?.tenantId || tenantContextStorage.getStore()?.currentTenantId || '';
      const graderId = authReq.user?.userId || '';
      const submissionId = req.params.submissionId as string;
      const { score, feedback } = req.body;

      const data = await AssessmentService.gradeSubmission({
        tenantId,
        submissionId,
        score,
        feedback,
        graderId
      });

      res.json({
        success: true,
        data,
        message: 'Submission graded successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getSubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = authReq.user?.tenantId || tenantContextStorage.getStore()?.currentTenantId || '';
      const hasGradePermission = authReq.user?.permissions?.includes('assessment.grade') || authReq.user?.permissions?.includes('assessment.create');
      const currentUserId = authReq.user?.userId;

      // If student (doesn't have grade permission), lock to their own submissions
      const userId = !hasGradePermission ? currentUserId : (req.query.userId as string | undefined);
      const assessmentId = req.query.assessmentId as string | undefined;
      const status = req.query.status as string | undefined;

      const data = await AssessmentService.getSubmissions({
        tenantId,
        assessmentId,
        userId,
        status
      });

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
   * Public Web endpoints
   */
  public static async getPublicAssessments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId =
        req.publicTenantContext?.tenantId?.toString() ||
        (req as any).tenantId ||
        tenantContextStorage.getStore()?.currentTenantId ||
        '';

      const data = await AssessmentService.getPublicAssessments(tenantId);
      res.json({
        success: true,
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getPublicAssessmentBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId =
        req.publicTenantContext?.tenantId?.toString() ||
        (req as any).tenantId ||
        tenantContextStorage.getStore()?.currentTenantId ||
        '';
      const slug = req.params.slug as string;

      const data = await AssessmentService.getPublicAssessmentBySlug(tenantId, slug);
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
