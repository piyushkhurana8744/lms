'use client';

import { useAuth } from '@/components/auth-provider';

/**
 * Hook to evaluate whether the current authenticated user has a specific permission.
 *
 * Example:
 * const canCreateCourse = usePermission('course.create');
 */
export function usePermission(requiredPermission: string): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(requiredPermission);
}

/**
 * Hook to evaluate multiple permissions.
 *
 * Example:
 * const { hasAny, hasAll, permissions } = usePermissions();
 */
export function usePermissions() {
  const { user, hasPermission } = useAuth();
  const permissions: string[] = (user as any)?.permissions || [];

  const hasAny = (requiredList: string[]): boolean => {
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    return requiredList.some((p) => hasPermission(p));
  };

  const hasAll = (requiredList: string[]): boolean => {
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    return requiredList.every((p) => hasPermission(p));
  };

  return {
    permissions,
    isSuperAdmin: Boolean(user?.isSuperAdmin),
    hasPermission,
    hasAny,
    hasAll
  };
}
