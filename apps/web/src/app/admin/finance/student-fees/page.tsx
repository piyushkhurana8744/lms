'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Badge, Button } from '@edtech/ui';

import { IStudentFeePlan, ICourse, IUser } from '@edtech/types';
import { formatCurrency } from '@edtech/utils';
import {
  IndianRupee,
  Plus,
  Search,
  Filter,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
  ArrowRight,
  User,
  BookOpen,
  Calendar,
  X
} from 'lucide-react';

export default function StudentFeesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Creation form state
  const [studentUserId, setStudentUserId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [baseAmountRupees, setBaseAmountRupees] = useState('50000');
  const [discountType, setDiscountType] = useState<string>('FLAT');
  const [discountValue, setDiscountValue] = useState<string>('0');
  const [discountReason, setDiscountReason] = useState<string>('');
  const [installmentsCount, setInstallmentsCount] = useState('2');
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch Courses
  const { data: coursesData } = useQuery<{ success: boolean; data: ICourse[] }>({
    queryKey: ['admin-courses-list'],
    queryFn: async () => {
      const res = await fetch('/api/v1/courses');
      return res.json();
    }
  });

  // Fetch Users for student selection
  const { data: usersData } = useQuery<{ success: boolean; data: IUser[] }>({
    queryKey: ['admin-users-list'],
    queryFn: async () => {
      const res = await fetch('/api/v1/users?role=STUDENT&limit=100');
      return res.json();
    }
  });

  // Fetch Student Fee Plans
  const { data, isLoading, isError, error, refetch } = useQuery<{
    success: boolean;
    data: IStudentFeePlan[];
    pagination: any;
  }>({
    queryKey: ['student-fee-plans-list', page, statusFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        status: statusFilter
      });
      if (search) params.append('search', search);

      const res = await fetch(`/api/v1/finance/student-fees?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load student fee plans');
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/v1/finance/student-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to create student fee plan');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-fee-plans-list'] });
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.message);
    }
  });

  const resetForm = () => {
    setStudentUserId('');
    setCourseId('');
    setBaseAmountRupees('50000');
    setDiscountType('FLAT');
    setDiscountValue('0');
    setDiscountReason('');
    setInstallmentsCount('2');
    setFormError(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!studentUserId) {
      setFormError('Please select a student');
      return;
    }
    if (!courseId) {
      setFormError('Please select a target course');
      return;
    }

    const baseMinor = Math.round(Number(baseAmountRupees) * 100);
    const discVal = Number(discountValue) || 0;
    const discMinor = discountType === 'PERCENTAGE' ? Math.round((baseMinor * discVal) / 100) : Math.round(discVal * 100);
    const netMinor = Math.max(0, baseMinor - discMinor);

    const count = Math.max(1, Number(installmentsCount) || 1);
    const instAmountMinor = Math.floor(netMinor / count);
    const remainder = netMinor - instAmountMinor * count;

    const installments = Array.from({ length: count }, (_, i) => {
      const isFirst = i === 0;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + i * 30);

      return {
        sequence: i + 1,
        label: count === 1 ? 'Full Course Fee' : `Installment ${i + 1}`,
        dueDate: dueDate.toISOString(),
        amountMinor: isFirst ? instAmountMinor + remainder : instAmountMinor
      };
    });

    createMutation.mutate({
      studentUserId,
      courseId,
      currency: 'INR',
      baseAmountMinor: baseMinor,
      discountType: discVal > 0 ? discountType : undefined,
      discountValue: discVal > 0 ? discVal : undefined,
      discountReason: discVal > 0 ? discountReason || 'Approved Concession' : undefined,
      installments
    });
  };

  const plans = data?.data || [];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#BE1E2E]/10 text-[#BE1E2E] border border-[#BE1E2E]/20">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-black tracking-tight text-[var(--brand-text)]">
                Student Fee Accounts
              </h1>
              <p className="text-xs text-[var(--text-muted)] font-mono">
                Contractual fee snapshots, schedules, dues, and offline payments
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => {
            resetForm();
            setIsCreateModalOpen(true);
          }}
          className="text-xs font-bold gap-1.5 bg-[#BE1E2E] hover:bg-[#a01826] text-white shadow-md shadow-[#BE1E2E]/20"
        >
          <Plus className="w-4 h-4" /> Create Student Fee Plan
        </Button>
      </div>

      {/* Filter Ribbon */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {['ALL', 'ACTIVE', 'FULLY_PAID'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                statusFilter === st
                  ? 'bg-[#BE1E2E] text-white shadow-md shadow-[#BE1E2E]/20'
                  : 'bg-[var(--bg-surface)] border border-[var(--brand-border)] text-[var(--text-muted)] hover:text-[var(--brand-text)]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Plans List */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#BE1E2E]" />
          <p className="text-xs text-[var(--text-muted)]">Loading student fee records...</p>
        </div>
      ) : isError ? (
        <Card className="p-6 border-red-500/20 bg-red-500/5 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-xs font-bold text-red-500">{(error as Error)?.message || 'Failed to load fee plans'}</p>
          <Button onClick={() => refetch()} variant="outline" className="text-xs">
            Retry
          </Button>
        </Card>
      ) : plans.length === 0 ? (
        <Card className="p-12 text-center space-y-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)]">
          <IndianRupee className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-[var(--brand-text)]">No Student Fee Accounts</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            Assign fee structures or create custom installment fee plans for admitted students.
          </p>
          <Button
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
            className="text-xs font-bold gap-1.5 bg-[#BE1E2E] text-white"
          >
            <Plus className="w-4 h-4" /> Create Student Fee Plan
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] hover:border-[#BE1E2E]/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-black text-[var(--brand-text)]">{plan.student?.name || 'Student'}</span>
                  {plan.status === 'FULLY_PAID' ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px]">
                      FULLY PAID
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px]">
                      ACTIVE DUES
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] flex-wrap">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" /> {plan.course?.title || 'Course'}
                  </span>
                  <span>•</span>
                  <span>{plan.student?.email}</span>
                  {plan.student?.phone && (
                    <>
                      <span>•</span>
                      <span>{plan.student?.phone}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Financial Snapshot */}
              <div className="flex items-center gap-6 self-start md:self-auto">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-mono text-[var(--text-muted)]">Net Payable</div>
                  <div className="text-xs font-bold text-[var(--brand-text)]">
                    {formatCurrency(plan.netPayableMinor, plan.currency)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase font-mono text-emerald-500">Paid</div>
                  <div className="text-xs font-bold text-emerald-500">
                    {formatCurrency(plan.paidAmountMinor, plan.currency)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase font-mono text-amber-500">Outstanding</div>
                  <div className="text-sm font-black text-amber-500">
                    {formatCurrency(plan.outstandingBalanceMinor, plan.currency)}
                  </div>
                </div>

                <Link href={`/admin/finance/student-fees/${plan.id}`}>
                  <Button className="text-xs font-bold gap-1 bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] hover:border-[#BE1E2E]/40 text-[var(--brand-text)]">
                    Inspect Account <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Student Fee Plan Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl shadow-2xl overflow-hidden space-y-5 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--brand-text)] flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-[#BE1E2E]" /> Create Student Fee Plan
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
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

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--brand-text)]">Student Identity *</label>
                <select
                  value={studentUserId}
                  onChange={(e) => setStudentUserId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-[var(--brand-text)] font-medium"
                  required
                >
                  <option value="">Select Student...</option>
                  {usersData?.data?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--brand-text)]">Target Course *</label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-[var(--brand-text)] font-medium"
                  required
                >
                  <option value="">Select Course...</option>
                  {coursesData?.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--brand-text)]">Base Fee Amount (₹) *</label>
                  <input
                    type="number"
                    value={baseAmountRupees}
                    onChange={(e) => setBaseAmountRupees(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--brand-text)]">Installments Count</label>
                  <select
                    value={installmentsCount}
                    onChange={(e) => setInstallmentsCount(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-[var(--brand-text)] font-medium"
                  >
                    <option value="1">1 (Full Upfront Payment)</option>
                    <option value="2">2 Installments (30 Days)</option>
                    <option value="3">3 Installments (Monthly)</option>
                    <option value="4">4 Installments (Quarterly)</option>
                  </select>
                </div>
              </div>

              {/* Discount Section */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-3">
                <div className="text-xs font-bold text-[var(--brand-text)]">Scholarship / Fee Concession</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[var(--text-muted)]">Discount Type</label>
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-[var(--brand-text)]"
                    >
                      <option value="FLAT">Flat Amount (₹)</option>
                      <option value="PERCENTAGE">Percentage (%)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[var(--text-muted)]">Discount Value</label>
                    <input
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-1.5 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[var(--text-muted)]">Approval Note / Reason</label>
                  <input
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    placeholder="e.g. Merit Scholarship approved by Director"
                    className="w-full px-3 py-1.5 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                  />
                </div>
              </div>


              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--brand-border)]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="text-xs font-bold bg-[#BE1E2E] hover:bg-[#a01826] text-white"
                >
                  {createMutation.isPending ? 'Creating...' : 'Confirm Fee Plan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
