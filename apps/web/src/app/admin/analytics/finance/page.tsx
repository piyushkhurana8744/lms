'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { IndianRupee, TrendingUp, AlertTriangle, RotateCcw, Wallet, AlertCircle } from 'lucide-react';
import { FinanceAnalyticsResponse } from '@edtech/types';
import { AnalyticsFilterBar } from '@/components/analytics/AnalyticsFilterBar';
import { KPICard } from '@/components/analytics/KPICard';
import { TimeSeriesChart } from '@/components/analytics/TimeSeriesChart';
import { BreakdownTable } from '@/components/analytics/BreakdownTable';
import { ExportButton } from '@/components/analytics/ExportButton';

export default function FinanceAnalyticsPage() {
  const [preset, setPreset] = useState('last_30_days');
  const [branchId, setBranchId] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [data, setData] = useState<FinanceAnalyticsResponse | null>(null);
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

      const res = await fetch(`/api/v1/analytics/finance?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Failed to fetch finance analytics (Status ${res.status})`);
      }
      const json = await res.json();
      setData(json.data);
    } catch (err: any) {
      setError(err.message || 'Unable to load finance analytics');
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
            <IndianRupee className="h-6 w-6 text-primary" />
            Financial Analytics & Collections
          </h1>
          <p className="text-sm text-muted-foreground">
            Strict ledger-reconciled fee collections, historical branch attribution, outstanding liabilities, and refunds.
          </p>
        </div>
        <ExportButton reportKey="finance_collections" query={{ preset, branchId }} label="Export Collections" />
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
          title="Gross Collected"
          value={data ? formatCurrency(data.collectedAmountMinor.current) : '—'}
          comparison={
            data
              ? {
                  current: data.collectedAmountMinor.current / 100,
                  previous: (data.collectedAmountMinor.previous || 0) / 100,
                  delta: (data.collectedAmountMinor.delta || 0) / 100,
                  percentageChange: data.collectedAmountMinor.percentageChange || null,
                }
              : undefined
          }
          subtitle="All successful payments"
          icon={TrendingUp}
          loading={loading}
        />
        <KPICard
          title="Refunded / Reversals"
          value={data ? formatCurrency(data.refundedAmountMinor) : '—'}
          subtitle="Processed refunds"
          icon={RotateCcw}
          loading={loading}
        />
        <KPICard
          title="Net Collections"
          value={data ? formatCurrency(data.netCollectionsMinor) : '—'}
          subtitle="Collected minus refunded"
          icon={Wallet}
          loading={loading}
        />
        <KPICard
          title="Total Outstanding"
          value={data ? formatCurrency(data.outstandingAmountMinor) : '—'}
          subtitle="Active fee plan liability"
          icon={IndianRupee}
          loading={loading}
        />
        <KPICard
          title="Overdue Dues"
          value={data ? formatCurrency(data.overdueAmountMinor) : '—'}
          subtitle="Past installment due date"
          icon={AlertTriangle}
          loading={loading}
        />
      </div>

      {/* Trends & Distributions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {data?.trend && (
          <TimeSeriesChart
            title="Daily Fee Collection Trend (INR)"
            data={data.trend}
            formatValue={(v) => formatCurrency(v)}
            color="#059669"
            loading={loading}
          />
        )}

        {data?.branchCollections && (
          <BreakdownTable
            title="Historical Collections by Branch"
            items={data.branchCollections}
            formatValue={(v) => formatCurrency(v)}
            valueHeader="Collected (INR)"
            loading={loading}
          />
        )}

        {data?.paymentMethodBreakdown && (
          <BreakdownTable
            title="Collections by Payment Method"
            items={data.paymentMethodBreakdown}
            formatValue={(v) => formatCurrency(v)}
            valueHeader="Amount (INR)"
            loading={loading}
          />
        )}

        {data?.courseCollections && (
          <BreakdownTable
            title="Collections by Course / Program"
            items={data.courseCollections}
            formatValue={(v) => formatCurrency(v)}
            valueHeader="Amount (INR)"
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
