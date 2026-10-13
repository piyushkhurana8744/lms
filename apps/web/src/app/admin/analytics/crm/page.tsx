'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { UserPlus, CheckCircle2, Clock, Users, BarChart3, AlertCircle } from 'lucide-react';
import { CRMAnalyticsResponse } from '@edtech/types';
import { AnalyticsFilterBar } from '@/components/analytics/AnalyticsFilterBar';
import { KPICard } from '@/components/analytics/KPICard';
import { TimeSeriesChart } from '@/components/analytics/TimeSeriesChart';
import { BreakdownTable } from '@/components/analytics/BreakdownTable';
import { ExportButton } from '@/components/analytics/ExportButton';

export default function CRMAnalyticsPage() {
  const [preset, setPreset] = useState('last_30_days');
  const [branchId, setBranchId] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [data, setData] = useState<CRMAnalyticsResponse | null>(null);
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

      const res = await fetch(`/api/v1/analytics/crm?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Failed to fetch CRM analytics (Status ${res.status})`);
      }
      const json = await res.json();
      setData(json.data);
    } catch (err: any) {
      setError(err.message || 'Unable to load CRM analytics');
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
            <UserPlus className="h-6 w-6 text-primary" />
            CRM & Admissions Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Pipeline velocity, lead attribution, counsellor workload, and cohort-based conversion metrics.
          </p>
        </div>
        <ExportButton reportKey="crm_leads" query={{ preset, branchId }} label="Export CRM Leads" />
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
          title="Leads Created"
          value={data?.leadsCreated ? data.leadsCreated.current.toLocaleString() : '—'}
          comparison={data?.leadsCreated}
          subtitle="New inbound prospects"
          icon={UserPlus}
          loading={loading}
        />
        <KPICard
          title="Admissions Converted"
          value={data?.admissionsTotal ? data.admissionsTotal.current.toLocaleString() : '—'}
          comparison={data?.admissionsTotal}
          subtitle="Confirmed enrollments"
          icon={CheckCircle2}
          loading={loading}
        />
        <KPICard
          title="Conversion Rate"
          value={data?.conversionRate !== undefined && data?.conversionRate !== null ? `${data.conversionRate}%` : 'N/A'}
          subtitle="Converted / Eligible created cohort"
          icon={BarChart3}
          loading={loading}
        />
        <KPICard
          title="Overdue Follow-ups"
          value={data?.overdueFollowUpsCount !== undefined ? data.overdueFollowUpsCount.toLocaleString() : '—'}
          subtitle="Pending counsellor attention"
          icon={Clock}
          loading={loading}
        />
      </div>

      {/* Funnel Visualization */}
      {data?.funnel && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-base font-bold text-foreground mb-4">Admissions Pipeline Funnel</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {data.funnel.map((stage, idx) => (
              <div
                key={stage.stage}
                className="flex flex-col items-center rounded-lg border border-border/70 bg-accent/30 p-3 text-center transition-all hover:bg-accent/60"
              >
                <span className="text-xs font-semibold text-muted-foreground uppercase">{stage.stage}</span>
                <span className="mt-2 text-xl font-extrabold text-foreground">{stage.count.toLocaleString()}</span>
                <span className="mt-1 text-[11px] text-muted-foreground">
                  {stage.stageConversionRate !== undefined ? `Conv: ${stage.stageConversionRate}%` : idx === 0 ? 'Top of funnel' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trends & Distributions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {data?.trend && (
          <TimeSeriesChart
            title="Lead Inflow Trend"
            data={data.trend}
            formatValue={(v) => `${v} leads`}
            color="#BE1E2E"
            loading={loading}
          />
        )}

        {data?.leadsBySource && (
          <BreakdownTable
            title="Leads by Acquisition Source"
            items={data.leadsBySource}
            loading={loading}
          />
        )}

        {data?.leadsByStage && (
          <BreakdownTable
            title="Leads by Current Pipeline Stage"
            items={data.leadsByStage}
            loading={loading}
          />
        )}

        {data?.counsellorDistribution && (
          <BreakdownTable
            title="Leads by Assigned Counsellor"
            items={data.counsellorDistribution}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
