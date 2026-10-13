'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/auth-provider';
import {
  GraduationCap,
  Calendar,
  IndianRupee,
  ClipboardCheck,
  Award,
  History,
  AlertCircle,
  Play,
  ArrowRightLeft,
  Pause,
  RotateCcw,
  UserX,
  CheckCircle2,
  Clock,
  ChevronRight
} from 'lucide-react';

export default function StudentWorkspacePage() {
  const params = useParams();
  const studentId = String(params.studentId);
  const qc = useQueryClient();
  const { hasPermission } = useAuth();

  // Active action modal state
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalReason, setModalReason] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch student academic profile
  const profileQuery = useQuery({
    queryKey: ['student-workspace-profile', studentId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/students/profile/${studentId}`);
      const text = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(text);
      } catch {}
      if (!res.ok) throw new Error(json.message || json.error?.message || 'Failed to load student workspace');
      return json.data;
    }
  });

  // Fetch student timeline
  const timelineQuery = useQuery({
    queryKey: ['student-workspace-timeline', studentId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/students/timeline/${studentId}`);
      const text = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(text);
      } catch {}
      if (!res.ok) throw new Error(json.message || json.error?.message || 'Failed to load timeline');
      return json.data;
    }
  });

  // Fetch batches for transfer/assignment
  const batchesQuery = useQuery({
    queryKey: ['batches-dropdown'],
    queryFn: async () => {
      const res = await fetch('/api/v1/batches?limit=100&status=UPCOMING,ONGOING');
      const text = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(text);
      } catch {}
      return json.data?.batches || [];
    }
  });

  // Mutation for lifecycle transitions
  const lifecycleActionMutation = useMutation({
    mutationFn: async ({ action, payload }: { action: string; payload: any }) => {
      const lifecycleId = profileQuery.data?.lifecycle?.id;
      if (!lifecycleId) throw new Error('Lifecycle record not initialized for student');

      const res = await fetch(`/api/v1/students/${lifecycleId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const text = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(text);
      } catch {}
      if (!res.ok) throw new Error(json.message || json.error?.message || `Failed to ${action} student`);
      return json.data;
    },
    onSuccess: () => {
      setActiveModal(null);
      setModalReason('');
      setSelectedBatchId('');
      setActionError(null);
      qc.invalidateQueries({ queryKey: ['student-workspace-profile', studentId] });
      qc.invalidateQueries({ queryKey: ['student-workspace-timeline', studentId] });
    },
    onError: (err: Error) => {
      setActionError(err.message);
    }
  });

  const profile = profileQuery.data;
  const lifecycle = profile?.lifecycle;
  const currentStatus = lifecycle?.currentStatus || 'UNKNOWN';

  const handleExecuteAction = (action: string) => {
    setActionError(null);
    const expectedRevision = lifecycle?.revision;

    let payload: any = { expectedRevision };
    if (action === 'activate') {
      if (selectedBatchId) payload.batchId = selectedBatchId;
      if (modalReason) payload.notes = modalReason;
    } else if (action === 'transfer') {
      if (!selectedBatchId) {
        setActionError('Please select a destination batch');
        return;
      }
      if (!modalReason || modalReason.trim().length < 3) {
        setActionError('Reason is required (min 3 characters)');
        return;
      }
      payload.toBatchId = selectedBatchId;
      payload.reason = modalReason;
    } else if (['hold', 'withdraw', 'drop', 'reactivate'].includes(action)) {
      if (!modalReason || modalReason.trim().length < 3) {
        setActionError('Reason is required (min 3 characters)');
        return;
      }
      payload.reason = modalReason;
      if (action === 'reactivate' && selectedBatchId) {
        payload.batchId = selectedBatchId;
      }
    } else if (action === 'resume' || action === 'complete') {
      if (modalReason) payload.notes = modalReason;
    }

    lifecycleActionMutation.mutate({ action, payload });
  };

  if (profileQuery.isLoading) {
    return (
      <div className="p-16 text-center text-zinc-500 flex flex-col items-center justify-center gap-3">
        <Clock className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium">Loading Student Academic Workspace...</p>
      </div>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <div className="p-16 text-center text-rose-600 flex flex-col items-center justify-center gap-3">
        <AlertCircle className="h-8 w-8" />
        <p className="text-base font-semibold">{(profileQuery.error as Error)?.message || 'Student workspace not found'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner & Header */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-2xl">
              {profile.identity.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{profile.identity.name}</h1>
                <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2.5 py-1 rounded-md">
                  {lifecycle?.studentNumber || 'NO ID'}
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                  Standing: {currentStatus}
                </span>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {profile.identity.email} • {profile.identity.phone || 'No phone'}
              </p>
            </div>
          </div>

          {/* Context-Valid Lifecycle Action Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {currentStatus === 'PENDING_ACTIVATION' && (
              <button
                onClick={() => {
                  setActionError(null);
                  setActiveModal('activate');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
              >
                <Play className="h-3.5 w-3.5" /> Activate Student
              </button>
            )}

            {currentStatus === 'ACTIVE' && (
              <>
                <button
                  onClick={() => {
                    setActionError(null);
                    setActiveModal('transfer');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 shadow-sm"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" /> Transfer Batch
                </button>
                <button
                  onClick={() => {
                    setActionError(null);
                    setActiveModal('hold');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 shadow-sm"
                >
                  <Pause className="h-3.5 w-3.5" /> Place on Hold
                </button>
                <button
                  onClick={() => {
                    setActionError(null);
                    setActiveModal('complete');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Mark Completed
                </button>
                <button
                  onClick={() => {
                    setActionError(null);
                    setActiveModal('withdraw');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/30"
                >
                  <UserX className="h-3.5 w-3.5" /> Withdraw
                </button>
              </>
            )}

            {currentStatus === 'ON_HOLD' && (
              <>
                <button
                  onClick={() => {
                    setActionError(null);
                    setActiveModal('resume');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Resume Academic Journey
                </button>
                <button
                  onClick={() => {
                    setActionError(null);
                    setActiveModal('withdraw');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                >
                  <UserX className="h-3.5 w-3.5" /> Withdraw
                </button>
              </>
            )}

            {['WITHDRAWN', 'DROPPED'].includes(currentStatus) && (
              <button
                onClick={() => {
                  setActionError(null);
                  setActiveModal('reactivate');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Readmit / Reactivate Episode
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid of Domain Projections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Academic Card */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Academic Course</span>
            <GraduationCap className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100">{profile.academic.course?.title || 'No Course'}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">{profile.academic.batch?.name || 'Unassigned Cohort'}</p>
          </div>
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between text-xs">
            <span className="text-zinc-500">Progress</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{profile.academic.progressPercent}% ({profile.academic.completedLessons}/{profile.academic.totalLessons} lessons)</span>
          </div>
        </div>

        {/* Attendance Card */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Attendance Rate</span>
            <ClipboardCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {profile.attendance?.attendancePercentage !== null && profile.attendance?.attendancePercentage !== undefined
                ? `${profile.attendance.attendancePercentage}%`
                : 'N/A'}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {profile.attendance?.attended || 0} Attended / {profile.attendance?.totalFinalizedEligibleSessions || 0} Eligible Sessions
            </p>
          </div>
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between text-xs text-zinc-500">
            <span>Present: {profile.attendance?.present || 0}</span>
            <span>Late: {profile.attendance?.late || 0}</span>
            <span>Absent: {profile.attendance?.absent || 0}</span>
          </div>
        </div>

        {/* Finance Card */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Fee Ledger</span>
            <IndianRupee className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {profile.finance
                ? `₹${((profile.finance.outstandingBalanceMinor || 0) / 100).toLocaleString('en-IN')}`
                : '₹0'}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {profile.finance ? `Paid: ₹${(profile.finance.paidAmountMinor / 100).toLocaleString('en-IN')}` : 'No Fee Plan'}
            </p>
          </div>
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between text-xs">
            <span className="text-zinc-500">Status</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{profile.finance?.status || 'UNASSIGNED'}</span>
          </div>
        </div>

        {/* Certificate Card */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Credentials</span>
            <Award className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {profile.credentials.length ? `${profile.credentials.length} Issued` : 'None'}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {profile.credentials[0]?.certificateNumber || 'No credentials earned yet'}
            </p>
          </div>
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between text-xs">
            <span className="text-zinc-500">Eligibility</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{profile.academic.progressPercent === 100 ? 'Eligible' : 'In Progress'}</span>
          </div>
        </div>
      </div>

      {/* Lifecycle Timeline */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-6">
          <History className="h-5 w-5 text-indigo-600" />
          Institutional Lifecycle Timeline
        </h2>

        {timelineQuery.isLoading ? (
          <p className="text-sm text-zinc-500">Loading timeline...</p>
        ) : (timelineQuery.data || []).length === 0 ? (
          <p className="text-sm text-zinc-500 italic">No lifecycle transition events recorded yet.</p>
        ) : (
          <div className="relative pl-6 border-l-2 border-zinc-200 dark:border-zinc-800 space-y-6">
            {timelineQuery.data.map((event: any) => (
              <div key={event.id} className="relative">
                <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full bg-indigo-600 border-2 border-white dark:border-zinc-900" />
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{event.eventType}</span>
                  <span className="text-xs text-zinc-400">{new Date(event.effectiveAt).toLocaleString()}</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">{event.reason || 'Standard system action'}</p>
                {event.performedBy && (
                  <span className="text-[11px] text-zinc-400">Actor: {event.performedBy.name}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 capitalize">
              {activeModal === 'transfer' ? 'Transfer Student Batch' : `${activeModal} Student`}
            </h3>

            {actionError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-lg text-xs text-rose-600 dark:text-rose-300">
                {actionError}
              </div>
            )}

            {/* Destination Batch selection for transfer or activation */}
            {['transfer', 'activate', 'reactivate'].includes(activeModal) && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {activeModal === 'transfer' ? 'Destination Batch *' : 'Assign Batch (Optional)'}
                </label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="">Select Cohort / Batch...</option>
                  {(batchesQuery.data || []).map((b: any) => (
                    <option key={b._id} value={b._id}>
                      {b.name} ({b.mode})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Reason or notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {['transfer', 'hold', 'withdraw', 'drop', 'reactivate'].includes(activeModal) ? 'Reason *' : 'Notes (Optional)'}
              </label>
              <textarea
                value={modalReason}
                onChange={(e) => setModalReason(e.target.value)}
                placeholder="Enter justification or remarks..."
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setActionError(null);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={lifecycleActionMutation.isPending}
                onClick={() => handleExecuteAction(activeModal)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {lifecycleActionMutation.isPending ? 'Processing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
