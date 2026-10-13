'use client';

import React, { useState } from 'react';
import {
  Video,
  FileText,
  Music,
  ExternalLink,
  Radio,
  ChevronDown,
  ChevronUp,
  Lock,
  Eye,
  BookOpen
} from 'lucide-react';
import { PublicLessonPreviewDrawer, LessonSummary } from './PublicLessonPreviewDrawer';

export interface PublicLessonItem {
  id: string;
  title: string;
  description?: string;
  type: 'TEXT' | 'VIDEO' | 'PDF' | 'AUDIO' | 'EXTERNAL_RESOURCE' | 'LIVE';
  estimatedDurationMinutes?: number;
  order: number;
  isPreview: boolean;
}

export interface PublicModuleItem {
  id: string;
  title: string;
  description?: string;
  order: number;
  lessons: PublicLessonItem[];
}

export interface PublicCurriculumProps {
  courseSlug: string;
  modules: PublicModuleItem[];
}

export function PublicCurriculum({ courseSlug, modules }: PublicCurriculumProps) {
  // Expand first module by default
  const [expandedModuleIds, setExpandedModuleIds] = useState<Set<string>>(
    new Set(modules && modules.length > 0 ? [modules[0].id] : [])
  );
  const [selectedLesson, setSelectedLesson] = useState<LessonSummary | null>(null);

  const toggleModule = (id: string) => {
    setExpandedModuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'VIDEO':
        return <Video className="w-4 h-4 text-purple-500" />;
      case 'PDF':
        return <FileText className="w-4 h-4 text-red-500" />;
      case 'AUDIO':
        return <Music className="w-4 h-4 text-emerald-500" />;
      case 'EXTERNAL_RESOURCE':
        return <ExternalLink className="w-4 h-4 text-blue-500" />;
      case 'LIVE':
        return <Radio className="w-4 h-4 text-amber-500 animate-pulse" />;
      case 'TEXT':
      default:
        return <FileText className="w-4 h-4 text-[var(--text-muted)]" />;
    }
  };

  if (!modules || modules.length === 0) {
    return (
      <div className="glass-card p-8 rounded-2xl border border-[var(--brand-border)] text-center space-y-2">
        <BookOpen className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-50" />
        <p className="text-xs text-[var(--text-muted)] font-mono">
          Curriculum structure is currently being updated for this course.
        </p>
      </div>
    );
  }

  const totalLessons = modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
  const previewCount = modules.reduce(
    (sum, m) => sum + (m.lessons?.filter((l) => l.isPreview).length || 0),
    0
  );

  return (
    <div className="space-y-4" data-testid="public-curriculum">
      <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)] pb-2 border-b border-[var(--brand-border)]">
        <span>
          {modules.length} Modules • {totalLessons} Lessons
          {previewCount > 0 && ` • ${previewCount} Free Previews`}
        </span>
        <button
          onClick={() => {
            if (expandedModuleIds.size === modules.length) {
              setExpandedModuleIds(new Set());
            } else {
              setExpandedModuleIds(new Set(modules.map((m) => m.id)));
            }
          }}
          className="hover:text-[#BE1E2E] font-bold transition-colors"
        >
          {expandedModuleIds.size === modules.length ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      <div className="space-y-3">
        {modules.map((module, idx) => {
          const isExpanded = expandedModuleIds.has(module.id);
          const moduleLessons = module.lessons || [];

          return (
            <div
              key={module.id}
              className="glass-card rounded-2xl border border-[var(--brand-border)] overflow-hidden transition-all shadow-sm hover:shadow-md"
            >
              {/* Module Header Accordion Trigger */}
              <button
                onClick={() => toggleModule(module.id)}
                aria-expanded={isExpanded}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-[var(--bg-surface-elevated)]/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-[#BE1E2E]/10 text-[#BE1E2E] font-bold text-xs font-mono flex items-center justify-center flex-shrink-0 border border-[#BE1E2E]/20">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-extrabold text-[var(--brand-text)] truncate">
                      {module.title}
                    </h4>
                    {module.description && (
                      <p className="text-xs text-[var(--text-muted)] line-clamp-1">
                        {module.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 font-mono text-xs text-[var(--text-muted)]">
                  <span>{moduleLessons.length} lessons</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {/* Lessons List */}
              {isExpanded && (
                <div className="border-t border-[var(--brand-border)] bg-[var(--bg-surface)]/40 divide-y divide-[var(--brand-border)]">
                  {moduleLessons.length === 0 ? (
                    <div className="p-4 text-xs font-mono text-[var(--text-muted)] italic">
                      No published lessons in this module.
                    </div>
                  ) : (
                    moduleLessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="p-3.5 px-5 flex items-center justify-between gap-4 hover:bg-[var(--bg-surface-elevated)]/40 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--brand-border)] flex-shrink-0">
                            {getLessonIcon(lesson.type)}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-[var(--brand-text)] block truncate">
                              {lesson.title}
                            </span>
                            {lesson.description && (
                              <span className="text-[11px] text-[var(--text-muted)] block truncate">
                                {lesson.description}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0 font-mono text-[11px]">
                          {lesson.estimatedDurationMinutes ? (
                            <span className="text-[var(--text-muted)] hidden sm:inline">
                              {lesson.estimatedDurationMinutes}m
                            </span>
                          ) : null}

                          {lesson.isPreview ? (
                            <button
                              onClick={() => setSelectedLesson(lesson)}
                              className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1 hover:bg-emerald-500/20 transition-colors"
                            >
                              <Eye className="w-3 h-3" /> 🔓 Preview
                            </button>
                          ) : (
                            <button
                              onClick={() => setSelectedLesson(lesson)}
                              className="px-2.5 py-1 rounded-full text-[10px] text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--brand-border)] flex items-center gap-1 hover:bg-[var(--bg-surface-elevated)] transition-colors"
                            >
                              <Lock className="w-3 h-3 text-amber-500" /> 🔒 Locked
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lesson Preview / Locked Drawer */}
      {selectedLesson && (
        <PublicLessonPreviewDrawer
          courseSlug={courseSlug}
          lesson={selectedLesson}
          onClose={() => setSelectedLesson(null)}
        />
      )}
    </div>
  );
}
