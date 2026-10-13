'use client';

import React from 'react';

export function CourseCatalogSkeleton() {
  return (
    <div className="space-y-8 animate-pulse" aria-busy="true" aria-label="Loading course catalog">
      {/* Search & Filter Bar Skeleton */}
      <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="w-full md:w-96 h-11 bg-[var(--bg-surface-elevated)] rounded-xl" />
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-32 h-11 bg-[var(--bg-surface-elevated)] rounded-xl" />
          <div className="w-32 h-11 bg-[var(--bg-surface-elevated)] rounded-xl" />
          <div className="w-32 h-11 bg-[var(--bg-surface-elevated)] rounded-xl" />
        </div>
      </div>

      {/* Course Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl overflow-hidden h-[380px] flex flex-col justify-between p-4 space-y-4"
          >
            <div className="w-full h-44 bg-[var(--bg-surface-elevated)] rounded-xl" />
            <div className="space-y-2">
              <div className="w-3/4 h-5 bg-[var(--bg-surface-elevated)] rounded" />
              <div className="w-full h-4 bg-[var(--bg-surface-elevated)] rounded" />
              <div className="w-2/3 h-4 bg-[var(--bg-surface-elevated)] rounded" />
            </div>
            <div className="pt-2 flex justify-between">
              <div className="w-20 h-4 bg-[var(--bg-surface-elevated)] rounded" />
              <div className="w-20 h-4 bg-[var(--bg-surface-elevated)] rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
