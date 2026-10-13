'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { BookOpen, CheckCircle, Award, AlertCircle, FileText } from 'lucide-react';
import { LearningAnalyticsResponse } from '@edtech/types';
import { AnalyticsFilterBar } from '@/components/analytics/AnalyticsFilterBar';
import { KPICard } from '@/components/analytics/KPICard';
import { TimeSeriesChart } from '@/components/analytics/TimeSeriesChart';
import { BreakdownTable } from '@/components/analytics/BreakdownTable';
import { ExportButton } from '@/components/analytics/ExportButton';

export default function LearningAnalyticsPage() {
  const [preset, setPreset] = useState('last_30_days');
  const [branchId, setBranchId] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [data, setData] = useState<LearningAnalyticsResponse | null>(null);
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

      const res = await fetch(`/api/v1/analytics/learning?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Failed to fetch learning analytics (Status ${res.status})`);
      }
      const json = await res.json();
      setData(json.data);
    } catch (err: any) {
      setError(err.message || 'Unable to load learning analytics');
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
            <BookOpen className="h-6 w-6 text-primary" />
            Learning & Assessment Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Course completions, lesson progression, assessment submissions, and certificate credential issuances.
          </p>
        </div>
        <ExportButton reportKey="learning_progress" query={{ preset, branchId }} label="Export Progress" />
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
          title="Active Enrollments"
          value={data?.activeEnrollments.toLocaleString() ?? '—'}
          subtitle="Course enrollments"
          icon={BookOpen}
          loading={loading}
        />
        <KPICard
          title="Course Completion Rate"
          value={data?.courseCompletionRate !== undefined && data?.courseCompletionRate !== null ? `${data.courseCompletionRate}%` : 'N/A'}
          subtitle="Completed / Total enrollments"
          icon={CheckCircle}
          loading={loading}
        />
        <KPICard
          title="Assessment Submissions"
          value={data?.assessmentMetrics.submissionsCount.toLocaleString() ?? '—'}
          subtitle={`${data?.assessmentMetrics.pendingGradingCount ?? 0} pending grading`}
          icon={FileText}
          loading={loading}
        />
        <KPICard
          title="Average Assessment Score"
          value={data?.assessmentMetrics.averageScorePercent !== null && data?.assessmentMetrics.averageScorePercent !== undefined ? `${data.assessmentMetrics.averageScorePercent}%` : 'N/A'}
          subtitle="Across graded submissions"
          icon={Award}
          loading={loading}
        />
        <KPICard
          title="Certificates Issued"
          value={data?.certificatesIssued.toLocaleString() ?? '—'}
          subtitle={`${data?.certificatesRevoked ?? 0} revoked`}
          icon={Award}
          loading={loading}
        />
      </div>

      {/* Course Progress Distribution */}
      <div className="grid gap-6">
        {data?.courseProgressDistribution && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">Course Progress Distribution</h2>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {data.courseProgressDistribution.map((tier) => (
                <div key={tier.range} className="rounded-lg border border-border/50 bg-accent/20 p-4">
                  <div className="text-xs font-medium text-muted-foreground">{tier.range} Completed</div>
                  <div className="mt-1 text-2xl font-bold text-foreground">{tier.count}</div>
                  <div className="mt-1 text-xs text-primary font-medium">{tier.percentage}% of students</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
