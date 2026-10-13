'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Users, UserCheck, PauseCircle, UserX, Award, AlertCircle } from 'lucide-react';
import { StudentsAnalyticsResponse } from '@edtech/types';
import { AnalyticsFilterBar } from '@/components/analytics/AnalyticsFilterBar';
import { KPICard } from '@/components/analytics/KPICard';
import { TimeSeriesChart } from '@/components/analytics/TimeSeriesChart';
import { BreakdownTable } from '@/components/analytics/BreakdownTable';
import { ExportButton } from '@/components/analytics/ExportButton';

export default function StudentsAnalyticsPage() {
  const [preset, setPreset] = useState('last_30_days');
  const [branchId, setBranchId] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [data, setData] = useState<StudentsAnalyticsResponse | null>(null);
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

      const res = await fetch(`/api/v1/analytics/students?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Failed to fetch student analytics (Status ${res.status})`);
      }
      const json = await res.json();
      setData(json.data);
    } catch (err: any) {
      setError(err.message || 'Unable to load student analytics');
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
            Student Lifecycle Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Canonical student state progression, effective-dated branch distribution, and completions.
          </p>
        </div>
        <ExportButton reportKey="students_lifecycle" query={{ preset, branchId }} label="Export Student Report" />
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KPICard
          title="Active Students"
          value={data?.activeStudents.toLocaleString() ?? '—'}
          subtitle="Currently enrolled & active"
          icon={UserCheck}
          loading={loading}
        />
        <KPICard
          title="Newly Admitted"
          value={data?.newlyAdmitted ? data.newlyAdmitted.current.toLocaleString() : '—'}
          comparison={data?.newlyAdmitted}
          subtitle="Activated in selected range"
          icon={Users}
          loading={loading}
        />
        <KPICard
          title="On Hold"
          value={data?.onHold.toLocaleString() ?? '—'}
          subtitle="Temporarily paused"
          icon={PauseCircle}
          loading={loading}
        />
        <KPICard
          title="Withdrawn / Dropout"
          value={data?.withdrawn.toLocaleString() ?? '—'}
          subtitle="Discontinued"
          icon={UserX}
          loading={loading}
        />
        <KPICard
          title="Completed"
          value={data?.completed.toLocaleString() ?? '—'}
          subtitle="Graduated"
          icon={Award}
          loading={loading}
        />
      </div>

      {/* Trends & Distributions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {data?.lifecycleTrend && (
          <TimeSeriesChart
            title="New Student Admissions Trend"
            data={data.lifecycleTrend}
            formatValue={(v) => `${v} students`}
            color="#2563eb"
            loading={loading}
          />
        )}

        {data?.branchDistribution && (
          <BreakdownTable
            title="Students by Branch (Effective-Dated)"
            items={data.branchDistribution}
            loading={loading}
          />
        )}

        {data?.courseDistribution && (
          <BreakdownTable
            title="Students by Course"
            items={data.courseDistribution}
            loading={loading}
          />
        )}

        {data?.batchDistribution && (
          <BreakdownTable
            title="Students by Batch"
            items={data.batchDistribution}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
