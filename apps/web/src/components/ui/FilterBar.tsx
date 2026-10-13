'use client';

import React from 'react';
import { Search, Filter, X, RefreshCw } from 'lucide-react';

export interface FilterBarProps {
  search?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  activeFilterCount?: number;
  onResetFilters?: () => void;
  rightActions?: React.ReactNode;
  className?: string;
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filters,
  activeFilterCount = 0,
  onResetFilters,
  rightActions,
  className = '',
}: FilterBarProps) {
  return (
    <div
      className={`p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs ${className}`}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2.5 min-w-0">
        {onSearchChange !== undefined && (
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-[var(--brand-text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E]/20 focus:border-[#BE1E2E] transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--brand-text)] p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {filters && <div className="flex items-center gap-2 flex-wrap">{filters}</div>}

        {activeFilterCount > 0 && onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-muted)] hover:text-[#BE1E2E] hover:bg-[#BE1E2E]/10 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset ({activeFilterCount})</span>
          </button>
        )}
      </div>

      {rightActions && (
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          {rightActions}
        </div>
      )}
    </div>
  );
}
