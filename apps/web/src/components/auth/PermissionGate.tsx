'use client';

import React from 'react';
import { useAuth } from '@/components/auth-provider';

export interface PermissionGateProps {
  /** The permission key required to render children (e.g. 'course.create') */
  required?: string;
  /** Optional list of permissions where having ANY grants access */
  anyOf?: string[];
  /** Optional list of permissions where ALL are required */
  allOf?: string[];
  /** Optional fallback UI to show if permission is denied */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Declarative component to protect UI sections, buttons, or full screens based on user permissions.
 *
 * Example:
 * <PermissionGate required="course.create" fallback={<p>Unauthorized</p>}>
 *   <Button>New Course</Button>
 * </PermissionGate>
 */
export function PermissionGate({
  required,
  anyOf,
  allOf,
  fallback = null,
  children
}: PermissionGateProps) {
  const { user, hasPermission } = useAuth();

  if (!user) return <>{fallback}</>;
  if (user.isSuperAdmin) return <>{children}</>;

  let isGranted = true;

  if (required) {
    isGranted = hasPermission(required);
  }

  if (isGranted && anyOf && anyOf.length > 0) {
    isGranted = anyOf.some((p) => hasPermission(p));
  }

  if (isGranted && allOf && allOf.length > 0) {
    isGranted = allOf.every((p) => hasPermission(p));
  }

  if (!isGranted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
