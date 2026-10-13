import { Request, Response, NextFunction } from 'express';
import { OrganizationLaunchService } from '../services/organizationLaunch.service';
import { OrganizationLaunchSchema } from '@edtech/validation';

export class OrganizationLaunchController {
  /**
   * GET /api/v1/organization/launch/readiness
   * Evaluates and returns dynamic launch readiness status.
   */
  public static async getReadiness(req: Request, res: Response, next: NextFunction) {
    try {
      const readiness = await OrganizationLaunchService.getLaunchReadiness();
      return res.json({
        success: true,
        data: readiness
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/organization/launch
   * Triggers organization launch to LIVE lifecycle status.
   */
  public static async launch(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate request body strictly (stripping injected sensitive fields)
      OrganizationLaunchSchema.parse(req.body || {});

      const actorId = (req as any).user?.id || (req as any).user?._id?.toString() || 'SYSTEM';
      const result = await OrganizationLaunchService.launchOrganization(actorId);

      return res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      if (error.code === 'ORGANIZATION_NOT_READY' || error.statusCode === 409) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'ORGANIZATION_NOT_READY',
            message: error.message || 'Your LMS is not ready to launch.',
            blockers: error.blockers || []
          }
        });
      }
      next(error);
    }
  }
}
