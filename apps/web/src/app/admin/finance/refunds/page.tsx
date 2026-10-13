'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Badge, Button } from '@edtech/ui';
import { IRefund } from '@edtech/types';
import { formatCurrency } from '@edtech/utils';
import {
  RefreshCcw,
  AlertCircle,
  Loader2,
  Calendar,
  IndianRupee,
  CheckCircle2,
  FileText
} from 'lucide-react';

export default function RefundsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useQuery<{
    success: boolean;
    data: IRefund[];
    pagination: any;
  }>({
    queryKey: ['admin-refunds-list', page],
    queryFn: async () => {
      const res = await fetch(`/api/v1/finance/refunds?page=${page}&limit=20`);
      if (!res.ok) throw new Error('Failed to load refunds audit log');
      return res.json();
    }
  });

  const refunds = data?.data || [];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
              <RefreshCcw className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-black tracking-tight text-[var(--brand-text)]">
                Refunds & Reversals Audit
              </h1>
              <p className="text-xs text-[var(--text-muted)] font-mono">
                Controlled record of authorized money returns and fee liability adjustments
              </p>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#BE1E2E]" />
          <p className="text-xs text-[var(--text-muted)]">Loading refund audit logs...</p>
        </div>
      ) : isError ? (
        <Card className="p-6 border-red-500/20 bg-red-500/5 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-xs font-bold text-red-500">{(error as Error)?.message || 'Failed to load refunds'}</p>
          <Button onClick={() => refetch()} variant="outline" className="text-xs">
            Retry
          </Button>
        </Card>
      ) : refunds.length === 0 ? (
        <Card className="p-12 text-center space-y-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)]">
          <RefreshCcw className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-[var(--brand-text)]">No Refunds Processed</h3>
          <p className="text-xs text-[var(--text-muted)]">
            Any refunds authorized by staff against successful payments will be logged here immutably.
          </p>
        </Card>
      ) : (
        <Card className="p-0 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--brand-border)] bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] font-mono text-[10px] uppercase">
                  <th className="p-4 font-semibold">Refund #</th>
                  <th className="p-4 font-semibold">Student</th>
                  <th className="p-4 font-semibold">Reason</th>
                  <th className="p-4 font-semibold">Processed Date</th>
                  <th className="p-4 font-semibold text-right">Refund Amount</th>
                  <th className="p-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--brand-border)]">
                {refunds.map((r) => (
                  <tr key={r.id} className="hover:bg-[var(--bg-surface-elevated)]/50 transition-colors">
                    <td className="p-4 font-mono font-bold text-[var(--brand-text)]">{r.refundNumber}</td>
                    <td className="p-4">
                      <div className="font-semibold text-[var(--brand-text)]">{r.studentUserId ? (r as any).studentUserId.name : 'Student'}</div>
                    </td>
                    <td className="p-4 text-[var(--text-muted)] max-w-xs truncate">{r.reason}</td>
                    <td className="p-4 font-mono text-[11px] text-[var(--text-muted)]">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 text-right font-black text-red-500">
                      {formatCurrency(r.amountMinor, r.currency)}
                    </td>
                    <td className="p-4 text-center">
                      <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px]">
                        {r.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
