'use client';

import React, { useEffect, useState } from 'react';
import { Calendar, Building2, RefreshCw } from 'lucide-react';

interface BranchOption {
  _id: string;
  name: string;
  code: string;
}

interface AnalyticsFilterBarProps {
  preset: string;
  onPresetChange: (preset: string) => void;
  branchId: string;
  onBranchChange: (branchId: string) => void;
  from?: string;
  to?: string;
  onCustomRangeChange?: (from: string, to: string) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export function AnalyticsFilterBar({
  preset,
  onPresetChange,
  branchId,
  onBranchChange,
  from,
  to,
  onCustomRangeChange,
  onRefresh,
  loading = false,
}: AnalyticsFilterBarProps) {
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [customFrom, setCustomFrom] = useState(from || '');
  const [customTo, setCustomTo] = useState(to || '');

  useEffect(() => {
    fetch('/api/v1/branches/accessible')
      .then((res) => (res.ok ? res.json() : { data: { items: [] } }))
      .then((data) => {
        setBranches(data.data?.items || data.data || []);
      })
      .catch(() => setBranches([]));
  }, []);

  const handleCustomApply = () => {
    if (customFrom && customTo && onCustomRangeChange) {
      onCustomRangeChange(customFrom, customTo);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {/* Preset Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <select
            value={preset}
            onChange={(e) => onPresetChange(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Select Date Preset"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last_7_days">Last 7 Days</option>
            <option value="last_30_days">Last 30 Days</option>
            <option value="this_month">This Month</option>
            <option value="previous_month">Previous Month</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {/* Custom Range Inputs */}
        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
              aria-label="From Date"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
              aria-label="To Date"
            />
            <button
              onClick={handleCustomApply}
              className="rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Apply
            </button>
          </div>
        )}

        {/* Branch Selector */}
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <select
            value={branchId}
            onChange={(e) => onBranchChange(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Select Branch Scope"
          >
            <option value="">All Authorized Branches</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Refresh Button */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50"
          title="Refresh metrics"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      )}
    </div>
  );
}
