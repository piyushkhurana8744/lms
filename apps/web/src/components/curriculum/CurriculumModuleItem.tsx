'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ICourseModule, ILesson } from '@edtech/types';
import { CurriculumLessonItem } from './CurriculumLessonItem';
import { GripVertical, ChevronDown, ChevronRight, Plus, Edit, Trash2, Layers } from 'lucide-react';
import { Button } from '@edtech/ui';

interface CurriculumModuleItemProps {
  courseId: string;
  module: ICourseModule;
  index: number;
  totalModules: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  canManage: boolean;
  onMoveModule: (index: number, direction: 'UP' | 'DOWN') => void;
  onEditModule: (module: ICourseModule) => void;
  onArchiveModule: (moduleId: string, title: string) => void;
  onAddLesson: (moduleId: string) => void;
  onEditLesson: (lesson: ILesson) => void;
  onArchiveLesson: (moduleId: string, lessonId: string, title: string) => void;
  onPreviewLesson: (lesson: ILesson) => void;
  onDragStartModule: (e: React.DragEvent, index: number) => void;
  onDragOverModule: (e: React.DragEvent, index: number) => void;
  onDropModule: (e: React.DragEvent, index: number) => void;
}

export function CurriculumModuleItem({
  courseId,
  module,
  index,
  totalModules,
  isExpanded,
  onToggleExpand,
  canManage,
  onMoveModule,
  onEditModule,
  onArchiveModule,
  onAddLesson,
  onEditLesson,
  onArchiveLesson,
  onPreviewLesson,
  onDragStartModule,
  onDragOverModule,
  onDropModule
}: CurriculumModuleItemProps) {
  const moduleId = module.id || (module as any)._id;
  const queryClient = useQueryClient();

  // Fetch Lessons for this module
  const { data: lessonsData, isLoading: isLessonsLoading } = useQuery({
    queryKey: ['admin-lessons', courseId, moduleId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/courses/${courseId}/modules/${moduleId}/lessons`);
      if (!res.ok) throw new Error('Failed to fetch lessons');
      const json = await res.json();
      return json.data as ILesson[];
    },
    enabled: isExpanded // Only fetch when expanded
  });

  const lessons: ILesson[] = lessonsData || [];

  // Lesson Reorder Mutation with Optimistic UI & Error Rollback
  const reorderLessonsMutation = useMutation({
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
      const previous = queryClient.getQueryData<ILesson[]>(['admin-lessons', courseId, moduleId]);

      if (previous) {
        const map = new Map(previous.map((l) => [l.id || (l as any)._id, l]));
        const optimistic = newLessonIds
          .map((id, idx) => {
            const item = map.get(id);
            return item ? { ...item, order: idx + 1 } : null;
          })
          .filter(Boolean) as ILesson[];

        queryClient.setQueryData(['admin-lessons', courseId, moduleId], optimistic);
      }

      return { previous };
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['admin-lessons', courseId, moduleId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lessons', courseId, moduleId] });
    }
  });

  const handleMoveLesson = (lessonIdx: number, direction: 'UP' | 'DOWN') => {
    const targetIdx = direction === 'UP' ? lessonIdx - 1 : lessonIdx + 1;
    if (targetIdx < 0 || targetIdx >= lessons.length) return;

    const ids = lessons.map((l) => l.id || (l as any)._id);
    const temp = ids[lessonIdx];
    ids[lessonIdx] = ids[targetIdx];
    ids[targetIdx] = temp;

    reorderLessonsMutation.mutate(ids);
  };

  // Drag & drop lessons within module
  const [draggedLessonIdx, setDraggedLessonIdx] = useState<number | null>(null);

  const handleLessonDragStart = (e: React.DragEvent, lIdx: number) => {
    e.stopPropagation(); // Stop module drag from triggering
    setDraggedLessonIdx(lIdx);
  };

  const handleLessonDragOver = (e: React.DragEvent, _lIdx: number) => {
    e.preventDefault();
  };

  const handleLessonDrop = (e: React.DragEvent, targetLIdx: number) => {
    e.stopPropagation();
    if (draggedLessonIdx === null || draggedLessonIdx === targetLIdx) return;

    const ids = lessons.map((l) => l.id || (l as any)._id);
    const draggedId = ids[draggedLessonIdx];
    ids.splice(draggedLessonIdx, 1);
    ids.splice(targetLIdx, 0, draggedId);

    setDraggedLessonIdx(null);
    reorderLessonsMutation.mutate(ids);
  };

  return (
    <div
      draggable={canManage}
      onDragStart={(e) => onDragStartModule(e, index)}
      onDragOver={(e) => onDragOverModule(e, index)}
      onDrop={(e) => onDropModule(e, index)}
      className="glass-card rounded-2xl border border-[var(--brand-border)] overflow-hidden transition-all"
    >
      {/* Module Header Bar */}
      <div className="p-4 bg-[var(--bg-surface)] flex items-center justify-between gap-3 border-b border-[var(--brand-border)]">
        <div className="flex items-center gap-3 min-w-0">
          {canManage && (
            <div
              className="cursor-grab active:cursor-grabbing text-[var(--text-muted)] hover:text-[var(--brand-text)]"
              title="Drag to reorder module"
              aria-label="Drag handle to reorder module"
            >
              <GripVertical className="w-4 h-4" />
            </div>
          )}

          <button
            onClick={onToggleExpand}
            className="p-1 rounded-lg hover:bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] hover:text-[var(--brand-text)] transition-colors"
            title={isExpanded ? 'Collapse Module' : 'Expand Module'}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          <div className="w-8 h-8 rounded-lg bg-[#BE1E2E]/10 text-[#BE1E2E] font-bold font-mono text-sm flex items-center justify-center flex-shrink-0">
            {module.order}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold truncate text-[var(--brand-text)]">{module.title}</h3>
              <span className="text-xs font-mono text-[var(--text-muted)]">
                ({lessons.length} lessons)
              </span>
            </div>
            {module.description && (
              <p className="text-xs text-[var(--text-muted)] line-clamp-1 mt-0.5">{module.description}</p>
            )}
          </div>
        </div>

        {/* Module Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {canManage && (
            <>
              <button
                disabled={index === 0}
                onClick={() => onMoveModule(index, 'UP')}
                aria-label="Move module up"
                className="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--bg-surface-elevated)] disabled:opacity-20"
              >
                <ChevronDown className="w-4 h-4 rotate-180" />
              </button>

              <button
                disabled={index === totalModules - 1}
                onClick={() => onMoveModule(index, 'DOWN')}
                aria-label="Move module down"
                className="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--bg-surface-elevated)] disabled:opacity-20"
              >
                <ChevronDown className="w-4 h-4" />
              </button>

              <button
                onClick={() => onEditModule(module)}
                className="p-1.5 rounded-lg border border-[var(--brand-border)] text-[var(--text-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
                title="Edit Module"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => onArchiveModule(moduleId, module.title)}
                className="p-1.5 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-colors"
                title="Archive Module"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <Button
                variant="primary"
                className="btn-primary text-xs py-1 px-3"
                onClick={() => onAddLesson(moduleId)}
              >
                <Plus className="w-3 h-3 mr-1" /> Lesson
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Expanded Lessons Container */}
      {isExpanded && (
        <div className="p-4 bg-[var(--brand-background)] space-y-2.5 border-t border-[var(--brand-border)]">
          {isLessonsLoading ? (
            <div className="py-6 text-center text-xs text-[var(--text-muted)] font-medium">
              Loading lessons...
            </div>
          ) : lessons.length === 0 ? (
            <div className="py-6 text-center space-y-2">
              <Layers className="w-6 h-6 mx-auto text-[var(--text-muted)] opacity-50" />
              <p className="text-xs font-semibold text-[var(--brand-text)]">No active lessons in this module</p>
              {canManage && (
                <button
                  onClick={() => onAddLesson(moduleId)}
                  className="text-xs text-[#BE1E2E] font-semibold hover:underline"
                >
                  + Add First Lesson
                </button>
              )}
            </div>
          ) : (
            lessons.map((les, lIdx) => (
              <CurriculumLessonItem
                key={les.id || (les as any)._id}
                lesson={les}
                index={lIdx}
                totalLessons={lessons.length}
                canManage={canManage}
                onMove={handleMoveLesson}
                onEdit={onEditLesson}
                onArchive={(lesId, lesTitle) => onArchiveLesson(moduleId, lesId, lesTitle)}
                onPreview={onPreviewLesson}
                onDragStart={handleLessonDragStart}
                onDragOver={handleLessonDragOver}
                onDrop={handleLessonDrop}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
