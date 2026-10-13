'use client';

import React from 'react';
import { ILesson } from '@edtech/types';
import { GripVertical, ChevronUp, ChevronDown, Edit, Trash2, Eye } from 'lucide-react';

interface CurriculumLessonItemProps {
  lesson: ILesson;
  index: number;
  totalLessons: number;
  canManage: boolean;
  onMove: (index: number, direction: 'UP' | 'DOWN') => void;
  onEdit: (lesson: ILesson) => void;
  onArchive: (lessonId: string, title: string) => void;
  onPreview: (lesson: ILesson) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
}

export function CurriculumLessonItem({
  lesson,
  index,
  totalLessons,
  canManage,
  onMove,
  onEdit,
  onArchive,
  onPreview,
  onDragStart,
  onDragOver,
  onDrop
}: CurriculumLessonItemProps) {
  const lessonId = lesson.id || (lesson as any)._id;

  return (
    <div
      draggable={canManage}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--brand-border)] flex items-center justify-between gap-3 hover:border-[var(--brand-primary)]/40 transition-colors group"
    >
      <div className="flex items-center gap-3 min-w-0">
        {canManage && (
          <div
            className="cursor-grab active:cursor-grabbing text-[var(--text-muted)] hover:text-[var(--brand-text)]"
            title="Drag to reorder lesson"
            aria-label="Drag handle to reorder lesson"
          >
            <GripVertical className="w-4 h-4" />
          </div>
        )}

        <div className="w-7 h-7 rounded-md bg-[#BE1E2E]/10 text-[#BE1E2E] font-bold font-mono text-xs flex items-center justify-center flex-shrink-0">
          {lesson.order}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold truncate text-[var(--brand-text)]">{lesson.title}</h4>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-[var(--text-muted)]">
              {lesson.type}
            </span>
            {lesson.isPreview && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                PREVIEW
              </span>
            )}
          </div>
          {lesson.description && (
            <p className="text-xs text-[var(--text-muted)] line-clamp-1 mt-0.5">{lesson.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs font-mono text-[var(--text-muted)] hidden sm:inline-block mr-1">
          {lesson.estimatedDurationMinutes || 0}m
        </span>

        <button
          onClick={() => onPreview(lesson)}
          className="p-1.5 rounded-lg border border-[var(--brand-border)] text-[var(--text-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
          title="Preview Lesson"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>

        {canManage && (
          <>
            <button
              disabled={index === 0}
              onClick={() => onMove(index, 'UP')}
              aria-label="Move lesson up"
              className="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--bg-surface-elevated)] disabled:opacity-20"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>

            <button
              disabled={index === totalLessons - 1}
              onClick={() => onMove(index, 'DOWN')}
              aria-label="Move lesson down"
              className="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--bg-surface-elevated)] disabled:opacity-20"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onEdit(lesson)}
              className="p-1.5 rounded-lg border border-[var(--brand-border)] text-[var(--text-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
              title="Edit Lesson"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onArchive(lessonId, lesson.title)}
              className="p-1.5 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-colors"
              title="Archive Lesson"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
