'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  Users,
  Video,
  MapPin,
  RefreshCw,
  AlertCircle,
  X,
  Lock,
  Zap,
} from 'lucide-react';
import { Button } from '@edtech/ui';

const DAYS_OF_WEEK = [
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
  { id: 7, name: 'Sunday', short: 'Sun' },
];

export default function AdminTimetablePage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Queries
  const timetablesQuery = useQuery({
    queryKey: ['timetables'],
    queryFn: async () => {
      const r = await fetch('/api/v1/timetables');
      if (!r.ok) throw new Error('Unable to load master timetables');
      const j = await r.json();
      return j.data || [];
    },
  });

  const batchesQuery = useQuery({
    queryKey: ['batches-list'],
    queryFn: async () => {
      const r = await fetch('/api/v1/batches?limit=100');
      if (!r.ok) return [];
      const j = await r.json();
      return j.data || [];
    },
  });

  const calendarsQuery = useQuery({
    queryKey: ['academic-calendars-list'],
    queryFn: async () => {
      const r = await fetch('/api/v1/academic-calendars');
      if (!r.ok) return [];
      const j = await r.json();
      return j.data || [];
    },
  });

  // Mutations
  const publishMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const r = await fetch(`/api/v1/timetables/${id}/publish`, { method: 'POST' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error?.message || j.message || 'Failed to publish timetable');
      return j.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timetables'] });
      setFeedback({ type: 'success', message: 'Timetable published and classes generated successfully!' });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.message });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const r = await fetch(`/api/v1/timetables/${id}/generate`, { method: 'POST' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error?.message || j.message || 'Failed to generate classes');
      return j.data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['timetables'] });
      setFeedback({
        type: 'success',
        message: `Successfully generated ${data.created || 0} class sessions!`,
      });
    },
    onError: (err: any) => {
      setFeedback({ type: 'error', message: err.message });
    },
  });

  const timetables = timetablesQuery.data || [];
  const totalCount = timetables.length;
  const publishedCount = timetables.filter((t: any) => t.status === 'PUBLISHED').length;
  const draftCount = timetables.filter((t: any) => t.status === 'DRAFT').length;

  return (
    <main className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <CalendarDays className="h-7 w-7 text-primary" />
            Timetable & Schedule Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Draft recurring weekly schedules, validate instructor availability, and publish concrete class sessions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/academic-calendar"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            Open Academic Calendar
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 rounded-xl text-xs font-semibold shadow-md"
          >
            <Plus className="h-4 w-4" /> Create Timetable Draft
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border bg-card space-y-1 shadow-sm">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Timetables</div>
          <div className="text-3xl font-black text-foreground">{totalCount}</div>
          <div className="text-xs text-muted-foreground">Managed recurring course templates</div>
        </div>
        <div className="p-5 rounded-2xl border bg-card space-y-1 shadow-sm">
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Published Schedules
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{publishedCount}</div>
          <div className="text-xs text-muted-foreground">Active in concrete class calendar</div>
        </div>
        <div className="p-5 rounded-2xl border bg-card space-y-1 shadow-sm">
          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Draft Versions
          </div>
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400">{draftCount}</div>
          <div className="text-xs text-muted-foreground">Pending publishing and conflict checks</div>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`flex items-center justify-between gap-3 p-4 rounded-xl border text-sm animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
              : 'bg-destructive/10 text-destructive border-destructive/30'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs underline hover:opacity-80">
            Dismiss
          </button>
        </div>
      )}

      {/* Timetable List Grid */}
      {timetablesQuery.isLoading ? (
        <div className="p-12 text-center rounded-2xl border bg-card animate-pulse space-y-3">
          <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto animate-bounce" />
          <p className="text-sm text-muted-foreground">Loading master timetables…</p>
        </div>
      ) : timetablesQuery.error ? (
        <div className="p-8 text-center rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive space-y-2">
          <AlertCircle className="h-8 w-8 mx-auto" />
          <h3 className="font-bold">Error loading timetables</h3>
          <p className="text-xs">{timetablesQuery.error.message}</p>
        </div>
      ) : timetables.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center space-y-4 shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Sparkles className="h-7 w-7" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-foreground">No Timetables Found</h3>
            <p className="text-sm text-muted-foreground">
              Create your first timetable draft to define recurring weekly class slots and generate scheduled sessions.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2 rounded-xl font-semibold shadow-md">
            <Plus className="h-4 w-4" /> Create Timetable
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {timetables.map((t: any) => {
            const isPublished = t.status === 'PUBLISHED';
            const slotsCount = t.slots?.length || 0;

            return (
              <article
                key={t._id}
                className="rounded-2xl border bg-card p-5 sm:p-6 shadow-sm space-y-5 flex flex-col justify-between hover:border-primary/40 transition-colors"
              >
                <div className="space-y-4">
                  {/* Top Header & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                            isPublished
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {t.status}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">v{t.version}</span>
                      </div>
                      <h2 className="text-xl font-bold text-foreground">{t.name}</h2>
                    </div>

                    <div className="text-right text-xs text-muted-foreground font-mono">
                      <span>{slotsCount} weekly slots</span>
                    </div>
                  </div>

                  {/* Batch & Dates Metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                    {t.batchId && (
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        <span className="font-semibold text-foreground">
                          {t.batchId.name} {t.batchId.batchCode && `(${t.batchId.batchCode})`}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 font-mono">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <span>{t.timezone || 'Asia/Kolkata'}</span>
                    </div>
                  </div>

                  {/* Weekly Day Slot Distribution */}
                  <div className="space-y-2 pt-2 border-t border-border/70">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Weekly Schedule Distribution
                    </div>
                    <div className="grid grid-cols-7 gap-1.5">
                      {DAYS_OF_WEEK.map((d) => {
                        const daySlots = (t.slots || []).filter((s: any) => s.dayOfWeek === d.id);
                        const hasSlots = daySlots.length > 0;

                        return (
                          <div
                            key={d.id}
                            className={`p-2 rounded-xl border text-center transition-all ${
                              hasSlots
                                ? 'bg-primary/10 border-primary/30 text-primary font-bold shadow-xs'
                                : 'bg-muted/40 border-border/60 text-muted-foreground/60'
                            }`}
                          >
                            <div className="text-[10px] uppercase font-bold">{d.short}</div>
                            <div className="text-xs mt-0.5">{hasSlots ? `${daySlots.length}` : '—'}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-3 border-t border-border/70 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    Effective:{' '}
                    <span className="font-medium text-foreground">
                      {new Date(t.effectiveFrom).toLocaleDateString()} – {new Date(t.effectiveTo).toLocaleDateString()}
                    </span>
                  </span>

                  <div className="flex items-center gap-2">
                    {!isPublished ? (
                      <Button
                        size="sm"
                        onClick={() => publishMutation.mutate({ id: t._id })}
                        disabled={publishMutation.isPending}
                        className="gap-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        {publishMutation.isPending ? 'Publishing…' : 'Publish & Generate'}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateMutation.mutate({ id: t._id })}
                        disabled={generateMutation.isPending}
                        className="gap-1.5 rounded-xl text-xs font-semibold"
                      >
                        <Zap className="h-3.5 w-3.5 text-primary" />
                        {generateMutation.isPending ? 'Generating…' : 'Regenerate Classes'}
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Create Timetable Drawer / Modal */}
      {createOpen && (
        <CreateTimetableModal
          batches={batchesQuery.data || []}
          calendars={calendarsQuery.data || []}
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false);
            qc.invalidateQueries({ queryKey: ['timetables'] });
            setFeedback({ type: 'success', message: 'Timetable draft created successfully!' });
          }}
        />
      )}
    </main>
  );
}

// Modal for Creating a New Timetable Draft
function CreateTimetableModal({
  batches,
  calendars,
  onClose,
  onSuccess,
}: {
  batches: any[];
  calendars: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [batchId, setBatchId] = useState('');
  const [calendarId, setCalendarId] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Slots
  const [slots, setSlots] = useState<
    Array<{
      dayOfWeek: number;
      title: string;
      localStartTime: string;
      localEndTime: string;
      mode: 'ONLINE' | 'OFFLINE' | 'HYBRID';
      instructorId: string;
    }>
  >([
    {
      dayOfWeek: 1,
      title: 'Morning Session',
      localStartTime: '10:00',
      localEndTime: '12:00',
      mode: 'ONLINE',
      instructorId: '',
    },
  ]);

  const addSlot = () => {
    setSlots((prev) => [
      ...prev,
      {
        dayOfWeek: 3,
        title: 'Regular Class',
        localStartTime: '10:00',
        localEndTime: '12:00',
        mode: 'ONLINE',
        instructorId: '',
      },
    ]);
  };

  const removeSlot = (idx: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateSlot = (idx: number, field: string, val: any) => {
    setSlots((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const selectedBatch = batches.find((b: any) => b.id === batchId || b._id === batchId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !batchId || !calendarId || !effectiveFrom || !effectiveTo) {
      setError('Please fill in all required timetable fields.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // If slot instructor is blank, fallback to batch instructor
      const preparedSlots = slots.map((s) => ({
        ...s,
        instructorId: s.instructorId || selectedBatch?.instructorId?._id || selectedBatch?.instructorId || '660000000000000000000001',
      }));

      const payload = {
        name,
        batchId,
        calendarId,
        effectiveFrom: new Date(effectiveFrom).toISOString(),
        effectiveTo: new Date(effectiveTo).toISOString(),
        timezone,
        slots: preparedSlots,
      };

      const res = await fetch('/api/v1/timetables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.message || 'Failed to create timetable');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border bg-card p-6 sm:p-8 shadow-2xl space-y-6 my-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Create Timetable Draft</h2>
            <p className="text-xs text-muted-foreground">
              Define recurring schedule slots and link them to an active academic batch.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold mb-1 text-foreground">Timetable Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Master Digital Marketing Mon/Wed Schedule"
                className="w-full px-3 py-2 rounded-xl border bg-background text-foreground focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-foreground">Target Batch *</label>
              <select
                required
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-background text-foreground font-medium"
              >
                <option value="">Select a batch...</option>
                {batches.map((b: any) => (
                  <option key={b.id || b._id} value={b.id || b._id}>
                    {b.name} {b.batchCode && `(${b.batchCode})`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-foreground">Academic Calendar *</label>
              <select
                required
                value={calendarId}
                onChange={(e) => setCalendarId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-background text-foreground font-medium"
              >
                <option value="">Select calendar...</option>
                {calendars.map((c: any) => (
                  <option key={c.id || c._id} value={c.id || c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-foreground">Effective From Date *</label>
              <input
                type="date"
                required
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-background text-foreground"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-foreground">Effective To Date *</label>
              <input
                type="date"
                required
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-background text-foreground"
              />
            </div>
          </div>

          {/* Slots Builder */}
          <div className="space-y-3 pt-3 border-t border-border/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Recurring Weekly Slots ({slots.length})
              </span>
              <button
                type="button"
                onClick={addSlot}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Add Slot
              </button>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {slots.map((s, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border bg-muted/20 grid grid-cols-2 sm:grid-cols-5 gap-2 items-center text-xs"
                >
                  <select
                    value={s.dayOfWeek}
                    onChange={(e) => updateSlot(idx, 'dayOfWeek', Number(e.target.value))}
                    className="rounded-lg border bg-background p-1.5 font-semibold"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={s.title}
                    onChange={(e) => updateSlot(idx, 'title', e.target.value)}
                    placeholder="Slot Title"
                    className="rounded-lg border bg-background p-1.5"
                  />

                  <div className="flex items-center gap-1 font-mono">
                    <input
                      type="text"
                      value={s.localStartTime}
                      onChange={(e) => updateSlot(idx, 'localStartTime', e.target.value)}
                      placeholder="10:00"
                      className="w-16 rounded-lg border bg-background p-1.5 text-center"
                    />
                    <span>–</span>
                    <input
                      type="text"
                      value={s.localEndTime}
                      onChange={(e) => updateSlot(idx, 'localEndTime', e.target.value)}
                      placeholder="12:00"
                      className="w-16 rounded-lg border bg-background p-1.5 text-center"
                    />
                  </div>

                  <select
                    value={s.mode}
                    onChange={(e) => updateSlot(idx, 'mode', e.target.value)}
                    className="rounded-lg border bg-background p-1.5 font-medium"
                  >
                    <option value="ONLINE">Online</option>
                    <option value="OFFLINE">Offline</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>

                  <div className="text-right">
                    {slots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSlot(idx)}
                        className="text-xs text-rose-500 hover:underline font-semibold"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/70">
            <Button variant="outline" type="button" onClick={onClose} className="rounded-xl">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl font-semibold shadow-md">
              {loading ? 'Creating…' : 'Create Timetable Draft'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
