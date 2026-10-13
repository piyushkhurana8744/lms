'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card, Badge, Button } from '@edtech/ui';

import { formatCurrency } from '@edtech/utils';
import {
  Clock,
  Search,
  Filter,
  AlertCircle,
  Loader2,
  Calendar,
  IndianRupee,
  ArrowRight,
  Phone,
  Mail,
  User
} from 'lucide-react';

export default function DuesQueuePage() {
  const [filterType, setFilterType] = useState<'ALL' | 'TODAY' | 'OVERDUE' | 'THIS_WEEK' | 'UPCOMING'>('ALL');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useQuery<{
    success: boolean;
    data: any[];
    pagination: any;
  }>({
    queryKey: ['admin-dues-queue', filterType, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        filterType
      });
      const res = await fetch(`/api/v1/finance/dues?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load dues queue');
      return res.json();
    }
  });

  const dues = data?.data || [];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-black tracking-tight text-[var(--brand-text)]">
                Collection & Dues Queue
              </h1>
              <p className="text-xs text-[var(--text-muted)] font-mono">
                Real-time operational queue for upcoming, due today, and overdue fee installments
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: 'ALL', label: 'All Outstanding Dues' },
          { key: 'TODAY', label: 'Due Today' },
          { key: 'OVERDUE', label: 'Overdue Dues' },
          { key: 'THIS_WEEK', label: 'Due This Week' },
          { key: 'UPCOMING', label: 'Upcoming' }
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setFilterType(f.key as any);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filterType === f.key
                ? 'bg-[#BE1E2E] text-white shadow-md shadow-[#BE1E2E]/20'
                : 'bg-[var(--bg-surface)] border border-[var(--brand-border)] text-[var(--text-muted)] hover:text-[var(--brand-text)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Dues List */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#BE1E2E]" />
          <p className="text-xs text-[var(--text-muted)]">Scanning collection dues queue...</p>
        </div>
      ) : isError ? (
        <Card className="p-6 border-red-500/20 bg-red-500/5 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-xs font-bold text-red-500">{(error as Error)?.message || 'Failed to load dues'}</p>
          <Button onClick={() => refetch()} variant="outline" className="text-xs">
            Retry
          </Button>
        </Card>
      ) : dues.length === 0 ? (
        <Card className="p-12 text-center space-y-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)]">
          <Clock className="w-10 h-10 text-emerald-500 mx-auto opacity-70" />
          <h3 className="text-sm font-bold text-[var(--brand-text)]">No Outstanding Dues in this Queue</h3>
          <p className="text-xs text-[var(--text-muted)]">
            All students in this filter category have satisfied their scheduled payments.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {dues.map((due, idx) => (
            <Card
              key={idx}
              className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] hover:border-[#BE1E2E]/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-black text-[var(--brand-text)]">{due.student?.name || 'Student'}</span>
                  {due.isOverdue ? (
                    <Badge className="bg-red-500/10 text-red-500 border border-red-500/20 text-[10px]">
                      OVERDUE
                    </Badge>
                  ) : due.isToday ? (
                    <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px]">
                      DUE TODAY
                    </Badge>
                  ) : (
                    <Badge className="bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px]">
                      UPCOMING
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] flex-wrap">
                  <span>{due.course?.title || 'Course'}</span>
                  <span>•</span>
                  <span className="font-mono">{due.installmentLabel}</span>
                  {due.student?.phone && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {due.student?.phone}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-6 self-start md:self-auto">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-mono text-[var(--text-muted)]">
                    Due Date
                  </div>
                  <div className={`text-xs font-bold ${due.isOverdue ? 'text-red-500' : 'text-[var(--brand-text)]'}`}>
                    {new Date(due.dueDate).toLocaleDateString()}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase font-mono text-amber-500">Remaining Amount</div>
                  <div className="text-base font-black text-amber-500">{formatCurrency(due.amountMinor, 'INR')}</div>
                </div>

                <Link href={`/admin/finance/student-fees/${due.studentFeePlanId}`}>
                  <Button className="text-xs font-bold gap-1 bg-[#BE1E2E] hover:bg-[#a01826] text-white">
                    Collect Fee <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
