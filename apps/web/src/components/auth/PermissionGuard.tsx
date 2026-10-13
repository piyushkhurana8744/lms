'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { evaluateNavigationPermissions } from '@edtech/permissions';
import { ShieldAlert, ArrowLeft, LayoutDashboard, Loader2 } from 'lucide-react';
import { Button } from '@edtech/ui';

export interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermissions?: string | string[];
  permissionMode?: 'ANY' | 'ALL';
  fallbackTitle?: string;
  fallbackMessage?: string;
}

/**
 * Client-Side Permission Guard Component.
 * Wraps protected admin views to prevent unauthorized UI execution and flashing.
 */
export function PermissionGuard({
  children,
  requiredPermissions,
  permissionMode = 'ANY',
  fallbackTitle = 'Access Denied',
  fallbackMessage = 'You do not have the required permissions to access this administrative module.'
}: PermissionGuardProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="p-12 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#BE1E2E]" />
          <p className="text-xs font-medium text-[var(--text-muted)]">Verifying security permissions...</p>
        </div>
      </div>
    );
  }

  const userPerms = (user as any)?.permissions || [];
  const isAuthorized = evaluateNavigationPermissions(
    userPerms,
    requiredPermissions,
    permissionMode,
    user?.isSuperAdmin
  );

  if (!isAuthorized) {
    return (
      <div className="p-6 sm:p-10 max-w-2xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="w-full glass-card p-8 rounded-3xl border border-red-500/20 bg-red-500/5 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto shadow-md">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-500 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
              403 Forbidden
            </span>
            <h2 className="text-2xl font-black tracking-tight text-[var(--brand-text)]">
              {fallbackTitle}
            </h2>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-md mx-auto">
              {fallbackMessage}
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold border border-[var(--brand-border)] rounded-xl hover:bg-[var(--bg-surface-elevated)] transition-colors text-[var(--brand-text)] flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Go Back
            </button>

            <Link href="/admin">
              <Button
                variant="primary"
                className="btn-primary w-full sm:w-auto text-xs px-6 py-2.5 shadow-lg shadow-[#BE1E2E]/20 flex items-center justify-center gap-2"
              >
                <LayoutDashboard className="w-3.5 h-3.5" /> Return to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
