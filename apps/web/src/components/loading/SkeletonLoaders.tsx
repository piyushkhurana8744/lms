'use client';

import React from 'react';

export function CardSkeleton() {
  return (
    <div className="p-6 rounded-2xl border border-[var(--brand-border,rgba(255,255,255,0.1))] bg-[var(--brand-card,#1A1A1A)] space-y-4 animate-pulse">
      <div className="h-40 w-full bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
      <div className="h-5 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
      <div className="h-4 w-1/2 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
      <div className="h-10 w-full bg-neutral-200 dark:bg-neutral-800 rounded-xl pt-2" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-[var(--brand-border,rgba(255,255,255,0.1))] animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-neutral-200 dark:bg-neutral-800 rounded-md ${
            i === 0 ? 'w-1/3' : 'flex-1'
          }`}
        />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-2xl border border-[var(--brand-border,rgba(255,255,255,0.1))] bg-[var(--brand-card,#1A1A1A)] overflow-hidden">
      <div className="p-4 border-b border-[var(--brand-border,rgba(255,255,255,0.1))] bg-neutral-100 dark:bg-neutral-900/50 flex items-center justify-between">
        <div className="h-5 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
        <div className="h-8 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} columns={columns} />
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-6 p-6 rounded-2xl border border-[var(--brand-border,rgba(255,255,255,0.1))] bg-[var(--brand-card,#1A1A1A)] animate-pulse">
      <div className="h-6 w-1/4 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
      <div className="space-y-2">
        <div className="h-4 w-1/6 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
        <div className="h-11 w-full bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-1/6 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
        <div className="h-24 w-full bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
      </div>
      <div className="h-11 w-1/3 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
    </div>
  );
}

export function CourseSkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-4 sm:p-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
          <div className="h-4 w-72 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
        </div>
        <div className="h-10 w-36 bg-neutral-200 dark:bg-neutral-800 rounded-xl shrink-0" />
      </div>

      {/* Search Bar & Filters Skeleton */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="h-10 flex-1 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
        <div className="h-10 w-28 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
      </div>

      {/* Grid of Course Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

export function CurriculumSkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-4 sm:p-6">
      {/* Course Header Skeleton */}
      <div className="p-6 rounded-2xl border border-[var(--brand-border,rgba(255,255,255,0.1))] bg-[var(--brand-card,#1A1A1A)] space-y-3">
        <div className="h-7 w-1/3 bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
        <div className="h-4 w-1/2 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
      </div>

      {/* Module Tree Skeleton */}
      <div className="space-y-4">
        {[1, 2].map((mod) => (
          <div key={mod} className="rounded-2xl border border-[var(--brand-border,rgba(255,255,255,0.1))] bg-[var(--brand-card,#1A1A1A)] overflow-hidden">
            <div className="p-4 bg-neutral-100 dark:bg-neutral-900/40 flex items-center justify-between">
              <div className="h-5 w-40 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
              <div className="h-8 w-20 bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
            </div>
            {/* Lesson Skeletons */}
            <div className="p-4 space-y-3 border-t border-[var(--brand-border,rgba(255,255,255,0.1))]">
              <div className="h-10 w-full bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
              <div className="h-10 w-full bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MediaLibrarySkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-4 sm:p-6">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-8 w-40 bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
          <div className="h-4 w-60 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
        </div>
        <div className="h-10 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
      </div>

      {/* Filter Bar Skeleton */}
      <div className="h-12 w-full bg-neutral-200 dark:bg-neutral-800 rounded-xl" />

      {/* Media Grid Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-36 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
        ))}
      </div>
    </div>
  );
}

export function OrganizationSettingsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-4 sm:p-6">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-56 bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
        <div className="h-4 w-80 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
      </div>

      {/* Progress Card Skeleton */}
      <div className="p-6 rounded-2xl border border-[var(--brand-border,rgba(255,255,255,0.1))] bg-[var(--brand-card,#1A1A1A)] space-y-4">
        <div className="h-5 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
        <div className="h-3 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full" />
      </div>

      {/* Settings Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormSkeleton />
        <FormSkeleton />
      </div>
    </div>
  );
}
