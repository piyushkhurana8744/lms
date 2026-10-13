import { Response } from 'express';
import { tenantContextStorage } from '@edtech/utils';
import { OrganizationSettingsService } from '../services/organizationSettings.service';
import { ApiResponse } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class OrganizationSettingsController {
  private static getTenantId(): string {
    const store = tenantContextStorage.getStore();
    const tenantId = store?.currentTenantId;
    if (!tenantId) {
      throw new Error('Workspace context missing from execution scope.');
    }
    return tenantId;
  }

  public static async getSettings(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const tenantId = OrganizationSettingsController.getTenantId();
    const settings = await OrganizationSettingsService.getSettings(tenantId);
    return ApiResponse.success(res, settings, 'Organization settings retrieved successfully');
  }

  public static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const tenantId = OrganizationSettingsController.getTenantId();
    const actorId = req.user!.userId;
    const settings = await OrganizationSettingsService.updateProfile(tenantId, actorId, req.body);
    return ApiResponse.success(res, settings, 'Organization profile updated successfully');
  }

  public static async updatePreferences(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const tenantId = OrganizationSettingsController.getTenantId();
    const actorId = req.user!.userId;
    const settings = await OrganizationSettingsService.updatePreferences(tenantId, actorId, req.body);
    return ApiResponse.success(res, settings, 'LMS preferences updated successfully');
  }

  public static async getSetupProgress(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const tenantId = OrganizationSettingsController.getTenantId();
    const progress = await OrganizationSettingsService.getSetupProgress(tenantId);
    return ApiResponse.success(res, progress, 'Organization setup progress calculated successfully');
  }
}
