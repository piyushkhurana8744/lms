import { Response } from 'express';
import { UserService } from '../services/user.service';
import { ApiResponse } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { UpdateProfileSchema } from '@edtech/validation';
import { z } from 'zod';

const SwitchWorkspaceSchema = z.object({
  targetTenantId: z.string().min(1, 'Target tenantId is required')
});

export class UserController {
  public static async getProfile(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const user = await UserService.getProfile(req.user!.userId);
    return ApiResponse.success(res, user, 'User profile fetched');
  }

  public static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const validated = UpdateProfileSchema.parse(req.body);
    const updated = await UserService.updateProfile(req.user!.userId, validated);
    return ApiResponse.success(res, updated, 'Profile updated successfully');
  }

  public static async getActiveSessions(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const sessions = await UserService.getActiveSessions(req.user!.userId);
    return ApiResponse.success(res, sessions, 'Active user sessions fetched');
  }

  public static async revokeSession(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const sessionId = req.params.sessionId as string;
    const result = await UserService.revokeSession(req.user!.userId, sessionId);
    return ApiResponse.success(res, result, 'Session revoked successfully');
  }

  public static async switchWorkspace(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const validated = SwitchWorkspaceSchema.parse(req.body);
    const result = await UserService.switchWorkspace({
      userId: req.user!.userId,
      sessionId: req.sessionId!,
      targetTenantId: validated.targetTenantId,
      userPermissions: req.user!.permissions,
      userHomeTenantId: req.user!.tenantId
    });
    return ApiResponse.success(res, result, `Switched active workspace to '${result.tenantName}'`);
  }
}
