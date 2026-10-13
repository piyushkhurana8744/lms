'use client';

import React, { useState } from 'react';
import { ICourseModule, ILesson } from '@edtech/types';
import { CurriculumModuleItem } from './CurriculumModuleItem';
import { Layers } from 'lucide-react';
import { Button } from '@edtech/ui';

interface CurriculumTreeProps {
  courseId: string;
  modules: ICourseModule[];
  canManage: boolean;
  expandedModuleIds: Set<string>;
  onToggleExpand: (moduleId: string) => void;
  onMoveModule: (index: number, direction: 'UP' | 'DOWN') => void;
  onReorderModules: (newModuleIds: string[]) => void;
  onEditModule: (module: ICourseModule) => void;
  onArchiveModule: (moduleId: string, title: string) => void;
  onAddModule: () => void;
  onAddLesson: (moduleId: string) => void;
  onEditLesson: (lesson: ILesson) => void;
  onArchiveLesson: (moduleId: string, lessonId: string, title: string) => void;
  onPreviewLesson: (lesson: ILesson) => void;
}

export function CurriculumTree({
  courseId,
  modules,
  canManage,
  expandedModuleIds,
  onToggleExpand,
  onMoveModule,
  onReorderModules,
  onEditModule,
  onArchiveModule,
  onAddModule,
  onAddLesson,
  onEditLesson,
  onArchiveLesson,
  onPreviewLesson
}: CurriculumTreeProps) {
  const [draggedModuleIdx, setDraggedModuleIdx] = useState<number | null>(null);

  const handleModuleDragStart = (_e: React.DragEvent, mIdx: number) => {
    setDraggedModuleIdx(mIdx);
  };

  const handleModuleDragOver = (e: React.DragEvent, _mIdx: number) => {
    e.preventDefault();
  };

  const handleModuleDrop = (_e: React.DragEvent, targetMIdx: number) => {
    if (draggedModuleIdx === null || draggedModuleIdx === targetMIdx) return;

    const ids = modules.map((m) => m.id || (m as any)._id);
    const draggedId = ids[draggedModuleIdx];
    ids.splice(draggedModuleIdx, 1);
    ids.splice(targetMIdx, 0, draggedId);

    setDraggedModuleIdx(null);
    onReorderModules(ids);
  };

  if (modules.length === 0) {
    return (
      <div className="glass-card p-12 text-center space-y-4 rounded-2xl border border-[var(--brand-border)]">
        <Layers className="w-10 h-10 mx-auto text-[#BE1E2E] opacity-70" />
        <div className="space-y-1">
          <h3 className="text-base font-bold text-[var(--brand-text)]">Curriculum Empty</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            Get started by creating your first course module to structure your learning content.
          </p>
        </div>
        {canManage && (
          <Button variant="primary" className="btn-primary text-xs" onClick={onAddModule}>
            + Create First Module
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {modules.map((mod, idx) => {
        const mId = mod.id || (mod as any)._id;
        const isExpanded = expandedModuleIds.has(mId);

        return (
          <CurriculumModuleItem
            key={mId}
            courseId={courseId}
            module={mod}
            index={idx}
            totalModules={modules.length}
            isExpanded={isExpanded}
            onToggleExpand={() => onToggleExpand(mId)}
            canManage={canManage}
            onMoveModule={onMoveModule}
            onEditModule={onEditModule}
            onArchiveModule={onArchiveModule}
            onAddLesson={onAddLesson}
            onEditLesson={onEditLesson}
            onArchiveLesson={onArchiveLesson}
            onPreviewLesson={onPreviewLesson}
            onDragStartModule={handleModuleDragStart}
            onDragOverModule={handleModuleDragOver}
            onDropModule={handleModuleDrop}
          />
        );
      })}
    </div>
  );
}
