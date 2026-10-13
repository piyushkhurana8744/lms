import React from 'react';

export function CourseDetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-6 animate-pulse" data-testid="course-detail-skeleton">
      {/* Back Button Skeleton */}
      <div className="w-24 h-8 bg-[var(--bg-surface-elevated)] rounded-xl" />

      {/* Breadcrumbs Skeleton */}
      <div className="flex items-center gap-2">
        <div className="w-16 h-4 bg-[var(--bg-surface-elevated)] rounded" />
        <span className="text-[var(--text-muted)]">/</span>
        <div className="w-48 h-4 bg-[var(--bg-surface-elevated)] rounded" />
      </div>

      {/* Hero Card Skeleton */}
      <div className="glass-card p-6 md:p-8 rounded-3xl border border-[var(--brand-border)] grid grid-cols-1 md:grid-cols-3 gap-8 shadow-xl">
        <div className="md:col-span-2 space-y-4">
          <div className="flex gap-2">
            <div className="w-20 h-5 bg-[var(--bg-surface-elevated)] rounded-full" />
            <div className="w-16 h-5 bg-[var(--bg-surface-elevated)] rounded-full" />
          </div>

          <div className="w-3/4 h-9 bg-[var(--bg-surface-elevated)] rounded-lg" />
          <div className="w-full h-4 bg-[var(--bg-surface-elevated)] rounded" />
          <div className="w-5/6 h-4 bg-[var(--bg-surface-elevated)] rounded" />

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[var(--brand-border)]">
            <div className="w-20 h-8 bg-[var(--bg-surface-elevated)] rounded" />
            <div className="w-20 h-8 bg-[var(--bg-surface-elevated)] rounded" />
            <div className="w-20 h-8 bg-[var(--bg-surface-elevated)] rounded" />
          </div>
        </div>

        {/* Thumbnail & CTA Box Skeleton */}
        <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-4">
          <div className="w-full aspect-video bg-[var(--bg-surface-elevated)] rounded-xl" />
          <div className="w-full h-10 bg-[var(--bg-surface-elevated)] rounded-xl" />
        </div>
      </div>

      {/* Course Overview Skeleton */}
      <div className="glass-card p-6 md:p-8 rounded-3xl border border-[var(--brand-border)] space-y-3">
        <div className="w-48 h-6 bg-[var(--bg-surface-elevated)] rounded" />
        <div className="w-full h-4 bg-[var(--bg-surface-elevated)] rounded" />
        <div className="w-full h-4 bg-[var(--bg-surface-elevated)] rounded" />
        <div className="w-2/3 h-4 bg-[var(--bg-surface-elevated)] rounded" />
      </div>

      {/* Curriculum Accordion Skeleton */}
      <div className="space-y-3">
        <div className="w-40 h-7 bg-[var(--bg-surface-elevated)] rounded" />
        <div className="w-full h-14 bg-[var(--bg-surface-elevated)] rounded-2xl" />
        <div className="w-full h-14 bg-[var(--bg-surface-elevated)] rounded-2xl" />
        <div className="w-full h-14 bg-[var(--bg-surface-elevated)] rounded-2xl" />
      </div>
    </div>
  );
}
