'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ICourse, ICourseModule, ILesson } from '@edtech/types';
import { useAuth } from '@/components/auth-provider';
import { CourseBuilderHeader } from './CourseBuilderHeader';
import { CurriculumCompleteness } from './CurriculumCompleteness';
import { CurriculumTree } from './CurriculumTree';
import { ModuleEditorDialog } from './ModuleEditorDialog';
import { LessonEditorDialog } from './LessonEditorDialog';
import { CurriculumPreviewDrawer } from './CurriculumPreviewDrawer';
import { Button } from '@edtech/ui';
import { Plus } from 'lucide-react';
import { useConfirmation } from '@/components/confirmation/useConfirmation';
import { CurriculumSkeleton } from '@/components/loading/SkeletonLoaders';

interface CourseCurriculumBuilderProps {
  courseId: string;
}

export function CourseCurriculumBuilder({ courseId }: CourseCurriculumBuilderProps) {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const { confirm } = useConfirmation();

  const canManage = hasPermission('course.module.create') || hasPermission('course.module.update');

  // Page UI State
  const [expandedModuleIds, setExpandedModuleIds] = useState<Set<string>>(new Set());
  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<ICourseModule | null>(null);

  const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false);
  const [targetModuleIdForLesson, setTargetModuleIdForLesson] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<ILesson | null>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewLesson, setPreviewLesson] = useState<ILesson | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Fetch Course Metadata
  const { data: course, isLoading: isCourseLoading } = useQuery({
    queryKey: ['admin-course-detail', courseId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/courses/${courseId}`);
      if (!res.ok) throw new Error('Course not found or access denied');
      const json = await res.json();
      return json.data as ICourse;
    }
  });

  // 2. Fetch Course Modules
  const { data: modulesData, isLoading: isModulesLoading } = useQuery({
    queryKey: ['admin-course-modules', courseId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/courses/${courseId}/modules`);
      if (!res.ok) throw new Error('Failed to fetch curriculum modules');
      const json = await res.json();
      return json.data as ICourseModule[];
    }
  });

  const modules: ICourseModule[] = React.useMemo(() => modulesData || [], [modulesData]);

  // Auto-expand first module on load if not expanded
  React.useEffect(() => {
    if (modules.length > 0 && expandedModuleIds.size === 0) {
      const firstId = modules[0].id || (modules[0] as any)._id;
      if (firstId) {
        setExpandedModuleIds(new Set([firstId]));
      }
    }
  }, [modules, expandedModuleIds.size]);

  const toggleExpandModule = (mId: string) => {
    setExpandedModuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(mId)) {
        next.delete(mId);
      } else {
        next.add(mId);
      }
      return next;
    });
  };

  // 3. Module Operations
  const saveModuleMutation = useMutation({
    mutationFn: async (payload: { title: string; description?: string }) => {
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-course-modules', courseId] });
      setIsModuleDialogOpen(false);
      setEditingModule(null);
      if (data?.id || data?._id) {
        setExpandedModuleIds((prev) => new Set(prev).add(data.id || data._id));
      }
    },
    onError: (err: any) => setErrorMessage(err.message)
  });

  const archiveModuleMutation = useMutation({
    mutationFn: async (mId: string) => {
      const res = await fetch(`/api/v1/courses/${courseId}/modules/${mId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to archive module');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-course-modules', courseId] })
  });

  const reorderModulesMutation = useMutation({
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
      const previous = queryClient.getQueryData<ICourseModule[]>(['admin-course-modules', courseId]);

      if (previous) {
        const map = new Map(previous.map((m) => [m.id || (m as any)._id, m]));
        const optimistic = newModuleIds
          .map((id, idx) => {
            const item = map.get(id);
            return item ? { ...item, order: idx + 1 } : null;
          })
          .filter(Boolean) as ICourseModule[];

        queryClient.setQueryData(['admin-course-modules', courseId], optimistic);
      }

      return { previous };
    },
    onError: (err: any, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['admin-course-modules', courseId], context.previous);
      }
      setErrorMessage(err.message || 'Unable to save module ordering. Previous order restored.');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin-course-modules', courseId] })
  });

  const handleMoveModule = (idx: number, direction: 'UP' | 'DOWN') => {
    const targetIdx = direction === 'UP' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= modules.length) return;

    const ids = modules.map((m) => m.id || (m as any)._id);
    const temp = ids[idx];
    ids[idx] = ids[targetIdx];
    ids[targetIdx] = temp;

    reorderModulesMutation.mutate(ids);
  };

  // 4. Lesson Operations
  const saveLessonMutation = useMutation({
    mutationFn: async (payload: any) => {
      const mId = targetModuleIdForLesson || editingLesson?.moduleId || (editingLesson as any)?.moduleId;
      const url = editingLesson
        ? `/api/v1/courses/${courseId}/modules/${mId}/lessons/${editingLesson.id || (editingLesson as any)._id}`
        : `/api/v1/courses/${courseId}/modules/${mId}/lessons`;
      const method = editingLesson ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to save lesson');
      return { data: json.data, moduleId: mId };
    },
    onSuccess: (res) => {
      if (res.moduleId) {
        queryClient.invalidateQueries({ queryKey: ['admin-lessons', courseId, res.moduleId] });
      }
      setIsLessonDialogOpen(false);
      setEditingLesson(null);
      setTargetModuleIdForLesson(null);
    },
    onError: (err: any) => setErrorMessage(err.message)
  });

  const archiveLessonMutation = useMutation({
    mutationFn: async ({ mId, lId }: { mId: string; lId: string }) => {
      const res = await fetch(`/api/v1/courses/${courseId}/modules/${mId}/lessons/${lId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to archive lesson');
      return { mId, lId };
    },
    onSuccess: (res) => queryClient.invalidateQueries({ queryKey: ['admin-lessons', courseId, res.mId] })
  });

  // Modal Triggers
  const openCreateModuleModal = () => {
    setEditingModule(null);
    setIsModuleDialogOpen(true);
  };

  const openEditModuleModal = (mod: ICourseModule) => {
    setEditingModule(mod);
    setIsModuleDialogOpen(true);
  };

  const handleArchiveModule = async (mId: string, title: string) => {
    await confirm({
      title: 'Archive this module?',
      description: 'This module and its lessons will be archived and removed from active management.',
      resourceName: title,
      type: 'danger',
      confirmText: 'Yes, Archive Module',
      cancelText: 'Cancel',
      onConfirm: async () => {
        await archiveModuleMutation.mutateAsync(mId);
      }
    });
  };

  const openCreateLessonModal = (mId: string) => {
    setEditingLesson(null);
    setTargetModuleIdForLesson(mId);
    setIsLessonDialogOpen(true);
  };

  const openEditLessonModal = (les: ILesson) => {
    setEditingLesson(les);
    setTargetModuleIdForLesson(les.moduleId || (les as any).moduleId);
    setIsLessonDialogOpen(true);
  };

  const handleArchiveLesson = async (mId: string, lId: string, title: string) => {
    await confirm({
      title: 'Archive this lesson?',
      description: 'This lesson will be archived and removed from active module curriculum.',
      resourceName: title,
      type: 'danger',
      confirmText: 'Yes, Archive Lesson',
      cancelText: 'Cancel',
      onConfirm: async () => {
        await archiveLessonMutation.mutateAsync({ mId, lId });
      }
    });
  };


  const openPreviewLessonModal = (les: ILesson) => {
    setPreviewLesson(les);
    setIsPreviewOpen(true);
  };

  if (isCourseLoading || isModulesLoading) {
    return <CurriculumSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)] p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <CourseBuilderHeader course={course} moduleCount={modules.length} lessonCount={0} />

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Curriculum Tree */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-[var(--brand-text)]">CURRICULUM</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Build your course structure
              </p>
            </div>

            {canManage && (
              <Button variant="primary" className="btn-primary text-xs shadow-md shadow-[#BE1E2E]/10" onClick={openCreateModuleModal}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> + Add Module
              </Button>
            )}
          </div>

          <CurriculumTree
            courseId={courseId}
            modules={modules}
            canManage={canManage}
            expandedModuleIds={expandedModuleIds}
            onToggleExpand={toggleExpandModule}
            onMoveModule={handleMoveModule}
            onReorderModules={(ids) => reorderModulesMutation.mutate(ids)}
            onEditModule={openEditModuleModal}
            onArchiveModule={handleArchiveModule}
            onAddModule={openCreateModuleModal}
            onAddLesson={openCreateLessonModal}
            onEditLesson={openEditLessonModal}
            onArchiveLesson={handleArchiveLesson}
            onPreviewLesson={openPreviewLessonModal}
          />
        </div>

        {/* Right Column: Completeness Summary */}
        <div className="space-y-6">
          <CurriculumCompleteness
            moduleCount={modules.length}
            lessonCount={0}
            modulesWithoutLessonsCount={0}
          />
        </div>
      </div>

      {/* Dialog Modals */}
      <ModuleEditorDialog
        isOpen={isModuleDialogOpen}
        onClose={() => setIsModuleDialogOpen(false)}
        module={editingModule}
        onSave={async (data) => {
          await saveModuleMutation.mutateAsync(data);
        }}
        isPending={saveModuleMutation.isPending}
      />

      <LessonEditorDialog
        isOpen={isLessonDialogOpen}
        onClose={() => setIsLessonDialogOpen(false)}
        lesson={editingLesson}
        onSave={async (data) => {
          await saveLessonMutation.mutateAsync(data);
        }}
        isPending={saveLessonMutation.isPending}
      />

      <CurriculumPreviewDrawer
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        lesson={previewLesson}
      />
    </div>
  );
}
