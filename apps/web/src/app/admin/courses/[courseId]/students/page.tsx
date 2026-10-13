'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@edtech/ui';
import {
  Users,
  Search,
  Filter,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  ShieldAlert
} from 'lucide-react';

import { BackButton } from '@/components/navigation/BackButton';

export default function AdminCourseStudentsPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');

  // Fetch Course Detail
  const { data: course } = useQuery({
    queryKey: ['admin-course-detail', courseId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/courses/${courseId}`);
      if (!res.ok) throw new Error('Course not found');
      const json = await res.json();
      return json.data;
    }
  });

  // Fetch Course Enrollments (Admin View)
  const { data: enrollmentsData, isLoading, isError, error } = useQuery({
    queryKey: ['admin-course-enrollments', courseId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/courses/${courseId}/enrollments`);
      if (!res.ok) throw new Error('Failed to fetch course enrollments');
      const json = await res.json();
      return json.data || [];
    }
  });

  // Cancel Enrollment Mutation
  const cancelMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const res = await fetch(`/api/v1/courses/${courseId}/enrollments/${enrollmentId}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to cancel enrollment');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course-enrollments', courseId] });
    }
  });

  const enrollments = enrollmentsData || [];

  const filtered = enrollments.filter((e: any) => {
    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
    const matchesSearch =
      !search ||
      e.student?.name?.toLowerCase().includes(search.toLowerCase()) ||
      e.student?.email?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-6">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <BackButton fallback={`/admin/courses/${courseId}`} />
        <span className="text-xs font-mono text-[var(--text-muted)]">Course ID: {courseId}</span>
      </div>

      {/* Header */}
      <div className="border-b border-[var(--brand-border)] pb-6 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#BE1E2E] bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
            Student Management
          </span>
          <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Tenant Scope</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--brand-text)]">
          {course?.title ? `Enrolled Students — ${course.title}` : 'Course Enrolled Students'}
        </h1>
        <p className="text-xs text-[var(--text-muted)]">
          View enrolled learners, monitor progress percentages, and manage student access.
        </p>
      </div>

      {/* Filter Controls Bar */}
      <div className="glass-card p-4 rounded-xl flex flex-wrap items-center gap-4 border border-[var(--brand-border)]">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search student by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--brand-border)] text-xs text-[var(--brand-text)]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--brand-border)] text-xs font-mono text-[var(--brand-text)]"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Enrollments Table / List */}
      {isLoading ? (
        <div className="glass-card p-12 text-center text-xs font-mono text-[var(--text-muted)]">
          Loading student enrollments...
        </div>
      ) : isError ? (
        <div className="glass-card p-8 text-center text-xs text-red-500 font-mono border border-red-500/30">
          {(error as any)?.message || 'Failed to load course enrollments'}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-10 rounded-2xl border border-[var(--brand-border)] text-center space-y-2">
          <UserCheck className="w-8 h-8 mx-auto text-[var(--text-muted)]" />
          <h3 className="text-sm font-extrabold text-[var(--brand-text)]">No student enrollments found</h3>
          <p className="text-xs text-[var(--text-muted)]">No students have enrolled in this course matching your search parameters.</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-[var(--brand-border)] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-surface-elevated)] border-b border-[var(--brand-border)] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                <tr>
                  <th className="p-4">Student</th>
                  <th className="p-4">Enrolled Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Progress</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--brand-border)]">
                {filtered.map((item: any) => (
                  <tr key={item.id} className="hover:bg-[var(--bg-surface-elevated)]/40 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-[var(--brand-text)]">{item.student?.name || 'Student'}</div>
                      <div className="text-[10px] font-mono text-[var(--text-muted)]">{item.student?.email}</div>
                    </td>

                    <td className="p-4 font-mono text-[var(--text-muted)]">
                      {new Date(item.enrolledAt).toLocaleDateString()}
                    </td>

                    <td className="p-4 font-mono">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : item.status === 'ACTIVE'
                            ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                            : 'bg-red-500/10 text-red-500 border-red-500/20'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="space-y-1 max-w-[140px]">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span>{item.progressPercent}%</span>
                          <span className="text-[var(--text-muted)]">
                            {item.completedLessons}/{item.totalLessons}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[var(--bg-surface-elevated)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#BE1E2E] rounded-full"
                            style={{ width: `${item.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="p-4 text-right">
                      {item.status !== 'CANCELLED' && (
                        <button
                          disabled={cancelMutation.isPending}
                          onClick={() => cancelMutation.mutate(item.id)}
                          className="px-3 py-1.5 rounded-lg border border-red-500/20 text-red-500 text-xs font-semibold hover:bg-red-500/10 transition-colors"
                        >
                          Cancel Access
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
