'use client';

import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { Button } from '@edtech/ui';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  secondaryAction?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  secondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`p-10 sm:p-14 text-center rounded-2xl border border-dashed border-[var(--brand-border)] bg-[var(--bg-surface)]/60 flex flex-col items-center justify-center max-w-xl mx-auto space-y-4 animate-fade-in ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-[#BE1E2E]/10 text-[#BE1E2E] flex items-center justify-center shadow-inner">
        <Icon className="w-6 h-6" />
      </div>

      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-base font-bold text-[var(--brand-text)] font-heading">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {(actionLabel || secondaryAction) && (
        <div className="flex items-center gap-3 pt-1 flex-wrap justify-center">
          {actionHref && actionLabel && (
            <a
              href={actionHref}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#BE1E2E] hover:bg-[#a01826] shadow-sm transition-all"
            >
              {actionLabel}
            </a>
          )}
          {onAction && actionLabel && !actionHref && (
            <Button
              variant="primary"
              size="sm"
              onClick={onAction}
              className="btn-primary text-xs font-bold px-4 py-2 rounded-xl"
            >
              {actionLabel}
            </Button>
          )}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
