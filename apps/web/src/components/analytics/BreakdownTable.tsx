'use client';

import React from 'react';
import { AnalyticsDimensionBreakdown } from '@edtech/types';

interface BreakdownTableProps {
  title: string;
  items: AnalyticsDimensionBreakdown[];
  formatValue?: (val: number) => string;
  valueHeader?: string;
  loading?: boolean;
}

export function BreakdownTable({
  title,
  items = [],
  formatValue = (v) => v.toLocaleString(),
  valueHeader = 'Count',
  loading = false,
}: BreakdownTableProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--brand-border)] bg-[var(--bg-surface)] p-5 shadow-sm animate-pulse">
        <div className="h-4 w-32 rounded bg-[var(--bg-surface-elevated)]"></div>
        <div className="mt-4 space-y-3">
          <div className="h-3 w-full rounded bg-[var(--bg-surface-elevated)]"></div>
          <div className="h-3 w-full rounded bg-[var(--bg-surface-elevated)]"></div>
          <div className="h-3 w-full rounded bg-[var(--bg-surface-elevated)]"></div>
        </div>
      </div>
    );
  }

  const totalValue = items.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="glass-card rounded-2xl border border-[var(--brand-border)] bg-[var(--bg-surface)] p-5 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--brand-border)]/60">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--brand-text)]">{title}</h3>
        <span className="text-[11px] font-mono text-[var(--text-muted)]">{items.length} categories</span>
      </div>

      {items.length === 0 ? (
        <div className="py-8 text-center text-xs font-mono text-[var(--text-muted)]">No breakdown data available.</div>
      ) : (
        <div className="mt-3.5 space-y-3.5">
          {items.map((item, idx) => {
            const percentage = item.percentage ?? (totalValue > 0 ? Math.round((item.value / totalValue) * 100) : 0);

            return (
              <div key={item.id || idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--brand-text)] truncate">{item.name || item.id}</span>
                  <div className="flex items-center gap-2 flex-shrink-0 font-mono">
                    <span className="font-bold text-[var(--brand-text)]">{formatValue(item.value)}</span>
                    <span className="text-[var(--text-muted)] w-11 text-right">({percentage}%)</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)]/50">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#BE1E2E] to-red-500 transition-all duration-500"
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
