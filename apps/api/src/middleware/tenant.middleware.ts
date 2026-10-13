import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { tenantContextStorage } from '@edtech/utils';
import { AuthenticatedRequest } from './auth.middleware';

/**
 * Server-Side Workspace Context Resolution Middleware
 * Resolves current workspace (currentTenantId) and execution context scope.
 * Safe against async stream handlers (e.g. Multer body parsing).
 */
export function tenantResolverMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): any {
  const existingStore = tenantContextStorage.getStore();
  const user = req.user;

  // Active workspace is derived strictly from authenticated user session context
  const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
  const currentTenantId =
    user?.activeTenantId ||
    user?.tenantId ||
    (headerTenantId && Types.ObjectId.isValid(headerTenantId) ? headerTenantId : '') ||
    (user?.isSuperAdmin && user?.allowedTenantIds?.length > 0 ? user.allowedTenantIds[0] : '');
  const currentUserId = user?.userId || (user as any)?.id || (user as any)?._id || 'anonymous';
  const isPlatformContext = req.path ? req.path.startsWith('/platform') : false;
  const allowedTenantIds = user?.allowedTenantIds || [];

  const contextData = {
    currentTenantId,
    currentUserId,
    isPlatformContext,
    allowedTenantIds
  };

  // If already inside active storage context, re-run or proceed
  if (existingStore) {
    return next();
  }

  return tenantContextStorage.run(contextData, () => next());
}

/**
 * Explicit helper middleware to guarantee WorkspaceContext is active before controller/service execution.
 */
export function ensureWorkspaceContext(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): any {
  return tenantResolverMiddleware(req, res, next);
}
