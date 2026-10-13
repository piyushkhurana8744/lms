'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGlobalError } from '@/components/error/useGlobalError';
import { Button, Card } from '@edtech/ui';
import { ILeadFollowUp, FollowUpOutcome, CompleteFollowUpPayload } from '@edtech/types';
import {
  Clock,
  PhoneCall,
  Calendar,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Filter,
  Search,
  Loader2,
  ChevronRight,
  ExternalLink,
  MessageSquare
} from 'lucide-react';

function FollowUpsContent() {
  const queryClient = useQueryClient();
  const { showError } = useGlobalError();

  const [activeTab, setActiveTab] = useState<'ALL' | 'TODAY' | 'OVERDUE' | 'COMPLETED'>('TODAY');
  const [search, setSearch] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Complete modal
  const [completingFollowUp, setCompletingFollowUp] = useState<ILeadFollowUp | null>(null);
  const [completeOutcome, setCompleteOutcome] = useState<FollowUpOutcome>('INTERESTED');
  const [completeOutcomeNote, setCompleteOutcomeNote] = useState('');

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Fetch Dashboard or Leads with Follow-ups
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['crm-follow-ups-dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/v1/crm/dashboard');
      if (!res.ok) throw new Error('Failed to load follow-ups queue');
      return res.json();
    }
  });

  const { data: leadsData, isLoading: isLeadsLoading } = useQuery({
    queryKey: ['crm-leads-follow-ups'],
    queryFn: async () => {
      const res = await fetch('/api/v1/crm/leads?limit=100');
      if (!res.ok) throw new Error('Failed to load leads list');
      return res.json();
    }
  });

  const completeFollowUpMutation = useMutation({
    mutationFn: async ({ followUpId, payload }: { followUpId: string; payload: CompleteFollowUpPayload }) => {
      const res = await fetch(`/api/v1/crm/follow-ups/${followUpId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to complete follow-up');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-follow-ups-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads-follow-ups'] });
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard-summary'] });
      showToast('Follow-up call logged as completed');
      setCompletingFollowUp(null);
    },
    onError: (err: Error) => showError({ title: 'Completion Failed', message: err.message })
  });

  const leads = leadsData?.data || [];
  const leadsWithFollowUps: any[] = leads.filter((l: any) => l.nextFollowUp);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const filteredItems = leadsWithFollowUps.filter((l: any) => {
    const fu = l.nextFollowUp;
    if (!fu) return false;
    const due = new Date(fu.dueAt);

    if (activeTab === 'TODAY') {
      return due >= startOfToday && due <= endOfToday;
    }
    if (activeTab === 'OVERDUE') {
      return due < startOfToday;
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8 min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)]">
      {/* Toast */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-xl bg-emerald-500 text-white shadow-2xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <CheckCircle className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--brand-border)]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-500 uppercase tracking-wider">
            <Clock className="w-4 h-4" /> Counsellor Task Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--brand-text)] mt-1">
            Follow-Ups Workspace
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Streamline outbound calling workflows, record structured outcomes, and prevent prospect leakage.
          </p>
        </div>

        <div>
          <Link href="/admin/crm/leads">
            <Button variant="outline" size="sm" className="text-xs flex items-center gap-1.5">
              <ArrowLeft className="w-4 h-4" /> Leads Directory
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-xs font-mono font-bold max-w-lg">
        <button
          type="button"
          onClick={() => setActiveTab('TODAY')}
          className={`flex-1 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'TODAY' ? 'bg-amber-500 text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--brand-text)]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" /> Due Today
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('OVERDUE')}
          className={`flex-1 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'OVERDUE' ? 'bg-red-500 text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--brand-text)]'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" /> Overdue
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={`flex-1 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'ALL' ? 'bg-[#BE1E2E] text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--brand-text)]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" /> All Upcoming
        </button>
      </div>

      {/* Queue List */}
      {isLeadsLoading ? (
        <div className="p-16 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" />
          <p className="text-xs font-mono font-bold text-[var(--text-muted)]">Loading Follow-Up Tasks...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-[var(--brand-border)] rounded-2xl bg-[var(--bg-surface-elevated)] space-y-3">
          <Clock className="w-10 h-10 mx-auto text-[var(--text-muted)] opacity-50" />
          <h3 className="font-extrabold text-sm text-[var(--brand-text)]">No pending follow-ups in this queue</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            You are completely caught up with scheduled tasks for this category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((l: any) => {
            const fu = l.nextFollowUp;
            const isOverdue = new Date(fu.dueAt) < startOfToday;

            return (
              <Card
                key={l.id}
                className={`p-5 rounded-2xl border transition-all space-y-3 text-xs ${
                  isOverdue
                    ? 'bg-red-500/5 border-red-500/30'
                    : 'bg-[var(--bg-surface-elevated)] border-[var(--brand-border)]'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-[var(--brand-border)]">
                  <span className="font-mono font-bold text-[10px] text-amber-500 uppercase flex items-center gap-1">
                    <PhoneCall className="w-3 h-3" /> {fu.type}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      isOverdue ? 'bg-red-500 text-white' : 'bg-amber-500/20 text-amber-500'
                    }`}
                  >
                    {isOverdue ? 'OVERDUE' : 'DUE TODAY'}
                  </span>
                </div>

                <div className="space-y-1">
                  <Link
                    href={`/admin/crm/leads/${l.id}`}
                    className="font-black text-sm text-[var(--brand-text)] hover:text-[#BE1E2E] transition-colors block"
                  >
                    {l.fullName}
                  </Link>
                  <div className="font-mono text-xs text-[var(--text-muted)] flex items-center gap-2">
                    <span>{l.phone}</span>
                    <span>•</span>
                    <span className="text-blue-500 font-bold">{l.courseInterest?.title || 'General'}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] space-y-1">
                  <div className="text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase">
                    Due Date & Time
                  </div>
                  <div className="font-mono font-bold text-xs text-[var(--brand-text)]">
                    {new Date(fu.dueAt).toLocaleDateString()} at{' '}
                    {new Date(fu.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {fu.note && <p className="text-[11px] text-[var(--brand-text)]/90 pt-1">{fu.note}</p>}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setCompletingFollowUp(fu)}
                    className="flex-1 btn-primary text-xs bg-emerald-600 hover:bg-emerald-700"
                  >
                    ✓ Complete
                  </Button>

                  <Link href={`/admin/crm/leads/${l.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      Workspace →
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* COMPLETE MODAL */}
      {completingFollowUp && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--brand-border)]">
              <h3 className="font-extrabold text-sm text-[var(--brand-text)]">
                Complete Follow-Up Call
              </h3>
              <button
                type="button"
                onClick={() => setCompletingFollowUp(null)}
                className="text-xs text-[var(--text-muted)] font-mono font-bold"
              >
                ✕ Close
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                completeFollowUpMutation.mutate({
                  followUpId: completingFollowUp.id,
                  payload: {
                    outcome: completeOutcome,
                    outcomeNote: completeOutcomeNote
                  }
                });
              }}
              className="space-y-4 text-xs"
            >
              <div className="space-y-1">
                <label className="font-bold text-[var(--brand-text)]">Structured Call Outcome *</label>
                <select
                  value={completeOutcome}
                  onChange={(e) => setCompleteOutcome(e.target.value as FollowUpOutcome)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs"
                >
                  <option value="CONNECTED">Connected & Spoke</option>
                  <option value="INTERESTED">Highly Interested</option>
                  <option value="NO_ANSWER">No Answer / Busy</option>
                  <option value="CALLBACK_REQUESTED">Call Back Requested</option>
                  <option value="DEMO_BOOKED">Demo Class Booked</option>
                  <option value="FEES_DISCUSSION">Fees / Discount Discussion</option>
                  <option value="NOT_INTERESTED">Not Interested</option>
                  <option value="OTHER">Other Outcome</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--brand-text)]">Call Summary / Remarks</label>
                <textarea
                  rows={3}
                  value={completeOutcomeNote}
                  onChange={(e) => setCompleteOutcomeNote(e.target.value)}
                  placeholder="Summarize conversation outcomes..."
                  className="w-full p-3 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--brand-border)]">
                <Button type="button" variant="outline" size="sm" onClick={() => setCompletingFollowUp(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={completeFollowUpMutation.isPending} className="btn-primary">
                  {completeFollowUpMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Completion'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FollowUpsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-[var(--text-muted)]">Loading Follow-ups...</div>}>
      <FollowUpsContent />
    </Suspense>
  );
}
