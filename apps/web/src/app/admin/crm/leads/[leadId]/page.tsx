'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useConfirmation } from '@/components/confirmation/useConfirmation';
import { useGlobalError } from '@/components/error/useGlobalError';
import { Button, Card, Badge } from '@edtech/ui';
import {
  ILead,
  ILeadActivity,
  ILeadFollowUp,
  LeadStage,
  FollowUpType,
  FollowUpOutcome,
  ScheduleFollowUpPayload,
  CompleteFollowUpPayload,
  AddLeadNotePayload,
  CreateAdmissionPayload,
  ConvertAdmissionPayload,
  LostReason
} from '@edtech/types';
import {
  Users,
  PhoneCall,
  Mail,
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  BookOpen,
  ArrowLeft,
  Plus,
  MessageSquare,
  FileText,
  UserCheck,
  Send,
  Loader2,
  GraduationCap,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  PhoneForwarded,
  UserPlus
} from 'lucide-react';

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.leadId as string;
  const queryClient = useQueryClient();
  const { confirm } = useConfirmation();
  const { showError } = useGlobalError();

  // Toast
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Quick Action Forms State
  const [activeTab, setActiveTab] = useState<'TIMELINE' | 'NOTE' | 'FOLLOW_UP' | 'ADMISSION'>('TIMELINE');

  // Note Form
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState<any>('NOTE_ADDED');

  // Follow-Up Form
  const [followUpType, setFollowUpType] = useState<FollowUpType>('CALL');
  const [followUpDueAt, setFollowUpDueAt] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');

  // Complete Follow-up Modal
  const [completingFollowUp, setCompletingFollowUp] = useState<ILeadFollowUp | null>(null);
  const [completeOutcome, setCompleteOutcome] = useState<FollowUpOutcome>('INTERESTED');
  const [completeOutcomeNote, setCompleteOutcomeNote] = useState('');

  // Admission Form
  const [admissionCourseId, setAdmissionCourseId] = useState('');
  const [admissionBatchId, setAdmissionBatchId] = useState('');
  const [admissionNotes, setAdmissionNotes] = useState('');

  // Assign Counsellor Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedCounsellorId, setSelectedCounsellorId] = useState('');

  // Stage Change Modal
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<LeadStage>('QUALIFIED');
  const [lostReason, setLostReason] = useState<LostReason>('NOT_INTERESTED');
  const [stageNote, setStageNote] = useState('');

  // 1. Fetch Lead Details & History
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['crm-lead-detail', leadId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/crm/leads/${leadId}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message || 'Failed to fetch lead details');
      }
      return res.json();
    }
  });

  // 2. Fetch Team Members for Assignment
  const { data: membersData } = useQuery({
    queryKey: ['tenant-team-members-list'],
    queryFn: async () => {
      const res = await fetch('/api/v1/organization/members');
      if (!res.ok) return { data: [] };
      return res.json();
    }
  });
  const members: any[] = membersData?.data || [];

  // 3. Fetch Courses & Batches
  const { data: coursesData } = useQuery({
    queryKey: ['all-courses-dropdown'],
    queryFn: async () => {
      const res = await fetch('/api/v1/courses');
      if (!res.ok) return { data: [] };
      return res.json();
    }
  });
  const courses: any[] = coursesData?.data || [];

  const { data: batchesData } = useQuery({
    queryKey: ['all-batches-dropdown'],
    queryFn: async () => {
      const res = await fetch('/api/v1/batches');
      if (!res.ok) return { data: [] };
      return res.json();
    }
  });
  const batches: any[] = batchesData?.data || [];

  const lead: ILead = data?.data?.lead;
  const activities: ILeadActivity[] = data?.data?.activities || [];
  const followUps: ILeadFollowUp[] = data?.data?.followUps || [];
  const admission: any = data?.data?.admission;

  // Mutations
  const addNoteMutation = useMutation({
    mutationFn: async (payload: AddLeadNotePayload) => {
      const res = await fetch(`/api/v1/crm/leads/${leadId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to add activity note');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-lead-detail', leadId] });
      showToast('Interaction note logged on timeline');
      setNoteContent('');
      setActiveTab('TIMELINE');
    },
    onError: (err: Error) => showError({ title: 'Note Failed', message: err.message })
  });

  const scheduleFollowUpMutation = useMutation({
    mutationFn: async (payload: ScheduleFollowUpPayload) => {
      const res = await fetch(`/api/v1/crm/leads/${leadId}/follow-ups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to schedule follow-up');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-lead-detail', leadId] });
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard-summary'] });
      showToast('Follow-up task scheduled successfully');
      setFollowUpNote('');
      setFollowUpDueAt('');
      setActiveTab('TIMELINE');
    },
    onError: (err: Error) => showError({ title: 'Schedule Failed', message: err.message })
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
      queryClient.invalidateQueries({ queryKey: ['crm-lead-detail', leadId] });
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard-summary'] });
      showToast('Follow-up marked completed');
      setCompletingFollowUp(null);
    },
    onError: (err: Error) => showError({ title: 'Completion Failed', message: err.message })
  });

  const assignCounsellorMutation = useMutation({
    mutationFn: async (assignedTo: string) => {
      const res = await fetch(`/api/v1/crm/leads/${leadId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to assign counsellor');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-lead-detail', leadId] });
      showToast('Counsellor assigned successfully');
      setIsAssignModalOpen(false);
    },
    onError: (err: Error) => showError({ title: 'Assignment Failed', message: err.message })
  });

  const changeStageMutation = useMutation({
    mutationFn: async ({ stage, lostReason, note }: { stage: LeadStage; lostReason?: LostReason; note?: string }) => {
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
      queryClient.invalidateQueries({ queryKey: ['crm-lead-detail', leadId] });
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard-summary'] });
      showToast('Pipeline stage updated');
      setIsStageModalOpen(false);
    },
    onError: (err: Error) => showError({ title: 'Stage Transition Error', message: err.message })
  });

  const createAdmissionMutation = useMutation({
    mutationFn: async (payload: CreateAdmissionPayload) => {
      const res = await fetch(`/api/v1/crm/leads/${leadId}/admissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to start admission application');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-lead-detail', leadId] });
      showToast('Admission application created successfully');
      setActiveTab('TIMELINE');
    },
    onError: (err: Error) => showError({ title: 'Admission Creation Failed', message: err.message })
  });

  const convertStudentMutation = useMutation({
    mutationFn: async (admissionId: string) => {
      const res = await fetch(`/api/v1/crm/admissions/${admissionId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to admit & enroll student');
      return json.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['crm-lead-detail', leadId] });
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard-summary'] });
      showToast(`Student admitted & enrolled in ${data.courseTitle || 'course'}!`);
    },
    onError: (err: Error) => showError({ title: 'Student Conversion Failed', message: err.message })
  });

  if (isLoading) {
    return (
      <div className="p-16 text-center space-y-3 min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#BE1E2E]" />
        <p className="text-xs font-mono font-bold text-[var(--text-muted)]">Loading Counsellor Workspace...</p>
      </div>
    );
  }

  if (isError || !lead) {
    return (
      <div className="p-8 space-y-4">
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold text-center">
          Failed to load lead: {(error as Error)?.message || 'Lead not found'}
        </div>
        <div className="text-center">
          <Link href="/admin/crm/leads">
            <Button variant="outline" size="sm">← Return to Leads</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8 min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)]">
      {/* Toast */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-xl bg-emerald-500 text-white shadow-2xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <CheckCircle className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--brand-border)]">
        <div className="flex items-center gap-3">
          <Link href="/admin/crm/leads">
            <button
              type="button"
              className="p-2 rounded-xl border border-[var(--brand-border)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] hover:text-[var(--brand-text)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#BE1E2E] uppercase">
              <span>{lead.leadCode || 'LEAD'}</span>
              <span>•</span>
              <span>Captured {new Date(lead.createdAt).toLocaleDateString()}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--brand-text)] mt-0.5">
              {lead.fullName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedStage(lead.stage);
              setIsStageModalOpen(true);
            }}
            className="text-xs"
          >
            Stage: <strong className="ml-1 text-[#BE1E2E]">{lead.stage}</strong>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAssignModalOpen(true)}
            className="text-xs flex items-center gap-1.5"
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-500" />
            <span>{lead.counsellor ? lead.counsellor.name : 'Assign Counsellor'}</span>
          </Button>

          {lead.stage !== 'CONVERTED' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setAdmissionCourseId(lead.courseInterest?.id || (courses[0]?.id || ''));
                setActiveTab('ADMISSION');
              }}
              className="text-xs btn-primary flex items-center gap-1.5 shadow-lg shadow-[#BE1E2E]/20"
            >
              <GraduationCap className="w-4 h-4" /> Start Admission
            </Button>
          )}
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Prospect Dossier Profile */}
        <div className="space-y-6">
          {/* Identity Card */}
          <Card className="p-5 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--brand-border)]">
              <span className="font-mono font-bold text-[10px] uppercase text-[var(--text-muted)]">
                Prospect Identity & Contact
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-blue-500/10 text-blue-500 border border-blue-500/20">
                {lead.source}
              </span>
            </div>

            <div className="space-y-3 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Phone</span>
                <span className="font-bold text-[var(--brand-text)] flex items-center gap-1">
                  <PhoneCall className="w-3.5 h-3.5 text-[#BE1E2E]" />
                  {lead.phone}
                </span>
              </div>

              {lead.email && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">Email</span>
                  <span className="font-bold text-[var(--brand-text)] truncate max-w-[170px]">
                    {lead.email}
                  </span>
                </div>
              )}

              {lead.city && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">Location</span>
                  <span className="font-bold text-[var(--brand-text)]">
                    {lead.city}{lead.state ? `, ${lead.state}` : ''}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Preferred Mode</span>
                <span className="font-bold text-blue-500 uppercase">
                  {lead.preferredMode || 'ONLINE'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Course Target</span>
                <span className="font-bold text-[#BE1E2E]">
                  {lead.courseInterest?.title || 'General Inquiry'}
                </span>
              </div>

              {lead.assignedTo && lead.counsellor && (
                <div className="flex items-center justify-between pt-2 border-t border-[var(--brand-border)]">
                  <span className="text-[var(--text-muted)]">Assigned To</span>
                  <span className="font-bold text-emerald-500">
                    {lead.counsellor.name}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Admission Status Dossier (if started) */}
          {admission && (
            <Card className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-500 font-bold font-mono text-[11px] uppercase">
                  <GraduationCap className="w-4 h-4" /> Admission Application
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500 text-white">
                  {admission.status}
                </span>
              </div>

              <div className="space-y-1 font-mono text-[11px]">
                <div className="text-[var(--brand-text)] font-bold">
                  App #{admission.admissionNumber}
                </div>
                <div className="text-[var(--text-muted)]">
                  Course: {admission.courseTitle}
                </div>
                {admission.batchName && (
                  <div className="text-[var(--text-muted)]">
                    Batch: {admission.batchName}
                  </div>
                )}
              </div>

              {admission.status !== 'ADMITTED' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => convertStudentMutation.mutate(admission.id)}
                  disabled={convertStudentMutation.isPending}
                  className="w-full btn-primary text-xs bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
                >
                  {convertStudentMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  Admit & Enroll Student Now
                </Button>
              )}
            </Card>
          )}

          {/* Pending Follow-Ups Queue */}
          <Card className="p-5 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--brand-border)]">
              <div className="flex items-center gap-1.5 font-bold font-mono uppercase text-[10px] text-[var(--text-muted)]">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Scheduled Follow-Ups</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('FOLLOW_UP')}
                className="h-6 px-2 text-[10px]"
              >
                + Schedule
              </Button>
            </div>

            {followUps.filter((f) => f.status === 'PENDING').length === 0 ? (
              <div className="text-center py-4 text-[var(--text-muted)] text-[11px]">
                No pending follow-ups. Schedule one to ensure next touchpoint!
              </div>
            ) : (
              <div className="space-y-2.5">
                {followUps
                  .filter((f) => f.status === 'PENDING')
                  .map((fu) => (
                    <div
                      key={fu.id}
                      className="p-3 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-amber-500 flex items-center gap-1 text-[11px]">
                          <PhoneCall className="w-3 h-3" /> {fu.type}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">
                          {new Date(fu.dueAt).toLocaleDateString()} {new Date(fu.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {fu.note && <p className="text-[11px] text-[var(--brand-text)]">{fu.note}</p>}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCompletingFollowUp(fu)}
                        className="w-full h-7 text-[11px] text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                      >
                        ✓ Mark Completed
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Interaction Workstation & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Action Tabs Header */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-xs font-mono font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('TIMELINE')}
              className={`flex-1 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'TIMELINE' ? 'bg-[#BE1E2E] text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--brand-text)]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Timeline ({activities.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('NOTE')}
              className={`flex-1 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'NOTE' ? 'bg-[#BE1E2E] text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--brand-text)]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Log Interaction
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('FOLLOW_UP')}
              className={`flex-1 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'FOLLOW_UP' ? 'bg-[#BE1E2E] text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--brand-text)]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Schedule Call
            </button>

            {lead.stage !== 'CONVERTED' && (
              <button
                type="button"
                onClick={() => {
                  setAdmissionCourseId(lead.courseInterest?.id || (courses[0]?.id || ''));
                  setActiveTab('ADMISSION');
                }}
                className={`flex-1 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'ADMISSION' ? 'bg-[#BE1E2E] text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--brand-text)]'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" /> Admission Form
              </button>
            )}
          </div>

          {/* Tab 1: LOG NOTE / CALL INTERACTION */}
          {activeTab === 'NOTE' && (
            <Card className="p-6 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-4 animate-in fade-in">
              <h3 className="font-extrabold text-sm text-[var(--brand-text)]">
                Log Prospect Touchpoint & Notes
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addNoteMutation.mutate({ note: noteContent, type: noteType });
                }}
                className="space-y-4 text-xs"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-[var(--brand-text)]">Interaction Type</label>
                    <select
                      value={noteType}
                      onChange={(e) => setNoteType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs"
                    >
                      <option value="CALL">Phone Call</option>
                      <option value="WHATSAPP">WhatsApp Chat</option>
                      <option value="EMAIL">Email Sent</option>
                      <option value="DEMO_SCHEDULED">Demo Class Discussion</option>
                      <option value="NOTE_ADDED">General Internal Note</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[var(--brand-text)]">Interaction Summary / Remarks *</label>
                  <textarea
                    rows={4}
                    required
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Enter discussion notes, objection handling, agreed milestones, or student questions..."
                    className="w-full p-3 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setActiveTab('TIMELINE')}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" disabled={addNoteMutation.isPending} className="btn-primary">
                    {addNoteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Post Note to Timeline
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Tab 2: SCHEDULE FOLLOW-UP */}
          {activeTab === 'FOLLOW_UP' && (
            <Card className="p-6 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-4 animate-in fade-in">
              <h3 className="font-extrabold text-sm text-[var(--brand-text)]">
                Schedule Next Follow-Up Task
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  scheduleFollowUpMutation.mutate({
                    type: followUpType,
                    dueAt: followUpDueAt,
                    note: followUpNote
                  });
                }}
                className="space-y-4 text-xs"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-[var(--brand-text)]">Task Channel</label>
                    <select
                      value={followUpType}
                      onChange={(e) => setFollowUpType(e.target.value as FollowUpType)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs"
                    >
                      <option value="CALL">Phone Call</option>
                      <option value="WHATSAPP">WhatsApp Reminder</option>
                      <option value="EMAIL">Email Follow-Up</option>
                      <option value="DEMO">Demo Class Link Sharing</option>
                      <option value="COUNSELLING">1-on-1 Counselling Session</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-[var(--brand-text)]">Due Date & Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={followUpDueAt}
                      onChange={(e) => setFollowUpDueAt(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[var(--brand-text)]">Follow-Up Agenda / Reminder</label>
                  <textarea
                    rows={3}
                    value={followUpNote}
                    onChange={(e) => setFollowUpNote(e.target.value)}
                    placeholder="e.g. Call to discuss installment plans and verify syllabus download"
                    className="w-full p-3 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setActiveTab('TIMELINE')}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" disabled={scheduleFollowUpMutation.isPending} className="btn-primary">
                    {scheduleFollowUpMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                    Schedule Follow-Up
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Tab 3: ADMISSION APPLICATION FORM */}
          {activeTab === 'ADMISSION' && (
            <Card className="p-6 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--brand-border)]">
                <div>
                  <h3 className="font-extrabold text-sm text-[var(--brand-text)]">
                    Create Formal Admission Application
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Prefills candidate info from CRM lead. Once submitted, this admission can be converted to an LMS student account.
                  </p>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createAdmissionMutation.mutate({
                    courseId: admissionCourseId,
                    batchId: admissionBatchId || undefined,
                    notes: admissionNotes,
                    applicant: {
                      fullName: lead.fullName,
                      phone: lead.phone,
                      email: lead.email
                    }
                  });
                }}
                className="space-y-4 text-xs"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-[var(--brand-text)]">Target Course *</label>
                    <select
                      required
                      value={admissionCourseId}
                      onChange={(e) => setAdmissionCourseId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs"
                    >
                      <option value="">-- Select Course --</option>
                      {courses.map((c: any) => (
                        <option key={c.id || c._id} value={c.id || c._id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-[var(--brand-text)]">Assign Batch (Optional)</label>
                    <select
                      value={admissionBatchId}
                      onChange={(e) => setAdmissionBatchId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs"
                    >
                      <option value="">-- Allocate Batch Later --</option>
                      {batches.map((b: any) => (
                        <option key={b.id || b._id} value={b.id || b._id}>
                          {b.name} ({b.batchCode})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[var(--brand-text)]">Application Remarks</label>
                  <textarea
                    rows={2}
                    value={admissionNotes}
                    onChange={(e) => setAdmissionNotes(e.target.value)}
                    placeholder="e.g. Special concession approved by academic head"
                    className="w-full p-3 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setActiveTab('TIMELINE')}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" disabled={createAdmissionMutation.isPending} className="btn-primary">
                    {createAdmissionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
                    Submit Application
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Tab 4: CHRONOLOGICAL ACTIVITY TIMELINE */}
          {activeTab === 'TIMELINE' && (
            <div className="p-6 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--brand-border)]">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#BE1E2E]" />
                  <h3 className="font-extrabold text-xs uppercase font-mono tracking-wider text-[var(--brand-text)]">
                    Audit-Grade Interaction Timeline
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-[var(--text-muted)]">
                  {activities.length} Recorded Events
                </span>
              </div>

              {activities.length === 0 ? (
                <div className="py-12 text-center text-xs text-[var(--text-muted)] font-mono">
                  No interactions logged yet. Use the tabs above to post notes or schedule calls.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--brand-border)]">
                  {activities.map((act) => {
                    const isSystem = act.type === 'LEAD_CREATED' || act.type === 'STAGE_CHANGED' || act.type === 'CONVERTED';

                    return (
                      <div key={act.id} className="relative group">
                        {/* Dot */}
                        <div
                          className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 border-[var(--bg-surface-elevated)] ${
                            act.type === 'CONVERTED'
                              ? 'bg-emerald-500'
                              : act.type === 'LOST'
                              ? 'bg-red-500'
                              : isSystem
                              ? 'bg-blue-500'
                              : 'bg-[#BE1E2E]'
                          }`}
                        />

                        <div className="p-4 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="font-extrabold text-[var(--brand-text)] flex items-center gap-2">
                              <span>{act.title}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--bg-surface-elevated)] font-mono text-[var(--text-muted)] uppercase">
                                {act.type}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-[var(--text-muted)]">
                              {new Date(act.createdAt).toLocaleString()}
                            </span>
                          </div>

                          {act.note && (
                            <p className="text-[11px] text-[var(--brand-text)]/90 whitespace-pre-wrap">
                              {act.note}
                            </p>
                          )}

                          <div className="text-[10px] font-mono text-[var(--text-muted)] pt-1 flex items-center gap-1">
                            <span>By:</span>
                            <span className="text-[var(--brand-text)] font-semibold">
                              {(act as any).actor?.name || act.actorName || 'System Auto'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* COMPLETE FOLLOW-UP MODAL */}
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

      {/* ASSIGN COUNSELLOR MODAL */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--brand-border)]">
              <h3 className="font-extrabold text-sm text-[var(--brand-text)]">
                Assign Counsellor Ownership
              </h3>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="text-xs text-[var(--text-muted)] font-mono font-bold"
              >
                ✕ Close
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (selectedCounsellorId) {
                  assignCounsellorMutation.mutate(selectedCounsellorId);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div className="space-y-1">
                <label className="font-bold text-[var(--brand-text)]">Select Organization Member *</label>
                <select
                  required
                  value={selectedCounsellorId}
                  onChange={(e) => setSelectedCounsellorId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs"
                >
                  <option value="">-- Choose Team Counsellor --</option>
                  {members.map((m: any) => (
                    <option key={m.userId || m.id} value={m.userId || m.id}>
                      {m.user?.name || m.name || 'Team Member'} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--brand-border)]">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAssignModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={assignCounsellorMutation.isPending} className="btn-primary">
                  {assignCounsellorMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign Ownership'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STAGE CHANGE MODAL */}
      {isStageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--brand-border)]">
              <h3 className="font-extrabold text-sm text-[var(--brand-text)]">
                Update Pipeline Stage
              </h3>
              <button
                type="button"
                onClick={() => setIsStageModalOpen(false)}
                className="text-xs text-[var(--text-muted)] font-mono font-bold"
              >
                ✕ Close
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                changeStageMutation.mutate({
                  stage: selectedStage,
                  lostReason: selectedStage === 'LOST' ? lostReason : undefined,
                  note: stageNote
                });
              }}
              className="space-y-4 text-xs"
            >
              <div className="space-y-1">
                <label className="font-bold text-[var(--brand-text)]">Select Stage *</label>
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value as LeadStage)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs"
                >
                  <option value="NEW">NEW</option>
                  <option value="CONTACTED">CONTACTED</option>
                  <option value="QUALIFIED">QUALIFIED</option>
                  <option value="DEMO_SCHEDULED">DEMO_SCHEDULED</option>
                  <option value="FOLLOW_UP">FOLLOW_UP</option>
                  <option value="APPLICATION_STARTED">APPLICATION_STARTED</option>
                  <option value="ADMISSION_IN_PROGRESS">ADMISSION_IN_PROGRESS</option>
                  <option value="LOST">LOST</option>
                </select>
              </div>

              {selectedStage === 'LOST' && (
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
                <label className="font-bold text-[var(--brand-text)]">Remark / Note</label>
                <textarea
                  rows={2}
                  value={stageNote}
                  onChange={(e) => setStageNote(e.target.value)}
                  placeholder="e.g. Transition details"
                  className="w-full p-3 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--brand-border)]">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsStageModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={changeStageMutation.isPending} className="btn-primary">
                  {changeStageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
