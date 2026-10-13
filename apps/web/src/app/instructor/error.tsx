'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, ArrowLeft, BookOpen } from 'lucide-react';
import { Button } from '@edtech/ui';

export default function InstructorErrorBoundary({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Instructor Error Captured]', error);
  }, [error]);

  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)] flex items-center justify-center p-6 sm:p-10">
      <div className="max-w-md w-full glass-card p-8 rounded-3xl border border-[var(--brand-border)] text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-[#BE1E2E]/10 border border-[#BE1E2E]/20 text-[#BE1E2E] flex items-center justify-center mx-auto shadow-md">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#BE1E2E] bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
            Instructor Portal Error
          </span>
          <h1 className="text-2xl font-black tracking-tight text-[var(--brand-text)]">
            Instructor Section Error
          </h1>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            The instructor workspace encountered a problem loading this section.
          </p>
        </div>

        {isDev && error.message && (
          <pre className="p-3 rounded-xl bg-black/80 text-emerald-400 font-mono text-[11px] text-left overflow-x-auto max-h-32 border border-white/10 select-all">
            {error.message}
          </pre>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            variant="primary"
            className="btn-primary w-full sm:w-auto text-xs px-6 py-2.5 shadow-lg shadow-[#BE1E2E]/20 flex items-center justify-center gap-2"
            onClick={reset}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Try Again
          </Button>

          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold border border-[var(--brand-border)] rounded-xl hover:bg-[var(--bg-surface-elevated)] transition-colors text-[var(--brand-text)] flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Go Back
          </button>
        </div>

        <div className="pt-4 border-t border-[var(--brand-border)]">
          <Link href="/instructor" className="text-xs font-mono text-[#BE1E2E] hover:underline flex items-center justify-center gap-1">
            <BookOpen className="w-3.5 h-3.5" /> Go to Instructor Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
