'use client';

import React from 'react';
import Link from 'next/link';
import { ICourse } from '@edtech/types';
import { Edit, Eye } from 'lucide-react';

import { BackButton } from '@/components/navigation/BackButton';

interface CourseBuilderHeaderProps {
  course?: ICourse | null;
  moduleCount: number;
  lessonCount: number;
  onPreviewAll?: () => void;
}

export function CourseBuilderHeader({ course, moduleCount, lessonCount, onPreviewAll }: CourseBuilderHeaderProps) {
  const cId = course?.id || (course as any)?._id;

  return (
    <div className="border-b border-[var(--brand-border)] pb-6 space-y-4">
      {/* Back Button & Top Navigation Links */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BackButton fallback={cId ? `/admin/courses/${cId}` : '/admin/courses'} />
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-mono">
            <Link href="/admin/courses" className="hover:text-[var(--brand-primary)]">
              Courses
            </Link>
            <span>/</span>
            <Link href={`/admin/courses/${cId}`} className="hover:text-[var(--brand-primary)]">
              {course?.title || 'Course Details'}
            </Link>
            <span>/</span>
            <span className="text-[var(--brand-text)] font-semibold">Curriculum</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {cId && (
            <Link
              href={`/admin/courses/${cId}/edit`}
              className="px-3 py-1.5 text-xs font-semibold border border-[var(--brand-border)] rounded-lg hover:bg-[var(--bg-surface-elevated)] transition-colors flex items-center gap-1.5"
            >
              <Edit className="w-3.5 h-3.5" /> Edit Course
            </Link>
          )}
          <Link
            href={`/admin/courses/${cId}`}
            className="px-3 py-1.5 text-xs font-semibold border border-[var(--brand-border)] rounded-lg hover:bg-[var(--bg-surface-elevated)] transition-colors flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </Link>
        </div>
      </div>

      {/* Main Title & Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--brand-text)]">
              {course?.title || 'Loading Curriculum...'}
            </h1>
            <span className="text-xs font-mono font-bold uppercase text-[var(--text-muted)] bg-[var(--bg-surface-elevated)] px-2 py-0.5 rounded border border-[var(--brand-border)]">
              Curriculum
            </span>
            {course?.status && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono">
                {course.status}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] font-mono mt-1">
            Slug: /{course?.slug || '...'} | Level: {course?.level || 'ALL_LEVELS'} | Visibility: {course?.visibility || 'PUBLIC'}
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-surface)] px-4 py-2.5 rounded-xl border border-[var(--brand-border)]">
          <div>
            Modules: <span className="font-bold text-[var(--brand-text)]">{moduleCount}</span>
          </div>
          <span className="text-[var(--brand-border)]">|</span>
          <div>
            Lessons: <span className="font-bold text-[var(--brand-text)]">{lessonCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

