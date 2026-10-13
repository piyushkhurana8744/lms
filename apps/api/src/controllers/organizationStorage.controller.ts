import { Response } from 'express';
import { tenantContextStorage } from '@edtech/utils';
import { OrganizationStorageService } from '../services/organizationStorage.service';
import { ApiResponse } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class OrganizationStorageController {
  private static getTenantId(): string {
    const store = tenantContextStorage.getStore();
    const tenantId = store?.currentTenantId;
    if (!tenantId) {
      throw new Error('Workspace context missing from execution scope.');
    }
    return tenantId;
  }

  public static async getStorageConfiguration(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const tenantId = OrganizationStorageController.getTenantId();
    const config = await OrganizationStorageService.getStorageConfiguration(tenantId);
    return ApiResponse.success(res, config, 'Organization storage configuration retrieved successfully');
  }

  public static async saveStorageConfiguration(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const tenantId = OrganizationStorageController.getTenantId();
    const actorId = req.user!.userId;
    const config = await OrganizationStorageService.saveStorageConfiguration(tenantId, actorId, req.body);
    return ApiResponse.success(res, config, 'Organization storage configuration saved successfully');
  }

  public static async testStorageConnection(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const tenantId = OrganizationStorageController.getTenantId();
    const result = await OrganizationStorageService.testStorageConnection(tenantId, req.body);
    return ApiResponse.success(res, result, result.message);
  }

  public static async enableStorage(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const tenantId = OrganizationStorageController.getTenantId();
    const actorId = req.user!.userId;
    const config = await OrganizationStorageService.enableStorage(tenantId, actorId);
    return ApiResponse.success(res, config, 'Organization storage enabled successfully');
  }

  public static async disableStorage(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const tenantId = OrganizationStorageController.getTenantId();
    const actorId = req.user!.userId;
    const config = await OrganizationStorageService.disableStorage(tenantId, actorId);
    return ApiResponse.success(res, config, 'Organization storage disabled successfully');
  }

  public static async deleteStorageConfiguration(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const tenantId = OrganizationStorageController.getTenantId();
    const actorId = req.user!.userId;
    await OrganizationStorageService.deleteStorageConfiguration(tenantId, actorId);
    return ApiResponse.success(res, null, 'Organization storage configuration deleted successfully');
  }
}
