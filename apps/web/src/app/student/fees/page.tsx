'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Badge, Button } from '@edtech/ui';
import { formatCurrency } from '@edtech/utils';
import {
  IndianRupee,
  Receipt,
  Calendar,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Download,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function StudentFeesOverviewPage() {
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery<{
    success: boolean;
    data: {
      plans: any[];
      payments: any[];
      receipts: any[];
    };
  }>({
    queryKey: ['student-self-finance-overview'],
    queryFn: async () => {
      const res = await fetch('/api/v1/student/fees');
      if (!res.ok) throw new Error('Failed to load your fee accounts and receipts');
      return res.json();
    }
  });

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        return resolve(true);
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleOnlinePay = async (plan: any, installment?: any) => {
    setPaymentProcessing(true);
    setPaymentError(null);
    setPaymentSuccess(null);

    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error('Payment gateway SDK failed to load. Please check your internet connection.');
      }

      // 1. Create server-authoritative order
      const orderRes = await fetch('/api/v1/finance/payments/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentFeePlanId: plan._id,
          installmentId: installment?._id
        })
      });

      const orderJson = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderJson.error?.message || 'Failed to initiate payment attempt');
      }

      const order = orderJson.data;

      // 2. Open Razorpay Checkout Modal
      const options = {
        key: order.keyId,
        amount: order.amountMinor,
        currency: order.currency || 'INR',
        name: 'DIDM Learning Portal',
        description: `Fee Payment for ${plan.courseId?.title || 'Course'}`,
        order_id: order.gatewayOrderId,
        prefill: {
          name: order.student?.name,
          email: order.student?.email,
          contact: order.student?.phone
        },
        theme: {
          color: '#BE1E2E'
        },
        handler: async (response: any) => {
          // 3. Cryptographic Signature Verification on backend
          try {
            const verifyRes = await fetch('/api/v1/finance/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                paymentId: order.paymentId,
                gatewayPaymentId: response.razorpay_payment_id,
                gatewayOrderId: response.razorpay_order_id,
                gatewaySignature: response.razorpay_signature
              })
            });

            const verifyJson = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyJson.error?.message || 'Payment signature verification failed');
            }

            setPaymentSuccess(`Payment successful! Receipt #${verifyJson.data.receiptNumber} generated.`);
            queryClient.invalidateQueries({ queryKey: ['student-self-finance-overview'] });
          } catch (verifyErr: any) {
            setPaymentError(verifyErr.message || 'Payment verification failed');
          } finally {
            setPaymentProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentProcessing(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to process checkout');
      setPaymentProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#BE1E2E]" />
          <p className="text-sm font-medium text-[var(--text-muted)]">Loading your fee schedule and receipts...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <Card className="p-6 border-red-500/20 bg-red-500/5 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-xs font-bold text-red-500">{(error as Error)?.message || 'Failed to load finance overview'}</p>
          <Button onClick={() => refetch()} variant="outline" className="text-xs">
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  const { plans, payments, receipts } = data?.data || { plans: [], payments: [], receipts: [] };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#BE1E2E]/10 text-[#BE1E2E] border border-[#BE1E2E]/20">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-black tracking-tight text-[var(--brand-text)]">
              My Fees & Receipts
            </h1>
            <p className="text-xs text-[var(--text-muted)] font-mono">
              Official tuition fee statements, payment schedules, and verified tax receipts
            </p>
          </div>
        </div>
      </div>

      {paymentSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-500 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {paymentSuccess}
        </div>
      )}

      {paymentError && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-500 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {paymentError}
        </div>
      )}

      {plans.length === 0 ? (
        <Card className="p-12 text-center space-y-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)]">
          <IndianRupee className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-[var(--brand-text)]">No Fee Accounts Found</h3>
          <p className="text-xs text-[var(--text-muted)]">
            You do not currently have any active fee obligations or payment plans assigned.
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          {plans.map((plan) => (
            <Card
              key={plan._id}
              className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-6"
            >
              {/* Course Fee Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--brand-border)]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base font-black text-[var(--brand-text)]">
                      {plan.courseId?.title || 'Enrolled Course'}
                    </h2>
                    {plan.status === 'FULLY_PAID' ? (
                      <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px]">
                        FEES CLEARED
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px]">
                        PAYMENTS PENDING
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    Batch: <span className="font-semibold text-[var(--brand-text)]">{plan.batchId?.name || 'Standard Batch'}</span>
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-[var(--bg-surface-elevated)] p-3.5 rounded-xl border border-[var(--brand-border)]">
                  <div>
                    <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Total Fee</div>
                    <div className="text-xs font-bold text-[var(--brand-text)]">
                      {formatCurrency(plan.netPayableMinor, plan.currency)}
                    </div>
                  </div>
                  <div className="h-6 w-px bg-[var(--brand-border)]" />
                  <div>
                    <div className="text-[10px] font-mono text-emerald-500 uppercase">Paid</div>
                    <div className="text-xs font-bold text-emerald-500">
                      {formatCurrency(plan.paidAmountMinor, plan.currency)}
                    </div>
                  </div>
                  <div className="h-6 w-px bg-[var(--brand-border)]" />
                  <div>
                    <div className="text-[10px] font-mono text-amber-500 uppercase">Due</div>
                    <div className="text-sm font-black text-amber-500">
                      {formatCurrency(plan.outstandingBalanceMinor, plan.currency)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Installments Table & Quick Pay */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[var(--brand-text)] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#BE1E2E]" /> Installment Payment Schedule
                </h3>

                <div className="divide-y divide-[var(--brand-border)] border border-[var(--brand-border)] rounded-xl overflow-hidden">
                  {plan.installments?.map((inst: any, idx: number) => {
                    const remaining = inst.amountMinor - inst.paidAmountMinor;
                    const isOverdue = remaining > 0 && new Date(inst.dueDate) < new Date();

                    return (
                      <div
                        key={idx}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-elevated)]/40 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[var(--brand-text)]">{inst.label}</span>
                            {inst.status === 'PAID' ? (
                              <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px]">
                                PAID
                              </Badge>
                            ) : inst.status === 'PARTIALLY_PAID' ? (
                              <Badge className="bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px]">
                                PARTIALLY PAID
                              </Badge>
                            ) : isOverdue ? (
                              <Badge className="bg-red-500/10 text-red-500 border border-red-500/20 text-[10px]">
                                OVERDUE
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px]">
                                UPCOMING
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-[var(--text-muted)]">
                            Due Date: {new Date(inst.dueDate).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-xs font-bold text-[var(--brand-text)]">
                              {formatCurrency(inst.amountMinor, plan.currency)}
                            </div>
                            {remaining > 0 && remaining < inst.amountMinor && (
                              <div className="text-[10px] text-amber-500 font-medium">
                                Balance: {formatCurrency(remaining, plan.currency)}
                              </div>
                            )}
                          </div>

                          {remaining > 0 && (
                            <Button
                              onClick={() => handleOnlinePay(plan, inst)}
                              disabled={paymentProcessing}
                              className="text-xs font-bold gap-1 bg-[#BE1E2E] hover:bg-[#a01826] text-white shadow-md shadow-[#BE1E2E]/20"
                            >
                              {paymentProcessing ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CreditCard className="w-3.5 h-3.5" />
                              )}
                              Pay {formatCurrency(remaining, plan.currency)}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          ))}

          {/* Official Receipts Section */}
          <Card className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-4">
            <h2 className="text-sm font-bold text-[var(--brand-text)] flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-500" /> Download Official Receipts ({receipts.length})
            </h2>

            {receipts.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                No payment receipts issued yet. Receipts are generated automatically when a payment is verified.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {receipts.map((rcpt: any) => (
                  <div
                    key={rcpt._id}
                    className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-[var(--brand-text)]">
                          {rcpt.receiptNumber}
                        </span>
                        <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px]">
                          {rcpt.paymentMethod}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        Issued: {new Date(rcpt.issuedAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="text-xs font-black text-emerald-500">
                        {formatCurrency(rcpt.amountMinor, rcpt.currency)}
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-400 flex items-center justify-end gap-1">
                        <CheckCircle2 className="w-3 h-3" /> VERIFIED
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
