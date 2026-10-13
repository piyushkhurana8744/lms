'use client';

import React from 'react';

export function CourseCardSkeleton() {
  return (
    <div className="glass-card rounded-2xl overflow-hidden border border-[var(--brand-border)] animate-pulse space-y-4 p-4">
      <div className="aspect-video bg-[var(--bg-surface-elevated)] rounded-xl" />
      <div className="space-y-2">
        <div className="h-4 bg-[var(--bg-surface-elevated)] rounded w-3/4" />
        <div className="h-3 bg-[var(--bg-surface-elevated)] rounded w-full" />
        <div className="h-3 bg-[var(--bg-surface-elevated)] rounded w-5/6" />
      </div>
      <div className="pt-3 border-t border-[var(--brand-border)] flex justify-between">
        <div className="h-3 bg-[var(--bg-surface-elevated)] rounded w-1/4" />
        <div className="h-3 bg-[var(--bg-surface-elevated)] rounded w-1/4" />
      </div>
    </div>
  );
}

export function CourseGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <CourseCardSkeleton key={i} />
      ))}
    </div>
  );
}
