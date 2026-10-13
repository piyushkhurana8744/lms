'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export function PublicErrorState({
  title = 'Failed to load content',
  message = 'An error occurred while fetching public course information.'
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="glass-card p-10 rounded-2xl border border-red-500/30 text-center space-y-4 max-w-lg mx-auto my-12">
      <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-extrabold text-[var(--brand-text)]">{title}</h3>
      <p className="text-xs text-[var(--text-muted)] font-mono leading-relaxed">{message}</p>
      <div className="pt-2">
        <Link href="/courses">
          <button className="px-4 py-2 text-xs font-bold bg-[#BE1E2E] text-white rounded-xl hover:bg-[#a01826] transition-colors inline-flex items-center gap-1.5 shadow-md">
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Courses
          </button>
        </Link>
      </div>
    </div>
  );
}
