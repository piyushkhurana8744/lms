import { Request, Response, NextFunction } from 'express';
import { OrganizationWebsiteService } from '../services/organizationWebsite.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class OrganizationWebsiteController {
  public static async getWebsiteSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await OrganizationWebsiteService.getWebsiteSettings();
      res.json({
        success: true,
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateBranding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const data = await OrganizationWebsiteService.updateBranding(actorId, req.body);
      res.json({
        success: true,
        data,
        message: 'Branding settings updated successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateHero(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const data = await OrganizationWebsiteService.updateHero(actorId, req.body);
      res.json({
        success: true,
        data,
        message: 'Hero settings updated successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateHomepage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const data = await OrganizationWebsiteService.updateHomepage(actorId, req.body);
      res.json({
        success: true,
        data,
        message: 'Homepage settings updated successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateAbout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const data = await OrganizationWebsiteService.updateAbout(actorId, req.body);
      res.json({
        success: true,
        data,
        message: 'About section updated successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const data = await OrganizationWebsiteService.updateContact(actorId, req.body);
      res.json({
        success: true,
        data,
        message: 'Contact settings updated successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateSocialLinks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const data = await OrganizationWebsiteService.updateSocialLinks(actorId, req.body);
      res.json({
        success: true,
        data,
        message: 'Social links updated successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateFooter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const data = await OrganizationWebsiteService.updateFooter(actorId, req.body);
      res.json({
        success: true,
        data,
        message: 'Footer settings updated successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateSeo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const data = await OrganizationWebsiteService.updateSeo(actorId, req.body);
      res.json({
        success: true,
        data,
        message: 'SEO settings updated successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateNavigation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const data = await OrganizationWebsiteService.updateNavigation(actorId, req.body);
      res.json({
        success: true,
        data,
        message: 'Navigation links updated successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async publishWebsite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const data = await OrganizationWebsiteService.publishWebsite(actorId);
      res.json({
        success: true,
        data,
        message: 'Website published successfully to public portal',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async unpublishWebsite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const data = await OrganizationWebsiteService.unpublishWebsite(actorId);
      res.json({
        success: true,
        data,
        message: 'Website unpublished successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getWebsitePreview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const data = await OrganizationWebsiteService.getWebsitePreview(actorId);
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
