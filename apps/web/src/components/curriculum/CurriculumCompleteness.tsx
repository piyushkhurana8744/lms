'use client';

import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface CurriculumCompletenessProps {
  moduleCount: number;
  lessonCount: number;
  modulesWithoutLessonsCount: number;
}

export function CurriculumCompleteness({
  moduleCount,
  lessonCount,
  modulesWithoutLessonsCount
}: CurriculumCompletenessProps) {
  const hasModules = moduleCount > 0;
  const allModulesHaveLessons = hasModules && modulesWithoutLessonsCount === 0;
  const isComplete = hasModules && allModulesHaveLessons;

  return (
    <div className="glass-card p-5 rounded-2xl border border-[var(--brand-border)] space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[var(--brand-text)] flex items-center gap-2">
          Curriculum Structure Summary
        </h3>
        <span
          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-mono border ${
            isComplete
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
          }`}
        >
          {isComplete ? 'Structure Complete' : 'In Progress'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--brand-border)]">
          <span className="text-[var(--text-muted)] block text-[10px]">Total Modules</span>
          <span className="text-base font-bold text-[var(--brand-text)]">{moduleCount}</span>
        </div>
        <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--brand-border)]">
          <span className="text-[var(--text-muted)] block text-[10px]">Total Lessons</span>
          <span className="text-base font-bold text-[var(--brand-text)]">{lessonCount}</span>
        </div>
      </div>

      <div className="space-y-1.5 pt-1 text-xs">
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          {hasModules ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          )}
          <span>Course contains modules</span>
        </div>

        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          {allModulesHaveLessons ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          )}
          <span>
            {allModulesHaveLessons
              ? 'Every module has active lessons'
              : `${modulesWithoutLessonsCount} module(s) missing lessons`}
          </span>
        </div>
      </div>
    </div>
  );
}
