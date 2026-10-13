'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Video,
  Building2,
  Users,
  MapPin,
  Search,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Laptop,
  GraduationCap,
  ShieldCheck,
  BookOpen
} from 'lucide-react';
import { Button } from '@edtech/ui';

interface PublicBatch {
  id: string;
  name: string;
  batchCode: string;
  mode: 'ONLINE' | 'OFFLINE' | 'HYBRID';
  status: string;
  startDate: string;
  endDate?: string;
  timing: {
    startTime: string;
    endTime: string;
    timezone: string;
  };
  daysOfWeek: string[];
  maxSeats: number;
  enrolledCount: number;
  course?: {
    id: string;
    title: string;
    slug: string;
    thumbnail?: string;
    duration?: string;
  };
  instructor?: {
    id: string;
    name: string;
    avatar?: string;
    bio?: string;
  };
  classroomDetails?: {
    branch?: string;
    roomNumber?: string;
    venueAddress?: string;
    centerContact?: string;
  };
  zoomDetails?: {
    meetingId?: string;
    joinUrl?: string;
    topic?: string;
    passcodeProtected?: boolean;
    instructions?: string;
  };
}

export default function PublicBatchesPage() {
  const [batches, setBatches] = useState<PublicBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const [dayFilter, setDayFilter] = useState<'ALL' | 'WEEKDAY' | 'WEEKEND'>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');

  useEffect(() => {
    async function loadBatches() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/v1/public/batches?limit=100');
        if (!res.ok) throw new Error('Failed to fetch scheduled batches');
        const data = await res.json();
        setBatches(data.data || []);
      } catch (err: any) {
        console.error('Error loading batches:', err);
        setError(err.message || 'Unable to load scheduled batches');
      } finally {
        setIsLoading(false);
      }
    }
    loadBatches();
  }, []);

  // Extract unique branches from offline batches
  const availableBranches = Array.from(
    new Set(
      batches
        .filter((b) => b.classroomDetails?.branch)
        .map((b) => b.classroomDetails!.branch!)
    )
  );

  // Filter batches
  const filteredBatches = batches.filter((b) => {
    // Mode match
    if (modeFilter === 'ONLINE' && b.mode !== 'ONLINE' && b.mode !== 'HYBRID') return false;
    if (modeFilter === 'OFFLINE' && b.mode !== 'OFFLINE' && b.mode !== 'HYBRID') return false;

    // Day type match
    const isWeekend = b.daysOfWeek.some((d) => ['Saturday', 'Sunday'].includes(d));
    const isWeekday = b.daysOfWeek.some((d) => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(d));
    if (dayFilter === 'WEEKEND' && !isWeekend) return false;
    if (dayFilter === 'WEEKDAY' && !isWeekday) return false;

    // Branch match
    if (branchFilter !== 'ALL' && b.classroomDetails?.branch !== branchFilter) return false;

    // Search query match (course title, batch code, batch name, branch, instructor)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = b.course?.title?.toLowerCase().includes(q);
      const matchesBatch = b.name?.toLowerCase().includes(q) || b.batchCode?.toLowerCase().includes(q);
      const matchesBranch = b.classroomDetails?.branch?.toLowerCase().includes(q) || b.classroomDetails?.venueAddress?.toLowerCase().includes(q);
      const matchesInstructor = b.instructor?.name?.toLowerCase().includes(q);
      if (!matchesTitle && !matchesBatch && !matchesBranch && !matchesInstructor) return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#0A0E1A] text-white p-8 sm:p-12 border border-slate-800 shadow-2xl">
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-[#BE1E2E]/20 blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 -bottom-16 w-64 h-64 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#BE1E2E]/20 border border-[#BE1E2E]/40 text-[#ff717f] text-xs font-mono font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Upcoming Batch Schedules
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Learn Live. Online on <span className="text-blue-400">Zoom</span> or In-Person at our <span className="text-[#ff5062]">Campus Centers</span>.
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
            Explore all scheduled cohorts for digital marketing, technology, and industry-certified programs. 
            Choose your learning mode, check timings, faculty, and reserve your seat before registration closes.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>100% Practical Training</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Live Zoom Cohorts</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Air-Conditioned Labs</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Doubt Support & Backup</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search course title, batch code, branch, or trainer..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-[var(--brand-background)] border border-[var(--brand-border)] text-[var(--brand-text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E]"
            />
          </div>

          {/* Mode Selector */}
          <div className="flex items-center bg-[var(--brand-background)] p-1 rounded-xl border border-[var(--brand-border)] text-xs font-semibold">
            <button
              onClick={() => setModeFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                modeFilter === 'ALL'
                  ? 'bg-[#BE1E2E] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--brand-text)]'
              }`}
            >
              All Batches
            </button>
            <button
              onClick={() => setModeFilter('ONLINE')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                modeFilter === 'ONLINE'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-blue-500'
              }`}
            >
              <Video className="w-3.5 h-3.5" /> Online (Zoom)
            </button>
            <button
              onClick={() => setModeFilter('OFFLINE')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                modeFilter === 'OFFLINE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-emerald-500'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" /> Classroom
            </button>
          </div>
        </div>

        {/* Secondary filters: Weekday/Weekend & Branch */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--brand-border)]/60 text-xs">
          <span className="text-[var(--text-muted)] font-mono font-medium">Filters:</span>
          
          <button
            onClick={() => setDayFilter(dayFilter === 'WEEKDAY' ? 'ALL' : 'WEEKDAY')}
            className={`px-3 py-1 rounded-lg border transition-all ${
              dayFilter === 'WEEKDAY'
                ? 'bg-[#BE1E2E]/10 border-[#BE1E2E] text-[#BE1E2E] font-bold'
                : 'border-[var(--brand-border)] text-[var(--text-muted)] hover:text-[var(--brand-text)]'
            }`}
          >
            Weekday Batches
          </button>

          <button
            onClick={() => setDayFilter(dayFilter === 'WEEKEND' ? 'ALL' : 'WEEKEND')}
            className={`px-3 py-1 rounded-lg border transition-all ${
              dayFilter === 'WEEKEND'
                ? 'bg-[#BE1E2E]/10 border-[#BE1E2E] text-[#BE1E2E] font-bold'
                : 'border-[var(--brand-border)] text-[var(--text-muted)] hover:text-[var(--brand-text)]'
            }`}
          >
            Weekend Batches
          </button>

          {availableBranches.length > 0 && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-1 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs text-[var(--brand-text)] focus:outline-none"
            >
              <option value="ALL">All Campus Branches</option>
              {availableBranches.map((branch) => (
                <option key={branch} value={branch}>
                  {branch} Branch
                </option>
              ))}
            </select>
          )}

          {(searchQuery || modeFilter !== 'ALL' || dayFilter !== 'ALL' || branchFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setModeFilter('ALL');
                setDayFilter('ALL');
                setBranchFilter('ALL');
              }}
              className="text-[11px] text-[#BE1E2E] hover:underline font-mono ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Batches Grid */}
      {isLoading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#BE1E2E] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-[var(--text-muted)]">Loading upcoming batch schedules...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 space-y-2">
          <p className="font-bold">Error loading schedules</p>
          <p className="text-xs">{error}</p>
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-4">
          <Calendar className="w-12 h-12 text-[var(--text-muted)] opacity-40 mx-auto" />
          <h3 className="text-lg font-bold text-[var(--brand-text)]">No Batches Found</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
            No scheduled batches match your current search and filter criteria. You can request a custom schedule or inquire for the upcoming monthly intake.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link href="/contact">
              <Button variant="primary" className="btn-primary text-xs px-5 py-2">
                Inquire Upcoming Batches
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setModeFilter('ALL');
                setDayFilter('ALL');
                setBranchFilter('ALL');
              }}
              className="text-xs px-4"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredBatches.map((batch) => {
            const isOnline = batch.mode === 'ONLINE' || batch.mode === 'HYBRID';
            const isOffline = batch.mode === 'OFFLINE' || batch.mode === 'HYBRID';
            const seatsLeft = Math.max(0, batch.maxSeats - batch.enrolledCount);
            const courseSlug = batch.course?.slug || 'digital-marketing';

            return (
              <div
                key={batch.id}
                className="group relative rounded-3xl bg-[var(--bg-surface)] border border-[var(--brand-border)] hover:border-[#BE1E2E]/60 shadow-lg hover:shadow-2xl transition-all duration-300 p-6 flex flex-col justify-between space-y-5"
              >
                {/* Header info */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      {/* Mode Badge */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider ${
                          batch.mode === 'ONLINE'
                            ? 'bg-blue-500/10 text-blue-500 border border-blue-500/30'
                            : batch.mode === 'OFFLINE'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                            : 'bg-purple-500/10 text-purple-500 border border-purple-500/30'
                        }`}
                      >
                        {batch.mode === 'ONLINE' ? (
                          <Video className="w-3.5 h-3.5" />
                        ) : batch.mode === 'OFFLINE' ? (
                          <Building2 className="w-3.5 h-3.5" />
                        ) : (
                          <Laptop className="w-3.5 h-3.5" />
                        )}
                        {batch.mode === 'ONLINE'
                          ? 'Live Online (Zoom)'
                          : batch.mode === 'OFFLINE'
                          ? 'Classroom (Campus)'
                          : 'Hybrid Cohort'}
                      </span>

                      <h2 className="text-lg sm:text-xl font-black text-[var(--brand-text)] group-hover:text-[#BE1E2E] transition-colors">
                        {batch.name}
                      </h2>
                      {batch.course && (
                        <p className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-[#BE1E2E]" />
                          Course: <span className="text-[var(--brand-text)]">{batch.course.title}</span>
                        </p>
                      )}
                    </div>

                    <span className="px-2.5 py-1 rounded-lg bg-[var(--brand-background)] border border-[var(--brand-border)] text-[11px] font-mono font-bold text-[#BE1E2E] shrink-0">
                      {batch.batchCode}
                    </span>
                  </div>

                  {/* Schedule details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[var(--brand-background)]/70 p-3.5 rounded-2xl border border-[var(--brand-border)]">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Cohort Timing</span>
                      <div className="flex items-center gap-1.5 font-bold font-mono text-[var(--brand-text)]">
                        <Clock className="w-3.5 h-3.5 text-[#BE1E2E]" />
                        {batch.timing.startTime} - {batch.timing.endTime}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Batch Start Date</span>
                      <div className="flex items-center gap-1.5 font-bold font-mono text-[var(--brand-text)]">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        {new Date(batch.startDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </div>

                    <div className="space-y-1 sm:col-span-2 pt-1 border-t border-[var(--brand-border)]/50">
                      <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Weekly Schedule</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {batch.daysOfWeek.map((day) => (
                          <span
                            key={day}
                            className="px-2 py-0.5 rounded bg-[var(--bg-surface)] text-[10px] font-mono font-bold border border-[var(--brand-border)]"
                          >
                            {day}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Mode Specific Feature Box */}
                  {isOnline && (
                    <div className="p-3.5 rounded-2xl bg-blue-500/5 border border-blue-500/20 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-blue-600 dark:text-blue-400">
                          <Video className="w-4 h-4" />
                          <span>Live Interactive Zoom Sessions</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
                          Full HD Stream
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Real-time screen share, live doubt clearance, and recorded session backup available in your student LMS portal.
                      </p>
                      {batch.zoomDetails?.instructions && (
                        <p className="text-[10px] font-mono text-blue-600/80 dark:text-blue-400/80">
                          Note: {batch.zoomDetails.instructions}
                        </p>
                      )}
                    </div>
                  )}

                  {isOffline && batch.classroomDetails && (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
                        <MapPin className="w-4 h-4 shrink-0" />
                        <span>{batch.classroomDetails.branch || 'DIDM Campus Training Center'}</span>
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] pl-6">
                        {batch.classroomDetails.roomNumber && (
                          <span className="font-mono font-semibold text-[var(--brand-text)]">
                            {batch.classroomDetails.roomNumber} •{' '}
                          </span>
                        )}
                        {batch.classroomDetails.venueAddress}
                      </div>
                      {batch.classroomDetails.centerContact && (
                        <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 pl-6">
                          Center Helpdesk: {batch.classroomDetails.centerContact}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Instructor & Seats Left */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#BE1E2E]/10 border border-[#BE1E2E]/30 flex items-center justify-center font-bold text-[#BE1E2E] text-[10px]">
                        {batch.instructor?.name ? batch.instructor.name.charAt(0) : 'T'}
                      </div>
                      <div>
                        <div className="font-bold text-[var(--brand-text)] text-[11px]">
                          {batch.instructor?.name || 'Senior DIDM Faculty'}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)]">Lead Trainer</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          seatsLeft <= 5
                            ? 'bg-red-500/10 text-red-500 border border-red-500/30 animate-pulse'
                            : 'bg-slate-500/10 text-[var(--text-muted)] border border-[var(--brand-border)]'
                        }`}
                      >
                        <Users className="w-3 h-3" />
                        {seatsLeft > 0 ? `${seatsLeft} Seats Left` : 'Batch Full'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-[var(--brand-border)] flex items-center gap-3">
                  <Link href={`/courses/${courseSlug}`} className="flex-1">
                    <Button
                      variant="primary"
                      disabled={seatsLeft === 0}
                      className="btn-primary w-full text-xs py-2.5 flex items-center justify-center gap-1.5 shadow-md shadow-[#BE1E2E]/10"
                    >
                      <span>Enroll in this Batch</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  <Link href={`/courses/${courseSlug}`}>
                    <Button variant="outline" className="text-xs py-2.5 px-3">
                      View Syllabus
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom FAQ / Help Callout */}
      <div className="p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--brand-border)] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <h3 className="text-base sm:text-lg font-black text-[var(--brand-text)]">
            Need help selecting the right batch timing or campus?
          </h3>
          <p className="text-xs text-[var(--text-muted)] max-w-xl">
            Our academic counselors are available to assist you with weekend vs weekday timings, syllabus breakdown, fee structures, and campus walk-throughs.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/contact">
            <Button variant="primary" className="btn-primary text-xs px-6 py-2.5">
              Talk to a Counselor
            </Button>
          </Link>
          <Link href="/courses">
            <Button variant="outline" className="text-xs px-5 py-2.5">
              Browse All Courses
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
