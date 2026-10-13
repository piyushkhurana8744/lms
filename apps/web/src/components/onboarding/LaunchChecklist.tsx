'use client';

import React from 'react';
import Link from 'next/link';
import { IOnboardingStepDetail } from '@edtech/types';
import { Button, Card, Badge } from '@edtech/ui';
import { Rocket, CheckCircle2, AlertTriangle, ArrowLeft, Loader2, Sparkles } from 'lucide-react';

export interface LaunchChecklistProps {
  steps: IOnboardingStepDetail[];
  completionPercentage: number;
  canLaunch: boolean;
  onComplete: () => void;
  onBack: () => void;
  isPending: boolean;
}

export function LaunchChecklist({
  steps,
  completionPercentage,
  canLaunch,
  onComplete,
  onBack,
  isPending
}: LaunchChecklistProps) {
  const checklistSteps = steps.filter((s) => s.key !== 'welcome' && s.key !== 'launch');

  return (
    <Card className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-6 max-w-3xl mx-auto shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--brand-border)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[#BE1E2E] uppercase tracking-wider flex items-center gap-1.5">
              <Rocket className="w-4 h-4 text-[#BE1E2E]" /> Launch Readiness Assessment
            </span>
          </div>
          <h3 className="text-2xl font-black tracking-tight text-[var(--brand-text)]">
            {canLaunch ? 'Your LMS is Ready to Launch 🚀' : 'Action Required Before Launch'}
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            Review your organization setup completion state before opening the Admin Console.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-center min-w-[130px]">
          <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase block font-bold">
            Readiness Index
          </span>
          <span className="text-2xl font-black font-mono text-[#BE1E2E] block mt-0.5">
            {completionPercentage}%
          </span>
        </div>
      </div>

      {/* Checklist Grid */}
      <div className="space-y-3">
        {checklistSteps.map((step) => (
          <div
            key={step.key}
            className="p-3.5 rounded-2xl bg-[var(--brand-background)] border border-[var(--brand-border)] flex items-center justify-between gap-4 text-xs"
          >
            <div className="flex items-center gap-3">
              {step.isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              ) : step.isRequired ? (
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              ) : (
                <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0" />
              )}

              <div>
                <h4 className="font-extrabold text-[var(--brand-text)] flex items-center gap-2">
                  <span>{step.title}</span>
                  {step.isRequired && <span className="text-[9px] text-red-500 font-mono font-bold">*Required</span>}
                </h4>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{step.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {step.isCompleted ? (
                <Badge variant="success" className="text-[10px]">
                  ✓ Completed
                </Badge>
              ) : step.isSkipped ? (
                <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">
                  Skipped
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">
                  Pending
                </Badge>
              )}

              {step.actionUrl && (
                <Link href={step.actionUrl} target="_blank">
                  <Button type="button" variant="outline" size="sm" className="text-[10px] py-1 px-2.5">
                    Configure
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Launch Actions */}
      <div className="pt-6 border-t border-[var(--brand-border)] flex items-center justify-between gap-4">
        <Button type="button" variant="outline" size="sm" onClick={onBack} className="flex items-center gap-1.5 text-xs">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Setup Steps
        </Button>

        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={onComplete}
          disabled={isPending}
          className="flex items-center gap-2 btn-primary shadow-xl shadow-[#BE1E2E]/20 text-sm px-6 py-2.5"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
          <span>{completionPercentage === 100 ? 'Enter Admin Console 🚀' : 'Launch Anyway & Enter Console'}</span>
        </Button>
      </div>
    </Card>
  );
}
