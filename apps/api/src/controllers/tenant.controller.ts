import { Response } from 'express';
import { TenantService } from '../services/tenant.service';
import { ApiResponse } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { CreateTenantSchema, UpdateTenantStatusSchema } from '@edtech/validation';

export class TenantController {
  public static async createTenant(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const validated = CreateTenantSchema.parse(req.body);
    const result = await TenantService.createTenant({
      ...validated,
      actorId: req.user!.userId
    });
    return ApiResponse.success(res, result, 'Tenant created and default roles initialized cleanly', 201);
  }

  public static async getAllTenants(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const tenants = await TenantService.getAllTenants();
    return ApiResponse.success(res, tenants, 'All tenants retrieved');
  }

  public static async getTenantById(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const id = req.params.id as string;
    const tenant = await TenantService.getTenantById(id);
    return ApiResponse.success(res, tenant, 'Tenant retrieved');
  }

  public static async updateTenantStatus(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const id = req.params.id as string;
    const validated = UpdateTenantStatusSchema.parse(req.body);
    const updated = await TenantService.updateTenantStatus(id, validated.status, req.user!.userId);
    return ApiResponse.success(res, updated, 'Tenant status updated');
  }

  public static async getTenantBranding(req: any, res: Response): Promise<Response> {
    const slugOrDomain = (req.query.slug || req.query.domain) as string | undefined;
    const branding = await TenantService.getTenantBranding(slugOrDomain);
    return ApiResponse.success(res, { branding }, 'Tenant branding resolved');
  }
}
