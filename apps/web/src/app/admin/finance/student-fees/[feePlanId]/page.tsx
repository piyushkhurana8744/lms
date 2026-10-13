'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Badge, Button } from '@edtech/ui';

import { IStudentFeePlan, IPayment, IFinancialLedger, IReceipt } from '@edtech/types';
import { formatCurrency } from '@edtech/utils';
import {
  IndianRupee,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Banknote,
  Receipt,
  FileSpreadsheet,
  Plus,
  X,
  CreditCard,
  UserCheck,
  ShieldCheck
} from 'lucide-react';

export default function StudentFeePlanDetailPage() {
  const params = useParams();
  const feePlanId = params?.feePlanId as string;
  const queryClient = useQueryClient();

  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [amountRupees, setAmountRupees] = useState('');
  const [method, setMethod] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'CHEQUE'>('UPI');
  const [transactionReference, setTransactionReference] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery<{
    success: boolean;
    data: {
      plan: any;
      payments: IPayment[];
      ledger: IFinancialLedger[];
      receipts: IReceipt[];
    };
  }>({
    queryKey: ['student-fee-plan-detail', feePlanId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/finance/student-fees/${feePlanId}`);
      if (!res.ok) throw new Error('Failed to load student fee plan details');
      return res.json();
    }
  });

  const collectMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/v1/finance/payments/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to record manual payment');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-fee-plan-detail', feePlanId] });
      setIsCollectModalOpen(false);
      setAmountRupees('');
      setTransactionReference('');
      setNotes('');
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message);
    }
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#BE1E2E]" />
          <p className="text-sm font-medium text-[var(--text-muted)]">Loading fee account dossier...</p>
        </div>
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="p-8">
        <Card className="p-6 border-red-500/20 bg-red-500/5 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-xs font-bold text-red-500">{(error as Error)?.message || 'Account not found'}</p>
          <Link href="/admin/finance/student-fees">
            <Button variant="outline" className="text-xs">
              Back to Student Fees
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const { plan, payments, ledger, receipts } = data.data;

  const handleCollectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const minor = Math.round(Number(amountRupees) * 100);
    if (!minor || minor <= 0) {
      setFormError('Please enter a valid payment amount');
      return;
    }
    if (minor > plan.outstandingBalanceMinor) {
      setFormError(`Payment amount cannot exceed outstanding balance (${formatCurrency(plan.outstandingBalanceMinor, plan.currency)})`);
      return;
    }

    collectMutation.mutate({
      studentFeePlanId: plan._id,
      amountMinor: minor,
      method,
      transactionReference: transactionReference.trim() || undefined,
      notes: notes.trim() || undefined
    });
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/finance/student-fees"
          className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--brand-text)]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Fee Accounts
        </Link>

        {plan.outstandingBalanceMinor > 0 && (
          <Button
            onClick={() => {
              setAmountRupees((plan.outstandingBalanceMinor / 100).toString());
              setIsCollectModalOpen(true);
            }}
            className="text-xs font-bold gap-1.5 bg-[#BE1E2E] hover:bg-[#a01826] text-white shadow-md shadow-[#BE1E2E]/20"
          >
            <Banknote className="w-4 h-4" /> Collect Payment
          </Button>
        )}
      </div>

      {/* Account Header Dossier */}
      <Card className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-[var(--brand-text)]">{plan.studentUserId?.name || 'Student Account'}</h1>
              {plan.status === 'FULLY_PAID' ? (
                <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs">
                  FULLY PAID
                </Badge>
              ) : (
                <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs">
                  ACTIVE DUES
                </Badge>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Enrolled Course: <span className="font-semibold text-[var(--brand-text)]">{plan.courseId?.title}</span> • Email: {plan.studentUserId?.email} • Phone: {plan.studentUserId?.phone || 'N/A'}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-[var(--bg-surface-elevated)] p-4 rounded-xl border border-[var(--brand-border)]">
            <div>
              <div className="text-[10px] uppercase font-mono text-[var(--text-muted)]">Net Course Fee</div>
              <div className="text-sm font-bold text-[var(--brand-text)]">{formatCurrency(plan.netPayableMinor, plan.currency)}</div>
            </div>
            <div className="h-8 w-px bg-[var(--brand-border)]" />
            <div>
              <div className="text-[10px] uppercase font-mono text-emerald-500">Collected</div>
              <div className="text-sm font-bold text-emerald-500">{formatCurrency(plan.paidAmountMinor, plan.currency)}</div>
            </div>
            <div className="h-8 w-px bg-[var(--brand-border)]" />
            <div>
              <div className="text-[10px] uppercase font-mono text-amber-500">Outstanding Due</div>
              <div className="text-base font-black text-amber-500">{formatCurrency(plan.outstandingBalanceMinor, plan.currency)}</div>
            </div>
          </div>
        </div>

        {/* Breakdown of discount */}
        {plan.discountAmountMinor > 0 && (
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-400 flex items-center justify-between">
            <span>
              🎓 Scholarship / Concession Applied: <strong>{formatCurrency(plan.discountAmountMinor, plan.currency)}</strong> ({plan.discountReason || 'Approved'})
            </span>
            <span className="text-[10px] font-mono opacity-80">Base: {formatCurrency(plan.baseAmountMinor, plan.currency)}</span>
          </div>
        )}
      </Card>

      {/* Grid: Installments Schedule + Payment History + Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Installment Schedule */}
        <Card className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--brand-text)] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#BE1E2E]" /> Installment Schedule
            </h2>
            <span className="text-xs text-[var(--text-muted)]">{plan.installments?.length || 0} Dues</span>
          </div>

          <div className="divide-y divide-[var(--brand-border)]">
            {plan.installments?.map((inst: any, i: number) => {
              const remaining = inst.amountMinor - inst.paidAmountMinor;
              const isOverdue = remaining > 0 && new Date(inst.dueDate) < new Date();

              return (
                <div key={i} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--brand-text)]">{inst.label}</span>
                      {inst.status === 'PAID' ? (
                        <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px]">
                          PAID
                        </Badge>
                      ) : inst.status === 'PARTIALLY_PAID' ? (
                        <Badge className="bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px]">
                          PARTIAL
                        </Badge>
                      ) : isOverdue ? (
                        <Badge className="bg-red-500/10 text-red-500 border border-red-500/20 text-[10px]">
                          OVERDUE
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px]">
                          PENDING
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] font-mono">
                      Due: {new Date(inst.dueDate).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="text-right space-y-0.5">
                    <div className="text-xs font-black text-[var(--brand-text)]">
                      {formatCurrency(inst.amountMinor, plan.currency)}
                    </div>
                    {inst.paidAmountMinor > 0 && (
                      <p className="text-[10px] text-emerald-500 font-medium">
                        Paid: {formatCurrency(inst.paidAmountMinor, plan.currency)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Receipts & Payments */}
        <Card className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--brand-text)] flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-500" /> Payment Receipts ({receipts.length})
            </h2>
          </div>

          {receipts.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              No payments collected for this account yet.
            </div>
          ) : (
            <div className="divide-y divide-[var(--brand-border)]">
              {receipts.map((rcpt: any) => (
                <div key={rcpt._id} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--brand-text)] font-mono">{rcpt.receiptNumber}</span>
                      <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px]">
                        {rcpt.paymentMethod}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      Issued {new Date(rcpt.issuedAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-black text-emerald-500">
                      {formatCurrency(rcpt.amountMinor, rcpt.currency)}
                    </div>
                    {rcpt.transactionReference && (
                      <p className="text-[9px] font-mono text-[var(--text-muted)]">Ref: {rcpt.transactionReference}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Immutable Financial Ledger Section */}
      <Card className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-4">
        <h2 className="text-sm font-bold text-[var(--brand-text)] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-500" /> Immutable Financial Audit Ledger
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--brand-border)] text-[var(--text-muted)] font-mono text-[10px] uppercase">
                <th className="pb-2 font-semibold">Date</th>
                <th className="pb-2 font-semibold">Entry Type</th>
                <th className="pb-2 font-semibold">Description</th>
                <th className="pb-2 font-semibold text-right">Amount</th>
                <th className="pb-2 font-semibold text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--brand-border)]">
              {ledger.map((entry: any) => (
                <tr key={entry._id} className="hover:bg-[var(--bg-surface-elevated)]/50">
                  <td className="py-2.5 font-mono text-[11px] text-[var(--text-muted)]">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2.5">
                    <Badge
                      className={`text-[9px] px-1.5 py-0.2 ${
                        entry.entryType === 'CHARGE'
                          ? 'bg-amber-500/10 text-amber-500'
                          : entry.entryType === 'PAYMENT'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-purple-500/10 text-purple-500'
                      }`}
                    >
                      {entry.entryType}
                    </Badge>
                  </td>
                  <td className="py-2.5 text-[var(--brand-text)]">{entry.description}</td>
                  <td
                    className={`py-2.5 text-right font-bold ${
                      entry.isDebit ? 'text-amber-500' : 'text-emerald-500'
                    }`}
                  >
                    {entry.isDebit ? '+' : '-'}
                    {formatCurrency(entry.amountMinor, entry.currency)}
                  </td>
                  <td className="py-2.5 text-right font-black text-[var(--brand-text)]">
                    {formatCurrency(entry.runningBalanceMinor, entry.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Collect Payment Modal */}
      {isCollectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl shadow-2xl overflow-hidden space-y-5 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--brand-text)] flex items-center gap-2">
                <Banknote className="w-4 h-4 text-[#BE1E2E]" /> Record Offline Payment
              </h2>
              <button
                onClick={() => setIsCollectModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[var(--bg-surface-elevated)] text-[var(--text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-500">
                {formError}
              </div>
            )}

            <form onSubmit={handleCollectSubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)]">Max Collectible Due:</span>
                <span className="font-bold text-amber-500">{formatCurrency(plan.outstandingBalanceMinor, plan.currency)}</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--brand-text)]">Amount to Collect (₹) *</label>
                <input
                  type="number"
                  value={amountRupees}
                  onChange={(e) => setAmountRupees(e.target.value)}
                  placeholder="e.g. 25000"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--brand-text)]">Payment Method *</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-[var(--brand-text)] font-medium"
                  required
                >
                  <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                  <option value="CASH">Cash (In-person)</option>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT / IMPS / RTGS)</option>
                  <option value="CARD">Debit / Credit Card POS</option>
                  <option value="CHEQUE">Cheque / Demand Draft</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--brand-text)]">
                  Transaction / UTR Reference Number
                </label>
                <input
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  placeholder="e.g. UPI-123456789 or Cheque #88921"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--brand-text)]">Internal Remarks / Notes</label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Collected at South Delhi Branch front desk"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>


              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--brand-border)]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCollectModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={collectMutation.isPending}
                  className="text-xs font-bold bg-[#BE1E2E] hover:bg-[#a01826] text-white"
                >
                  {collectMutation.isPending ? 'Recording...' : 'Confirm Payment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
