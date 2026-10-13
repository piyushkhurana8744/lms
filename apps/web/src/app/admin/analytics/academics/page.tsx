'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Video, CheckCircle, XCircle, RotateCw, AlertCircle } from 'lucide-react';
import { AcademicsAnalyticsResponse } from '@edtech/types';
import { AnalyticsFilterBar } from '@/components/analytics/AnalyticsFilterBar';
import { KPICard } from '@/components/analytics/KPICard';
import { TimeSeriesChart } from '@/components/analytics/TimeSeriesChart';
import { BreakdownTable } from '@/components/analytics/BreakdownTable';
import { ExportButton } from '@/components/analytics/ExportButton';

export default function AcademicsAnalyticsPage() {
  const [preset, setPreset] = useState('last_30_days');
  const [branchId, setBranchId] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [data, setData] = useState<AcademicsAnalyticsResponse | null>(null);
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

      const res = await fetch(`/api/v1/analytics/academics?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Failed to fetch academic analytics (Status ${res.status})`);
      }
      const json = await res.json();
      setData(json.data);
    } catch (err: any) {
      setError(err.message || 'Unable to load academic analytics');
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
            <Video className="h-6 w-6 text-primary" />
            Academic Operations Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Authoritative class schedule occurrences, completions, cancellations, and batch activity.
          </p>
        </div>
        <ExportButton reportKey="academic_classes" query={{ preset, branchId }} label="Export Classes" />
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
          title="Classes Scheduled"
          value={data?.scheduledClasses.toLocaleString() ?? '—'}
          subtitle="Concrete class sessions"
          icon={Video}
          loading={loading}
        />
        <KPICard
          title="Classes Completed"
          value={data?.completedClasses.toLocaleString() ?? '—'}
          subtitle="Finished sessions"
          icon={CheckCircle}
          loading={loading}
        />
        <KPICard
          title="Classes Cancelled"
          value={data?.cancelledClasses.toLocaleString() ?? '—'}
          subtitle="Cancelled sessions"
          icon={XCircle}
          loading={loading}
        />
        <KPICard
          title="Classes Rescheduled"
          value={data?.rescheduledClasses.toLocaleString() ?? '—'}
          subtitle="Rescheduled metadata events"
          icon={RotateCw}
          loading={loading}
        />
      </div>

      {/* Trends & Distributions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {data?.trend && (
          <TimeSeriesChart
            title="Class Delivery Volume Trend"
            data={data.trend}
            formatValue={(v) => `${v} classes`}
            color="#7c3aed"
            loading={loading}
          />
        )}

        {data?.branchClassVolume && (
          <BreakdownTable
            title="Class Sessions by Branch"
            items={data.branchClassVolume}
            valueHeader="Classes"
            loading={loading}
          />
        )}

        {data?.modeBreakdown && (
          <BreakdownTable
            title="Class Sessions by Delivery Mode"
            items={data.modeBreakdown}
            valueHeader="Classes"
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
