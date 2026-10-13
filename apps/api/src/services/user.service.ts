import { UserModel, SessionModel, TenantModel } from '@edtech/database';
import { NotFoundError, ForbiddenError, BadRequestError } from '../errors/appError';
import { AuditService } from './audit.service';
import { hasPermission, PERMISSIONS } from '@edtech/permissions';

export class UserService {
  public static async getProfile(userId: string) {
    const user = await UserModel.findById(userId).populate('roles').select('-passwordHash');
    if (!user) {
      throw new NotFoundError('User profile not found');
    }
    return user;
  }

  public static async updateProfile(userId: string, updates: { name?: string; phone?: string; avatarUrl?: string }) {
    const user = await UserModel.findByIdAndUpdate(userId, { $set: updates }, { new: true }).select('-passwordHash');
    if (!user) {
      throw new NotFoundError('User profile not found');
    }
    return user;
  }

  public static async getActiveSessions(userId: string) {
    const sessions = await SessionModel.find({
      userId,
      revokedAt: null,
      expiresAt: { $gt: new Date() }
    }).select('-currentRefreshTokenHash -previousRefreshTokenHash');
    return sessions;
  }

  public static async revokeSession(userId: string, sessionId: string) {
    const session = await SessionModel.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    if (session.userId.toString() !== userId) {
      throw new ForbiddenError('Unauthorized: Cannot revoke another user session');
    }

    session.revokedAt = new Date();
    await session.save();

    await AuditService.logEvent({
      actorId: userId,
      tenantId: session.tenantId ? session.tenantId.toString() : 'PLATFORM',
      action: 'SESSION_REVOKED_BY_USER',
      resource: 'Session',
      resourceId: sessionId
    });

    return { revoked: true, sessionId };
  }

  /**
   * Workspace Context Switching Engine
   * Validates target tenant status & evaluates authorization strictly via user permissions & tenant context.
   */
  public static async switchWorkspace(params: {
    userId: string;
    sessionId: string;
    targetTenantId: string;
    userPermissions: string[];
    userHomeTenantId: string | null;
  }) {
    const targetTenant = await TenantModel.findById(params.targetTenantId);
    if (!targetTenant) {
      throw new NotFoundError(`Target workspace tenant '${params.targetTenantId}' not found`);
    }

    if (targetTenant.status !== 'ACTIVE') {
      throw new BadRequestError(`Target workspace '${targetTenant.name}' is currently suspended or inactive`);
    }

    // AUTHORIZATION RULE: User must have explicit PLATFORM_TENANT_SWITCH permission or be switching to their assigned home tenant
    const canSwitch =
      hasPermission(params.userPermissions, PERMISSIONS.PLATFORM_TENANT_SWITCH) ||
      params.userHomeTenantId === params.targetTenantId;

    if (!canSwitch) {
      throw new ForbiddenError('Unauthorized: You lack permission to switch to this workspace context');
    }

    // Update active session workspace
    const session = await SessionModel.findById(params.sessionId);
    if (!session || session.revokedAt) {
      throw new ForbiddenError('Session invalid or revoked');
    }

    session.activeTenantId = targetTenant._id;
    await session.save();

    await AuditService.logEvent({
      actorId: params.userId,
      tenantId: targetTenant._id.toString(),
      action: 'WORKSPACE_SWITCHED',
      resource: 'Tenant',
      resourceId: targetTenant._id.toString(),
      metadata: { targetTenantSlug: targetTenant.slug }
    });

    return {
      activeTenantId: targetTenant._id.toString(),
      tenantName: targetTenant.name,
      tenantSlug: targetTenant.slug
    };
  }
}
