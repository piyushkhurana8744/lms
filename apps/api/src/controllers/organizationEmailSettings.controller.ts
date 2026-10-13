import { Request, Response, NextFunction } from 'express';
import { OrganizationEmailSettingsService } from '../services/organizationEmailSettings.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class OrganizationEmailSettingsController {
  public static async getEmailSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await OrganizationEmailSettingsService.getEmailSettings();
      res.json({
        success: true,
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateEmailSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const data = await OrganizationEmailSettingsService.updateEmailSettings(actorId, req.body);
      res.json({
        success: true,
        data,
        message: 'Email configuration updated successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async verifyEmailSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const data = await OrganizationEmailSettingsService.verifyEmailSettings(actorId);
      res.json({
        success: true,
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async sendTestEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const data = await OrganizationEmailSettingsService.sendTestEmail(actorId, req.body);
      res.json({
        success: true,
        data,
        message: data.message,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteEmailSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const data = await OrganizationEmailSettingsService.deleteEmailSettings(actorId);
      res.json({
        success: true,
        data,
        message: 'Email configuration removed successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getNotificationPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await OrganizationEmailSettingsService.getNotificationPreferences();
      res.json({
        success: true,
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateNotificationPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const data = await OrganizationEmailSettingsService.updateNotificationPreferences(actorId, req.body);
      res.json({
        success: true,
        data,
        message: 'Notification preferences updated successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }
}
