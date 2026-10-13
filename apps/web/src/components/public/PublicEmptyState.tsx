'use client';

import React from 'react';
import { BookOpen } from 'lucide-react';

export function PublicEmptyState({
  title = 'No courses available yet',
  description = 'Our workspace is currently updating the course catalog. Check back soon for new programs.'
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="glass-card p-12 rounded-2xl border border-[var(--brand-border)] text-center space-y-3 max-w-lg mx-auto my-8">
      <div className="w-12 h-12 rounded-2xl bg-[#BE1E2E]/10 text-[#BE1E2E] flex items-center justify-center mx-auto mb-2">
        <BookOpen className="w-6 h-6" />
      </div>
      <h3 className="text-base font-extrabold text-[var(--brand-text)]">{title}</h3>
      <p className="text-xs text-[var(--text-muted)] leading-relaxed">{description}</p>
    </div>
  );
}
