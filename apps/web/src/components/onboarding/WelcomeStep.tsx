'use client';

import React from 'react';
import { Button, Card } from '@edtech/ui';
import { Sparkles, Clock, CheckCircle2, ArrowRight } from 'lucide-react';

export interface WelcomeStepProps {
  organizationName?: string;
  onNext: () => void;
  onSkip: () => void;
}

export function WelcomeStep({
  organizationName = 'DIDM LMS Academy',
  onNext,
  onSkip
}: WelcomeStepProps) {
  return (
    <Card className="p-8 sm:p-12 rounded-3xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-8 max-w-2xl mx-auto shadow-2xl">
      <div className="space-y-3 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#BE1E2E]/10 border border-[#BE1E2E]/30 text-[#BE1E2E] flex items-center justify-center mx-auto shadow-lg shadow-[#BE1E2E]/10">
          <Sparkles className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-mono font-bold text-[#BE1E2E] uppercase tracking-wider">
            First-Time Setup Experience
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--brand-text)]">
            Welcome to {organizationName}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-lg mx-auto leading-relaxed">
            Let&apos;s set up your learning platform. Complete a few quick steps to prepare your LMS for instructors and students.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-4 rounded-2xl bg-[var(--brand-background)] border border-[var(--brand-border)] space-y-1 text-center">
          <Clock className="w-5 h-5 text-blue-500 mx-auto" />
          <h4 className="font-extrabold text-[var(--brand-text)]">5–10 Minutes</h4>
          <p className="text-[11px] text-[var(--text-muted)]">Estimated setup time</p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--brand-background)] border border-[var(--brand-border)] space-y-1 text-center">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
          <h4 className="font-extrabold text-[var(--brand-text)]">Resumable Setup</h4>
          <p className="text-[11px] text-[var(--text-muted)]">Progress saves automatically</p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--brand-background)] border border-[var(--brand-border)] space-y-1 text-center">
          <Sparkles className="w-5 h-5 text-purple-500 mx-auto" />
          <h4 className="font-extrabold text-[var(--brand-text)]">White-label Ready</h4>
          <p className="text-[11px] text-[var(--text-muted)]">Your brand & custom domain</p>
        </div>
      </div>

      <div className="pt-4 border-t border-[var(--brand-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={onSkip}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--brand-text)] font-semibold"
        >
          I&apos;ll do this later
        </button>

        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={onNext}
          className="w-full sm:w-auto flex items-center justify-center gap-2 btn-primary shadow-xl shadow-[#BE1E2E]/20 px-6 py-3 text-sm"
        >
          <span>Let&apos;s Get Started</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
