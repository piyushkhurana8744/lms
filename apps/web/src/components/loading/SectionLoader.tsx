'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface SectionLoaderProps {
  label?: string;
  minHeight?: string;
}

export function SectionLoader({
  label = 'Loading content...',
  minHeight = 'min-h-[200px]'
}: SectionLoaderProps) {
  return (
    <div
      className={`w-full ${minHeight} flex flex-col items-center justify-center p-8 rounded-2xl bg-[var(--brand-card)]/50 border border-[var(--brand-border)]/50 text-center space-y-3`}
    >
      <Loader2 className="w-6 h-6 text-[#BE1E2E] animate-spin" />
      <p className="text-xs font-semibold text-[var(--brand-text-secondary)]">{label}</p>
    </div>
  );
}
