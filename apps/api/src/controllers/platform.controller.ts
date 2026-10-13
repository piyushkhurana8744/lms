import { Response } from 'express';
import { TenantModel, UserModel, SessionModel, OrganizationMemberModel, getDatabaseState } from '@edtech/database';
import { ApiResponse } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AuditService } from '../services/audit.service';
import { AuthService } from '../services/auth.service';
import { NotFoundError } from '../errors/appError';

export class PlatformController {
  /**
   * Platform Command Center Aggregated Metrics Summary
   */
  public static async getCommandCenterSummary(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const totalTenants = await TenantModel.countDocuments();
    const activeTenants = await TenantModel.countDocuments({ status: 'ACTIVE' });
    const suspendedTenants = await TenantModel.countDocuments({ status: 'SUSPENDED' });
    const totalUsers = await UserModel.countDocuments();

    const tenantList = await TenantModel.find().select('name slug customDomain isCustomDomainVerified status createdAt').sort({ createdAt: -1 });

    await AuditService.logEvent({
      actorId: req.user!.userId,
      tenantId: 'PLATFORM',
      action: 'PLATFORM_COMMAND_CENTER_VIEWED',
      resource: 'PlatformCommandCenter',
      metadata: { totalTenants, activeTenants }
    });

    const summary = {
      timestamp: new Date().toISOString(),
      metrics: {
        totalTenants,
        activeTenants,
        suspendedTenants,
        totalRegisteredUsers: totalUsers,
        databaseState: getDatabaseState()
      },
      tenants: tenantList.map((t) => ({
        id: t._id.toString(),
        name: t.name,
        slug: t.slug,
        customDomain: t.customDomain,
        isCustomDomainVerified: t.isCustomDomainVerified,
        status: t.status,
        createdAt: t.createdAt
      }))
    };

    return ApiResponse.success(res, summary, 'Platform Command Center summary retrieved');
  }

  /**
   * SuperAdmin Impersonation ("Secret Login")
   */
  public static async impersonateUser(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const targetUserId = req.body?.targetUserId || req.params?.userId || req.body?.userId;
    const reason = req.body?.reason;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    try {
      const result = await AuthService.impersonateUser({
        targetUserId,
        superAdminUserId: req.user!.userId,
        reason,
        originalSessionId: req.sessionId,
        ipAddress,
        userAgent
      });

      const isProd = process.env.NODE_ENV === 'production';

      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 4 * 60 * 60 * 1000 // 4 Hours
      });

      res.cookie('accessToken', result.tokens.accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 4 * 60 * 60 * 1000
      });

      return ApiResponse.success(res, result, 'Impersonation session established successfully');
    } catch (error: any) {
      const statusCode = error.statusCode || 400;
      const code = error.code || 'ERR_BAD_REQUEST';
      return ApiResponse.error(res, error.message || 'Impersonation failed', statusCode, code);
    }
  }

  /**
   * Get Current Impersonation Status
   */
  public static async getImpersonationStatus(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const isImpersonated = Boolean(req.user?.isImpersonated);
      return ApiResponse.success(
        res,
        {
          isImpersonated,
          originalActorId: req.user?.impersonatedBy || null,
          effectiveUserId: req.user?.userId || null,
          targetTenantId: req.user?.tenantId || null,
          impersonationReason: req.user?.impersonationReason || null,
          roles: req.user?.roles || [],
          permissions: req.user?.permissions || []
        },
        'Impersonation status retrieved'
      );
    } catch (error: any) {
      const statusCode = error.statusCode || 400;
      const code = error.code || 'ERR_BAD_REQUEST';
      return ApiResponse.error(res, error.message || 'Failed to get impersonation status', statusCode, code);
    }
  }

  /**
   * Exit Impersonation: Return to SuperAdmin Session
   */
  public static async exitImpersonation(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.get('user-agent');

      const result = await AuthService.exitImpersonation({
        currentSessionId: req.sessionId!,
        ipAddress,
        userAgent
      });

      const isProd = process.env.NODE_ENV === 'production';

      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.cookie('accessToken', result.tokens.accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000
      });

      return ApiResponse.success(res, result, 'Impersonation ended. SuperAdmin session restored.');
    } catch (error: any) {
      const statusCode = error.statusCode || 400;
      const code = error.code || 'ERR_BAD_REQUEST';
      return ApiResponse.error(res, error.message || 'Failed to exit impersonation', statusCode, code);
    }
  }

  /**
   * Switch Active Tenant Context for SuperAdmin
   */
  public static async switchTenant(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const tenantId = req.params.tenantId;

    const tenant = await TenantModel.findById(tenantId);
    if (!tenant) {
      throw new NotFoundError('Target tenant organization not found');
    }

    if (req.sessionId) {
      await SessionModel.findByIdAndUpdate(req.sessionId, { activeTenantId: tenant._id });
    }

    await AuditService.logEvent({
      actorId: req.user!.userId,
      tenantId: tenant._id.toString(),
      action: 'PLATFORM_TENANT_SWITCHED',
      resource: 'Tenant',
      resourceId: tenant._id.toString(),
      metadata: { targetTenantName: tenant.name, targetTenantSlug: tenant.slug }
    });

    return ApiResponse.success(
      res,
      {
        activeTenantId: tenant._id.toString(),
        tenant: {
          id: tenant._id.toString(),
          name: tenant.name,
          slug: tenant.slug
        }
      },
      `Active organization switched to '${tenant.name}'`
    );
  }

  /**
   * List Users Across All Tenants (for SuperAdmin User Directory & Impersonation Matrix)
   */
  public static async getUsers(req: AuthenticatedRequest, res: Response): Promise<Response> {
    const tenantId = req.query.tenantId as string | undefined;
    const search = req.query.search as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const skip = (page - 1) * limit;

    const query: any = {};
    if (tenantId) {
      query.tenantId = tenantId;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const [users, total] = await Promise.all([
      UserModel.find(query)
        .populate('tenantId', 'name slug')
        .populate('roles')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      UserModel.countDocuments(query)
    ]);

    // Also enrich with organization memberships if available
    const userIds = users.map((u) => u._id);
    const memberships = await OrganizationMemberModel.find({ userId: { $in: userIds } })
      .populate('tenantId', 'name slug');

    const membershipMap = new Map<string, any[]>();
    memberships.forEach((m) => {
      const uId = m.userId.toString();
      if (!membershipMap.has(uId)) {
        membershipMap.set(uId, []);
      }
      membershipMap.get(uId)!.push({
        tenantId: m.tenantId?._id?.toString(),
        tenantName: (m.tenantId as any)?.name,
        role: m.role,
        status: m.status
      });
    });

    const userList = users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      phone: u.phone,
      status: u.status,
      isSuperAdmin: u.isSuperAdmin,
      tenantId: u.tenantId ? (u.tenantId as any)._id?.toString() || u.tenantId.toString() : null,
      tenantName: u.tenantId ? (u.tenantId as any).name : 'Platform Scope',
      roles: (u.roles || []).map((r: any) => r.name || r.slug || r.toString()),
      memberships: membershipMap.get(u._id.toString()) || [],
      createdAt: u.createdAt
    }));

    return ApiResponse.success(res, userList, 'Platform users retrieved', 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  }
}
