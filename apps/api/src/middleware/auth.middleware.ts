import { Request, Response, NextFunction } from 'express';
import { tenantContextStorage, verifyAccessToken } from '@edtech/utils';
import { runAuthBootstrapOperation, SessionModel, UserModel, OrganizationMemberModel, RoleModel } from '@edtech/database';
import { PERMISSIONS, SYSTEM_ROLE_PERMISSIONS } from '@edtech/permissions';
import { ApiResponse } from '../utils/apiResponse';

export interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    userId: string;
    name?: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    status?: string;
    tenantId: string | null;
    activeTenantId: string | null;
    allowedTenantIds: string[];
    isSuperAdmin: boolean;
    impersonatedBy?: string | null;
    isImpersonated?: boolean;
    impersonationReason?: string | null;
    impersonationReturnTo?: string | null;
    roles: string[];
    permissions: string[];
  };
  sessionId?: string;
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> {
  let token: string | undefined;

  // 1. Extract token from Authorization header or HttpOnly cookie
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return ApiResponse.error(res, 'Authentication token missing', 401, 'ERR_UNAUTHORIZED');
  }

  // 2. Verify JWT signature & expiration
  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return ApiResponse.error(res, 'Invalid or expired access token', 401, 'ERR_UNAUTHORIZED');
  }

  // 3. Verify active Session in DB
  const session = await SessionModel.findById(decoded.sessionId);
  if (!session || session.revokedAt || new Date() > session.expiresAt) {
    return ApiResponse.error(res, 'Session has been revoked or expired', 401, 'ERR_SESSION_REVOKED');
  }
  if (decoded.tokenVersion !== session.tokenVersion) {
    return ApiResponse.error(res, 'Access token has been rotated', 401, 'ERR_TOKEN_ROTATED');
  }

  // 4. Fetch User record and populate live roles & permissions
  if (decoded.sub !== session.userId.toString()) return ApiResponse.error(res, 'Session identity mismatch', 401, 'ERR_UNAUTHORIZED');
  const user = await runAuthBootstrapOperation('SESSION_USER_BY_ID', decoded.sub, () => UserModel.findOne({ _id: decoded.sub }).setOptions({ authBootstrapPolicy: 'SESSION_USER_BY_ID' }));
  if (!user) {
    return ApiResponse.error(res, 'User not found or session invalid', 401, 'ERR_UNAUTHORIZED');
  }
  if (user.status !== 'ACTIVE') {
    return ApiResponse.error(res, 'User account is inactive or suspended', 403, 'ERR_ACCOUNT_INACTIVE');
  }

  let activeTenantId = session.activeTenantId
    ? session.activeTenantId.toString()
    : user.tenantId
      ? user.tenantId.toString()
      : null;

  const allowedTenantIds = (user.allowedTenantIds || []).map((id: any) => id.toString());
  if (user.tenantId && !allowedTenantIds.includes(user.tenantId.toString())) {
    allowedTenantIds.push(user.tenantId.toString());
  }

  const permissionsSet = new Set<string>();
  const rolesList: string[] = [];

  // SuperAdmin default tenant context resolution
  if (user.isSuperAdmin && !activeTenantId && allowedTenantIds.length > 0) {
    activeTenantId = allowedTenantIds[0];
  }
  if (activeTenantId) {
    await tenantContextStorage.run(
      { currentTenantId: activeTenantId, currentUserId: user._id.toString(), isPlatformContext: false, allowedTenantIds },
      async () => {
        await user.populate('roles');
        try {
          const member = await OrganizationMemberModel.findOne({
            tenantId: activeTenantId,
            userId: user._id,
            status: 'ACTIVE'
          });

          if (member) {
            rolesList.push(member.role);
            // Default system permissions for this role
            const systemPerms = SYSTEM_ROLE_PERMISSIONS[member.role] || [];
            systemPerms.forEach((p) => permissionsSet.add(p));

            // Also check if there is a custom role in this tenant matching the role slug/name
            const customRole = await RoleModel.findOne({
              tenantId: activeTenantId,
              slug: member.role.toLowerCase()
            });

            if (customRole && Array.isArray(customRole.permissions)) {
              customRole.permissions.forEach((p) => permissionsSet.add(p));
            }
          }
        } catch {
          // If organization member check fails, proceed with default user roles
        }
      }
    );
  }

  // Super Admin bypass
  if (user.isSuperAdmin) {
    permissionsSet.add(PERMISSIONS.SUPERADMIN_ALL);
    rolesList.push('SUPER_ADMIN');
  }

  // Fallback: Populate static user roles if no active tenant membership found
  if (rolesList.length === 0 && user.roles && Array.isArray(user.roles)) {
    user.roles.forEach((r: any) => {
      if (r) {
        if (r.slug) rolesList.push(r.slug);
        if (Array.isArray(r.permissions)) {
          r.permissions.forEach((p: string) => permissionsSet.add(p));
        }
      }
    });
  }

  // Attach verified user payload to request
  req.user = {
    id: user._id.toString(),
    userId: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    status: user.status,
    tenantId: user.tenantId ? user.tenantId.toString() : null,
    activeTenantId,
    allowedTenantIds,
    isSuperAdmin: user.isSuperAdmin,
    impersonatedBy: session.impersonatedBy ? session.impersonatedBy.toString() : null,
    isImpersonated: Boolean(session.impersonatedBy),
    impersonationReason: (session as any).impersonationReason || null,
    impersonationReturnTo: (session as any).impersonationReturnTo || null,
    roles: rolesList,
    permissions: Array.from(permissionsSet)
  };
  req.sessionId = session._id.toString();

  return next();
}

/**
 * Super Admin Authorization Middleware
 * Verifies live Super Admin role/permission context.
 */
export function requireSuperAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): any {
  if (!req.user || !req.user.isSuperAdmin) {
    return ApiResponse.error(res, 'Platform Super Admin access required', 403, 'ERR_SUPERADMIN_REQUIRED');
  }
  return next();
}
