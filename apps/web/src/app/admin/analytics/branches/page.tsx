'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Building2, Users, IndianRupee, ClipboardCheck, Video, AlertCircle } from 'lucide-react';
import { BranchComparisonResponse } from '@edtech/types';
import { AnalyticsFilterBar } from '@/components/analytics/AnalyticsFilterBar';

export default function BranchComparisonPage() {
  const [preset, setPreset] = useState('last_30_days');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [data, setData] = useState<BranchComparisonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (preset === 'custom' && customFrom && customTo) {
        params.set('from', customFrom);
        params.set('to', customTo);
      } else {
        params.set('preset', preset);
      }

      const res = await fetch(`/api/v1/analytics/branches/compare?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Failed to fetch branch comparison (Status ${res.status})`);
      }
      const json = await res.json();
      setData(json.data);
    } catch (err: any) {
      setError(err.message || 'Unable to load branch comparison');
    } finally {
      setLoading(false);
    }
  }, [preset, customFrom, customTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (minor?: number) => {
    if (minor === undefined) return '—';
    const major = minor / 100;
    return `₹${major.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Branch Performance Comparison
          </h1>
          <p className="text-sm text-muted-foreground">
            Side-by-side comparison across all authorized branch locations for students, admissions, finance, attendance, and class volume.
          </p>
        </div>
      </div>

      {/* Filter Bar (Date range only) */}
      <AnalyticsFilterBar
        preset={preset}
        onPresetChange={setPreset}
        branchId=""
        onBranchChange={() => {}}
        from={customFrom}
        to={customTo}
        onCustomRangeChange={(f, t) => {
          setCustomFrom(f);
          setCustomTo(t);
        }}
        onRefresh={fetchData}
        loading={loading}
      />

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Comparison Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-4">Branch</th>
                <th className="p-4 text-right">
                  <span className="flex items-center justify-end gap-1">
                    <Users className="h-3.5 w-3.5" /> Active Students
                  </span>
                </th>
                <th className="p-4 text-right">Admissions</th>
                <th className="p-4 text-right">
                  <span className="flex items-center justify-end gap-1">
                    <IndianRupee className="h-3.5 w-3.5" /> Collections
                  </span>
                </th>
                <th className="p-4 text-right">
                  <span className="flex items-center justify-end gap-1">
                    <ClipboardCheck className="h-3.5 w-3.5" /> Attendance
                  </span>
                </th>
                <th className="p-4 text-right">
                  <span className="flex items-center justify-end gap-1">
                    <Video className="h-3.5 w-3.5" /> Classes
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4"><div className="h-4 w-32 rounded bg-muted"></div></td>
                    <td className="p-4 text-right"><div className="ml-auto h-4 w-16 rounded bg-muted"></div></td>
                    <td className="p-4 text-right"><div className="ml-auto h-4 w-16 rounded bg-muted"></div></td>
                    <td className="p-4 text-right"><div className="ml-auto h-4 w-20 rounded bg-muted"></div></td>
                    <td className="p-4 text-right"><div className="ml-auto h-4 w-12 rounded bg-muted"></div></td>
                    <td className="p-4 text-right"><div className="ml-auto h-4 w-12 rounded bg-muted"></div></td>
                  </tr>
                ))
              ) : !data?.branches || data.branches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No branch comparison data found for this selection.
                  </td>
                </tr>
              ) : (
                data.branches.map((b) => (
                  <tr key={b.branchId} className="hover:bg-accent/40 transition-colors">
                    <td className="p-4 font-semibold text-foreground">
                      <div>{b.branchName}</div>
                      <span className="font-mono text-xs font-normal text-muted-foreground">{b.branchCode}</span>
                    </td>
                    <td className="p-4 text-right font-medium text-foreground">
                      {b.activeStudents !== undefined ? b.activeStudents.toLocaleString() : '—'}
                    </td>
                    <td className="p-4 text-right font-medium text-foreground">
                      {b.admissions !== undefined ? b.admissions.toLocaleString() : '—'}
                    </td>
                    <td className="p-4 text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(b.collectionsMinor)}
                    </td>
                    <td className="p-4 text-right font-medium text-foreground">
                      {b.attendancePercentage !== null && b.attendancePercentage !== undefined
                        ? `${b.attendancePercentage}%`
                        : 'N/A'}
                    </td>
                    <td className="p-4 text-right font-medium text-foreground">
                      {b.scheduledClasses !== undefined ? b.scheduledClasses.toLocaleString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
