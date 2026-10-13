'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ICourse, ICourseFilterQuery } from '@edtech/types';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@edtech/ui';
import { Plus, Search, Filter, BookOpen, ExternalLink, Image as ImageIcon, Trash2 } from 'lucide-react';
import { BackButton } from '@/components/navigation/BackButton';
import { useConfirmation } from '@/components/confirmation/useConfirmation';
import { CourseSkeleton } from '@/components/loading/SkeletonLoaders';

export default function AdminCoursesPage() {
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAuth();
  const { confirm } = useConfirmation();

  const canCreateCourse = hasPermission('course.create');
  const canUpdateCourse = hasPermission('course.update');
  const canArchiveCourse = hasPermission('course.archive');
  const canPublishCourse = hasPermission('course.publish');

  const [filter, setFilter] = useState<ICourseFilterQuery>({
    page: 1,
    limit: 10,
    search: '',
    status: undefined,
    visibility: undefined,
    level: undefined
  });

  const fetchCourses = async () => {
    const params = new URLSearchParams();
    if (filter.page) params.set('page', filter.page.toString());
    if (filter.limit) params.set('limit', filter.limit.toString());
    if (filter.search) params.set('search', filter.search);
    if (filter.status) params.set('status', filter.status);
    if (filter.visibility) params.set('visibility', filter.visibility);
    if (filter.level) params.set('level', filter.level);

    const res = await fetch(`/api/v1/courses?${params.toString()}`);
    if (res.status === 401 || res.status === 403) return { data: [], meta: { page: 1, totalPages: 1, total: 0 } };
    if (!res.ok) {
      throw new Error('Failed to fetch courses');
    }
    return res.json();
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-courses', filter],
    enabled: !!user,
    queryFn: fetchCourses
  });

  const publishMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const res = await fetch(`/api/v1/courses/${courseId}/publish`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to publish course');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      queryClient.invalidateQueries({ queryKey: ['public-courses'] });
      queryClient.invalidateQueries({ queryKey: ['public-featured-courses'] });
    }
  });

  const unpublishMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const res = await fetch(`/api/v1/courses/${courseId}/unpublish`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to unpublish course');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      queryClient.invalidateQueries({ queryKey: ['public-courses'] });
      queryClient.invalidateQueries({ queryKey: ['public-featured-courses'] });
    }
  });

  const archiveMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const res = await fetch(`/api/v1/courses/${courseId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        throw new Error('Failed to archive course');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      queryClient.invalidateQueries({ queryKey: ['public-courses'] });
      queryClient.invalidateQueries({ queryKey: ['public-featured-courses'] });
    }
  });

  const courses: ICourse[] = data?.data || [];
  const meta = data?.meta || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)] p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <BackButton fallback="/admin" />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--brand-border)] pb-6">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#BE1E2E] bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
            Course Management
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--brand-text)] mt-2">
            Workspace Courses
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Manage course catalog, curriculum modules, and readiness state.
          </p>
        </div>

        {canCreateCourse && (
          <Link href="/admin/courses/create">
            <Button variant="primary" className="btn-primary text-xs shadow-lg shadow-[#BE1E2E]/20">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Course
            </Button>
          </Link>
        )}
      </div>

      {/* Filter Controls Bar */}
      <div className="glass-card p-4 rounded-xl flex flex-wrap items-center gap-4 border border-[var(--brand-border)]">
        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search courses by title..."
            value={filter.search || ''}
            onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] text-xs"
          />
        </div>

        {/* Level Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <select
            value={filter.level || ''}
            onChange={(e) => setFilter((prev) => ({ ...prev, level: (e.target.value as any) || undefined, page: 1 }))}
            className="px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--brand-border)] text-xs font-mono"
          >
            <option value="">All Levels</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
            <option value="ALL_LEVELS">All Levels</option>
          </select>
        </div>

        {/* Status Filter */}
        <select
          value={filter.status || ''}
          onChange={(e) => setFilter((prev) => ({ ...prev, status: (e.target.value as any) || undefined, page: 1 }))}
          className="px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--brand-border)] text-xs font-mono"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {/* Course Table / Grid */}
      {isLoading ? (
        <CourseSkeleton />
      ) : isError ? (
        <div className="glass-card p-8 border-red-500/30 text-red-500 text-center text-xs">
          <p className="font-bold">Error loading course catalog</p>
          <p className="text-[11px] font-mono mt-1">{(error as any)?.message}</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3 rounded-2xl border border-[var(--brand-border)]">
          <p className="text-base font-semibold text-[var(--brand-text)]">No courses found in catalog</p>
          <p className="text-xs text-[var(--text-muted)]">Create your first course to populate the DIDM LMS workspace.</p>
          {canCreateCourse && (
            <Link href="/admin/courses/create">
              <Button variant="primary" className="btn-primary text-xs mt-2">
                + Create Course
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden shadow-lg border border-[var(--brand-border)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] border-b border-[var(--brand-border)] uppercase text-[10px] tracking-wider font-mono">
                <tr>
                  <th className="py-3.5 px-4">Course</th>
                  <th className="py-3.5 px-4">Level</th>
                  <th className="py-3.5 px-4">Visibility</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--brand-border)]">
                {courses.map((course) => (
                  <tr key={course.id || (course as any)._id} className="hover:bg-[var(--bg-surface-elevated)]/50 transition-colors">
                    <td className="py-4 px-4 font-medium max-w-[340px]">
                      <div className="flex items-center gap-3">
                        {course.thumbnailUrl ? (
                          <img
                            src={course.thumbnailUrl}
                            alt=""
                            className="w-12 h-9 object-cover rounded-lg border border-[var(--brand-border)] flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-9 rounded-lg bg-[var(--bg-surface)] border border-[var(--brand-border)] flex items-center justify-center flex-shrink-0 text-[var(--text-muted)]">
                            <BookOpen className="w-4 h-4 text-[#BE1E2E]" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="block text-[var(--brand-text)] font-bold text-sm truncate">{course.title}</span>
                          <span className="block text-[10px] font-mono text-[var(--text-muted)] truncate">/{course.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--brand-border)] font-semibold">
                        {course.level}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono text-[11px]">
                      <span className="px-2.5 py-0.5 rounded-full font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        {course.visibility}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono text-[10px]">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold ${
                          course.status === 'PUBLISHED'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : course.status === 'UNDER_REVIEW'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : course.status === 'ARCHIVED'
                            ? 'bg-[var(--badge-bg)] text-[var(--text-muted)]'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {course.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-[11px] text-[var(--text-muted)] font-mono">
                      {new Date(course.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-right space-x-2">
                      <Link href={`/admin/courses/${course.id || (course as any)._id}`}>
                        <button className="px-2.5 py-1 text-[11px] font-semibold text-[var(--brand-text)] hover:underline">
                          View
                        </button>
                      </Link>
                      <Link href={`/admin/courses/${course.id || (course as any)._id}/curriculum`}>
                        <button className="px-2.5 py-1 text-[11px] font-bold text-[#BE1E2E] hover:underline">
                          Curriculum
                        </button>
                      </Link>
                      <Link href={`/admin/courses/${course.id || (course as any)._id}/students`}>
                        <button className="px-2.5 py-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline">
                          Students
                        </button>
                      </Link>
                      {canUpdateCourse && (
                        <Link href={`/admin/courses/${course.id || (course as any)._id}/edit`}>
                          <button className="px-2.5 py-1 text-[11px] font-semibold text-[var(--brand-text)] hover:underline">
                            Edit
                          </button>
                        </Link>
                      )}
                      {canPublishCourse && course.status !== 'PUBLISHED' && course.status !== 'ARCHIVED' && (
                        <button
                          disabled={publishMutation.isPending}
                          onClick={async () => {
                            await confirm({
                              title: 'Publish this course?',
                              description: 'Once published, this course will become active and available according to its visibility settings.',
                              resourceName: course.title,
                              type: 'primary',
                              confirmText: 'Publish Course',
                              cancelText: 'Cancel',
                              onConfirm: async () => {
                                await publishMutation.mutateAsync(course.id || (course as any)._id);
                              }
                            });
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50"
                        >
                          {publishMutation.isPending ? 'Publishing...' : 'Publish'}
                        </button>
                      )}
                      {canPublishCourse && course.status === 'PUBLISHED' && (
                        <button
                          disabled={unpublishMutation.isPending}
                          onClick={async () => {
                            await confirm({
                              title: 'Unpublish this course?',
                              description: 'The course will be reverted back to Draft status and hidden from the public website.',
                              resourceName: course.title,
                              type: 'warning',
                              confirmText: 'Unpublish Course',
                              cancelText: 'Cancel',
                              onConfirm: async () => {
                                await unpublishMutation.mutateAsync(course.id || (course as any)._id);
                              }
                            });
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-amber-600 hover:underline disabled:opacity-50"
                        >
                          Unpublish
                        </button>
                      )}
                      {canArchiveCourse && course.status !== 'ARCHIVED' && (
                        <button
                          onClick={async () => {
                            await confirm({
                              title: 'Archive this course?',
                              description: 'The course will be removed from active management. Its data will be preserved and can be restored later.',
                              resourceName: course.title,
                              type: 'danger',
                              confirmText: 'Yes, Archive Course',
                              cancelText: 'Cancel',
                              onConfirm: async () => {
                                await archiveMutation.mutateAsync(course.id || (course as any)._id);
                              }
                            });
                          }}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Archive Course"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-[var(--brand-border)] flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
            <span>
              Showing Page {meta.page} of {meta.totalPages} ({meta.total} Total Courses)
            </span>
            <div className="space-x-2">
              <button
                disabled={filter.page === 1}
                onClick={() => setFilter((prev) => ({ ...prev, page: (prev.page || 1) - 1 }))}
                className="px-3 py-1.5 rounded bg-[var(--bg-surface)] border border-[var(--brand-border)] disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={filter.page! >= meta.totalPages}
                onClick={() => setFilter((prev) => ({ ...prev, page: (prev.page || 1) + 1 }))}
                className="px-3 py-1.5 rounded bg-[var(--bg-surface)] border border-[var(--brand-border)] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
