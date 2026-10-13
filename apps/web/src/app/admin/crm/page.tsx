'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card, Badge, Button } from '@edtech/ui';
import { CRMDashboardSummary } from '@edtech/types';
import {
  Users,
  UserCheck,
  PhoneCall,
  Clock,
  AlertCircle,
  GraduationCap,
  TrendingUp,
  ArrowUpRight,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Filter,
  Loader2,
  Flame,
  ArrowRight
} from 'lucide-react';

export default function CRMDashboardPage() {
  const { data, isLoading, isError, error, refetch } = useQuery<{ success: boolean; data: CRMDashboardSummary }>({
    queryKey: ['crm-dashboard-summary'],
    queryFn: async () => {
      const res = await fetch('/api/v1/crm/dashboard');
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message || 'Failed to load CRM dashboard metrics');
      }
      return res.json();
    }
  });

  const dashboard = data?.data;
  const stats = dashboard?.stats || {
    totalLeads: 0,
    newLeads: 0,
    contactedLeads: 0,
    qualifiedLeads: 0,
    followUpsPending: 0,
    followUpsOverdue: 0,
    followUpsToday: 0,
    admissionsInProgress: 0,
    convertedStudents: 0,
    lostLeads: 0
  };

  const pipeline = dashboard?.pipelineCounts || {
    NEW: 0,
    CONTACTED: 0,
    QUALIFIED: 0,
    DEMO_SCHEDULED: 0,
    FOLLOW_UP: 0,
    APPLICATION_STARTED: 0,
    ADMISSION_IN_PROGRESS: 0,
    CONVERTED: 0,
    LOST: 0
  };

  const recentLeads = dashboard?.recentLeads || [];
  const todaysFollowUps = dashboard?.todaysFollowUps || [];
  const sourceBreakdown = dashboard?.sourceBreakdown || [];

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8 min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--brand-border)]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#BE1E2E] uppercase tracking-wider">
            <Flame className="w-4 h-4" /> CRM & Admissions Command Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--brand-text)] mt-1">
            Pre-Admission Pipeline
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Track inquiries, manage counsellor workflows, schedule follow-ups, and convert admissions to active students.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/admin/crm/follow-ups">
            <Button variant="outline" size="sm" className="text-xs flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Today&apos;s Follow-Ups</span>
              {stats.followUpsToday > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-mono text-[10px] font-bold">
                  {stats.followUpsToday}
                </span>
              )}
            </Button>
          </Link>

          <Link href="/admin/crm/leads">
            <Button variant="primary" size="sm" className="text-xs btn-primary flex items-center gap-1.5 shadow-lg shadow-[#BE1E2E]/20">
              <Plus className="w-4 h-4" /> Capture Lead
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#BE1E2E]" />
          <p className="text-xs font-bold text-[var(--text-muted)] font-mono">Synthesizing CRM Pipeline Metrics...</p>
        </div>
      ) : isError ? (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold text-center">
          Failed to load CRM data: {(error as Error)?.message}
        </div>
      ) : (
        <>
          {/* Key Metric KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 text-xs">
            <Card className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-1">
              <div className="text-[var(--text-muted)] font-mono font-bold flex items-center justify-between">
                <span>Total Leads</span>
                <Users className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="text-2xl font-black text-[var(--brand-text)]">{stats.totalLeads}</div>
              <div className="text-[10px] text-blue-500 font-medium">All Lifetime Leads</div>
            </Card>

            <Card className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-1">
              <div className="text-[var(--text-muted)] font-mono font-bold flex items-center justify-between">
                <span>New / Unassigned</span>
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
              </div>
              <div className="text-2xl font-black text-cyan-500">{stats.newLeads}</div>
              <div className="text-[10px] text-[var(--text-muted)]">Requires First Call</div>
            </Card>

            <Card className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-1">
              <div className="text-[var(--text-muted)] font-mono font-bold flex items-center justify-between">
                <span>Qualified</span>
                <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <div className="text-2xl font-black text-indigo-500">{stats.qualifiedLeads}</div>
              <div className="text-[10px] text-[var(--text-muted)]">High Intent Prospects</div>
            </Card>

            <Card className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-1">
              <div className="text-[var(--text-muted)] font-mono font-bold flex items-center justify-between">
                <span>Follow-Ups Today</span>
                <PhoneCall className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-amber-500">{stats.followUpsToday}</div>
              <div className="text-[10px] text-[var(--text-muted)]">{stats.followUpsPending} Pending Tasks</div>
            </Card>

            <Card className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-red-500/30 space-y-1 bg-red-500/5">
              <div className="text-red-500 font-mono font-bold flex items-center justify-between">
                <span>Overdue Follow-Ups</span>
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              </div>
              <div className="text-2xl font-black text-red-500">{stats.followUpsOverdue}</div>
              <div className="text-[10px] text-red-400 font-medium">Needs Urgent Action</div>
            </Card>

            <Card className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-emerald-500/30 space-y-1 bg-emerald-500/5">
              <div className="text-emerald-500 font-mono font-bold flex items-center justify-between">
                <span>Converted Students</span>
                <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-emerald-500">{stats.convertedStudents}</div>
              <div className="text-[10px] text-emerald-500 font-medium">Admitted & Enrolled</div>
            </Card>
          </div>

          {/* Pipeline Stage Bar */}
          <div className="p-5 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#BE1E2E]" />
                <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-[var(--brand-text)]">
                  Pipeline Stage Breakdown
                </h3>
              </div>
              <Link href="/admin/crm/leads" className="text-xs font-bold text-[#BE1E2E] hover:underline flex items-center gap-1">
                View Full Pipeline <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2 text-xs">
              {[
                { label: 'New', count: pipeline.NEW, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
                { label: 'Contacted', count: pipeline.CONTACTED, color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' },
                { label: 'Qualified', count: pipeline.QUALIFIED, color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
                { label: 'Demo', count: pipeline.DEMO_SCHEDULED, color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
                { label: 'Follow Up', count: pipeline.FOLLOW_UP, color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
                { label: 'App Started', count: pipeline.APPLICATION_STARTED, color: 'bg-pink-500/10 text-pink-500 border-pink-500/20' },
                { label: 'Admission', count: pipeline.ADMISSION_IN_PROGRESS, color: 'bg-teal-500/10 text-teal-500 border-teal-500/20' },
                { label: 'Converted', count: pipeline.CONVERTED, color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
                { label: 'Lost', count: pipeline.LOST, color: 'bg-red-500/10 text-red-500 border-red-500/20' }
              ].map((st) => (
                <div key={st.label} className={`p-3 rounded-xl border text-center space-y-1 ${st.color}`}>
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider">{st.label}</div>
                  <div className="text-lg font-black">{st.count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Two-Column Workspace Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Leads Inquiries */}
            <div className="p-5 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--brand-border)]">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-[var(--brand-text)]">
                    Recent Inquiries & Prospects
                  </h3>
                </div>
                <Link href="/admin/crm/leads" className="text-xs text-[#BE1E2E] font-bold hover:underline">
                  All Leads →
                </Link>
              </div>

              {recentLeads.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                  No inquiries recorded yet. Public landing page inquiries will stream in automatically.
                </div>
              ) : (
                <div className="divide-y divide-[var(--brand-border)]">
                  {recentLeads.map((l) => (
                    <div key={l.id} className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-[var(--brand-background)]/50 px-2 rounded-xl transition-colors">
                      <div className="space-y-0.5">
                        <Link href={`/admin/crm/leads/${l.id}`} className="font-extrabold text-[var(--brand-text)] hover:text-[#BE1E2E] transition-colors">
                          {l.fullName}
                        </Link>
                        <div className="text-[11px] text-[var(--text-muted)] font-mono flex items-center gap-2">
                          <span>{l.phone}</span>
                          <span>•</span>
                          <span className="text-blue-500 font-semibold">{l.courseInterest?.title || 'General'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-blue-500/10 text-blue-500 border border-blue-500/20">
                          {l.stage}
                        </span>
                        <Link href={`/admin/crm/leads/${l.id}`}>
                          <Button variant="outline" size="sm" className="h-7 px-2.5 text-[11px]">
                            Workspace
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Today's Follow-Ups Queue */}
            <div className="p-5 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--brand-border)]">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-[var(--brand-text)]">
                    Today&apos;s Follow-Up Tasks
                  </h3>
                </div>
                <Link href="/admin/crm/follow-ups" className="text-xs text-amber-500 font-bold hover:underline">
                  Follow-Up Queue →
                </Link>
              </div>

              {todaysFollowUps.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                  🎉 No pending follow-up calls scheduled for today! You are all caught up.
                </div>
              ) : (
                <div className="divide-y divide-[var(--brand-border)]">
                  {todaysFollowUps.map((fu) => (
                    <div key={fu.id} className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-[var(--brand-background)]/50 px-2 rounded-xl transition-colors">
                      <div className="space-y-0.5">
                        <div className="font-extrabold text-[var(--brand-text)] flex items-center gap-2">
                          <span>{fu.lead?.fullName || 'Prospect'}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-mono font-bold">
                            {fu.type}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          Due at {new Date(fu.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {fu.note || 'Scheduled call'}
                        </div>
                      </div>

                      <div>
                        <Link href={`/admin/crm/leads/${fu.leadId}`}>
                          <Button variant="outline" size="sm" className="h-7 px-2.5 text-[11px] text-amber-500 border-amber-500/30 hover:bg-amber-500/10">
                            Call & Log
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
