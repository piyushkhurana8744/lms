'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Badge, Button } from '@edtech/ui';

import { IPayment } from '@edtech/types';
import { formatCurrency } from '@edtech/utils';
import {
  Receipt,
  Search,
  Filter,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Calendar,
  IndianRupee,
  RefreshCcw,
  X
} from 'lucide-react';

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  // Refund Modal State
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<IPayment | null>(null);
  const [refundAmountRupees, setRefundAmountRupees] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundError, setRefundError] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery<{
    success: boolean;
    data: IPayment[];
    pagination: any;
  }>({
    queryKey: ['admin-payments-list', page, methodFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        method: methodFilter
      });
      if (search) params.append('search', search);

      const res = await fetch(`/api/v1/finance/payments?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load payments history');
      return res.json();
    }
  });

  const refundMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/v1/finance/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to process refund');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments-list'] });
      setIsRefundModalOpen(false);
      setSelectedPayment(null);
      setRefundAmountRupees('');
      setRefundReason('');
      setRefundError(null);
    },
    onError: (err: any) => {
      setRefundError(err.message);
    }
  });

  const handleRefundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRefundError(null);

    if (!selectedPayment) return;

    const minor = Math.round(Number(refundAmountRupees) * 100);
    const availableRefundable = selectedPayment.amountMinor - (selectedPayment.refundedAmountMinor || 0);

    if (!minor || minor <= 0) {
      setRefundError('Please enter a valid refund amount');
      return;
    }
    if (minor > availableRefundable) {
      setRefundError(`Refund amount cannot exceed available refundable funds (${formatCurrency(availableRefundable, selectedPayment.currency)})`);
      return;
    }
    if (!refundReason.trim()) {
      setRefundError('Please provide a legitimate reason for this refund');
      return;
    }

    refundMutation.mutate({
      paymentId: selectedPayment.id,
      amountMinor: minor,
      reason: refundReason.trim()
    });
  };

  const payments = data?.data || [];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#BE1E2E]/10 text-[#BE1E2E] border border-[#BE1E2E]/20">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-black tracking-tight text-[var(--brand-text)]">
                Payments & Collections
              </h1>
              <p className="text-xs text-[var(--text-muted)] font-mono">
                Verified transactions, receipt snapshots, and refund controls
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {['ALL', 'ONLINE_GATEWAY', 'UPI', 'CASH', 'BANK_TRANSFER'].map((m) => (
          <button
            key={m}
            onClick={() => {
              setMethodFilter(m);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              methodFilter === m
                ? 'bg-[#BE1E2E] text-white shadow-md shadow-[#BE1E2E]/20'
                : 'bg-[var(--bg-surface)] border border-[var(--brand-border)] text-[var(--text-muted)] hover:text-[var(--brand-text)]'
            }`}
          >
            {m.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Payments Table */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#BE1E2E]" />
          <p className="text-xs text-[var(--text-muted)]">Loading payments records...</p>
        </div>
      ) : isError ? (
        <Card className="p-6 border-red-500/20 bg-red-500/5 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-xs font-bold text-red-500">{(error as Error)?.message || 'Failed to load payments'}</p>
          <Button onClick={() => refetch()} variant="outline" className="text-xs">
            Retry
          </Button>
        </Card>
      ) : payments.length === 0 ? (
        <Card className="p-12 text-center space-y-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)]">
          <Receipt className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-[var(--brand-text)]">No Payment Records Found</h3>
          <p className="text-xs text-[var(--text-muted)]">
            Transactions will appear here when students pay online or staff records offline payments.
          </p>
        </Card>
      ) : (
        <Card className="p-0 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--brand-border)] bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] font-mono text-[10px] uppercase">
                  <th className="p-4 font-semibold">Payment / Receipt #</th>
                  <th className="p-4 font-semibold">Student</th>
                  <th className="p-4 font-semibold">Method</th>
                  <th className="p-4 font-semibold">Date Received</th>
                  <th className="p-4 font-semibold text-right">Amount Paid</th>
                  <th className="p-4 font-semibold text-center">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--brand-border)]">
                {payments.map((p) => {
                  const availableRefundable = p.amountMinor - (p.refundedAmountMinor || 0);

                  return (
                    <tr key={p.id} className="hover:bg-[var(--bg-surface-elevated)]/50 transition-colors">
                      <td className="p-4 space-y-0.5">
                        <div className="font-bold text-[var(--brand-text)] font-mono">{p.paymentNumber}</div>
                        {p.receiptNumber && (
                          <div className="text-[10px] text-[var(--text-muted)] font-mono">RCPT: {p.receiptNumber}</div>
                        )}
                      </td>
                      <td className="p-4 space-y-0.5">
                        <div className="font-semibold text-[var(--brand-text)]">{p.student?.name || 'Student'}</div>
                        <div className="text-[10px] text-[var(--text-muted)]">{p.student?.phone || p.student?.email}</div>
                      </td>
                      <td className="p-4">
                        <Badge className="bg-[var(--bg-surface-elevated)] text-[var(--brand-text)] border border-[var(--brand-border)] text-[10px]">
                          {p.method}
                        </Badge>
                      </td>
                      <td className="p-4 font-mono text-[11px] text-[var(--text-muted)]">
                        {new Date(p.receivedAt).toLocaleString()}
                      </td>
                      <td className="p-4 text-right">
                        <div className="font-black text-emerald-500 text-sm">
                          {formatCurrency(p.amountMinor, p.currency)}
                        </div>
                        {p.refundedAmountMinor > 0 && (
                          <div className="text-[10px] text-red-400 font-medium">
                            Refunded: {formatCurrency(p.refundedAmountMinor, p.currency)}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <Badge
                          className={`text-[10px] ${
                            p.status === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : p.status === 'PARTIALLY_REFUNDED'
                              ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                              : p.status === 'REFUNDED'
                              ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                              : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        {p.status === 'SUCCESS' && availableRefundable > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedPayment(p);
                              setRefundAmountRupees((availableRefundable / 100).toString());
                              setRefundReason('');
                              setRefundError(null);
                              setIsRefundModalOpen(true);
                            }}
                            className="text-[11px] font-bold text-red-500 border-red-500/20 hover:bg-red-500/10 gap-1"
                          >
                            <RefreshCcw className="w-3 h-3" /> Refund
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Refund Modal */}
      {isRefundModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl shadow-2xl overflow-hidden space-y-5 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-red-500 flex items-center gap-2">
                <RefreshCcw className="w-4 h-4" /> Process Controlled Refund
              </h2>
              <button
                onClick={() => setIsRefundModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[var(--bg-surface-elevated)] text-[var(--text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {refundError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-500">
                {refundError}
              </div>
            )}

            <form onSubmit={handleRefundSubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Payment Number:</span>
                  <span className="font-mono font-bold text-[var(--brand-text)]">{selectedPayment.paymentNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Max Refundable:</span>
                  <span className="font-bold text-emerald-500">
                    {formatCurrency(
                      selectedPayment.amountMinor - (selectedPayment.refundedAmountMinor || 0),
                      selectedPayment.currency
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--brand-text)]">Refund Amount (₹) *</label>
                <input
                  type="number"
                  value={refundAmountRupees}
                  onChange={(e) => setRefundAmountRupees(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--brand-text)]">Formal Reason *</label>
                <input
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Student requested batch cancellation within refund policy"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                  required
                />
              </div>


              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--brand-border)]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRefundModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={refundMutation.isPending}
                  className="text-xs font-bold bg-red-600 hover:bg-red-700 text-white"
                >
                  {refundMutation.isPending ? 'Processing...' : 'Authorize Refund'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
