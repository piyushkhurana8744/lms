'use client';

import React, { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck,
  UserCheck,
  UserX,
  Clock3,
  HelpCircle,
  Lock,
  AlertCircle,
  Search,
  SlidersHorizontal,
  History,
  TrendingDown,
  CheckCircle2,
  Calendar,
  Sparkles,
  Users,
} from 'lucide-react';
import { Button } from '@edtech/ui';
import { useAuth } from '@/components/auth-provider';

const statuses = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const;

const STATUS_THEMES: Record<string, { label: string; badge: string; btn: string; activeBtn: string }> = {
  PRESENT: {
    label: 'Present',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    btn: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20',
    activeBtn: 'bg-emerald-600 text-white border-emerald-600',
  },
  LATE: {
    label: 'Late',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    btn: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20',
    activeBtn: 'bg-amber-500 text-white border-amber-500',
  },
  ABSENT: {
    label: 'Absent',
    badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
    btn: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20',
    activeBtn: 'bg-rose-600 text-white border-rose-600',
  },
  EXCUSED: {
    label: 'Excused',
    badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30',
    btn: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 hover:bg-sky-500/20',
    activeBtn: 'bg-sky-600 text-white border-sky-600',
  },
};

export default function AdminAttendancePage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const [classId, setClassId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNMARKED' | 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED'>('ALL');
  const [correction, setCorrection] = useState<any>(null);
  const [newStatus, setNewStatus] = useState('PRESENT');
  const [reason, setReason] = useState('');
  const [threshold, setThreshold] = useState(75);

  const classes = useQuery({
    queryKey: ['attendance-classes'],
    queryFn: async () => {
      const r = await fetch('/api/v1/classes?limit=100');
      const text = await r.text();
      let j: any = {};
      try {
        j = JSON.parse(text);
      } catch {}
      if (!r.ok) throw new Error(j.message || j.error?.message || 'Unable to load classes');
      return j;
    },
  });

  const roster = useQuery({
    queryKey: ['attendance-roster', classId],
    enabled: Boolean(classId),
    queryFn: async () => {
      const r = await fetch(`/api/v1/attendance/classes/${classId}`);
      const text = await r.text();
      let j: any = {};
      try {
        j = JSON.parse(text);
      } catch {}
      if (!r.ok) throw new Error(j.message || j.error?.message || 'Unable to load attendance');
      return j.data;
    },
  });

  const call = useMutation({
    mutationFn: async ({ path, method = 'POST', body }: any) => {
      const r = await fetch(path, {
        method,
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await r.text();
      let j: any = {};
      try {
        j = JSON.parse(text);
      } catch {}
      if (!r.ok) throw new Error(j.message || j.error?.message || `Operation failed (${r.status})`);
      return j;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-roster', classId] });
      qc.invalidateQueries({ queryKey: ['attendance-analytics'] });
    },
  });

  const data = roster.data;

  const history = useQuery({
    queryKey: ['attendance-corrections', data?.session?.id],
    enabled: Boolean(data?.session?.id && data?.session?.status === 'FINALIZED' && hasPermission('attendance.correct')),
    queryFn: async () => {
      const r = await fetch(`/api/v1/attendance/sessions/${data.session.id}/history`);
      const text = await r.text();
      let j: any = {};
      try {
        j = JSON.parse(text);
      } catch {}
      if (!r.ok) throw new Error(j.message || j.error?.message || 'Unable to load correction history');
      return j.data;
    },
  });

  const analytics = useQuery({
    queryKey: ['attendance-analytics', data?.session?.batchId, threshold],
    enabled: Boolean(data?.session?.batchId),
    queryFn: async () => {
      const r = await fetch(`/api/v1/attendance/batches/${data.session.batchId}/analytics?threshold=${threshold}&limit=20`);
      const text = await r.text();
      let j: any = {};
      try {
        j = JSON.parse(text);
      } catch {}
      if (!r.ok) throw new Error(j.message || j.error?.message || 'Unable to load batch analytics');
      return j.data;
    },
  });

  const filteredRecords = useMemo(() => {
    if (!data?.records) return [];
    return data.records.filter((rec: any) => {
      const matchesSearch =
        !searchQuery ||
        (rec.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (rec.studentEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      if (!matchesSearch) return false;
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'UNMARKED') return !rec.status;
      return rec.status === statusFilter;
    });
  }, [data?.records, searchQuery, statusFilter]);

  const selectedClassInfo = classes.data?.data?.find((c: any) => c.id === classId);

  return (
    <main className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <ClipboardCheck className="h-7 w-7 text-primary" />
            Attendance Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Open, mark, finalize, and execute audit-certified attendance corrections.
          </p>
        </div>
      </div>

      {/* Class Selector Bar */}
      <div className="p-4 rounded-2xl border bg-card shadow-sm space-y-3">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
          Select Academic Class
        </label>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <select
            aria-label="Class"
            className="w-full md:w-96 rounded-xl border bg-background p-3 text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/30 focus:outline-none"
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setCorrection(null);
            }}
          >
            <option value="">Choose a class session to view...</option>
            {classes.data?.data?.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.classCode || c.id.slice(-6)}
              </option>
            ))}
          </select>

          {selectedClassInfo && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="px-2.5 py-1 rounded-full bg-muted border font-medium">
                Mode: {selectedClassInfo.mode || 'ONLINE'}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-muted border font-medium">
                Status: {selectedClassInfo.status}
              </span>
              {selectedClassInfo.scheduledStartAt && (
                <span className="flex items-center gap-1 font-mono">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  {new Date(selectedClassInfo.scheduledStartAt).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* When class is selected but session is not opened yet */}
      {classId && data === null && (
        <div className="rounded-2xl border bg-card p-8 text-center space-y-4 shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Sparkles className="h-7 w-7" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-foreground">Attendance Register Not Initialized</h3>
            <p className="text-sm text-muted-foreground">
              Open the attendance session for this class to load the student roster and begin recording attendance.
            </p>
          </div>
          <Button
            onClick={() => call.mutate({ path: `/api/v1/attendance/classes/${classId}/open` })}
            disabled={call.isPending}
            className="px-6 py-2.5 rounded-xl font-semibold gap-2 shadow-md"
          >
            {call.isPending ? 'Opening...' : 'Open Attendance Register'}
          </Button>
        </div>
      )}

      {/* Roster & Controls when data exists */}
      {data && (
        <div className="space-y-6">
          {/* Status & Actions Control Card */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 rounded-2xl border bg-card shadow-sm">
            <div className="flex items-center gap-3">
              <div
                className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  data.session.status === 'FINALIZED'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-primary/15 text-primary'
                }`}
              >
                {data.session.status === 'FINALIZED' ? <Lock className="h-6 w-6" /> : <ClipboardCheck className="h-6 w-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">Session Status</h2>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                      data.session.status === 'FINALIZED'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {data.session.status === 'FINALIZED' ? 'Finalized' : 'Open for Marking'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.session.status === 'FINALIZED'
                    ? `Finalized on ${new Date(data.session.finalizedAt || data.session.sessionDate).toLocaleString()}`
                    : 'Mark all students before finalizing.'}
                </p>
              </div>
            </div>

            {/* Bulk Action Buttons */}
            {data.session.status === 'OPEN' && (
              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.session.status !== 'OPEN' || call.isPending}
                  onClick={() =>
                    call.mutate({ path: `/api/v1/attendance/sessions/${data.session.id}/mark-all-present` })
                  }
                  className="gap-2 rounded-xl text-xs font-semibold"
                >
                  <UserCheck className="h-4 w-4 text-emerald-600" />
                  Mark All Present
                </Button>
                <Button
                  size="sm"
                  disabled={data.counts.unmarked > 0 || data.session.status !== 'OPEN' || call.isPending}
                  onClick={() =>
                    call.mutate({ path: `/api/v1/attendance/sessions/${data.session.id}/finalize` })
                  }
                  className="gap-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  <Lock className="h-4 w-4" />
                  Finalize Attendance
                </Button>
              </div>
            )}
          </div>

          {call.error && (
            <div className="flex items-center gap-2 p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm font-medium">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{call.error.message}</span>
            </div>
          )}

          {/* Counts Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="p-3.5 rounded-xl border bg-card text-center space-y-1">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Expected</div>
              <div className="text-2xl font-black text-foreground">{data.counts.expected}</div>
            </div>
            <div className="p-3.5 rounded-xl border bg-card text-center space-y-1">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Marked</div>
              <div className="text-2xl font-black text-primary">{data.counts.marked}</div>
            </div>
            <div className="p-3.5 rounded-xl border bg-card text-center space-y-1">
              <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Present</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{data.counts.present}</div>
            </div>
            <div className="p-3.5 rounded-xl border bg-card text-center space-y-1">
              <div className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Late</div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{data.counts.late}</div>
            </div>
            <div className="p-3.5 rounded-xl border bg-card text-center space-y-1">
              <div className="text-xs font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider">Absent</div>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{data.counts.absent}</div>
            </div>
            <div className="p-3.5 rounded-xl border bg-card text-center space-y-1">
              <div className="text-xs font-medium text-sky-600 dark:text-sky-400 uppercase tracking-wider">Excused</div>
              <div className="text-2xl font-black text-sky-600 dark:text-sky-400">{data.counts.excused}</div>
            </div>
            <div className="p-3.5 rounded-xl border bg-card text-center space-y-1 col-span-2 sm:col-span-1">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unmarked</div>
              <div className={`text-2xl font-black ${data.counts.unmarked > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                {data.counts.unmarked}
              </div>
            </div>
          </div>

          {/* Roster Table Card */}
          <div className="rounded-2xl border bg-card p-4 sm:p-6 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search student name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Status Filters */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {(['ALL', 'UNMARKED', 'PRESENT', 'LATE', 'ABSENT', 'EXCUSED'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      statusFilter === filter
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {filter.charAt(0) + filter.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border/70">
              <table className="w-full min-w-[640px] text-sm text-left">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
                  <tr>
                    <th className="p-4">Student</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-muted-foreground">
                        No students match the criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r: any) => (
                      <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="font-semibold text-foreground">{r.studentName || 'Student'}</div>
                          <div className="text-xs text-muted-foreground font-mono">{r.studentEmail || r.studentId}</div>
                        </td>
                        <td className="p-4">
                          {r.status ? (
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                                STATUS_THEMES[r.status]?.badge || 'bg-muted border'
                              }`}
                            >
                              {r.status}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border">
                              Unmarked
                            </span>
                          )}
                          {Boolean(r.correctionCount && r.correctionCount > 0) && (
                            <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              {r.correctionCount}× corrected
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {statuses.map((s) => (
                              <button
                                key={s}
                                disabled={data.session.status !== 'OPEN'}
                                className={`rounded-lg border px-3 py-1 text-xs font-semibold transition-all ${
                                  r.status === s
                                    ? STATUS_THEMES[s]?.activeBtn
                                    : STATUS_THEMES[s]?.btn
                                } disabled:opacity-40`}
                                onClick={() =>
                                  call.mutate({
                                    path: `/api/v1/attendance/sessions/${data.session.id}/records`,
                                    method: 'PUT',
                                    body: { records: [{ studentId: r.studentId, status: s }] },
                                  })
                                }
                              >
                                {s}
                              </button>
                            ))}
                            {data.session.status === 'FINALIZED' && hasPermission('attendance.correct') && (
                              <button
                                className="rounded-lg border bg-card px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10 border-primary/30 transition-colors ml-1"
                                onClick={() => {
                                  setCorrection(r);
                                  setNewStatus(r.status || 'PRESENT');
                                }}
                              >
                                Correct
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Correction Drawer / Modal Card */}
          {correction && (
            <section className="rounded-2xl border border-primary/30 bg-card p-6 space-y-4 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Correct Attendance for {correction.studentName}
                </h2>
                <span className="text-xs text-muted-foreground font-mono">Record: {correction.id.slice(-6)}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Current Certified Status: <span className="font-semibold text-foreground">{correction.status}</span>
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    New Attendance Status
                  </label>
                  <select
                    className="w-full rounded-xl border bg-background p-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/30"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Audited Correction Reason (Required)
                  </label>
                  <input
                    aria-label="Correction reason"
                    className="w-full rounded-xl border bg-background p-2.5 text-sm focus:ring-2 focus:ring-primary/30"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Student submitted medical certificate / Late transport clearance"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  disabled={reason.trim().length < 3 || call.isPending}
                  onClick={() =>
                    call.mutate(
                      {
                        path: `/api/v1/attendance/records/${correction.id}/correct`,
                        body: {
                          status: newStatus,
                          reason,
                          idempotencyKey: `ui-${correction.id}-${Date.now()}`,
                        },
                      },
                      {
                        onSuccess: () => {
                          setCorrection(null);
                          setReason('');
                          qc.invalidateQueries({ queryKey: ['attendance-corrections'] });
                          qc.invalidateQueries({ queryKey: ['attendance-analytics'] });
                        },
                      }
                    )
                  }
                  className="rounded-xl font-semibold"
                >
                  Save Audited Correction
                </Button>
                <Button variant="outline" onClick={() => setCorrection(null)} className="rounded-xl">
                  Cancel
                </Button>
              </div>
            </section>
          )}

          {/* Certified Correction History */}
          {data.session.status === 'FINALIZED' && hasPermission('attendance.correct') && (
            <section className="rounded-2xl border bg-card p-6 space-y-4 shadow-sm">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Audited Correction History
              </h2>
              {history.isLoading ? (
                <p className="text-sm text-muted-foreground animate-pulse">Loading history…</p>
              ) : history.data?.length ? (
                <div className="space-y-3">
                  {history.data.map((h: any) => (
                    <div
                      key={h._id}
                      className="text-sm border rounded-xl p-4 bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <div className="font-semibold text-foreground">{h.student?.name || 'Student'}</div>
                        <div className="text-xs text-muted-foreground">
                          Status changed from <span className="font-bold text-rose-500">{h.previousStatus}</span> to{' '}
                          <span className="font-bold text-emerald-500">{h.newStatus}</span> · {h.reason}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {h.changedBy?.name || 'Authorized staff'} · {new Date(h.changedAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No post-finalization corrections recorded for this session.</p>
              )}
            </section>
          )}

          {/* Batch Analytics Drilldown */}
          {data.session.batchId && (
            <section className="rounded-2xl border bg-card p-6 space-y-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-primary" />
                    Batch Attendance Analytics & Early Alerts
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Aggregated over all finalized sessions for this batch.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-xs text-muted-foreground">At-risk Threshold:</span>
                  <input
                    className="w-16 rounded-lg border bg-background p-1.5 text-center text-sm font-bold"
                    type="number"
                    min="0"
                    max="100"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                  />
                  <span className="text-xs font-semibold">%</span>
                </div>
              </div>

              {analytics.isLoading ? (
                <p className="text-sm text-muted-foreground animate-pulse">Loading batch analytics…</p>
              ) : analytics.error ? (
                <p className="text-sm text-destructive">Analytics unavailable for this batch.</p>
              ) : analytics.data ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                    <div className="p-3 rounded-xl border bg-muted/30 text-center">
                      <div className="text-xs text-muted-foreground">Finalized Sessions</div>
                      <div className="text-xl font-bold">{analytics.data.finalizedSessions}</div>
                    </div>
                    <div className="p-3 rounded-xl border bg-muted/30 text-center">
                      <div className="text-xs text-muted-foreground">Batch Average</div>
                      <div className="text-xl font-bold text-primary">
                        {analytics.data.averageAttendancePercentage ?? '—'}%
                      </div>
                    </div>
                    {Object.entries(analytics.data.totals).map(([k, v]) => (
                      <div key={k} className="p-3 rounded-xl border bg-muted/30 text-center">
                        <div className="text-xs capitalize text-muted-foreground">{k}</div>
                        <div className="text-xl font-bold">{String(v)}</div>
                      </div>
                    ))}
                  </div>

                  {analytics.data.students.length ? (
                    <div className="overflow-x-auto rounded-xl border border-border/70">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
                          <tr>
                            <th className="p-3">Student with Low Attendance (&lt; {threshold}%)</th>
                            <th className="p-3 text-right">Attendance Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {analytics.data.students.map((s: any) => (
                            <tr key={s.studentId} className="hover:bg-muted/30">
                              <td className="p-3 font-medium text-foreground">{s.studentName}</td>
                              <td className="p-3 text-right font-bold text-rose-600 dark:text-rose-400">
                                {s.attendancePercentage}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-medium">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                      <span>All students currently meet or exceed the {threshold}% attendance threshold.</span>
                    </div>
                  )}
                </div>
              ) : null}
            </section>
          )}
        </div>
      )}
    </main>
  );
}
