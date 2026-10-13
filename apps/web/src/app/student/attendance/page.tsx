'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Calendar,
  Search,
  Filter,
  TrendingUp,
  ShieldCheck,
  ArrowUpRight,
  Sparkles,
  Info,
  ChevronRight,
  BookOpen,
  Laptop,
  Building,
  RefreshCw,
  Award
} from 'lucide-react';

interface AttendanceSummary {
  totalFinalizedEligibleSessions: number;
  attended: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendancePercentage: number | null;
}

interface AttendanceRecord {
  _id: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';
  markedAt?: string;
  session?: {
    _id: string;
    sessionDate?: string;
    scheduledSnapshot?: {
      name?: string;
      mode?: string;
      startDate?: string;
      startTime?: string;
      endTime?: string;
      branch?: string;
      timezone?: string;
    };
  };
}

export default function StudentAttendancePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const summaryQuery = useQuery<AttendanceSummary>({
    queryKey: ['student-attendance-summary'],
    queryFn: async () => {
      const res = await fetch('/api/v1/student/attendance/summary', { credentials: 'include' });
      if (!res.ok) throw new Error('Unable to load attendance summary');
      const json = await res.json();
      return json.data;
    }
  });

  const historyQuery = useQuery<{ data: AttendanceRecord[] }>({
    queryKey: ['student-attendance-history'],
    queryFn: async () => {
      const res = await fetch('/api/v1/student/attendance/history?limit=100', { credentials: 'include' });
      if (!res.ok) throw new Error('Unable to load attendance history');
      const json = await res.json();
      return json.data;
    }
  });

  const summary = summaryQuery.data;
  const rawHistory = useMemo(() => historyQuery.data?.data || [], [historyQuery.data?.data]);

  // Filtered & Sorted History
  const filteredHistory = useMemo(() => {
    return rawHistory
      .filter((rec) => {
        const matchesStatus = statusFilter === 'ALL' || rec.status === statusFilter;
        const className = rec.session?.scheduledSnapshot?.name?.toLowerCase() || '';
        const matchesSearch = className.includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        const dateA = new Date(a.session?.sessionDate || a.markedAt || 0).getTime();
        const dateB = new Date(b.session?.sessionDate || b.markedAt || 0).getTime();
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
      });
  }, [rawHistory, statusFilter, searchTerm, sortOrder]);

  const percentage = summary?.attendancePercentage ?? 0;
  const isEligible = percentage >= 75;
  const isExcellent = percentage >= 85;

  if (summaryQuery.isLoading || historyQuery.isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-zinc-500">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-indigo-200 dark:border-indigo-950 border-t-indigo-600 animate-spin" />
          <ClipboardCheck className="w-6 h-6 text-indigo-600 absolute inset-0 m-auto" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Loading Attendance Portal</p>
          <p className="text-xs text-zinc-500 mt-0.5">Fetching verified session registers and performance analytics...</p>
        </div>
      </div>
    );
  }

  if (summaryQuery.isError || !summary) {
    return (
      <div className="p-8 max-w-2xl mx-auto my-12 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto" />
        <h3 className="text-lg font-bold text-rose-900 dark:text-rose-200">Unable to Load Attendance Record</h3>
        <p className="text-xs text-rose-700 dark:text-rose-400">
          {(summaryQuery.error as Error)?.message || 'There was an error communicating with the attendance service.'}
        </p>
        <button
          onClick={() => {
            summaryQuery.refetch();
            historyQuery.refetch();
          }}
          className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Try Again
        </button>
      </div>
    );
  }

  // SVG Gauge calculations
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* 1. Header Banner with Overview */}
      <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-zinc-800/80">
        <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/2 -top-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-zinc-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Verified Institutional Attendance Ledger</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              My Attendance & Academic Tracking
            </h1>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Track your presence across lecture sessions, interactive workshops, and masterclasses. A minimum of{' '}
              <strong className="text-amber-300 font-semibold">75% attendance</strong> is required to maintain exam eligibility and receive your accredited certificate.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-semibold text-xs border ${
                  isEligible
                    ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                    : 'bg-rose-500/20 border-rose-400/40 text-rose-300'
                }`}
              >
                {isEligible ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                <span>
                  {isEligible
                    ? isExcellent
                      ? 'Exemplary Attendance Standing'
                      : 'Certificate Eligibility: On Track'
                    : 'Attendance At Risk (< 75%)'}
                </span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-300 font-medium">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>{summary.totalFinalizedEligibleSessions} Total Finalized Sessions</span>
              </div>
            </div>
          </div>

          {/* Radial Donut Gauge */}
          <div className="flex items-center justify-center sm:justify-start lg:justify-end gap-6 bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shrink-0">
            <div className="relative flex items-center justify-center">
              <svg className="w-36 h-36 transform -rotate-90">
                {/* Background Track */}
                <circle
                  cx="72"
                  cy="72"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="10"
                  className="text-white/10"
                  fill="transparent"
                />
                {/* 75% Requirement Marker (dash line at 75%) */}
                <circle
                  cx="72"
                  cy="72"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeDasharray="2 6"
                  className="text-amber-400/50"
                  fill="transparent"
                />
                {/* Active Progress Circle */}
                <circle
                  cx="72"
                  cy="72"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className={`${
                    isExcellent
                      ? 'text-emerald-400'
                      : isEligible
                      ? 'text-indigo-400'
                      : 'text-rose-400'
                  } transition-all duration-1000 ease-out`}
                  fill="transparent"
                />
              </svg>

              {/* Inner Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black tracking-tight text-white">{percentage}%</span>
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Attendance</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-zinc-300">Your Score: <strong className="text-white font-bold">{percentage}%</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-zinc-300">Target Min: <strong className="text-white font-bold">75.0%</strong></span>
              </div>
              <div className="pt-1 text-[11px] text-zinc-400">
                {isEligible ? (
                  <span className="text-emerald-300 font-medium flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5" /> +{(percentage - 75).toFixed(1)}% Safe Buffer
                  </span>
                ) : (
                  <span className="text-rose-300 font-medium">
                    Need {(75 - percentage).toFixed(1)}% more to qualify
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
        {/* Present Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Present</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-zinc-900 dark:text-zinc-100">{summary.present}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-1.5">classes</span>
          </div>
          <div className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {summary.totalFinalizedEligibleSessions > 0
              ? `${Math.round((summary.present / summary.totalFinalizedEligibleSessions) * 100)}% of total`
              : '0%'}
          </div>
        </div>

        {/* Late Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Late (Attended)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-zinc-900 dark:text-zinc-100">{summary.late}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-1.5">classes</span>
          </div>
          <div className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
            Credited to total presence
          </div>
        </div>

        {/* Absent Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Absent</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-zinc-900 dark:text-zinc-100">{summary.absent}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-1.5">classes</span>
          </div>
          <div className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
            Unexcused absences
          </div>
        </div>

        {/* Excused Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Excused Leave</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-zinc-900 dark:text-zinc-100">{summary.excused}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-1.5">classes</span>
          </div>
          <div className="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
            Approved exemptions
          </div>
        </div>

        {/* Total Attended Card */}
        <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-indigo-50 to-indigo-100/60 dark:from-indigo-950/40 dark:to-indigo-900/20 border border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300">Total Attended</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-indigo-950 dark:text-indigo-100">{summary.attended}</span>
            <span className="text-xs text-indigo-700 dark:text-indigo-300 ml-1.5">/ {summary.totalFinalizedEligibleSessions}</span>
          </div>
          <div className="mt-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
            {summary.attended} of {summary.totalFinalizedEligibleSessions} held sessions
          </div>
        </div>
      </div>

      {/* 3. Visual Breakdown & Progress Distribution Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Attendance Ratio & Policy Benchmark
            </h3>
            <p className="text-xs text-zinc-500">
              Visual composition of all finalized academic registers. Minimum threshold: 75% required.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">
            {summary.attended} Attended • {summary.absent} Absent • {summary.totalFinalizedEligibleSessions} Total
          </span>
        </div>

        {/* Multi-Segment Color Bar */}
        <div className="w-full h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex shadow-inner">
          {summary.present > 0 && (
            <div
              style={{ width: `${(summary.present / (summary.totalFinalizedEligibleSessions || 1)) * 100}%` }}
              className="bg-emerald-500 hover:bg-emerald-400 transition-all duration-500 cursor-pointer"
              title={`Present: ${summary.present}`}
            />
          )}
          {summary.late > 0 && (
            <div
              style={{ width: `${(summary.late / (summary.totalFinalizedEligibleSessions || 1)) * 100}%` }}
              className="bg-amber-500 hover:bg-amber-400 transition-all duration-500 cursor-pointer"
              title={`Late: ${summary.late}`}
            />
          )}
          {summary.absent > 0 && (
            <div
              style={{ width: `${(summary.absent / (summary.totalFinalizedEligibleSessions || 1)) * 100}%` }}
              className="bg-rose-500 hover:bg-rose-400 transition-all duration-500 cursor-pointer"
              title={`Absent: ${summary.absent}`}
            />
          )}
          {summary.excused > 0 && (
            <div
              style={{ width: `${(summary.excused / (summary.totalFinalizedEligibleSessions || 1)) * 100}%` }}
              className="bg-indigo-500 hover:bg-indigo-400 transition-all duration-500 cursor-pointer"
              title={`Excused: ${summary.excused}`}
            />
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1 text-xs text-zinc-600 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/80">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Present: <strong>{summary.present}</strong> ({Math.round((summary.present / (summary.totalFinalizedEligibleSessions || 1)) * 100)}%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span>Late: <strong>{summary.late}</strong> ({Math.round((summary.late / (summary.totalFinalizedEligibleSessions || 1)) * 100)}%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span>Absent: <strong>{summary.absent}</strong> ({Math.round((summary.absent / (summary.totalFinalizedEligibleSessions || 1)) * 100)}%)</span>
            </span>
            {summary.excused > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-indigo-500" />
                <span>Excused: <strong>{summary.excused}</strong></span>
              </span>
            )}
          </div>

          <div className="text-xs font-semibold text-zinc-500">
            DIDM Academic Compliance: <span className={isEligible ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}>{isEligible ? 'PASSED (>= 75%)' : 'ACTION REQUIRED'}</span>
          </div>
        </div>
      </div>

      {/* 4. Session History Log Table with Search & Filters */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden space-y-0">
        {/* Table Controls */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Session Attendance History</h3>
            <p className="text-xs text-zinc-500">Detailed logs of all past finalized class meetings and lab sessions.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search class name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center bg-zinc-200/70 dark:bg-zinc-800 p-0.5 rounded-xl text-xs font-medium">
              {(['ALL', 'PRESENT', 'LATE', 'ABSENT'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    statusFilter === tab
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-bold shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {tab === 'ALL' ? `All (${rawHistory.length})` : tab}
                </button>
              ))}
            </div>

            {/* Sort Toggle */}
            <button
              onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
            >
              <Filter className="w-3.5 h-3.5 text-zinc-500" />
              <span>{sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
            </button>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-950/40 text-zinc-500 font-bold uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="py-3.5 px-5">Session & Topic</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Delivery Mode</th>
                <th className="py-3.5 px-4">Campus / Branch</th>
                <th className="py-3.5 px-5 text-right">Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
              {filteredHistory.map((row, idx) => {
                const sessionDate = row.session?.sessionDate ? new Date(row.session.sessionDate) : null;
                const snapshot = row.session?.scheduledSnapshot;
                const isOnline = snapshot?.mode === 'ONLINE';
                const isHybrid = snapshot?.mode === 'HYBRID';

                return (
                  <tr
                    key={row._id || idx}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    {/* Class Name */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 font-bold text-xs border border-indigo-100 dark:border-indigo-900/50">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                            {snapshot?.name || 'Practical Workshop Session'}
                          </div>
                          <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-indigo-600 dark:text-indigo-400">DIDM-CLS</span>
                            <span>•</span>
                            <span>Scheduled 2-Hour Practical</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Date & Time */}
                    <td className="py-4 px-4 text-zinc-600 dark:text-zinc-300">
                      <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {sessionDate
                          ? sessionDate.toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : '—'}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        {snapshot?.startTime || '10:00'} - {snapshot?.endTime || '12:00'} ({snapshot?.timezone || 'IST'})
                      </div>
                    </td>

                    {/* Mode */}
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold border border-zinc-200 dark:border-zinc-700/60">
                        {isOnline ? (
                          <Laptop className="w-3 h-3 text-sky-500" />
                        ) : isHybrid ? (
                          <Sparkles className="w-3 h-3 text-purple-500" />
                        ) : (
                          <Building className="w-3 h-3 text-emerald-500" />
                        )}
                        <span>{snapshot?.mode || 'OFFLINE'}</span>
                      </span>
                    </td>

                    {/* Branch */}
                    <td className="py-4 px-4 text-zinc-600 dark:text-zinc-400 font-medium">
                      {snapshot?.branch || 'Main Campus — New Delhi'}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-5 text-right">
                      {row.status === 'PRESENT' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Present</span>
                        </span>
                      )}
                      {row.status === 'LATE' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Late</span>
                        </span>
                      )}
                      {row.status === 'ABSENT' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Absent</span>
                        </span>
                      )}
                      {row.status === 'EXCUSED' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Excused</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredHistory.length === 0 && (
            <div className="py-16 text-center space-y-2">
              <ClipboardCheck className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No session records match the filter</p>
              <p className="text-xs text-zinc-500">Try changing the status tab or search query above.</p>
            </div>
          )}
        </div>
      </div>

      {/* 5. Policy Card */}
      <div className="bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
            <Info className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">DIDM Academic Attendance Guidelines</h4>
            <p className="text-xs text-indigo-900/80 dark:text-indigo-300/80 leading-relaxed max-w-3xl">
              Attendance records are finalized by your batch mentors following every live masterclass and practical lab. If you have any discrepancy or wish to submit medical/authorized leave documentation, please reach out to academic support via the communication inbox.
            </p>
          </div>
        </div>

        <a
          href="/student/inbox"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-indigo-900 dark:text-indigo-200 rounded-xl text-xs font-bold shadow-xs border border-indigo-200/60 dark:border-indigo-800/60 shrink-0 transition"
        >
          <span>Contact Mentor</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
