'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Calendar as CalendarIcon,
  Plus,
  ArrowLeft,
  Sun,
  Coffee,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  X,
} from 'lucide-react';
import { Button } from '@edtech/ui';
import { ClassCalendarList } from '@/components/academic/ClassCalendarList';

export default function AdminAcademicCalendarPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'calendar' | 'rules'>('calendar');
  const [exceptionModalOpen, setExceptionModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Queries
  const calendarsQuery = useQuery({
    queryKey: ['academic-calendars-full'],
    queryFn: async () => {
      const r = await fetch('/api/v1/academic-calendars');
      if (!r.ok) return [];
      const j = await r.json();
      return j.data || [];
    },
  });

  const calendars = calendarsQuery.data || [];

  return (
    <div className="space-y-6">
      {/* Tab Navigation Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-4 sm:pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/70">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/timetable"
              className="p-2 rounded-xl border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Academic Scheduling
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground mt-0.5">
                Academic Calendar & Operating Rules
              </h2>
            </div>
          </div>

          {/* Tab Switcher & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-muted/70 p-1 rounded-xl border">
              <button
                onClick={() => setActiveTab('calendar')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'calendar'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Live Operations Schedule
              </button>
              <button
                onClick={() => setActiveTab('rules')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'rules'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Calendars & Holidays ({calendars.length})
              </button>
            </div>

            {activeTab === 'rules' && calendars.length > 0 && (
              <Button
                size="sm"
                onClick={() => setExceptionModalOpen(true)}
                className="gap-1.5 rounded-xl text-xs font-semibold shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" /> Add Holiday / Exception
              </Button>
            )}
          </div>
        </div>

        {feedback && (
          <div
            className={`mt-4 flex items-center justify-between gap-3 p-4 rounded-xl border text-sm animate-in fade-in duration-200 ${
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
      </div>

      {/* Tab 1: Live Operations Schedule */}
      {activeTab === 'calendar' ? (
        <ClassCalendarList
          endpoint="/api/v1/academic-calendar/classes"
          title="Academic Operations Calendar"
          subtitle="Real-time multi-view timeline of all generated, scheduled, and rescheduled class sessions."
        />
      ) : (
        /* Tab 2: Calendars & Holiday Exceptions */
        <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {calendars.map((cal: any) => (
              <article key={cal._id} className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                      {cal.status || 'ACTIVE'}
                    </span>
                    <h3 className="text-xl font-bold text-foreground mt-2">{cal.name}</h3>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{cal.timezone}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-2 border-t">
                  <div>
                    <span>Effective Period:</span>
                    <div className="font-semibold text-foreground mt-0.5">
                      {new Date(cal.startDate).toLocaleDateString()} – {new Date(cal.endDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span>Working Days:</span>
                    <div className="font-semibold text-foreground mt-0.5">
                      {cal.workingDays?.length ? `${cal.workingDays.length} days / week` : 'Mon – Sat'}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </main>
      )}

      {/* Exception Dialog */}
      {exceptionModalOpen && (
        <AddExceptionModal
          calendars={calendars}
          onClose={() => setExceptionModalOpen(false)}
          onSuccess={() => {
            setExceptionModalOpen(false);
            qc.invalidateQueries({ queryKey: ['academic-calendars-full'] });
            setFeedback({ type: 'success', message: 'Holiday / Exception date registered successfully!' });
          }}
        />
      )}
    </div>
  );
}

function AddExceptionModal({
  calendars,
  onClose,
  onSuccess,
}: {
  calendars: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [calendarId, setCalendarId] = useState(calendars[0]?._id || '');
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'HOLIDAY' | 'WORKING_DAY_OVERRIDE'>('HOLIDAY');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calendarId || !date || !name) {
      setError('Please fill in all exception details.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/v1/academic-calendars/${calendarId}/exceptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          name,
          type,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.message || 'Failed to add exception');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Add Calendar Exception</h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold mb-1 text-foreground">Academic Calendar *</label>
            <select
              value={calendarId}
              onChange={(e) => setCalendarId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border bg-background text-foreground font-medium"
            >
              {calendars.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-foreground">Exception Type *</label>
            <select
              value={type}
              onChange={(e: any) => setType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border bg-background text-foreground font-medium"
            >
              <option value="HOLIDAY">Holiday / No Classes</option>
              <option value="WORKING_DAY_OVERRIDE">Working Day Override</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-foreground">Date (YYYY-MM-DD) *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border bg-background text-foreground"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 text-foreground">Holiday / Occasion Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Diwali Holiday / National Day"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border bg-background text-foreground"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t">
            <Button variant="outline" type="button" onClick={onClose} className="rounded-xl">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl font-semibold shadow-md">
              {loading ? 'Saving…' : 'Save Exception'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
