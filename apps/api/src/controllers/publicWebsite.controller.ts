import { Request, Response, NextFunction } from 'express';
import { getWorkspaceContext } from '@edtech/utils';
import { OrganizationWebsiteService } from '../services/organizationWebsite.service';

export class PublicWebsiteController {
  public static async getPublicWebsite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentTenantId } = getWorkspaceContext();
      if (!currentTenantId) {
        res.json({
          success: true,
          data: null,
          message: 'No tenant workspace resolved',
          error: null
        });
        return;
      }

      const website = await OrganizationWebsiteService.getPublicWebsite(currentTenantId);

      res.json({
        success: true,
        data: website,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getPublicNavigation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentTenantId } = getWorkspaceContext();
      if (!currentTenantId) {
        res.json({
          success: true,
          data: { links: [] },
          error: null
        });
        return;
      }

      const website = await OrganizationWebsiteService.getPublicWebsite(currentTenantId);

      res.json({
        success: true,
        data: {
          branding: website?.branding,
          navigation: website?.navigation || { links: [] }
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getPublicHomepage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentTenantId } = getWorkspaceContext();
      if (!currentTenantId) {
        res.json({
          success: true,
          data: null,
          error: null
        });
        return;
      }

      const website = await OrganizationWebsiteService.getPublicWebsite(currentTenantId);

      res.json({
        success: true,
        data: {
          hero: website?.hero,
          homepage: website?.homepage,
          about: website?.about,
          contact: website?.contact
        },
        error: null
      });
    } catch (err) {
      next(err);
    }
  }
}
