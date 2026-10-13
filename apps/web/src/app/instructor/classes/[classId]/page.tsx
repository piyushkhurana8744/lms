'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Video,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Users,
  UserCheck,
  UserX,
  Clock3,
  HelpCircle,
  ExternalLink,
  Search,
  BookOpen,
  Sparkles,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@edtech/ui';
import type { IIntegrationConnectionDTO, IProviderMetadataDTO } from '@edtech/types';

interface ClassDetails {
  id: string;
  name: string;
  classCode?: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  timezone?: string;
  mode: 'ONLINE' | 'OFFLINE' | 'HYBRID';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  isRescheduled?: boolean;
  meetingUrl?: string;
  scheduleRevision?: number;
  roomId?: any;
}

interface StudentRecord {
  id: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  status?: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  lateMinutes?: number;
  remarks?: string;
  correctionCount?: number;
}

interface AttendanceData {
  session: {
    id: string;
    classId: string;
    batchId?: string;
    status: 'OPEN' | 'FINALIZED';
    sessionDate: string;
    expected: number;
    marked: number;
    finalizedAt?: string;
  };
  records: StudentRecord[];
  counts: {
    expected: number;
    marked: number;
    unmarked: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
}

interface WorkspaceData {
  class: ClassDetails;
  batch?: {
    id?: string;
    name: string;
    batchCode?: string;
  };
  course?: {
    title: string;
    slug?: string;
  };
  attendance?: AttendanceData | null;
}

interface MeetingData {
  provider: 'GOOGLE_MEET' | 'ZOOM' | 'MICROSOFT_TEAMS';
  status: string;
  syncStatus: string;
  scheduledStart: string;
  scheduledEnd: string;
  isHost: boolean;
}

const STATUS_CONFIG = {
  PRESENT: {
    label: 'Present',
    bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20',
    activeBg: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    icon: UserCheck,
  },
  LATE: {
    label: 'Late',
    bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20',
    activeBg: 'bg-amber-500 text-white border-amber-500 shadow-sm',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    icon: Clock3,
  },
  ABSENT: {
    label: 'Absent',
    bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20',
    activeBg: 'bg-rose-600 text-white border-rose-600 shadow-sm',
    badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
    icon: UserX,
  },
  EXCUSED: {
    label: 'Excused',
    bg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 hover:bg-sky-500/20',
    activeBg: 'bg-sky-600 text-white border-sky-600 shadow-sm',
    badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30',
    icon: HelpCircle,
  },
};

export default function InstructorClassPage({ params }: { params: { classId: string } }) {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [meeting, setMeeting] = useState<MeetingData | null>(null);
  const [meetingProvider, setMeetingProvider] = useState<MeetingData['provider']>('GOOGLE_MEET');
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [meetingHistory, setMeetingHistory] = useState<Array<{ _id: string; provider: string; status: string; activatedAt: string }>>([]);
  const [providerMetadata, setProviderMetadata] = useState<IProviderMetadataDTO[]>([]);
  const [providerConnections, setProviderConnections] = useState<IIntegrationConnectionDTO[]>([]);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNMARKED' | 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED'>('ALL');

  const fetchWorkspace = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/v1/instructor/classes/${params.classId}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || errJson.message || 'Unable to load class session workspace');
      }
      const json = await res.json();
      setData(json.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load class details');
    } finally {
      setLoading(false);
    }
  }, [params.classId]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  const fetchMeeting = useCallback(async () => {
    const res = await fetch(`/api/v1/integrations/classes/${params.classId}/meeting`);
    if (!res.ok) { setMeeting(null); return; }
    const json = await res.json();
    setMeeting(json.data);
    if (json.data?.provider) setMeetingProvider(json.data.provider);
    const historyRes = await fetch(`/api/v1/integrations/classes/${params.classId}/meeting/history`);
    if (historyRes.ok) setMeetingHistory((await historyRes.json()).data || []);
  }, [params.classId]);

  useEffect(() => { void fetchMeeting(); }, [fetchMeeting]);

  useEffect(() => {
    Promise.all([fetch('/api/v1/integrations/providers'), fetch('/api/v1/integrations/connections')])
      .then(async ([providers, connections]) => {
        if (providers.ok) setProviderMetadata((await providers.json()).data || []);
        if (connections.ok) setProviderConnections((await connections.json()).data || []);
      })
      .catch(() => undefined);
  }, []);

  const providerAvailability = (provider: MeetingData['provider']) => {
    const metadata = providerMetadata.find((item) => item.provider === provider);
    const connection = providerConnections.find((item) => item.provider === provider);
    if (metadata?.configurationStatus === 'SETUP_REQUIRED') return { usable: false, message: metadata.configurationMessage || 'Deployment setup required' };
    if (!connection) return { usable: false, message: 'Not connected by your institute administrator' };
    if (connection.status !== 'CONNECTED' && connection.status !== 'DEMO') return { usable: false, message: `Unavailable: ${connection.status.replaceAll('_', ' ').toLowerCase()}` };
    return { usable: true, message: `Connected${connection.externalAccountId ? ` as ${connection.externalAccountId}` : ''}` };
  };

  const runMeetingAction = async (action: 'create' | 'reschedule' | 'cancel') => {
    try {
      setMeetingLoading(true); setActionFeedback(null);
      const suffix = action === 'create' ? '' : `/${action}`;
      const res = await fetch(`/api/v1/integrations/classes/${params.classId}/meeting${suffix}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'create' ? { provider: meetingProvider } : action === 'cancel' ? { reason: 'Instructor cancelled meeting' } : {})
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error?.message || json.message || `Meeting ${action} failed`);
      await fetchMeeting();
      setActionFeedback({ type: 'success', message: `Meeting ${action} completed in TEST MODE.` });
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message });
    } finally { setMeetingLoading(false); }
  };

  // Open attendance session
  const handleOpenAttendance = async () => {
    try {
      setActionLoading(true);
      setActionFeedback(null);
      const res = await fetch(`/api/v1/attendance/classes/${params.classId}/open`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.message || 'Could not open attendance register');
      }
      setData((prev) => (prev ? { ...prev, attendance: json.data } : null));
      setActionFeedback({ type: 'success', message: 'Attendance register opened successfully!' });
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Mark a single student status
  const handleMarkStudent = async (studentId: string, status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED') => {
    if (!data?.attendance?.session?.id) return;
    try {
      const sessionId = data.attendance.session.id;
      const res = await fetch(`/api/v1/attendance/sessions/${sessionId}/records`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: [{ studentId, status }],
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.message || 'Failed to update record');
      }
      // Update local state with latest roster
      setData((prev) => (prev ? { ...prev, attendance: json.data } : null));
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message });
    }
  };

  // Mark all unmarked students present
  const handleMarkAllPresent = async () => {
    if (!data?.attendance?.session?.id) return;
    try {
      setActionLoading(true);
      setActionFeedback(null);
      const sessionId = data.attendance.session.id;
      const res = await fetch(`/api/v1/attendance/sessions/${sessionId}/mark-all-present`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.message || 'Failed to mark all present');
      }
      setData((prev) => (prev ? { ...prev, attendance: json.data } : null));
      setActionFeedback({ type: 'success', message: 'All remaining students marked Present.' });
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Finalize attendance session
  const handleFinalizeAttendance = async () => {
    if (!data?.attendance?.session?.id) return;
    try {
      setActionLoading(true);
      setActionFeedback(null);
      const sessionId = data.attendance.session.id;
      const res = await fetch(`/api/v1/attendance/sessions/${sessionId}/finalize`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.message || 'Failed to finalize attendance');
      }
      setData((prev) => (prev ? { ...prev, attendance: json.data } : null));
      setActionFeedback({ type: 'success', message: 'Attendance finalized and certified successfully!' });
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Roster
  const filteredRecords = useMemo(() => {
    if (!data?.attendance?.records) return [];
    return data.attendance.records.filter((rec) => {
      const matchesSearch =
        !searchQuery ||
        (rec.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (rec.studentEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      if (!matchesSearch) return false;

      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'UNMARKED') return !rec.status;
      return rec.status === statusFilter;
    });
  }, [data?.attendance?.records, searchQuery, statusFilter]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="h-36 bg-card border rounded-2xl p-6 space-y-3">
          <div className="h-8 w-2/3 bg-muted rounded" />
          <div className="h-4 w-1/3 bg-muted rounded" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-card border rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto p-6 md:p-8">
        <Link
          href="/instructor"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Instructor Workspace
        </Link>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <h2 className="text-xl font-bold text-destructive">Class Unavailable</h2>
          <p className="text-sm text-muted-foreground">{error || 'Could not load class details'}</p>
          <Button onClick={fetchWorkspace} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
        </div>
      </div>
    );
  }

  const cls = data.class;
  const isCancelled = cls.status === 'CANCELLED';
  const attendance = data.attendance;
  const sessionStatus = attendance?.session?.status;
  const counts = attendance?.counts || {
    expected: 0,
    marked: 0,
    unmarked: 0,
    present: 0,
    late: 0,
    absent: 0,
    excused: 0,
  };

  const markedPercentage = counts.expected > 0 ? Math.round((counts.marked / counts.expected) * 100) : 0;

  const formattedDate = new Date(cls.scheduledStartAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = `${new Date(cls.scheduledStartAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })} - ${new Date(cls.scheduledEndAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })}`;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/instructor"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Instructor Schedule
        </Link>
        <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-muted text-muted-foreground border">
          Class ID: {cls.id.slice(-6)}
        </span>
      </div>

      {/* Hero Class Information Banner */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-card/60 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                  cls.status === 'CANCELLED'
                    ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                    : cls.status === 'IN_PROGRESS'
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                    : 'bg-primary/10 text-primary border-primary/30'
                }`}
              >
                {cls.status === 'IN_PROGRESS' && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />}
                {cls.status}
              </span>

              {cls.isRescheduled && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Rescheduled
                </span>
              )}

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-foreground border">
                {cls.mode === 'ONLINE' ? <Video className="h-3.5 w-3.5 text-blue-500" /> : <MapPin className="h-3.5 w-3.5 text-emerald-500" />}
                {cls.mode}
              </span>

              {cls.classCode && (
                <span className="text-xs font-mono text-muted-foreground px-2 py-0.5 bg-muted/60 rounded">
                  {cls.classCode}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">{cls.name}</h1>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-primary" />
                <span>{formattedTime}</span>
              </div>
              {cls.timezone && (
                <span className="text-xs text-muted-foreground/80 font-mono">({cls.timezone})</span>
              )}
            </div>
          </div>

          {/* Quick Actions & Links */}
          <div className="flex flex-wrap items-center gap-3">
            {cls.meetingUrl && !isCancelled && (
              <a
                href={cls.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all active:scale-95"
              >
                <Video className="h-4 w-4" />
                Join Class Meeting
                <ExternalLink className="h-3.5 w-3.5 ml-1 opacity-80" />
              </a>
            )}
            <Button variant="outline" size="sm" onClick={fetchWorkspace} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </div>

        {/* Academic Context Bar */}
        {(data.course || data.batch) && (
          <div className="mt-6 pt-5 border-t border-border/70 flex flex-wrap items-center gap-y-2 gap-x-6 text-sm">
            {data.course && (
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Course:</span>
                <span className="font-semibold text-foreground">{data.course.title}</span>
              </div>
            )}
            {data.batch && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Batch:</span>
                <span className="font-semibold text-foreground">
                  {data.batch.name} {data.batch.batchCode && `(${data.batch.batchCode})`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Feedback Alerts */}
      {actionFeedback && (
        <div
          className={`flex items-center justify-between gap-3 p-4 rounded-xl border text-sm animate-in fade-in slide-in-from-top-2 duration-200 ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
              : 'bg-destructive/10 text-destructive border-destructive/30'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <span className="font-medium">{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-xs underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      <section data-testid="live-meeting-console" className="rounded-2xl border bg-card p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><h2 className="font-bold">Live-class provider</h2><span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">TEST MODE</span></div>
            <p className="text-xs text-muted-foreground">Deterministic provider adapters; not live-provider certification.</p>
          </div>
          <select data-testid="meeting-provider-selector" aria-label="Meeting provider" value={meetingProvider} onChange={(e) => setMeetingProvider(e.target.value as MeetingData['provider'])} className="rounded-lg border px-3 py-2 text-sm">
            <option value="GOOGLE_MEET" disabled={!providerAvailability('GOOGLE_MEET').usable}>Google Meet{providerAvailability('GOOGLE_MEET').usable ? '' : ' — unavailable'}</option>
            <option value="ZOOM" disabled={!providerAvailability('ZOOM').usable}>Zoom{providerAvailability('ZOOM').usable ? '' : ' — unavailable'}</option>
            <option value="MICROSOFT_TEAMS" disabled={!providerAvailability('MICROSOFT_TEAMS').usable}>Microsoft Teams{providerAvailability('MICROSOFT_TEAMS').usable ? '' : ' — unavailable'}</option>
          </select>
        </div>
        <div data-testid="meeting-provider-availability" className="grid gap-1 text-xs text-muted-foreground">
          {(['GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS'] as const).map((provider) => <div key={provider}><span className="font-semibold">{provider.replaceAll('_', ' ')}:</span> {providerAvailability(provider).message}</div>)}
          {!providerAvailability(meetingProvider).usable && <div className="text-amber-700">Ask an integration administrator to configure this provider.</div>}
        </div>
        {meeting ? <div data-testid="meeting-status" className="text-sm">{meeting.provider} · {meeting.status} · {meeting.syncStatus} · {new Date(meeting.scheduledStart).toLocaleString()}</div> : <div data-testid="meeting-status" className="text-sm text-muted-foreground">No active meeting</div>}
        <div className="flex flex-wrap gap-2">
          <Button disabled={meetingLoading || isCancelled || !providerAvailability(meetingProvider).usable} onClick={() => runMeetingAction('create')}>Create / Switch Meeting</Button>
          <Button variant="outline" disabled={meetingLoading || !meeting || isCancelled} onClick={() => runMeetingAction('reschedule')}>Reschedule Meeting</Button>
          <Button variant="outline" disabled={meetingLoading || !meeting} onClick={() => runMeetingAction('cancel')}>Cancel Meeting</Button>
        </div>
        <div data-testid="meeting-history" className="space-y-1 text-xs text-muted-foreground">
          <div className="font-semibold text-foreground">Meeting history</div>
          {meetingHistory.length ? meetingHistory.map((item) => <div key={item._id}>{item.provider} · {item.status} · {new Date(item.activatedAt).toLocaleString()}</div>) : <div>No provider history yet</div>}
        </div>
      </section>

      {/* Attendance Workspace Section */}
      <div className="space-y-6">
        {isCancelled ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-8 text-center space-y-2">
            <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
            <h3 className="text-lg font-bold text-rose-700 dark:text-rose-400">Class Cancelled</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Attendance tracking is disabled because this class was cancelled in the academic timetable.
            </p>
          </div>
        ) : !attendance ? (
          /* Attendance Register Not Opened Yet */
          <div className="rounded-2xl border bg-card p-8 text-center space-y-4 shadow-sm">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Sparkles className="h-7 w-7" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-xl font-bold text-foreground">Attendance Register Not Opened</h3>
              <p className="text-sm text-muted-foreground">
                Initialize the live attendance roster for this scheduled session to start recording student presence.
              </p>
            </div>
            <Button
              onClick={handleOpenAttendance}
              disabled={actionLoading}
              className="px-6 py-2.5 rounded-xl font-semibold gap-2 shadow-md"
            >
              {actionLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Open Attendance Register
            </Button>
          </div>
        ) : (
          /* Live / Finalized Attendance Console */
          <div className="space-y-6">
            {/* Status & Action Control Bar */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 rounded-2xl border bg-card shadow-sm">
              <div className="flex items-center gap-3">
                <div
                  className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    sessionStatus === 'FINALIZED'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-primary/15 text-primary'
                  }`}
                >
                  {sessionStatus === 'FINALIZED' ? <Lock className="h-6 w-6" /> : <UserCheck className="h-6 w-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-foreground">Attendance Console</h2>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                        sessionStatus === 'FINALIZED'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {sessionStatus === 'FINALIZED' ? 'Finalized & Locked' : 'Register Open'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {sessionStatus === 'FINALIZED'
                      ? `Certified on ${new Date(attendance.session.finalizedAt || attendance.session.sessionDate).toLocaleString()}`
                      : 'Mark attendance for all enrolled students before finalizing the session.'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              {sessionStatus === 'OPEN' && (
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAllPresent}
                    disabled={actionLoading || counts.unmarked === 0}
                    className="gap-2 rounded-xl text-xs font-semibold"
                  >
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                    Mark All Remaining Present
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleFinalizeAttendance}
                    disabled={actionLoading || counts.unmarked > 0}
                    className="gap-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  >
                    <Lock className="h-4 w-4" />
                    Finalize Session
                  </Button>
                </div>
              )}
            </div>

            {/* Roster Progress & KPI Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="p-3.5 rounded-xl border bg-card text-center space-y-1">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Expected</div>
                <div className="text-2xl font-black text-foreground">{counts.expected}</div>
              </div>
              <div className="p-3.5 rounded-xl border bg-card text-center space-y-1">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Marked</div>
                <div className="text-2xl font-black text-primary">{counts.marked}</div>
              </div>
              <div className="p-3.5 rounded-xl border bg-card text-center space-y-1">
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Present</div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{counts.present}</div>
              </div>
              <div className="p-3.5 rounded-xl border bg-card text-center space-y-1">
                <div className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Late</div>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{counts.late}</div>
              </div>
              <div className="p-3.5 rounded-xl border bg-card text-center space-y-1">
                <div className="text-xs font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider">Absent</div>
                <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{counts.absent}</div>
              </div>
              <div className="p-3.5 rounded-xl border bg-card text-center space-y-1">
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400 uppercase tracking-wider">Excused</div>
                <div className="text-2xl font-black text-sky-600 dark:text-sky-400">{counts.excused}</div>
              </div>
              <div className="p-3.5 rounded-xl border bg-card text-center space-y-1 col-span-2 sm:col-span-1">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unmarked</div>
                <div className={`text-2xl font-black ${counts.unmarked > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                  {counts.unmarked}
                </div>
              </div>
            </div>

            {/* Roster Marking Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground font-medium">
                <span>Roster Marking Progress</span>
                <span>
                  {counts.marked} of {counts.expected} Students ({markedPercentage}%)
                </span>
              </div>
              <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 transition-all duration-300"
                  style={{ width: `${counts.expected ? (counts.present / counts.expected) * 100 : 0}%` }}
                />
                <div
                  className="bg-amber-500 transition-all duration-300"
                  style={{ width: `${counts.expected ? (counts.late / counts.expected) * 100 : 0}%` }}
                />
                <div
                  className="bg-rose-500 transition-all duration-300"
                  style={{ width: `${counts.expected ? (counts.absent / counts.expected) * 100 : 0}%` }}
                />
                <div
                  className="bg-sky-500 transition-all duration-300"
                  style={{ width: `${counts.expected ? (counts.excused / counts.expected) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Interactive Student Roster Table */}
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden space-y-4 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Search Bar */}
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search student by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      statusFilter === 'ALL'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All ({counts.expected})
                  </button>
                  <button
                    onClick={() => setStatusFilter('UNMARKED')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      statusFilter === 'UNMARKED'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Unmarked ({counts.unmarked})
                  </button>
                  <button
                    onClick={() => setStatusFilter('PRESENT')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      statusFilter === 'PRESENT'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                  >
                    Present ({counts.present})
                  </button>
                  <button
                    onClick={() => setStatusFilter('LATE')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      statusFilter === 'LATE'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                    }`}
                  >
                    Late ({counts.late})
                  </button>
                  <button
                    onClick={() => setStatusFilter('ABSENT')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      statusFilter === 'ABSENT'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                    }`}
                  >
                    Absent ({counts.absent})
                  </button>
                  <button
                    onClick={() => setStatusFilter('EXCUSED')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      statusFilter === 'EXCUSED'
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20'
                    }`}
                  >
                    Excused ({counts.excused})
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-border/70">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
                    <tr>
                      <th className="p-4">Student</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">
                        {sessionStatus === 'OPEN' ? 'Mark Attendance' : 'Certified Record'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-muted-foreground">
                          No students found matching the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((record) => {
                        const currentStatus = record.status;
                        const config = currentStatus ? STATUS_CONFIG[currentStatus] : null;

                        return (
                          <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                            {/* Student Profile Cell */}
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center flex-shrink-0 text-sm">
                                  {record.studentName ? record.studentName.charAt(0).toUpperCase() : 'S'}
                                </div>
                                <div>
                                  <div className="font-semibold text-foreground">
                                    {record.studentName || 'Student'}
                                  </div>
                                  <div className="text-xs text-muted-foreground font-mono">
                                    {record.studentEmail || record.studentId}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Status Badge Cell */}
                            <td className="p-4">
                              {config ? (
                                <span
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.badge}`}
                                >
                                  <config.icon className="h-3.5 w-3.5" />
                                  {config.label}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border">
                                  Unmarked
                                </span>
                              )}
                              {Boolean(record.correctionCount && record.correctionCount > 0) && (
                                <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                  {record.correctionCount}× corrected
                                </span>
                              )}
                            </td>

                            {/* Quick Action Marking Buttons */}
                            <td className="p-4 text-right">
                              {sessionStatus === 'OPEN' ? (
                                <div className="inline-flex items-center gap-1.5">
                                  {(['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'] as const).map((s) => {
                                    const c = STATUS_CONFIG[s];
                                    const isSelected = currentStatus === s;
                                    return (
                                      <button
                                        key={s}
                                        onClick={() => handleMarkStudent(record.studentId, s)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                          isSelected ? c.activeBg : c.bg
                                        }`}
                                      >
                                        {c.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-xs font-medium text-muted-foreground">
                                  Locked (Session Finalized)
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
