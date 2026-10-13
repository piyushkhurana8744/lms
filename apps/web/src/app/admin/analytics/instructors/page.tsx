'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Users, Clock, CheckSquare, ClipboardCheck, AlertCircle } from 'lucide-react';
import { InstructorsAnalyticsResponse } from '@edtech/types';
import { AnalyticsFilterBar } from '@/components/analytics/AnalyticsFilterBar';
import { KPICard } from '@/components/analytics/KPICard';
import { BreakdownTable } from '@/components/analytics/BreakdownTable';
import { ExportButton } from '@/components/analytics/ExportButton';

export default function InstructorsAnalyticsPage() {
  const [preset, setPreset] = useState('last_30_days');
  const [branchId, setBranchId] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [data, setData] = useState<InstructorsAnalyticsResponse | null>(null);
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

      const res = await fetch(`/api/v1/analytics/instructors?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Failed to fetch instructor analytics (Status ${res.status})`);
      }
      const json = await res.json();
      setData(json.data);
    } catch (err: any) {
      setError(err.message || 'Unable to load instructor analytics');
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
            <Users className="h-6 w-6 text-primary" />
            Instructor Workload Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Canonical teaching assignments, delivered class hours, pending grading queues, and finalized attendance records.
          </p>
        </div>
        <ExportButton reportKey="instructor_workload" query={{ preset, branchId }} label="Export Workload" />
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
          title="Scheduled Workload Hours"
          value={data?.scheduledWorkloadHours !== undefined ? `${data.scheduledWorkloadHours} hrs` : '—'}
          subtitle="Assigned teaching duration"
          icon={Clock}
          loading={loading}
        />
        <KPICard
          title="Teaching Hours Delivered"
          value={data?.completedWorkloadHours !== undefined ? `${data.completedWorkloadHours} hrs` : '—'}
          subtitle="Completed sessions"
          icon={CheckSquare}
          loading={loading}
        />
        <KPICard
          title="Attendance Marking Pending"
          value={data?.pendingAttendanceCount.toLocaleString() ?? '—'}
          subtitle="Unfinalized past sessions"
          icon={ClipboardCheck}
          loading={loading}
        />
        <KPICard
          title="Grading Tasks Pending"
          value={data?.pendingGradingCount.toLocaleString() ?? '—'}
          subtitle="Ungraded student submissions"
          icon={Clock}
          loading={loading}
        />
      </div>

      {/* Workload Breakdowns */}
      <div className="grid gap-6 lg:grid-cols-2">
        {data?.instructorWorkloadDistribution && (
          <BreakdownTable
            title="Teaching Hours by Instructor"
            items={data.instructorWorkloadDistribution}
            formatValue={(v) => `${v} hrs`}
            valueHeader="Hours"
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
