'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Search,
  BookOpen,
  Calendar,
  GraduationCap,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

interface StudentItem {
  studentUserId: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  studentNumber?: string;
  academicStatus?: string;
  batch?: {
    id: string;
    name: string;
    batchCode?: string;
    mode?: string;
    status?: string;
  } | null;
  course?: {
    id: string;
    title: string;
    slug?: string;
  } | null;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  enrollmentStatus?: string;
}

interface StudentsResponse {
  data: StudentItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function InstructorStudentsPage() {
  const [search, setSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const limit = 15;

  // 1. Fetch instructor batches for the filter dropdown
  const batchesQuery = useQuery({
    queryKey: ['instructor-batches-list'],
    queryFn: async () => {
      const res = await fetch('/api/v1/instructor/batches?limit=50');
      if (!res.ok) return [];
      const json = await res.json();
      const payload = json.data;
      return (Array.isArray(payload) ? payload : payload?.data || payload?.items || []) as Array<{ _id: string; name: string; batchCode?: string }>;
    },
  });

  // 2. Fetch instructor-scoped students
  const studentsQuery = useQuery<StudentsResponse>({
    queryKey: ['instructor-students', page, search, selectedBatch, selectedStatus],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search.trim()) params.set('search', search.trim());
      if (selectedBatch !== 'ALL') params.set('batchId', selectedBatch);
      if (selectedStatus !== 'ALL') params.set('status', selectedStatus);

      const res = await fetch(`/api/v1/instructor/students?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to load instructor students roster');
      }
      const json = await res.json();
      return json.data;
    },
  });

  const students = useMemo(() => studentsQuery.data?.data || [], [studentsQuery.data?.data]);
  const pagination = studentsQuery.data?.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 };
  const batches = batchesQuery.data || [];

  // Summary counts
  const activeCount = useMemo(() => {
    return students.filter((s) => s.academicStatus === 'ACTIVE').length;
  }, [students]);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ──────────────── Header ──────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Enrolled Students
              </h1>
              <p className="text-xs text-muted-foreground">
                Students assigned to your batches, live classes, and courses.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold shadow-xs">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span>{pagination.total} Total Students</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold shadow-xs">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{activeCount} Active</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold shadow-xs">
            <Layers className="h-3.5 w-3.5 text-primary" />
            <span>{batches.length} Batches</span>
          </div>
        </div>
      </div>

      {/* ──────────────── Filters & Search Toolbar ──────────────── */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by student name or student ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 shadow-xs"
            />
          </div>

          {/* Batch Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <select
                aria-label="Filter by batch"
                value={selectedBatch}
                onChange={(e) => {
                  setSelectedBatch(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none shadow-xs"
              >
                <option value="ALL">All Batches ({batches.length})</option>
                {batches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name} {b.batchCode ? `(${b.batchCode})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Academic Status Selector */}
            <div className="relative">
              <select
                aria-label="Filter by academic status"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none shadow-xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
                <option value="DROPPED">Dropped</option>
                <option value="WITHDRAWN">Withdrawn</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────── Students Table ──────────────── */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        {studentsQuery.isLoading ? (
          <div className="p-12 text-center space-y-3">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-muted-foreground font-medium">Loading assigned student roster...</p>
          </div>
        ) : studentsQuery.error ? (
          <div className="p-8 text-center space-y-2 text-destructive">
            <AlertCircle className="h-8 w-8 mx-auto" />
            <h3 className="font-bold text-sm">Failed to load students</h3>
            <p className="text-xs text-muted-foreground">
              {(studentsQuery.error as Error).message || 'Unable to retrieve roster.'}
            </p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No Students Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No students match your active filters in your teaching roster.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Batch</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {students.map((student) => {
                  const statusColors =
                    student.academicStatus === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : student.academicStatus === 'ON_HOLD'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      : student.academicStatus === 'COMPLETED'
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                      : 'bg-muted text-muted-foreground border-border';

                  return (
                    <tr
                      key={student.studentUserId || student.studentNumber}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs border border-primary/20 flex-shrink-0">
                            {student.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-foreground block truncate">
                              {student.displayName}
                            </span>
                            {student.email && (
                              <span className="text-[11px] text-muted-foreground block truncate">
                                {student.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Student Number */}
                      <td className="py-3 px-4 font-mono font-medium text-muted-foreground">
                        {student.studentNumber || '—'}
                      </td>

                      {/* Batch */}
                      <td className="py-3 px-4">
                        {student.batch ? (
                          <div>
                            <span className="font-semibold text-foreground block truncate max-w-[180px]">
                              {student.batch.name}
                            </span>
                            {student.batch.batchCode && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {student.batch.batchCode}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Unassigned</span>
                        )}
                      </td>

                      {/* Course */}
                      <td className="py-3 px-4">
                        {student.course ? (
                          <span className="font-medium text-foreground truncate block max-w-[180px]">
                            {student.course.title}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </td>

                      {/* Progress Bar */}
                      <td className="py-3 px-4">
                        <div className="w-28 space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="font-bold text-foreground">
                              {student.progressPercent}%
                            </span>
                            {student.totalLessons > 0 && (
                              <span className="text-muted-foreground">
                                {student.completedLessons}/{student.totalLessons}
                              </span>
                            )}
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-primary h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, student.progressPercent))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusColors}`}
                        >
                          {student.academicStatus || 'UNKNOWN'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        {student.studentUserId ? (
                          <Link
                            href={`/instructor/students/${student.studentUserId}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted text-foreground transition-colors shadow-2xs"
                          >
                            <span>Profile</span>
                            <ExternalLink className="h-3 w-3 opacity-60" />
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ──────────────── Pagination Bar ──────────────── */}
        {pagination.totalPages > 1 && (
          <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <div>
              Showing page <span className="font-bold text-foreground">{pagination.page}</span> of{' '}
              <span className="font-bold text-foreground">{pagination.totalPages}</span> (
              {pagination.total} students)
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-foreground transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-foreground transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
