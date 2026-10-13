'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownRight, Minus, ArrowRight } from 'lucide-react';

interface MetricComparison {
  current: number;
  previous?: number;
  delta?: number;
  percentageChange?: number | null;
}

interface KPICardProps {
  title: string;
  value: string | number;
  comparison?: MetricComparison;
  subtitle?: string;
  drilldownUrl?: string;
  drilldownLabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}

export function KPICard({
  title,
  value,
  comparison,
  subtitle,
  drilldownUrl,
  drilldownLabel = 'View details',
  icon: Icon,
  loading = false,
}: KPICardProps) {
  if (loading) {
    return (
      <div className="flex flex-col justify-between rounded-2xl border border-[var(--brand-border)] bg-[var(--bg-surface)]/60 p-5 shadow-sm animate-pulse">
        <div className="h-4 w-24 rounded bg-[var(--bg-surface-elevated)]"></div>
        <div className="my-3 h-8 w-32 rounded bg-[var(--bg-surface-elevated)]"></div>
        <div className="h-3 w-20 rounded bg-[var(--bg-surface-elevated)]"></div>
      </div>
    );
  }

  const isPositive = comparison && comparison.delta !== undefined && comparison.delta > 0;
  const isNegative = comparison && comparison.delta !== undefined && comparison.delta < 0;
  const isNeutral = comparison && comparison.delta !== undefined && comparison.delta === 0;

  return (
    <div className="glass-card flex flex-col justify-between rounded-2xl border border-[var(--brand-border)] bg-[var(--bg-surface)] p-5 shadow-sm transition-all hover:border-[#BE1E2E]/40 hover:shadow-lg hover:-translate-y-0.5">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">{title}</span>
          {Icon && (
            <div className="p-1.5 rounded-lg bg-[var(--bg-surface-elevated)] text-[var(--text-muted)]">
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
        <div className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-[var(--brand-text)] font-heading">{value}</div>

        {comparison && (
          <div className="mt-2 flex items-center gap-1.5 text-xs font-mono">
            {isPositive && (
              <span className="inline-flex items-center font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                <ArrowUpRight className="h-3.5 w-3.5" />
                {comparison.percentageChange !== null ? `+${comparison.percentageChange}%` : `+${comparison.delta}`}
              </span>
            )}
            {isNegative && (
              <span className="inline-flex items-center font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded">
                <ArrowDownRight className="h-3.5 w-3.5" />
                {comparison.percentageChange !== null ? `${comparison.percentageChange}%` : `${comparison.delta}`}
              </span>
            )}
            {isNeutral && (
              <span className="inline-flex items-center font-bold text-[var(--text-muted)] bg-[var(--bg-surface-elevated)] px-1.5 py-0.5 rounded">
                <Minus className="h-3.5 w-3.5" />
                0%
              </span>
            )}
            <span className="text-[var(--text-muted)] text-[11px]">vs prev period</span>
          </div>
        )}

        {subtitle && <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">{subtitle}</p>}
      </div>

      {drilldownUrl && (
        <div className="mt-4 border-t border-[var(--brand-border)]/60 pt-3">
          <Link
            href={drilldownUrl}
            className="group flex items-center justify-between text-xs font-bold text-[#BE1E2E] hover:underline"
          >
            <span>{drilldownLabel}</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      )}
    </div>
  );
}
