'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card, Badge, Button } from '@edtech/ui';
import { FinanceDashboardSummary } from '@edtech/types';
import { formatCurrency } from '@edtech/utils';
import {
  IndianRupee,
  TrendingUp,
  CreditCard,
  Banknote,
  AlertCircle,
  Clock,
  CheckCircle2,
  Receipt,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowRight,
  Loader2,
  Calendar,
  Layers,
  Settings,
  ShieldCheck,
  RefreshCcw
} from 'lucide-react';

export default function FinanceDashboardPage() {
  const { data, isLoading, isError, error, refetch } = useQuery<{ success: boolean; data: FinanceDashboardSummary }>({
    queryKey: ['finance-dashboard-summary'],
    queryFn: async () => {
      const res = await fetch('/api/v1/finance/dashboard');
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message || 'Failed to load finance dashboard metrics');
      }
      return res.json();
    }
  });

  const dashboard = data?.data;
  const stats = dashboard?.stats || {
    totalCollectedMinor: 0,
    totalOutstandingMinor: 0,
    totalOverdueMinor: 0,
    collectedTodayMinor: 0,
    onlineCollectionsMinor: 0,
    offlineCollectionsMinor: 0,
    totalRefundedMinor: 0,
    activePlansCount: 0,
    fullyPaidPlansCount: 0
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#BE1E2E]" />
          <p className="text-sm font-medium text-[var(--text-muted)]">Loading financial intelligence...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <Card className="p-6 border-red-500/20 bg-red-500/5 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-red-600">Failed to load Finance Dashboard</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">{(error as Error)?.message || 'An error occurred'}</p>
          </div>
          <Button onClick={() => refetch()} variant="outline" className="text-xs">
            Retry Loading
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#BE1E2E]/10 text-[#BE1E2E] border border-[#BE1E2E]/20">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-black tracking-tight text-[var(--brand-text)]">
                Finance & Payments Engine
              </h1>
              <p className="text-xs text-[var(--text-muted)] font-mono">
                Provider-Independent Financial Ledger & Collection Command Center
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link href="/admin/finance/fee-structures">
            <Button variant="outline" className="text-xs font-semibold gap-1.5 border-[var(--brand-border)]">
              <Layers className="w-3.5 h-3.5" /> Fee Structures
            </Button>
          </Link>
          <Link href="/admin/finance/dues">
            <Button variant="outline" className="text-xs font-semibold gap-1.5 border-[var(--brand-border)]">
              <Clock className="w-3.5 h-3.5 text-amber-500" /> Dues Queue
            </Button>
          </Link>
          <Link href="/admin/finance/student-fees">
            <Button className="text-xs font-bold gap-1.5 bg-[#BE1E2E] hover:bg-[#a01826] text-white shadow-md shadow-[#BE1E2E]/20">
              <IndianRupee className="w-3.5 h-3.5" /> Student Fee Plans
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-muted)]">Total Revenue Collected</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-[var(--brand-text)] tracking-tight">
              {formatCurrency(stats.totalCollectedMinor, 'INR')}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] font-medium text-emerald-500 flex items-center">
                Today: {formatCurrency(stats.collectedTodayMinor, 'INR')}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-muted)]">Outstanding Dues</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-500 tracking-tight">
              {formatCurrency(stats.totalOutstandingMinor, 'INR')}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Across {stats.activePlansCount} active student accounts
            </p>
          </div>
        </Card>

        <Card className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-muted)]">Overdue Amount</span>
            <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-red-500 tracking-tight">
              {formatCurrency(stats.totalOverdueMinor, 'INR')}
            </div>
            <p className="text-[11px] text-red-400 mt-1 font-medium">Requires immediate follow-up</p>
          </div>
        </Card>

        <Card className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-muted)]">Collections Split</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-muted)]">Online Gateways:</span>
              <span className="font-bold text-[var(--brand-text)]">{formatCurrency(stats.onlineCollectionsMinor, 'INR')}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-muted)]">Offline / Cash / UPI:</span>
              <span className="font-bold text-[var(--brand-text)]">{formatCurrency(stats.offlineCollectionsMinor, 'INR')}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Grid: Upcoming Dues Queue & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Actionable Dues Queue */}
        <Card className="lg:col-span-2 p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#BE1E2E]" />
              <h2 className="text-base font-bold text-[var(--brand-text)]">Actionable Dues Queue</h2>
            </div>
            <Link
              href="/admin/finance/dues"
              className="text-xs font-semibold text-[#BE1E2E] hover:underline flex items-center gap-1"
            >
              View All Dues <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {dashboard?.upcomingDues && dashboard.upcomingDues.length > 0 ? (
            <div className="divide-y divide-[var(--brand-border)]">
              {dashboard.upcomingDues.map((item, idx) => (
                <div key={idx} className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--brand-text)]">{item.studentName}</span>
                      {item.isOverdue ? (
                        <Badge className="bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] px-1.5 py-0.2">
                          OVERDUE
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] px-1.5 py-0.2">
                          DUE SOON
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {item.courseTitle} • <span className="font-mono">{item.installmentLabel}</span>
                    </p>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-sm font-black text-[var(--brand-text)]">
                      {formatCurrency(item.amountMinor, 'INR')}
                    </div>
                    <p className="text-[10px] font-mono text-[var(--text-muted)]">
                      Due: {new Date(item.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-[var(--text-muted)]">
              No outstanding dues requiring collection right now.
            </div>
          )}
        </Card>

        {/* Right 1 Col: Quick Links & Summary */}
        <div className="space-y-6">
          <Card className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-4">
            <h2 className="text-base font-bold text-[var(--brand-text)] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Financial Operations
            </h2>

            <div className="space-y-2.5">
              <Link
                href="/admin/finance/student-fees"
                className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] hover:border-[#BE1E2E]/40 transition-colors text-xs font-semibold"
              >
                <div className="flex items-center gap-2.5">
                  <Banknote className="w-4 h-4 text-[#BE1E2E]" />
                  <span>Collect Offline Payment</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              </Link>

              <Link
                href="/admin/finance/payments"
                className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] hover:border-[#BE1E2E]/40 transition-colors text-xs font-semibold"
              >
                <div className="flex items-center gap-2.5">
                  <Receipt className="w-4 h-4 text-blue-500" />
                  <span>Payment History & Receipts</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              </Link>

              <Link
                href="/admin/finance/refunds"
                className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] hover:border-[#BE1E2E]/40 transition-colors text-xs font-semibold"
              >
                <div className="flex items-center gap-2.5">
                  <RefreshCcw className="w-4 h-4 text-purple-500" />
                  <span>Controlled Refunds</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              </Link>

              <Link
                href="/admin/finance/settings"
                className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] hover:border-[#BE1E2E]/40 transition-colors text-xs font-semibold"
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4 text-amber-500" />
                  <span>Payment Gateway Credentials</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
