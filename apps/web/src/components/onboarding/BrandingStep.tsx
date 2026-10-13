'use client';

import React from 'react';
import Link from 'next/link';
import { Button, Card } from '@edtech/ui';
import { Palette, ArrowRight, ArrowLeft, ExternalLink } from 'lucide-react';

export interface BrandingStepProps {
  onNext: () => void;
  onBack: () => void;
  onSkipStep: () => void;
}

export function BrandingStep({
  onNext,
  onBack,
  onSkipStep
}: BrandingStepProps) {
  return (
    <Card className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-6 max-w-2xl mx-auto shadow-xl">
      <div className="flex items-center gap-3 pb-4 border-b border-[var(--brand-border)]">
        <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500">
          <Palette className="w-6 h-6" />
        </div>
        <div>
          <span className="text-[10px] font-mono font-bold text-purple-500 uppercase tracking-wider">
            Step 2 of 8
          </span>
          <h3 className="text-xl font-extrabold text-[var(--brand-text)]">Website & Branding</h3>
          <p className="text-xs text-[var(--text-muted)]">
            Upload logo, set brand primary colors, hero title, and public homepage sections.
          </p>
        </div>
      </div>

      <div className="space-y-4 text-xs">
        <div className="p-4 rounded-2xl bg-[var(--brand-background)] border border-[var(--brand-border)] space-y-3">
          <h4 className="font-extrabold text-xs text-[var(--brand-text)]">Brand Identity & Homepage Editor</h4>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            You can customize logos, primary/secondary colors, and hero banners using the full CMS Branding Studio. Default platform theme is applied.
          </p>

          <Link href="/admin/organization/branding" target="_blank">
            <Button type="button" variant="outline" size="sm" className="flex items-center gap-1.5 text-xs text-purple-500 border-purple-500/30">
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Full Branding Studio</span>
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-3 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)]">
            <div className="w-8 h-8 rounded-lg bg-[#BE1E2E] mx-auto mb-1.5 shadow-md" />
            <span className="font-mono text-[10px] text-[var(--text-muted)]">Primary: #BE1E2E</span>
          </div>
          <div className="p-3 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)]">
            <div className="w-8 h-8 rounded-lg bg-[#1F2937] mx-auto mb-1.5 shadow-md" />
            <span className="font-mono text-[10px] text-[var(--text-muted)]">Secondary: #1F2937</span>
          </div>
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
            Configure later
          </button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onNext}
            className="flex items-center gap-1.5 btn-primary shadow-lg shadow-[#BE1E2E]/20 text-xs"
          >
            <span>Continue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
