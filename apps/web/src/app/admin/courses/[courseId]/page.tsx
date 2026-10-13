'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ICourseModule, ICourse } from '@edtech/types';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@edtech/ui';
import { BackButton } from '@/components/navigation/BackButton';
import { useConfirmation } from '@/components/confirmation/useConfirmation';
import { CheckCircle2, XCircle, Send, Globe, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';

interface ReadinessError {
  code: string;
  message: string;
  field?: string;
  location?: {
    courseId?: string;
    moduleId?: string;
    lessonId?: string;
  };
}

interface ReadinessData {
  ready: boolean;
  errors: ReadinessError[];
  warnings: string[];
}

export default function AdminCourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const { confirm } = useConfirmation();

  const canUpdateCourse = hasPermission('course.update');
  const canManageModules = hasPermission('course.module.create') || hasPermission('course.module.update');
  const canArchiveModule = hasPermission('course.module.archive');
  const canSubmitReview = hasPermission('course.submit_review');
  const canPublishCourse = hasPermission('course.publish');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<ICourseModule | null>(null);
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleDescription, setModuleDescription] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Fetch Course Metadata
  const { data: course, isLoading: isCourseLoading } = useQuery({
    queryKey: ['admin-course-detail', courseId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/courses/${courseId}`);
      if (!res.ok) throw new Error('Course not found');
      const json = await res.json();
      return json.data as ICourse;
    }
  });

  // 2. Fetch Readiness Validation Status
  const { data: readinessData, isLoading: isReadinessLoading } = useQuery({
    queryKey: ['admin-course-readiness', courseId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/courses/${courseId}/readiness`);
      if (!res.ok) throw new Error('Failed to fetch course readiness status');
      const json = await res.json();
      return json.data as ReadinessData;
    }
  });

  // 3. Fetch Active Course Modules
  const { data: modulesData, isLoading: isModulesLoading } = useQuery({
    queryKey: ['admin-course-modules', courseId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/courses/${courseId}/modules`);
      if (!res.ok) throw new Error('Failed to fetch modules');
      const json = await res.json();
      return json.data as ICourseModule[];
    }
  });

  const modules: ICourseModule[] = modulesData || [];

  // Publishing State Transitions
  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/courses/${courseId}/submit-review`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to submit course for review');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course-detail', courseId] });
      queryClient.invalidateQueries({ queryKey: ['admin-course-readiness', courseId] });
    },
    onError: (err: any) => setErrorMessage(err.message)
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/courses/${courseId}/publish`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to publish course');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course-detail', courseId] });
      queryClient.invalidateQueries({ queryKey: ['admin-course-readiness', courseId] });
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      queryClient.invalidateQueries({ queryKey: ['public-courses'] });
      queryClient.invalidateQueries({ queryKey: ['public-featured-courses'] });
    },
    onError: (err: any) => setErrorMessage(err.message)
  });

  const unpublishMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/courses/${courseId}/unpublish`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to unpublish course');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course-detail', courseId] });
      queryClient.invalidateQueries({ queryKey: ['admin-course-readiness', courseId] });
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      queryClient.invalidateQueries({ queryKey: ['public-courses'] });
      queryClient.invalidateQueries({ queryKey: ['public-featured-courses'] });
    },
    onError: (err: any) => setErrorMessage(err.message)
  });

  // Create / Edit Module Mutation
  const saveModuleMutation = useMutation({
    mutationFn: async () => {
      const payload = { title: moduleTitle, description: moduleDescription };
      const url = editingModule
        ? `/api/v1/courses/${courseId}/modules/${editingModule.id || (editingModule as any)._id}`
        : `/api/v1/courses/${courseId}/modules`;
      const method = editingModule ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to save module');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course-modules', courseId] });
      queryClient.invalidateQueries({ queryKey: ['admin-course-readiness', courseId] });
      closeModal();
    },
    onError: (err: any) => setErrorMessage(err.message)
  });

  // Archive Module Mutation
  const archiveModuleMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      const res = await fetch(`/api/v1/courses/${courseId}/modules/${moduleId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to archive module');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course-modules', courseId] });
      queryClient.invalidateQueries({ queryKey: ['admin-course-readiness', courseId] });
    }
  });

  // Reorder Modules Mutation
  const reorderMutation = useMutation({
    mutationFn: async (newModuleIds: string[]) => {
      const res = await fetch(`/api/v1/courses/${courseId}/modules/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleIds: newModuleIds })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to reorder modules');
      return json.data;
    },
    onMutate: async (newModuleIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: ['admin-course-modules', courseId] });
      const previousModules = queryClient.getQueryData<ICourseModule[]>(['admin-course-modules', courseId]);

      if (previousModules) {
        const idToModule = new Map(previousModules.map((m) => [m.id || (m as any)._id, m]));
        const optimistic = newModuleIds
          .map((id, idx) => {
            const m = idToModule.get(id);
            return m ? { ...m, order: idx + 1 } : null;
          })
          .filter(Boolean) as ICourseModule[];

        queryClient.setQueryData(['admin-course-modules', courseId], optimistic);
      }

      return { previousModules };
    },
    onError: (err: any, _newIds, context) => {
      if (context?.previousModules) {
        queryClient.setQueryData(['admin-course-modules', courseId], context.previousModules);
      }
      setErrorMessage(err.message || 'Your changes could not be saved. The previous order has been restored.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course-modules', courseId] });
    }
  });

  const handleMove = (index: number, direction: 'UP' | 'DOWN') => {
    const newIdx = direction === 'UP' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= modules.length) return;

    const ids = modules.map((m) => m.id || (m as any)._id);
    const temp = ids[index];
    ids[index] = ids[newIdx];
    ids[newIdx] = temp;

    reorderMutation.mutate(ids);
  };

  const openCreateModal = () => {
    setEditingModule(null);
    setModuleTitle('');
    setModuleDescription('');
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (mod: ICourseModule) => {
    setEditingModule(mod);
    setModuleTitle(mod.title);
    setModuleDescription(mod.description || '');
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingModule(null);
    setModuleTitle('');
    setModuleDescription('');
    setErrorMessage(null);
  };

  if (isCourseLoading) {
    return (
      <div className="min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)] p-10 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="inline-block animate-spin w-8 h-8 border-4 border-[#BE1E2E] border-t-transparent rounded-full" />
          <p className="text-sm font-medium">Loading course details...</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'PUBLISHED':
        return <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">PUBLISHED</span>;
      case 'UNDER_REVIEW':
        return <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">UNDER REVIEW</span>;
      case 'ARCHIVED':
        return <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[var(--badge-bg)] text-[var(--text-muted)] border border-[var(--brand-border)]">ARCHIVED</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">DRAFT</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)] p-6 md:p-10 max-w-6xl mx-auto space-y-6">
      <BackButton fallback="/admin/courses" />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--brand-border)] pb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--brand-text)]">{course?.title}</h1>
            {getStatusBadge(course?.status)}
          </div>
          <p className="text-[var(--text-muted)] text-xs font-mono mt-1">
            Slug: /{course?.slug} {course?.publishedAt && ` | Published at: ${new Date(course.publishedAt).toLocaleString()}`}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link href={`/admin/courses/${courseId}/curriculum`}>
            <button className="px-4 py-2 text-xs font-bold bg-[#BE1E2E] text-white rounded-xl hover:bg-[#a01826] transition-colors flex items-center gap-2 shadow-lg shadow-[#BE1E2E]/20">
              Open Curriculum →
            </button>
          </Link>
          {canUpdateCourse && (
            <Link href={`/admin/courses/${courseId}/edit`}>
              <button className="px-4 py-2 text-xs font-medium border border-[var(--brand-border)] rounded-xl hover:bg-[var(--bg-surface-elevated)] transition-colors">
                Edit Metadata
              </button>
            </Link>
          )}
          <Link href="/admin/courses">
            <button className="px-4 py-2 text-xs font-medium border border-[var(--brand-border)] rounded-xl hover:bg-[var(--bg-surface-elevated)] transition-colors">
              ← Catalog
            </button>
          </Link>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold">
          {errorMessage}
        </div>
      )}

      {/* Course Readiness & Publishing Section (STEP 3F) */}
      <div className="glass-card p-6 rounded-2xl border border-[var(--brand-border)] space-y-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--brand-border)] pb-4">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#BE1E2E]">
              Publishing Readiness Audit
            </span>
            <h2 className="text-xl font-extrabold text-[var(--brand-text)] mt-1">Course Readiness & Publishing Controls</h2>
          </div>

          <div className="flex items-center gap-3">
            {readinessData?.ready ? (
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> READY TO PUBLISH
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-red-500/10 text-red-500 border border-red-500/20 flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" /> NOT READY ({readinessData?.errors?.length || 0} Issues)
              </span>
            )}
          </div>
        </div>

        {/* Readiness Checklist Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-1">
            <span className="text-[var(--text-muted)] text-[10px] block uppercase">Course Information</span>
            <div className="flex items-center gap-1.5 font-bold text-[var(--brand-text)]">
              {course?.title ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
              <span>Metadata & Title</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-1">
            <span className="text-[var(--text-muted)] text-[10px] block uppercase">Curriculum Structure</span>
            <div className="flex items-center gap-1.5 font-bold text-[var(--brand-text)]">
              {modules.length > 0 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
              <span>{modules.length} Modules</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-1">
            <span className="text-[var(--text-muted)] text-[10px] block uppercase">Lesson Structure</span>
            <div className="flex items-center gap-1.5 font-bold text-[var(--brand-text)]">
              {readinessData?.ready ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-amber-500" />}
              <span>Lessons & Content</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-1">
            <span className="text-[var(--text-muted)] text-[10px] block uppercase">Media Attachments</span>
            <div className="flex items-center gap-1.5 font-bold text-[var(--brand-text)]">
              {readinessData?.ready ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />}
              <span>Asset Vault Verification</span>
            </div>
          </div>
        </div>

        {/* Readiness Errors List */}
        {readinessData && !readinessData.ready && readinessData.errors.length > 0 && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 space-y-2">
            <h4 className="text-xs font-bold text-red-500 uppercase font-mono">Issues preventing publication:</h4>
            <div className="space-y-2">
              {readinessData.errors.map((err, idx) => (
                <div key={idx} className="flex items-center justify-between gap-4 text-xs font-mono bg-[var(--bg-surface)] p-2.5 rounded-lg border border-red-500/20">
                  <span className="text-[var(--brand-text)] font-semibold">❌ {err.message}</span>
                  <Link href={`/admin/courses/${courseId}/curriculum`}>
                    <button className="px-2.5 py-1 text-[10px] font-bold text-[#BE1E2E] bg-red-500/10 rounded hover:bg-red-500/20">
                      Fix Issue →
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Publishing Actions Bar */}
        <div className="pt-2 flex items-center justify-between border-t border-[var(--brand-border)] flex-wrap gap-4">
          <div className="text-xs text-[var(--text-muted)] font-mono">
            {course?.status === 'DRAFT' && 'Submit this course for administrative review once readiness checks pass.'}
            {course?.status === 'UNDER_REVIEW' && 'Course has passed readiness audit and is waiting for publication.'}
            {course?.status === 'PUBLISHED' && 'Course is live for student enrollment.'}
          </div>

          <div className="flex items-center gap-3">
            {course?.status !== 'PUBLISHED' && canPublishCourse && (
              <Button
                variant="primary"
                className="btn-primary text-xs px-5 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
                disabled={!readinessData?.ready || publishMutation.isPending}
                onClick={async () => {
                  const confirmed = await confirm({
                    title: 'Publish this course?',
                    description: 'Once published, this course will become live on your website based on its visibility settings.',
                    resourceName: course?.title,
                    type: 'primary',
                    confirmText: 'Publish Course Live',
                    cancelText: 'Cancel'
                  });
                  if (confirmed) {
                    publishMutation.mutate();
                  }
                }}
              >
                <Globe className="w-3.5 h-3.5 mr-1.5" /> {publishMutation.isPending ? 'Publishing...' : 'Publish Course Live'}
              </Button>
            )}

            {course?.status === 'DRAFT' && canSubmitReview && (
              <Button
                variant="primary"
                className="btn-primary text-xs px-5 shadow-lg shadow-[#BE1E2E]/20"
                disabled={!readinessData?.ready || submitReviewMutation.isPending}
                onClick={() => submitReviewMutation.mutate()}
              >
                <Send className="w-3.5 h-3.5 mr-1.5" /> Submit for Review
              </Button>
            )}

            {course?.status === 'PUBLISHED' && canPublishCourse && (
              <button
                disabled={unpublishMutation.isPending}
                onClick={async () => {
                  const confirmed = await confirm({
                    title: 'Unpublish this course?',
                    description: 'The course will be reverted back to Draft status and hidden from the public website.',
                    resourceName: course?.title,
                    type: 'warning',
                    confirmText: 'Unpublish to Draft',
                    cancelText: 'Cancel'
                  });
                  if (confirmed) {
                    unpublishMutation.mutate();
                  }
                }}
                className="px-4 py-2 text-xs font-semibold text-amber-600 border border-amber-500/30 rounded-xl hover:bg-amber-500/10 transition-colors"
              >
                Unpublish to Draft
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Course Overview Details Grid */}
      <div className="glass-card p-6 rounded-2xl border border-[var(--brand-border)] space-y-4">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Course Overview & Metadata
        </h2>
        {course?.description && (
          <p className="text-sm text-[var(--brand-text)] leading-relaxed">{course.description}</p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 pt-2 font-mono text-xs border-t border-[var(--brand-border)]">
          <div>
            <span className="text-[var(--text-muted)] block text-[10px] uppercase">Status</span>
            <span className="font-bold text-[var(--brand-text)]">{course?.status}</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)] block text-[10px] uppercase">Visibility</span>
            <span className="font-bold text-[var(--brand-text)]">{course?.visibility}</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)] block text-[10px] uppercase">Level</span>
            <span className="font-bold text-[var(--brand-text)]">{course?.level}</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)] block text-[10px] uppercase">Language</span>
            <span className="font-bold text-[var(--brand-text)]">{course?.language || 'English'}</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)] block text-[10px] uppercase">Duration</span>
            <span className="font-bold text-[var(--brand-text)]">
              {course?.durationMinutes ? `${course.durationMinutes} mins` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Module Management Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--brand-text)]">Curriculum Modules</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Organize course modules in sequential order</p>
          </div>
          {canManageModules && (
            <Button variant="primary" className="btn-primary text-xs" onClick={openCreateModal}>
              + Add New Module
            </Button>
          )}
        </div>

        {isModulesLoading ? (
          <div className="glass-card p-8 text-center text-[var(--text-muted)]">
            <p className="text-sm font-medium">Loading course modules...</p>
          </div>
        ) : modules.length === 0 ? (
          <div className="glass-card p-12 text-center space-y-3 rounded-2xl border border-[var(--brand-border)]">
            <p className="text-base font-semibold text-[var(--brand-text)]">No active modules in this course</p>
            <p className="text-xs text-[var(--text-muted)]">Add your first module to begin structuring the course curriculum.</p>
            {canManageModules && (
              <Button variant="primary" className="btn-primary text-xs" onClick={openCreateModal}>
                Create First Module
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {modules.map((mod, index) => (
              <div
                key={mod.id || (mod as any)._id}
                className="glass-card p-5 rounded-xl border border-[var(--brand-border)] flex items-center justify-between gap-4 hover:border-[#BE1E2E]/50 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#BE1E2E]/10 text-[#BE1E2E] font-bold text-sm flex items-center justify-center flex-shrink-0">
                    {mod.order}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold truncate text-[var(--brand-text)]">{mod.title}</h3>
                    {mod.description && (
                      <p className="text-xs text-[var(--text-muted)] line-clamp-1 mt-0.5">{mod.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {canManageModules && (
                    <>
                      <button
                        disabled={index === 0 || reorderMutation.isPending}
                        onClick={() => handleMove(index, 'UP')}
                        className="p-1.5 rounded hover:bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] disabled:opacity-30 text-xs"
                        title="Move Module Up"
                      >
                        ▲
                      </button>
                      <button
                        disabled={index === modules.length - 1 || reorderMutation.isPending}
                        onClick={() => handleMove(index, 'DOWN')}
                        className="p-1.5 rounded hover:bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] disabled:opacity-30 text-xs"
                        title="Move Module Down"
                      >
                        ▼
                      </button>

                      <button
                        onClick={() => openEditModal(mod)}
                        className="px-3 py-1.5 text-xs font-medium border border-[var(--brand-border)] rounded-md hover:bg-[var(--bg-surface-elevated)]"
                      >
                        Edit
                      </button>
                    </>
                  )}

                  {canArchiveModule && (
                    <button
                      onClick={async () => {
                        const confirmed = await confirm({
                          title: 'Archive this module?',
                          description: 'This module and its lessons will be archived and removed from active management.',
                          resourceName: mod.title,
                          type: 'danger',
                          confirmText: 'Yes, Archive Module',
                          cancelText: 'Cancel'
                        });
                        if (confirmed) {
                          archiveModuleMutation.mutate(mod.id || (mod as any)._id);
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-red-500 border border-red-500/20 rounded-md hover:bg-red-500/10"
                    >
                      Archive
                    </button>
                  )}

                  <Link href={`/admin/courses/${courseId}/modules/${mod.id || (mod as any)._id}/lessons`}>
                    <button className="px-3 py-1.5 text-xs font-bold text-[#BE1E2E] border border-[#BE1E2E]/20 rounded-md hover:bg-[#BE1E2E]/10">
                      Manage Lessons →
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Module Creation / Editing Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-xl p-6 w-full max-w-lg space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--brand-border)] pb-4">
              <h3 className="text-lg font-bold text-[var(--brand-text)]">
                {editingModule ? 'Edit Module' : 'Create New Module'}
              </h3>
              <button onClick={closeModal} className="text-[var(--text-muted)] hover:text-[var(--brand-text)] text-sm">
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveModuleMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold mb-1 text-[var(--brand-text)]">Module Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Module 1: Introduction to SEO Strategies"
                  value={moduleTitle}
                  onChange={(e) => setModuleTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-[var(--brand-background)] border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] text-sm text-[var(--brand-text)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-[var(--brand-text)]">Module Description</label>
                <textarea
                  rows={3}
                  placeholder="Optional module learning objectives"
                  value={moduleDescription}
                  onChange={(e) => setModuleDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-[var(--brand-background)] border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] text-sm text-[var(--brand-text)]"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[var(--brand-border)]">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-medium border border-[var(--brand-border)] rounded-lg text-[var(--brand-text)]"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  variant="primary"
                  className="btn-primary px-5 text-xs"
                  disabled={saveModuleMutation.isPending}
                >
                  {saveModuleMutation.isPending ? 'Saving...' : editingModule ? 'Update Module' : 'Create Module'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
