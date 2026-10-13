'use client';

import React from 'react';
import Link from 'next/link';
import { Button, Card } from '@edtech/ui';
import { BookOpen, ArrowRight, ArrowLeft, PlusCircle } from 'lucide-react';

export interface FirstCourseStepProps {
  onNext: () => void;
  onBack: () => void;
  onSkipStep: () => void;
}

export function FirstCourseStep({
  onNext,
  onBack,
  onSkipStep
}: FirstCourseStepProps) {
  return (
    <Card className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-6 max-w-2xl mx-auto shadow-xl">
      <div className="flex items-center gap-3 pb-4 border-b border-[var(--brand-border)]">
        <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-500">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <span className="text-[10px] font-mono font-bold text-teal-500 uppercase tracking-wider">
            Step 7 of 8
          </span>
          <h3 className="text-xl font-extrabold text-[var(--brand-text)]">Create Your First Course</h3>
          <p className="text-xs text-[var(--text-muted)]">
            Draft or publish a course masterclass with curriculum modules and lessons.
          </p>
        </div>
      </div>

      <div className="space-y-4 text-xs">
        <div className="p-4 rounded-2xl bg-[var(--brand-background)] border border-[var(--brand-border)] space-y-3">
          <h4 className="font-extrabold text-xs text-[var(--brand-text)]">Course Studio Builder</h4>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Create structured courses with rich text, video, PDF attachments, and module ordering.
          </p>

          <Link href="/admin/courses/create" target="_blank">
            <Button type="button" variant="primary" size="sm" className="flex items-center gap-1.5 text-xs btn-primary shadow-md">
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Launch Course Builder</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="pt-6 border-t border-[var(--brand-border)] flex items-center justify-between gap-4">
        <Button type="button" variant="outline" size="sm" onClick={onBack} className="flex items-center gap-1.5 text-xs">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSkipStep}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--brand-text)] font-semibold px-3"
          >
            I&apos;ll do this later
          </button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onNext}
            className="flex items-center gap-1.5 text-xs"
          >
            <span>Continue to Launch</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
