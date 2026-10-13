'use client';

import React from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { Sparkles, LogOut } from 'lucide-react';
import { Button } from '@edtech/ui';

export interface OnboardingHeaderProps {
  organizationName?: string;
  completionPercentage: number;
  onExit: () => void;
}

export function OnboardingHeader({
  organizationName = 'DIDM LMS Academy',
  completionPercentage,
  onExit
}: OnboardingHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-[var(--bg-surface)] border-b border-[var(--brand-border)] p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Link href="/admin/onboarding" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#BE1E2E] text-white font-black text-sm flex items-center justify-center shadow-md shadow-[#BE1E2E]/20">
            D
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-[var(--brand-text)] block leading-none">
              {organizationName}
            </span>
            <span className="text-[10px] font-mono text-[var(--text-muted)] tracking-wider block mt-0.5">
              ONBOARDING WIZARD
            </span>
          </div>
        </Link>
      </div>

      {/* Progress Badge & Action Buttons */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs">
          <Sparkles className="w-3.5 h-3.5 text-[#BE1E2E]" />
          <span className="text-[var(--text-muted)]">Launch Readiness:</span>
          <span className="font-mono font-black text-[var(--brand-text)]">{completionPercentage}%</span>
        </div>

        <ThemeToggle />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onExit}
          className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--brand-text)]"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Exit Setup</span>
        </Button>
      </div>
    </header>
  );
}
