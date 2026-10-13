'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useConfirmation } from '@/components/confirmation/useConfirmation';
import { useGlobalError } from '@/components/error/useGlobalError';
import { Button, Card, Badge } from '@edtech/ui';
import { ILead, LeadStage, LeadSource, CreateLeadPayload, LostReason } from '@edtech/types';
import {
  Users,
  Search,
  Filter,
  Plus,
  ArrowLeft,
  PhoneCall,
  Clock,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Calendar,
  ChevronRight,
  UserCheck,
  UserPlus,
  Loader2,
  Tag,
  GraduationCap
} from 'lucide-react';

function LeadsContent() {
  const queryClient = useQueryClient();
  const { confirm } = useConfirmation();
  const { showError } = useGlobalError();

  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [myLeadsOnly, setMyLeadsOnly] = useState(false);
  const [page, setPage] = useState(1);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState<CreateLeadPayload>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    city: '',
    source: 'MANUAL',
    preferredMode: 'ONLINE'
  });

  // Stage Change Modal State
  const [stageModalLead, setStageModalLead] = useState<ILead | null>(null);
  const [selectedNextStage, setSelectedNextStage] = useState<LeadStage>('QUALIFIED');
  const [lostReason, setLostReason] = useState<LostReason>('NOT_INTERESTED');
  const [stageNote, setStageNote] = useState('');

  // Toast
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // 1. Fetch Leads Query
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['crm-leads-list', search, stageFilter, sourceFilter, myLeadsOnly, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (stageFilter !== 'ALL') params.append('stage', stageFilter);
      if (sourceFilter !== 'ALL') params.append('source', sourceFilter);
      if (myLeadsOnly) params.append('isMyLeads', 'true');
      params.append('page', page.toString());
      params.append('limit', '20');

      const res = await fetch(`/api/v1/crm/leads?${params.toString()}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message || 'Failed to fetch leads');
      }
      return res.json();
    }
  });

  // 2. Fetch Courses for selection
  const { data: coursesData } = useQuery({
    queryKey: ['public-courses-dropdown'],
    queryFn: async () => {
      const res = await fetch('/api/v1/courses');
      if (!res.ok) return { data: [] };
      return res.json();
    }
  });
  const courses: any[] = coursesData?.data || [];

  const leads: ILead[] = data?.data || [];
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };

  // Mutations
  const createLeadMutation = useMutation({
    mutationFn: async (payload: CreateLeadPayload) => {
      const res = await fetch('/api/v1/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.message || 'Failed to capture lead');
      return json.data;
    },
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads-list'] });
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard-summary'] });
      showToast(`Lead captured successfully! Lead Code: ${lead.leadCode || lead.id}`);
      setIsCreateModalOpen(false);
      setNewLeadForm({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        city: '',
        source: 'MANUAL',
        preferredMode: 'ONLINE'
      });
    },
    onError: (err: Error) => {
      showError({ title: 'Lead Creation Conflict', message: err.message });
    }
  });

  const changeStageMutation = useMutation({
    mutationFn: async ({ leadId, stage, lostReason, note }: { leadId: string; stage: LeadStage; lostReason?: LostReason; note?: string }) => {
      const res = await fetch(`/api/v1/crm/leads/${leadId}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, lostReason, note })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to update stage');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads-list'] });
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard-summary'] });
      showToast('Lead stage updated successfully');
      setStageModalLead(null);
    },
    onError: (err: Error) => {
      showError({ title: 'Stage Transition Error', message: err.message });
    }
  });

  const handleStageChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageModalLead) return;
    changeStageMutation.mutate({
      leadId: stageModalLead.id,
      stage: selectedNextStage,
      lostReason: selectedNextStage === 'LOST' ? lostReason : undefined,
      note: stageNote
    });
  };

  const getStageBadgeColor = (stage: LeadStage) => {
    switch (stage) {
      case 'NEW':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case 'CONTACTED':
        return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30';
      case 'QUALIFIED':
        return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30';
      case 'DEMO_SCHEDULED':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
      case 'FOLLOW_UP':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
      case 'APPLICATION_STARTED':
        return 'bg-pink-500/10 text-pink-500 border-pink-500/30';
      case 'ADMISSION_IN_PROGRESS':
        return 'bg-teal-500/10 text-teal-500 border-teal-500/30';
      case 'CONVERTED':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
      case 'LOST':
        return 'bg-red-500/10 text-red-500 border-red-500/30';
      default:
        return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/30';
    }
  };

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
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#BE1E2E] uppercase tracking-wider">
            <Users className="w-4 h-4" /> Lead Management & Pipeline
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--brand-text)] mt-1">
            Leads Directory
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Server-side deduplicated prospective student leads with multi-counsellor assignments and follow-up schedules.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/admin/crm">
            <Button variant="outline" size="sm" className="text-xs flex items-center gap-1.5">
              <ArrowLeft className="w-4 h-4" /> CRM Dashboard
            </Button>
          </Link>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="text-xs btn-primary flex items-center gap-1.5 shadow-lg shadow-[#BE1E2E]/20"
          >
            <Plus className="w-4 h-4" /> New Lead
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] flex flex-col lg:flex-row items-center justify-between gap-4 text-xs">
        {/* Search */}
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search name, phone, email, lead code..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-end flex-wrap">
          {/* My Leads Filter */}
          <button
            type="button"
            onClick={() => {
              setMyLeadsOnly(!myLeadsOnly);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl border font-mono text-xs font-bold transition-colors ${
              myLeadsOnly
                ? 'bg-[#BE1E2E] text-white border-[#BE1E2E]'
                : 'bg-[var(--brand-background)] text-[var(--brand-text)] border-[var(--brand-border)] hover:border-[#BE1E2E]'
            }`}
          >
            👤 My Leads Only
          </button>

          {/* Stage Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[var(--text-muted)] font-mono">Stage:</span>
            <select
              value={stageFilter}
              onChange={(e) => {
                setStageFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs"
            >
              <option value="ALL">All Stages</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="DEMO_SCHEDULED">Demo Scheduled</option>
              <option value="FOLLOW_UP">Follow Up</option>
              <option value="APPLICATION_STARTED">Application Started</option>
              <option value="ADMISSION_IN_PROGRESS">Admission In Progress</option>
              <option value="CONVERTED">Converted</option>
              <option value="LOST">Lost</option>
            </select>
          </div>

          {/* Source Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[var(--text-muted)] font-mono">Source:</span>
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs"
            >
              <option value="ALL">All Sources</option>
              <option value="WEBSITE">Website Form</option>
              <option value="WALK_IN">Walk In</option>
              <option value="PHONE">Phone Inquiry</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="GOOGLE_ADS">Google Ads</option>
              <option value="FACEBOOK">Facebook / Meta</option>
              <option value="REFERRAL">Referral</option>
              <option value="MANUAL">Manual Entry</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      {isLoading ? (
        <div className="p-16 text-center text-xs text-[var(--text-muted)] space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#BE1E2E]" />
          <p className="font-mono">Loading Leads Directory...</p>
        </div>
      ) : isError ? (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold text-center">
          Failed to load leads: {(error as Error)?.message}
        </div>
      ) : leads.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-[var(--brand-border)] rounded-2xl bg-[var(--bg-surface-elevated)] space-y-3">
          <Users className="w-10 h-10 mx-auto text-[var(--text-muted)] opacity-50" />
          <h3 className="font-extrabold text-sm text-[var(--brand-text)]">No matching leads found</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            Try adjusting your search keywords, stage, or source filters, or capture a new prospective student lead.
          </p>
          <div className="pt-2">
            <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)} className="text-xs btn-primary">
              <Plus className="w-4 h-4" /> Capture Lead
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-[var(--brand-border)] bg-[var(--bg-surface-elevated)] shadow-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--brand-background)] border-b border-[var(--brand-border)] text-[var(--text-muted)] uppercase font-mono font-bold text-[11px]">
                <tr>
                  <th className="p-4">Lead Identity</th>
                  <th className="p-4">Contact Info</th>
                  <th className="p-4">Course Interest</th>
                  <th className="p-4">Pipeline Stage</th>
                  <th className="p-4">Counsellor</th>
                  <th className="p-4">Next Follow-Up</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--brand-border)] text-[var(--brand-text)]">
                {leads.map((lead) => {
                  const stageBadge = getStageBadgeColor(lead.stage);

                  return (
                    <tr key={lead.id} className="hover:bg-[var(--brand-background)]/50 transition-colors">
                      {/* Name & Code */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <Link
                            href={`/admin/crm/leads/${lead.id}`}
                            className="font-extrabold text-xs text-[var(--brand-text)] hover:text-[#BE1E2E] transition-colors block"
                          >
                            {lead.fullName}
                          </Link>
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.2 rounded bg-[var(--brand-background)] border border-[var(--brand-border)] font-mono text-[10px] font-bold text-[#BE1E2E]">
                              {lead.leadCode || 'LD-N/A'}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">
                              via {lead.source}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="p-4">
                        <div className="space-y-0.5 font-mono">
                          <div className="text-xs font-bold text-[var(--brand-text)] flex items-center gap-1">
                            <PhoneCall className="w-3 h-3 text-[#BE1E2E]" />
                            <span>{lead.phone}</span>
                          </div>
                          {lead.email && (
                            <div className="text-[11px] text-[var(--text-muted)] truncate max-w-[170px]">
                              {lead.email}
                            </div>
                          )}
                          {lead.city && (
                            <div className="text-[10px] text-[var(--text-muted)]">
                              📍 {lead.city}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Interest */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="font-bold text-xs flex items-center gap-1 text-[var(--brand-text)]">
                            <BookOpen className="w-3 h-3 text-[#BE1E2E]" />
                            <span className="truncate max-w-[170px]">
                              {lead.courseInterest?.title || 'General Inquiry'}
                            </span>
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] font-mono">
                            Mode: {lead.preferredMode || 'ONLINE'}
                          </div>
                        </div>
                      </td>

                      {/* Stage */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase font-mono tracking-wider ${stageBadge}`}
                          >
                            ● {lead.stage}
                          </span>
                          {lead.stage === 'LOST' && lead.lostReason && (
                            <div className="text-[10px] text-red-400 font-mono">
                              Reason: {lead.lostReason}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Counsellor */}
                      <td className="p-4">
                        <div className="space-y-0.5">
                          {lead.counsellor ? (
                            <div className="font-bold text-xs text-[var(--brand-text)] flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                              <span>{lead.counsellor.name}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-amber-500 font-bold font-mono">
                              ⚠️ Unassigned
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Next Follow Up */}
                      <td className="p-4">
                        {lead.nextFollowUp ? (
                          <div className="space-y-0.5 font-mono">
                            <div
                              className={`text-xs font-bold flex items-center gap-1 ${
                                lead.nextFollowUp.isOverdue ? 'text-red-500' : 'text-amber-500'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>
                                {new Date(lead.nextFollowUp.dueAt).toLocaleDateString()}{' '}
                                {new Date(lead.nextFollowUp.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[150px]">
                              {lead.nextFollowUp.type}: {lead.nextFollowUp.note || 'Scheduled'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">
                            No follow-up set
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setStageModalLead(lead);
                              setSelectedNextStage(lead.stage);
                              setStageNote('');
                            }}
                            className="h-7 px-2 text-[11px]"
                            title="Update Pipeline Stage"
                          >
                            Stage
                          </Button>

                          <Link href={`/admin/crm/leads/${lead.id}`}>
                            <Button
                              variant="primary"
                              size="sm"
                              className="h-7 px-2.5 text-[11px] btn-primary"
                            >
                              Workspace →
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between text-xs font-mono pt-2">
              <div className="text-[var(--text-muted)]">
                Showing Page {pagination.page} of {pagination.totalPages} ({pagination.total} total leads)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                  className="text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE LEAD MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl w-full max-w-xl p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--brand-border)]">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#BE1E2E] uppercase">
                <UserPlus className="w-4 h-4" /> New Student Prospect
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--brand-text)] font-mono font-bold"
              >
                ✕ Close
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createLeadMutation.mutate(newLeadForm);
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[var(--brand-text)]">First Name *</label>
                  <input
                    type="text"
                    required
                    value={newLeadForm.firstName}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                    placeholder="e.g. Rahul"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[var(--brand-text)]">Last Name</label>
                  <input
                    type="text"
                    value={newLeadForm.lastName || ''}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                    placeholder="e.g. Sharma"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[var(--brand-text)]">Phone Number * (Deduplicated)</label>
                  <input
                    type="tel"
                    required
                    value={newLeadForm.phone}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                    placeholder="e.g. 9876543210"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[var(--brand-text)]">Email Address</label>
                  <input
                    type="email"
                    value={newLeadForm.email || ''}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                    placeholder="e.g. rahul@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[var(--brand-text)]">Source</label>
                  <select
                    value={newLeadForm.source}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, source: e.target.value as LeadSource })}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs"
                  >
                    <option value="MANUAL">Manual Entry</option>
                    <option value="WALK_IN">Walk-In Center</option>
                    <option value="PHONE">Phone Call</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="WEBSITE">Website Form</option>
                    <option value="REFERRAL">Student Referral</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[var(--brand-text)]">Course Interest</label>
                  <select
                    value={newLeadForm.courseInterestId || ''}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, courseInterestId: e.target.value || undefined })}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs"
                  >
                    <option value="">-- Choose Course --</option>
                    {courses.map((c: any) => (
                      <option key={c.id || c._id} value={c.id || c._id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[var(--brand-text)]">Mode</label>
                  <select
                    value={newLeadForm.preferredMode}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, preferredMode: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs"
                  >
                    <option value="ONLINE">Online (Zoom)</option>
                    <option value="OFFLINE">Classroom</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[var(--brand-text)]">Initial Counselor Note / Remark</label>
                <textarea
                  rows={2}
                  value={newLeadForm.initialNote || ''}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, initialNote: e.target.value })}
                  placeholder="e.g. Inquired about weekend batch timing and discount options"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--brand-border)]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={createLeadMutation.isPending}
                  className="btn-primary flex items-center gap-1.5"
                >
                  {createLeadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Save Lead
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STAGE TRANSITION MODAL */}
      {stageModalLead && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--brand-border)]">
              <div>
                <h3 className="font-extrabold text-sm text-[var(--brand-text)]">
                  Update Lead Stage
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                  Lead: {stageModalLead.fullName} ({stageModalLead.leadCode || stageModalLead.id})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStageModalLead(null)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--brand-text)] font-mono font-bold"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleStageChangeSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[var(--brand-text)]">New Pipeline Stage *</label>
                <select
                  value={selectedNextStage}
                  onChange={(e) => setSelectedNextStage(e.target.value as LeadStage)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs"
                >
                  <option value="NEW">NEW</option>
                  <option value="CONTACTED">CONTACTED</option>
                  <option value="QUALIFIED">QUALIFIED</option>
                  <option value="DEMO_SCHEDULED">DEMO_SCHEDULED</option>
                  <option value="FOLLOW_UP">FOLLOW_UP</option>
                  <option value="APPLICATION_STARTED">APPLICATION_STARTED</option>
                  <option value="ADMISSION_IN_PROGRESS">ADMISSION_IN_PROGRESS</option>
                  <option value="LOST">LOST (Dropped)</option>
                </select>
              </div>

              {selectedNextStage === 'LOST' && (
                <div className="space-y-1 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                  <label className="font-bold text-red-500">Lost Reason *</label>
                  <select
                    value={lostReason}
                    onChange={(e) => setLostReason(e.target.value as LostReason)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-red-500/40 text-xs"
                  >
                    <option value="NOT_INTERESTED">Not Interested</option>
                    <option value="FEES">Fees Too High</option>
                    <option value="NO_RESPONSE">No Response / Unreachable</option>
                    <option value="JOINED_COMPETITOR">Joined Competitor</option>
                    <option value="LOCATION">Location Inconvenient</option>
                    <option value="TIMING">Batch Timing Mismatch</option>
                    <option value="COURSE_NOT_AVAILABLE">Course Not Available</option>
                    <option value="INVALID_LEAD">Invalid / Junk Number</option>
                    <option value="DUPLICATE">Duplicate Inquiry</option>
                    <option value="OTHER">Other Reason</option>
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-[var(--brand-text)]">Stage Change Note</label>
                <textarea
                  rows={2}
                  value={stageNote}
                  onChange={(e) => setStageNote(e.target.value)}
                  placeholder="e.g. Student confirmed attendance for demo class this Friday"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--brand-border)]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStageModalLead(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={changeStageMutation.isPending}
                  className="btn-primary flex items-center gap-1.5"
                >
                  {changeStageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Stage Change'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-[var(--text-muted)]">Loading CRM Directory...</div>}>
      <LeadsContent />
    </Suspense>
  );
}
