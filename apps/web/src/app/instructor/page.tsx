'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  BookOpen,
  ArrowRight,
  Video,
  MapPin,
  Sparkles,
  ClipboardCheck,
  Award
} from 'lucide-react';
import { Button } from '@edtech/ui';

interface InstructorDashboardData {
  classesToday: number;
  assignedActiveBatches: number;
  pendingAttendance: number;
  pendingGrading: number;
  classesThisWeek: number;
  scheduledTeachingMinutesThisWeek: number;
  timezone: string;
  todaysClasses?: Array<{
    _id: string;
    name: string;
    courseName?: string;
    batchName?: string;
    scheduledStartAt: string;
    scheduledEndAt?: string;
    mode?: string;
    venueAddress?: string;
    meetingUrl?: string;
    enrolledCount?: number;
    attendanceFinalized?: boolean;
  }>;
}

export default function InstructorDashboardPage() {
  const [data, setData] = useState<InstructorDashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/instructor/dashboard')
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(
            r.status === 403
              ? 'Instructor faculty access is unavailable for this account.'
              : 'Instructor dashboard could not be loaded.'
          );
        }
        return r.json();
      })
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-[var(--text-muted)]">Loading faculty workspace...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="glass-card p-6 rounded-2xl border border-red-500/30 text-red-500 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span>Access Warning</span>
          </div>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const statCards = [
    {
      title: 'Classes Today',
      value: data.classesToday,
      description: 'Scheduled today',
      icon: Calendar,
      color: 'bg-blue-500/10 text-blue-500',
      border: 'hover:border-blue-500/40'
    },
    {
      title: 'Active Batches',
      value: data.assignedActiveBatches,
      description: 'Under mentorship',
      icon: GraduationCap,
      color: 'bg-indigo-500/10 text-indigo-500',
      border: 'hover:border-indigo-500/40'
    },
    {
      title: 'Pending Attendance',
      value: data.pendingAttendance,
      description: 'Awaiting lock',
      icon: Users,
      color: data.pendingAttendance > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500',
      border: data.pendingAttendance > 0 ? 'border-amber-500/30' : 'hover:border-emerald-500/40'
    },
    {
      title: 'Pending Grading',
      value: data.pendingGrading,
      description: 'Submissions queue',
      icon: ClipboardCheck,
      color: data.pendingGrading > 0 ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500',
      border: data.pendingGrading > 0 ? 'border-red-500/30' : 'hover:border-emerald-500/40'
    },
    {
      title: 'Classes This Week',
      value: data.classesThisWeek,
      description: 'Total weekly schedule',
      icon: Clock,
      color: 'bg-purple-500/10 text-purple-500',
      border: 'hover:border-purple-500/40'
    },
    {
      title: 'Teaching Hours',
      value: `${Math.round(data.scheduledTeachingMinutesThisWeek / 60)} hrs`,
      description: `${data.scheduledTeachingMinutesThisWeek} total mins`,
      icon: Award,
      color: 'bg-cyan-500/10 text-cyan-500',
      border: 'hover:border-cyan-500/40'
    }
  ];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--brand-border)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-500 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> Faculty Portal
            </span>
            <span className="text-[10px] font-mono font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Timezone: {data.timezone}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--brand-text)]">
            Instructor Command Center
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Manage daily schedule, mark batch attendances, and evaluate student assessments.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/instructor/classes">
            <Button variant="primary" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-blue-600/20">
              <Calendar className="w-3.5 h-3.5 mr-1.5" /> Class Schedule
            </Button>
          </Link>
          <Link href="/instructor/grading">
            <Button variant="outline" className="text-xs px-4 py-2 rounded-xl border border-[var(--brand-border)]">
              <ClipboardCheck className="w-3.5 h-3.5 mr-1.5" /> Grading Queue ({data.pendingGrading})
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className={`glass-card p-4 rounded-2xl border border-[var(--brand-border)] transition-all ${stat.border} space-y-2`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase truncate">
                  {stat.title}
                </span>
                <div className={`p-1.5 rounded-lg ${stat.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-2xl font-black tracking-tight text-[var(--brand-text)]">{stat.value}</p>
              <p className="text-[10px] text-[var(--text-muted)] font-mono truncate">{stat.description}</p>
            </div>
          );
        })}
      </div>

      {/* Today's Schedule Card */}
      <div className="glass-card p-6 rounded-3xl border border-[var(--brand-border)] space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--brand-border)] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--brand-text)]">Today&apos;s Classes & Sessions</h2>
              <p className="text-[11px] text-[var(--text-muted)]">Live schedules mapped to active batches</p>
            </div>
          </div>
          <Link
            href="/instructor/classes"
            className="text-xs font-bold text-blue-500 hover:underline flex items-center gap-1"
          >
            View Full Timetable <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {!data.todaysClasses || data.todaysClasses.length === 0 ? (
          <div className="p-10 text-center space-y-2 text-xs text-[var(--text-muted)] font-mono">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-70 mb-2" />
            <p className="font-semibold text-[var(--brand-text)]">No classes scheduled for today.</p>
            <p>Enjoy your teaching preparation time or review pending assignments in the queue.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.todaysClasses.map((c) => {
              const startFormatted = new Date(c.scheduledStartAt).toLocaleTimeString([], {
                timeZone: data.timezone,
                hour: '2-digit',
                minute: '2-digit'
              });
              const endFormatted = c.scheduledEndAt
                ? new Date(c.scheduledEndAt).toLocaleTimeString([], {
                    timeZone: data.timezone,
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : '';

              return (
                <div
                  key={c._id}
                  className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] hover:border-blue-500/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        {startFormatted} {endFormatted && `- ${endFormatted}`}
                      </span>
                      {c.batchName && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)]">
                          Batch: {c.batchName}
                        </span>
                      )}
                      {c.mode && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-400">
                          {c.mode}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-extrabold text-[var(--brand-text)] truncate">{c.name}</h3>

                    {c.venueAddress && (
                      <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-red-400 flex-shrink-0" />
                        <span className="truncate">{c.venueAddress}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {c.meetingUrl && (
                      <a
                        href={c.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
                      >
                        <Video className="w-3.5 h-3.5" /> Start Meeting
                      </a>
                    )}

                    <Link href={`/instructor/classes/${c._id}`}>
                      <button className="px-3.5 py-2 rounded-xl border border-[var(--brand-border)] hover:bg-[var(--bg-surface-elevated)] text-xs font-bold transition-colors">
                        Class Details & Attendance →
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Faculty Quick Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/instructor/classes"
          className="glass-card p-5 rounded-2xl border border-[var(--brand-border)] hover:border-blue-500/50 transition-all group flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-[var(--brand-text)] group-hover:text-blue-500 transition-colors">
              My Classes & Calendar
            </h3>
            <p className="text-[11px] text-[var(--text-muted)]">Manage batches, attendance registers & topics</p>
          </div>
        </Link>

        <Link
          href="/instructor/grading"
          className="glass-card p-5 rounded-2xl border border-[var(--brand-border)] hover:border-indigo-500/50 transition-all group flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-[var(--brand-text)] group-hover:text-indigo-500 transition-colors">
              Grading Queue
            </h3>
            <p className="text-[11px] text-[var(--text-muted)]">Grade student submissions & give feedback</p>
          </div>
        </Link>

        <Link
          href="/instructor/availability"
          className="glass-card p-5 rounded-2xl border border-[var(--brand-border)] hover:border-purple-500/50 transition-all group flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-[var(--brand-text)] group-hover:text-purple-500 transition-colors">
              Availability Slots
            </h3>
            <p className="text-[11px] text-[var(--text-muted)]">Configure weekly teaching slots & holidays</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
