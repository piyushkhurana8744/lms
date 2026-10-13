'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ClipboardCheck, UserX, AlertTriangle, AlertCircle } from 'lucide-react';
import { AttendanceAnalyticsResponse } from '@edtech/types';
import { AnalyticsFilterBar } from '@/components/analytics/AnalyticsFilterBar';
import { KPICard } from '@/components/analytics/KPICard';
import { TimeSeriesChart } from '@/components/analytics/TimeSeriesChart';
import { BreakdownTable } from '@/components/analytics/BreakdownTable';
import { ExportButton } from '@/components/analytics/ExportButton';

export default function AttendanceAnalyticsPage() {
  const [preset, setPreset] = useState('last_30_days');
  const [branchId, setBranchId] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [data, setData] = useState<AttendanceAnalyticsResponse | null>(null);
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
      if (branchId) params.set('branchId', branchId);

      const res = await fetch(`/api/v1/analytics/attendance?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Failed to fetch attendance analytics (Status ${res.status})`);
      }
      const json = await res.json();
      setData(json.data);
    } catch (err: any) {
      setError(err.message || 'Unable to load attendance analytics');
    } finally {
      setLoading(false);
    }
  }, [preset, branchId, customFrom, customTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            Attendance Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Strict Phase 12 attendance formula: (PRESENT + LATE) / (PRESENT + LATE + ABSENT), finalized sessions only.
          </p>
        </div>
        <ExportButton reportKey="attendance_summary" query={{ preset, branchId }} label="Export Attendance" />
      </div>

      {/* Filter Bar */}
      <AnalyticsFilterBar
        preset={preset}
        onPresetChange={setPreset}
        branchId={branchId}
        onBranchChange={setBranchId}
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

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Overall Attendance Rate"
          value={data?.overallPercentage !== undefined && data?.overallPercentage !== null ? `${data.overallPercentage}%` : 'N/A'}
          subtitle="Finalized attendance percentage"
          icon={ClipboardCheck}
          loading={loading}
        />
        <KPICard
          title="Total Absences"
          value={data?.absentCount.toLocaleString() ?? '—'}
          subtitle="Marked absent instances"
          icon={UserX}
          loading={loading}
        />
        <KPICard
          title="Total Present & Late"
          value={`${(data?.presentCount ?? 0) + (data?.lateCount ?? 0)}`}
          subtitle={`${data?.lateCount ?? 0} marked late`}
          icon={ClipboardCheck}
          loading={loading}
        />
        <KPICard
          title="Students with Low Attendance"
          value={data?.lowAttendanceSummary?.studentsBelowThresholdCount.toLocaleString() ?? '—'}
          subtitle={`Below ${data?.lowAttendanceSummary?.threshold ?? 75}% threshold`}
          drilldownUrl="/admin/analytics/reports?reportKey=LOW_ATTENDANCE_STUDENTS"
          drilldownLabel="View low attendance list"
          icon={AlertTriangle}
          loading={loading}
        />
      </div>

      {/* Trends & Distributions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {data?.trend && (
          <TimeSeriesChart
            title="Daily Attendance Rate Trend (%)"
            data={data.trend}
            formatValue={(v) => `${v}%`}
            color="#2563eb"
            loading={loading}
          />
        )}

        {data?.branchBreakdown && (
          <BreakdownTable
            title="Attendance Rate by Branch"
            items={data.branchBreakdown}
            formatValue={(v) => `${v}%`}
            valueHeader="Rate (%)"
            loading={loading}
          />
        )}

        {data?.batchBreakdown && (
          <BreakdownTable
            title="Attendance Rate by Batch"
            items={data.batchBreakdown}
            formatValue={(v) => `${v}%`}
            valueHeader="Rate (%)"
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
