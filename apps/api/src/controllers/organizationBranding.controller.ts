import { Response } from 'express';
import { tenantContextStorage } from '@edtech/utils';
import { OrganizationBrandingService } from '../services/organizationBranding.service';
import { ApiResponse } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class OrganizationBrandingController {
  private static getTenantId(): string {
    const store = tenantContextStorage.getStore();
    const tenantId = store?.currentTenantId;
    if (!tenantId) {
      throw new Error('Workspace context missing from execution scope.');
    }
    return tenantId;
  }

  public static async getBranding(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const tenantId = OrganizationBrandingController.getTenantId();
    const branding = await OrganizationBrandingService.getBranding(tenantId);
    return ApiResponse.success(res, branding, 'Organization branding retrieved successfully');
  }

  public static async updateBranding(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const tenantId = OrganizationBrandingController.getTenantId();
    const actorId = req.user!.userId;
    const branding = await OrganizationBrandingService.updateBranding(tenantId, actorId, req.body);
    return ApiResponse.success(res, branding, 'Organization branding updated successfully');
  }

  public static async resetBranding(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const tenantId = OrganizationBrandingController.getTenantId();
    const actorId = req.user!.userId;
    const branding = await OrganizationBrandingService.resetBranding(tenantId, actorId);
    return ApiResponse.success(res, branding, 'Organization branding reset to defaults successfully');
  }
}
