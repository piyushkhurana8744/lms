import { Response, NextFunction } from 'express';
import { hasPermission } from '@edtech/permissions';
import { AuthenticatedRequest } from './auth.middleware';
import { ApiResponse } from '../utils/apiResponse';

/**
 * RBAC Authorization Middleware
 * Evaluates whether the authenticated user has the required granular permission.
 */
export function requirePermission(requiredPermission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): any => {
    if (!req.user) {
      return ApiResponse.error(res, 'Authentication required', 401, 'ERR_UNAUTHORIZED');
    }

    const userPermissions = req.user.permissions || [];
    const isGranted = hasPermission(userPermissions, requiredPermission);

    if (!isGranted) {
      return ApiResponse.error(
        res,
        `Permission denied: Missing required permission '${requiredPermission}'`,
        403,
        'ERR_FORBIDDEN',
        { requiredPermission }
      );
    }

    return next();
  };
}

export function requireAnyPermission(requiredPermissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): any => {
    if (!req.user) {
      return ApiResponse.error(res, 'Authentication required', 401, 'ERR_UNAUTHORIZED');
    }

    const userPermissions = req.user.permissions || [];
    const isGranted = requiredPermissions.some((p) => hasPermission(userPermissions, p));

    if (!isGranted) {
      return ApiResponse.error(
        res,
        `Permission denied: Missing required permission in [${requiredPermissions.join(', ')}]`,
        403,
        'ERR_FORBIDDEN',
        { requiredPermissions }
      );
    }

    return next();
  };
}
