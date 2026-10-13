'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useConfirmation } from '@/components/confirmation/useConfirmation';
import { useGlobalError } from '@/components/error/useGlobalError';
import { Button, Card } from '@edtech/ui';
import { ILead, AdmissionStatus } from '@edtech/types';
import {
  GraduationCap,
  Users,
  Search,
  CheckCircle,
  Clock,
  ArrowLeft,
  UserPlus,
  Loader2,
  BookOpen,
  Calendar,
  Sparkles,
  ChevronRight,
  Filter
} from 'lucide-react';

function AdmissionsContent() {
  const queryClient = useQueryClient();
  const { confirm } = useConfirmation();
  const { showError } = useGlobalError();

  const [search, setSearch] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Fetch Leads that have an Admission or are in Application stage
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['crm-admissions-list'],
    queryFn: async () => {
      const res = await fetch('/api/v1/crm/leads?limit=100');
      if (!res.ok) throw new Error('Failed to load admissions pipeline');
      return res.json();
    }
  });

  const leads: ILead[] = data?.data || [];
  const admissionLeads = leads.filter(
    (l) => l.admissionId || ['APPLICATION_STARTED', 'ADMISSION_IN_PROGRESS', 'CONVERTED'].includes(l.stage)
  );

  const convertStudentMutation = useMutation({
    mutationFn: async (admissionId: string) => {
      const res = await fetch(`/api/v1/crm/admissions/${admissionId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to admit student');
      return json.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['crm-admissions-list'] });
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard-summary'] });
      showToast(`Student admitted & enrolled in ${res.courseTitle || 'course'} successfully!`);
    },
    onError: (err: Error) => showError({ title: 'Admit Failed', message: err.message })
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
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-500 uppercase tracking-wider">
            <GraduationCap className="w-4 h-4" /> Student Admission Lifecycle
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--brand-text)] mt-1">
            Admissions Pipeline
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Review submitted student applications and convert them into registered LMS students with automated course enrollment.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/admin/crm/leads">
            <Button variant="outline" size="sm" className="text-xs flex items-center gap-1.5">
              <ArrowLeft className="w-4 h-4" /> Leads Directory
            </Button>
          </Link>
        </div>
      </div>

      {/* Admissions List */}
      {isLoading ? (
        <div className="p-16 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
          <p className="text-xs font-mono font-bold text-[var(--text-muted)]">Loading Admissions Pipeline...</p>
        </div>
      ) : admissionLeads.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-[var(--brand-border)] rounded-2xl bg-[var(--bg-surface-elevated)] space-y-3">
          <GraduationCap className="w-10 h-10 mx-auto text-[var(--text-muted)] opacity-50" />
          <h3 className="font-extrabold text-sm text-[var(--brand-text)]">No active admissions applications</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            When you qualify a lead, click &quot;Start Admission&quot; inside their workspace to create an application.
          </p>
          <div className="pt-2">
            <Link href="/admin/crm/leads">
              <Button variant="primary" size="sm" className="btn-primary text-xs">
                Browse Leads Directory
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-[var(--brand-border)] bg-[var(--bg-surface-elevated)] shadow-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--brand-background)] border-b border-[var(--brand-border)] text-[var(--text-muted)] uppercase font-mono font-bold text-[11px]">
                <tr>
                  <th className="p-4">Applicant Name</th>
                  <th className="p-4">Contact Phone</th>
                  <th className="p-4">Target Course</th>
                  <th className="p-4">Admission Status</th>
                  <th className="p-4">Counsellor</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--brand-border)] text-[var(--brand-text)]">
                {admissionLeads.map((lead) => {
                  const isConverted = lead.stage === 'CONVERTED';

                  return (
                    <tr key={lead.id} className="hover:bg-[var(--brand-background)]/50 transition-colors">
                      {/* Name */}
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <Link
                            href={`/admin/crm/leads/${lead.id}`}
                            className="font-extrabold text-xs text-[var(--brand-text)] hover:text-[#BE1E2E] transition-colors"
                          >
                            {lead.fullName}
                          </Link>
                          <div className="text-[10px] font-mono text-[var(--text-muted)]">
                            Code: {lead.leadCode || 'LD-N/A'}
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="p-4 font-mono font-bold text-xs">
                        {lead.phone}
                      </td>

                      {/* Course */}
                      <td className="p-4">
                        <div className="font-bold text-xs text-[#BE1E2E] flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{lead.courseInterest?.title || 'Course'}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase font-mono tracking-wider ${
                            isConverted
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                              : 'bg-teal-500/10 text-teal-500 border-teal-500/30'
                          }`}
                        >
                          ● {isConverted ? 'ADMITTED (STUDENT)' : lead.stage}
                        </span>
                      </td>

                      {/* Counsellor */}
                      <td className="p-4">
                        <span className="text-xs text-[var(--brand-text)] font-semibold">
                          {lead.counsellor?.name || 'Unassigned'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isConverted && lead.admissionId && (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={convertStudentMutation.isPending}
                              onClick={() => convertStudentMutation.mutate(lead.admissionId!)}
                              className="h-7 px-3 text-[11px] btn-primary bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1 shadow-md shadow-emerald-500/20"
                            >
                              <UserPlus className="w-3 h-3" /> Admit Student
                            </Button>
                          )}

                          <Link href={`/admin/crm/leads/${lead.id}`}>
                            <Button variant="outline" size="sm" className="h-7 px-2.5 text-[11px]">
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
        </div>
      )}
    </div>
  );
}

export default function AdmissionsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-[var(--text-muted)]">Loading Admissions...</div>}>
      <AdmissionsContent />
    </Suspense>
  );
}
