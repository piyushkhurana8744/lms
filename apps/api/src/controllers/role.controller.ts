import { Response } from 'express';
import { RoleService } from '../services/role.service';
import { ApiResponse } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { CreateRoleSchema, UpdateRoleSchema } from '@edtech/validation';

export class RoleController {
  public static async getRoles(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const tenantId = (req.user?.activeTenantId || req.user?.tenantId)!;
    const roles = await RoleService.getTenantRoles(tenantId);
    return ApiResponse.success(res, roles, 'Tenant roles retrieved');
  }

  public static async createRole(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const tenantId = (req.user?.activeTenantId || req.user?.tenantId)!;
    const validated = CreateRoleSchema.parse(req.body);
    const role = await RoleService.createRole(tenantId, validated, req.user!.userId);
    return ApiResponse.success(res, role, 'Custom role created', 201);
  }

  public static async updateRole(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const tenantId = (req.user?.activeTenantId || req.user?.tenantId)!;
    const id = req.params.id as string;
    const validated = UpdateRoleSchema.parse(req.body);
    const updated = await RoleService.updateRole(tenantId, id, validated, req.user!.userId);
    return ApiResponse.success(res, updated, 'Role updated');
  }

  public static async deleteRole(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const tenantId = (req.user?.activeTenantId || req.user?.tenantId)!;
    const id = req.params.id as string;
    const result = await RoleService.deleteRole(tenantId, id, req.user!.userId);
    return ApiResponse.success(res, result, 'Role deleted');
  }

  public static getPermissions(req: AuthenticatedRequest, res: Response): Response {
    const permissions = RoleService.getAvailablePermissions();
    const categories = RoleService.getCategorizedPermissions();
    return ApiResponse.success(res, { permissions, categories }, 'System permission identifiers and categories retrieved');
  }
}
