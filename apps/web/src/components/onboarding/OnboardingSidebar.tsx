'use client';

import React from 'react';
import { IOnboardingStepDetail } from '@edtech/types';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';

export interface OnboardingSidebarProps {
  steps: IOnboardingStepDetail[];
  currentStep: number;
  onSelectStep: (stepIndex: number) => void;
}

export function OnboardingSidebar({
  steps,
  currentStep,
  onSelectStep
}: OnboardingSidebarProps) {
  return (
    <aside className="w-full md:w-72 bg-[var(--bg-surface)] border-r border-[var(--brand-border)] p-4 flex flex-col justify-between">
      <div className="space-y-4">
        <div className="px-2">
          <h3 className="font-extrabold text-xs text-[var(--brand-text)] uppercase font-mono tracking-wider">
            Setup Workflow
          </h3>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Complete steps to launch your academy.
          </p>
        </div>

        <nav className="space-y-1">
          {steps.map((step) => {
            const isCurrent = step.stepIndex === currentStep;
            const isDone = step.isCompleted;
            const isSkipped = step.isSkipped;

            return (
              <button
                key={step.key}
                type="button"
                onClick={() => onSelectStep(step.stepIndex)}
                className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 text-xs ${
                  isCurrent
                    ? 'bg-[#BE1E2E]/10 border border-[#BE1E2E] text-[#BE1E2E] font-bold shadow-sm'
                    : isDone
                    ? 'text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)]'
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : isCurrent ? (
                    <ArrowRight className="w-4 h-4 text-[#BE1E2E]" />
                  ) : (
                    <Circle className="w-4 h-4 text-[var(--brand-border)]" />
                  )}
                </div>

                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate font-semibold">{step.title}</span>
                    {isSkipped && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        Skipped
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] truncate">{step.description}</p>
                </div>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
