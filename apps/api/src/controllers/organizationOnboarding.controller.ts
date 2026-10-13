import { Request, Response, NextFunction } from 'express';
import { OrganizationOnboardingService } from '../services/organizationOnboarding.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class OrganizationOnboardingController {
  public static async getOnboardingProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await OrganizationOnboardingService.getOnboardingProgress();
      res.json({
        success: true,
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const data = await OrganizationOnboardingService.updateProgress(actorId, req.body);
      res.json({
        success: true,
        data,
        message: 'Onboarding step progress updated successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async completeOnboarding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const data = await OrganizationOnboardingService.completeOnboarding(actorId);
      res.json({
        success: true,
        data,
        message: 'Organization setup completed successfully! Your LMS is ready to launch 🚀',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async skipOnboarding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const data = await OrganizationOnboardingService.skipOnboarding(actorId);
      res.json({
        success: true,
        data,
        message: 'Organization onboarding skipped. You can resume setup anytime from Organization Settings.',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }
}
