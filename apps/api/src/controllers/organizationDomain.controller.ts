import { Request, Response, NextFunction } from 'express';
import { OrganizationDomainService } from '../services/organizationDomain.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class OrganizationDomainController {
  public static async getDomain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await OrganizationDomainService.getDomain();
      res.json({
        success: true,
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async configureCustomDomain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const data = await OrganizationDomainService.configureCustomDomain(actorId, req.body);
      res.json({
        success: true,
        data,
        message: 'Custom domain configured. Please complete DNS record verification.',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async verifyDomain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const data = await OrganizationDomainService.verifyDomain(actorId);
      res.json({
        success: true,
        data: data.domain,
        message: data.message,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async activateDomain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const data = await OrganizationDomainService.activateDomain(actorId);
      res.json({
        success: true,
        data,
        message: 'Custom domain activated successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async disconnectDomain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const data = await OrganizationDomainService.disconnectDomain(actorId);
      res.json({
        success: true,
        data,
        message: 'Custom domain disconnected successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getWhiteLabelSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await OrganizationDomainService.getWhiteLabelSettings();
      res.json({
        success: true,
        data,
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateWhiteLabelSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as AuthenticatedRequest).user?.userId || '';
      const data = await OrganizationDomainService.updateWhiteLabelSettings(actorId, req.body);
      res.json({
        success: true,
        data,
        message: 'White-label settings updated successfully',
        error: null
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getPublicDomainConfiguration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawHost = (req.headers.host as string) || (req.headers['x-forwarded-host'] as string) || '';
      const domainData = await OrganizationDomainService.getDomain();
      const whiteLabelData = await OrganizationDomainService.getWhiteLabelSettings();

      res.json({
        success: true,
        data: {
          hostname: OrganizationDomainService.normalizeHostname(rawHost),
          domain: domainData,
          whiteLabel: whiteLabelData
        },
        error: null
      });
    } catch (err) {
      next(err);
    }
  }
}
