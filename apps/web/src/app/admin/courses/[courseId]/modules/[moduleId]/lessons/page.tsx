'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ILesson, LessonType } from '@edtech/types';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@edtech/ui';
import { BackButton } from '@/components/navigation/BackButton';
import { useConfirmation } from '@/components/confirmation/useConfirmation';

export default function AdminLessonManagementPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const moduleId = params.moduleId as string;
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const { confirm } = useConfirmation();

  const canManage = hasPermission('lesson.create') || hasPermission('lesson.update');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewLesson, setPreviewLesson] = useState<ILesson | null>(null);
  const [editingLesson, setEditingLesson] = useState<ILesson | null>(null);

  // Form State
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [lessonType, setLessonType] = useState<LessonType>('TEXT');
  const [bodyHtml, setBodyHtml] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState(10);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Fetch Course Metadata
  const { data: course } = useQuery({
    queryKey: ['admin-course-detail', courseId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/courses/${courseId}`);
      if (!res.ok) throw new Error('Course not found');
      const json = await res.json();
      return json.data;
    }
  });

  // 2. Fetch Module Details
  const { data: moduleDetail } = useQuery({
    queryKey: ['admin-module-detail', courseId, moduleId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/courses/${courseId}/modules`);
      if (!res.ok) throw new Error('Failed to fetch modules');
      const json = await res.json();
      const modules = json.data || [];
      return modules.find((m: any) => (m.id || m._id) === moduleId);
    }
  });

  // 3. Fetch Active Lessons
  const { data: lessonsData, isLoading: isLessonsLoading } = useQuery({
    queryKey: ['admin-lessons', courseId, moduleId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/courses/${courseId}/modules/${moduleId}/lessons`);
      if (!res.ok) throw new Error('Failed to fetch lessons');
      const json = await res.json();
      return json.data as ILesson[];
    }
  });

  const lessons: ILesson[] = lessonsData || [];

  // 4. Save Lesson Mutation
  const saveLessonMutation = useMutation({
    mutationFn: async () => {
      let contentPayload: any = {};
      if (lessonType === 'TEXT') {
        contentPayload = { bodyHtml };
      } else if (lessonType === 'EXTERNAL_RESOURCE') {
        contentPayload = { url: externalUrl };
      }

      const payload = {
        title: lessonTitle,
        description: lessonDescription,
        type: lessonType,
        content: contentPayload,
        isPreview,
        estimatedDurationMinutes
      };

      const url = editingLesson
        ? `/api/v1/courses/${courseId}/modules/${moduleId}/lessons/${editingLesson.id || (editingLesson as any)._id}`
        : `/api/v1/courses/${courseId}/modules/${moduleId}/lessons`;
      const method = editingLesson ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to save lesson');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lessons', courseId, moduleId] });
      closeModal();
    },
    onError: (err: any) => {
      setErrorMessage(err.message);
    }
  });

  // 5. Archive Lesson Mutation
  const archiveLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      const res = await fetch(`/api/v1/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to archive lesson');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lessons', courseId, moduleId] });
    }
  });

  // 6. Reorder Lessons Mutation
  const reorderMutation = useMutation({
    mutationFn: async (newLessonIds: string[]) => {
      const res = await fetch(`/api/v1/courses/${courseId}/modules/${moduleId}/lessons/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonIds: newLessonIds })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to reorder lessons');
      return json.data;
    },
    onMutate: async (newLessonIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: ['admin-lessons', courseId, moduleId] });
      const previousLessons = queryClient.getQueryData<ILesson[]>(['admin-lessons', courseId, moduleId]);

      if (previousLessons) {
        const idToLesson = new Map(previousLessons.map((l) => [l.id || (l as any)._id, l]));
        const optimistic = newLessonIds
          .map((id, idx) => {
            const l = idToLesson.get(id);
            return l ? { ...l, order: idx + 1 } : null;
          })
          .filter(Boolean) as ILesson[];

        queryClient.setQueryData(['admin-lessons', courseId, moduleId], optimistic);
      }

      return { previousLessons };
    },
    onError: (err: any, _newIds, context) => {
      if (context?.previousLessons) {
        queryClient.setQueryData(['admin-lessons', courseId, moduleId], context.previousLessons);
      }
      setErrorMessage(err.message || 'Your changes could not be saved. The previous order has been restored.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lessons', courseId, moduleId] });
    }
  });

  const handleMove = (index: number, direction: 'UP' | 'DOWN') => {
    const newIdx = direction === 'UP' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= lessons.length) return;

    const ids = lessons.map((l) => l.id || (l as any)._id);
    const temp = ids[index];
    ids[index] = ids[newIdx];
    ids[newIdx] = temp;

    reorderMutation.mutate(ids);
  };

  const openCreateModal = () => {
    setEditingLesson(null);
    setLessonTitle('');
    setLessonDescription('');
    setLessonType('TEXT');
    setBodyHtml('');
    setExternalUrl('');
    setIsPreview(false);
    setEstimatedDurationMinutes(10);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (les: ILesson) => {
    setEditingLesson(les);
    setLessonTitle(les.title);
    setLessonDescription(les.description || '');
    setLessonType(les.type);
    const contentAny = (les.content as any) || {};
    setBodyHtml(contentAny.bodyHtml || '');
    setExternalUrl(contentAny.url || '');
    setIsPreview(les.isPreview || false);
    setEstimatedDurationMinutes(les.estimatedDurationMinutes || 0);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLesson(null);
    setErrorMessage(null);
  };

  const openPreview = (les: ILesson) => {
    setPreviewLesson(les);
    setIsPreviewModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-brand-background text-brand-text p-6 md:p-10 max-w-6xl mx-auto space-y-6">
      <BackButton
        fallback={`/admin/courses/${courseId}/curriculum`}
        hasUnsavedChanges={isModalOpen && lessonTitle.trim().length > 0}
      />

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-brand-mutedText font-mono border-b border-brand-border pb-4">
        <Link href="/admin/courses" className="hover:text-brand-primary">Courses</Link>
        <span>/</span>
        <Link href={`/admin/courses/${courseId}`} className="hover:text-brand-primary truncate max-w-[200px]">
          {course?.title || courseId}
        </Link>
        <span>/</span>
        <span className="text-brand-text font-semibold truncate max-w-[200px]">
          {moduleDetail?.title || 'Module Lessons'}
        </span>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lesson Management</h1>
          <p className="text-brand-mutedText text-xs mt-1">
            Module: <strong className="text-brand-text">{moduleDetail?.title}</strong> ({lessons.length} active lessons)
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canManage && (
            <Button variant="primary" className="btn-primary text-xs" onClick={openCreateModal}>
              + Add Lesson
            </Button>
          )}
          <Link href={`/admin/courses/${courseId}`}>
            <button className="px-4 py-2 text-sm font-medium border border-brand-border rounded-lg hover:bg-brand-surfaceElevated transition-colors">
              ← Back to Module Overview
            </button>
          </Link>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Lesson List */}
      {isLessonsLoading ? (
        <div className="glass-card p-8 text-center text-brand-mutedText">
          <p className="text-sm font-medium">Loading lessons...</p>
        </div>
      ) : lessons.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <p className="text-base font-semibold">No active lessons in this module</p>
          <p className="text-xs text-brand-mutedText">Add your first lesson to start building content.</p>
          {canManage && (
            <Button variant="primary" className="btn-primary text-xs" onClick={openCreateModal}>
              Create First Lesson
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map((les, index) => (
            <div
              key={les.id || (les as any)._id}
              className="glass-card p-5 rounded-xl border border-brand-border flex items-center justify-between gap-4 hover:border-brand-primary/50 transition-colors"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-brand-primary/10 text-brand-primary font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {les.order}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold truncate text-brand-text">{les.title}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-brand-surfaceElevated border border-brand-border text-brand-mutedText">
                      {les.type}
                    </span>
                    {les.isPreview && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        FREE PREVIEW
                      </span>
                    )}
                  </div>
                  {les.description && (
                    <p className="text-xs text-brand-mutedText line-clamp-1 mt-0.5">{les.description}</p>
                  )}
                  <p className="text-[11px] text-brand-mutedText font-mono mt-1">
                    Est. Duration: {les.estimatedDurationMinutes} mins
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => openPreview(les)}
                  className="px-3 py-1.5 text-xs font-medium border border-brand-border rounded-md hover:bg-brand-surfaceElevated"
                >
                  Preview
                </button>

                {canManage && (
                  <>
                    <button
                      disabled={index === 0 || reorderMutation.isPending}
                      onClick={() => handleMove(index, 'UP')}
                      className="p-1.5 rounded hover:bg-brand-surfaceElevated text-brand-mutedText disabled:opacity-30 text-xs"
                      title="Move Lesson Up"
                    >
                      ▲
                    </button>
                    <button
                      disabled={index === lessons.length - 1 || reorderMutation.isPending}
                      onClick={() => handleMove(index, 'DOWN')}
                      className="p-1.5 rounded hover:bg-brand-surfaceElevated text-brand-mutedText disabled:opacity-30 text-xs"
                      title="Move Lesson Down"
                    >
                      ▼
                    </button>

                    <button
                      onClick={() => openEditModal(les)}
                      className="px-3 py-1.5 text-xs font-medium border border-brand-border rounded-md hover:bg-brand-surfaceElevated"
                    >
                      Edit
                    </button>

                    <button
                      onClick={async () => {
                        const confirmed = await confirm({
                          title: 'Archive this lesson?',
                          description: 'This lesson will be archived and removed from active module curriculum.',
                          resourceName: les.title,
                          type: 'danger',
                          confirmText: 'Yes, Archive Lesson',
                          cancelText: 'Cancel'
                        });
                        if (confirmed) {
                          archiveLessonMutation.mutate(les.id || (les as any)._id);
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-red-500 border border-red-500/20 rounded-md hover:bg-red-500/10"
                    >
                      Archive
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lesson Creation / Editing Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-brand-border rounded-xl p-6 w-full max-w-xl space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-brand-border pb-4">
              <h3 className="text-lg font-bold">
                {editingLesson ? 'Edit Lesson' : 'Create New Lesson'}
              </h3>
              <button onClick={closeModal} className="text-brand-mutedText hover:text-brand-text text-sm">
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveLessonMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold mb-1">Lesson Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lesson 1: Keyword Research Techniques"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-brand-background border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Summary of lesson topics"
                  value={lessonDescription}
                  onChange={(e) => setLessonDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-brand-background border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Lesson Type *</label>
                  <select
                    value={lessonType}
                    onChange={(e) => setLessonType(e.target.value as LessonType)}
                    className="w-full px-3.5 py-2 rounded-lg bg-brand-background border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
                  >
                    <option value="TEXT">Text Article</option>
                    <option value="VIDEO">Video</option>
                    <option value="PDF">PDF Document</option>
                    <option value="AUDIO">Audio</option>
                    <option value="EXTERNAL_RESOURCE">External Resource</option>
                    <option value="LIVE">Live Session</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Est. Duration (minutes)</label>
                  <input
                    type="number"
                    min={0}
                    value={estimatedDurationMinutes}
                    onChange={(e) => setEstimatedDurationMinutes(parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 rounded-lg bg-brand-background border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
                  />
                </div>
              </div>

              {/* Type-Specific Fields */}
              {lessonType === 'TEXT' && (
                <div>
                  <label className="block text-xs font-semibold mb-1">Lesson HTML Body</label>
                  <textarea
                    rows={5}
                    placeholder="Enter lesson text/HTML content"
                    value={bodyHtml}
                    onChange={(e) => setBodyHtml(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg bg-brand-background border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm font-mono"
                  />
                </div>
              )}

              {lessonType === 'EXTERNAL_RESOURCE' && (
                <div>
                  <label className="block text-xs font-semibold mb-1">Resource URL *</label>
                  <input
                    type="url"
                    placeholder="https://example.com/guide"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg bg-brand-background border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
                  />
                </div>
              )}

              {(lessonType === 'VIDEO' || lessonType === 'PDF' || lessonType === 'AUDIO' || lessonType === 'LIVE') && (
                <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
                  <strong>Notice:</strong> {lessonType} media upload & live class integrations will be configured in a future step. Foundation metadata registered.
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isPreviewToggle"
                  checked={isPreview}
                  onChange={(e) => setIsPreview(e.target.checked)}
                  className="rounded border-brand-border text-brand-primary focus:ring-brand-primary"
                />
                <label htmlFor="isPreviewToggle" className="text-xs font-semibold">
                  Enable as Free Preview Lesson
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-brand-border">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-medium border border-brand-border rounded-lg"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  variant="primary"
                  className="btn-primary px-5 text-xs"
                  disabled={saveLessonMutation.isPending}
                >
                  {saveLessonMutation.isPending ? 'Saving...' : editingLesson ? 'Update Lesson' : 'Create Lesson'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lesson Preview Modal */}
      {isPreviewModalOpen && previewLesson && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-brand-border rounded-xl p-6 w-full max-w-2xl space-y-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-brand-border pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary">
                  {previewLesson.type} PREVIEW
                </span>
                <h3 className="text-xl font-bold mt-1">{previewLesson.title}</h3>
              </div>
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="text-brand-mutedText hover:text-brand-text text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {previewLesson.description && (
                <p className="text-xs text-brand-mutedText italic">{previewLesson.description}</p>
              )}

              {previewLesson.type === 'TEXT' ? (
                <div
                  className="p-4 rounded-lg bg-brand-background border border-brand-border text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: (previewLesson.content as any)?.bodyHtml || '<p>No content html available.</p>' }}
                />
              ) : previewLesson.type === 'EXTERNAL_RESOURCE' ? (
                <div className="p-4 rounded-lg bg-brand-background border border-brand-border text-sm space-y-2">
                  <p className="text-xs font-semibold">External Link:</p>
                  <a
                    href={(previewLesson.content as any)?.url || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-primary underline break-all font-mono text-xs"
                  >
                    {(previewLesson.content as any)?.url || 'No URL provided'}
                  </a>
                </div>
              ) : (
                <div className="p-6 rounded-lg bg-brand-background border border-brand-border text-center space-y-2">
                  <p className="text-sm font-semibold">{previewLesson.type} Media Content Placeholder</p>
                  <p className="text-xs text-brand-mutedText">
                    Media streaming, S3/R2 storage, signed URLs, and Live Classroom integration will be attached in future dedicated steps.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end border-t border-brand-border">
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-4 py-2 text-xs font-medium border border-brand-border rounded-lg"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
