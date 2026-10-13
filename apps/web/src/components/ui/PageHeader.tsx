'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  badge,
  breadcrumbs,
  actions,
  className = '',
  children,
}: PageHeaderProps) {
  return (
    <div className={`space-y-4 pb-6 border-b border-[var(--brand-border)] ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-medium">
          {breadcrumbs.map((item, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-[var(--text-faint)] flex-shrink-0" />}
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="hover:text-[var(--brand-text)] hover:underline truncate transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className={isLast ? 'text-[var(--brand-text)] font-semibold truncate' : 'truncate'}>
                    {item.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--brand-text)] font-heading truncate">
              {title}
            </h1>
            {badge && <div className="flex-shrink-0">{badge}</div>}
          </div>
          {description && (
            <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed max-w-3xl">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap flex-shrink-0">
            {actions}
          </div>
        )}
      </div>

      {children}
    </div>
  );
}
