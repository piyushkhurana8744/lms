'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Users, UserPlus, IndianRupee, ClipboardCheck, Video, BookOpen, Award, BarChart3, AlertCircle } from 'lucide-react';
import { ExecutiveDashboardResponse } from '@edtech/types';
import { AnalyticsFilterBar } from '@/components/analytics/AnalyticsFilterBar';
import { KPICard } from '@/components/analytics/KPICard';
import { TimeSeriesChart } from '@/components/analytics/TimeSeriesChart';

export default function AnalyticsOverviewPage() {
  const [preset, setPreset] = useState('last_30_days');
  const [branchId, setBranchId] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [data, setData] = useState<ExecutiveDashboardResponse | null>(null);
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

      const res = await fetch(`/api/v1/analytics/dashboard?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Failed to fetch analytics (Status ${res.status})`);
      }
      const json = await res.json();
      setData(json.data);
    } catch (err: any) {
      setError(err.message || 'Unable to load analytics');
    } finally {
      setLoading(false);
    }
  }, [preset, branchId, customFrom, customTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (minor: number) => {
    const major = (minor || 0) / 100;
    return `₹${major.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Executive Analytics Overview
          </h1>
          <p className="text-sm text-muted-foreground">
            Canonical operational intelligence across student lifecycles, admissions, finance, attendance, and academics.
          </p>
        </div>
      </div>

      {/* Global Filter Bar */}
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

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Students Section */}
        {data?.students && (
          <>
            <KPICard
              title="Active Students"
              value={data.students.activeTotal.toLocaleString()}
              subtitle={`${data.students.newlyAdmitted.current} newly admitted`}
              drilldownUrl="/admin/analytics/students"
              drilldownLabel="View student lifecycle"
              icon={Users}
              loading={loading}
            />
            <KPICard
              title="Completed Students"
              value={data.students.completed.toLocaleString()}
              subtitle="Graduated / Completed"
              drilldownUrl="/admin/analytics/students"
              drilldownLabel="View completions"
              icon={Award}
              loading={loading}
            />
          </>
        )}

        {/* CRM Section */}
        {data?.crm && (
          <>
            <KPICard
              title="New Leads Created"
              value={data.crm.leadsCreated.current.toLocaleString()}
              comparison={data.crm.leadsCreated}
              subtitle={`${data.crm.leadsConverted.current} converted (${data.crm.conversionRate !== null ? `${data.crm.conversionRate}%` : 'N/A'})`}
              drilldownUrl="/admin/analytics/crm"
              drilldownLabel="View CRM funnel"
              icon={UserPlus}
              loading={loading}
            />
            <KPICard
              title="Admissions / Converted"
              value={data.crm.leadsConverted.current.toLocaleString()}
              comparison={data.crm.leadsConverted}
              subtitle={`${data.crm.overdueFollowUps} follow-ups overdue`}
              drilldownUrl="/admin/analytics/crm"
              drilldownLabel="View admissions"
              icon={UserPlus}
              loading={loading}
            />
          </>
        )}

        {/* Finance Section */}
        {data?.finance && (
          <>
            <KPICard
              title="Fees Collected"
              value={formatCurrency(data.finance.collectedMinor.current)}
              comparison={{
                current: data.finance.collectedMinor.current / 100,
                previous: (data.finance.collectedMinor.previous || 0) / 100,
                delta: (data.finance.collectedMinor.delta || 0) / 100,
                percentageChange: data.finance.collectedMinor.percentageChange || null,
              }}
              subtitle={`Net: ${formatCurrency(data.finance.netCollectionsMinor)}`}
              drilldownUrl="/admin/analytics/finance"
              drilldownLabel="View finance ledger"
              icon={IndianRupee}
              loading={loading}
            />
            <KPICard
              title="Outstanding Balance"
              value={formatCurrency(data.finance.outstandingMinor)}
              subtitle={`Overdue: ${formatCurrency(data.finance.overdueMinor)}`}
              drilldownUrl="/admin/analytics/finance"
              drilldownLabel="View dues queue"
              icon={IndianRupee}
              loading={loading}
            />
          </>
        )}

        {/* Attendance Section */}
        {data?.attendance && (
          <KPICard
            title="Attendance Rate"
            value={data.attendance.overallPercentage !== null ? `${data.attendance.overallPercentage}%` : 'N/A'}
            subtitle={`${data.attendance.absentCount} total absences`}
            drilldownUrl="/admin/analytics/attendance"
            drilldownLabel="View attendance"
            icon={ClipboardCheck}
            loading={loading}
          />
        )}

        {/* Academics Section */}
        {data?.academics && (
          <KPICard
            title="Scheduled Classes"
            value={data.academics.scheduledClasses.toLocaleString()}
            subtitle={`${data.academics.completedClasses} completed, ${data.academics.cancelledClasses} cancelled`}
            drilldownUrl="/admin/analytics/academics"
            drilldownLabel="View timetable"
            icon={Video}
            loading={loading}
          />
        )}
      </div>

      {/* Trends Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {data?.finance?.trend && (
          <TimeSeriesChart
            title="Collection Trend (INR)"
            data={data.finance.trend}
            formatValue={(v) => formatCurrency(v)}
            color="#059669"
            loading={loading}
          />
        )}

        {data?.students?.trend && (
          <TimeSeriesChart
            title="New Student Admissions Trend"
            data={data.students.trend}
            formatValue={(v) => `${v} students`}
            color="#2563eb"
            loading={loading}
          />
        )}

        {data?.attendance?.trend && (
          <TimeSeriesChart
            title="Daily Attendance Trend (%)"
            data={data.attendance.trend}
            formatValue={(v) => `${v}%`}
            color="#0891b2"
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
