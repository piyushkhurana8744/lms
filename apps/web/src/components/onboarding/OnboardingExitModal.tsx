'use client';

import React from 'react';
import { Button } from '@edtech/ui';
import { LogOut, AlertTriangle } from 'lucide-react';

export interface OnboardingExitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExit: () => void;
}

export function OnboardingExitModal({
  isOpen,
  onClose,
  onConfirmExit
}: OnboardingExitModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl text-[var(--brand-text)]">
        <div className="flex items-center gap-3 pb-3 border-b border-[var(--brand-border)]">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base">Exit Onboarding Setup?</h3>
            <p className="text-xs text-[var(--text-muted)]">
              Your progress will be saved. You can resume onboarding anytime from Organization Settings.
            </p>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2 text-xs">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Resume Setup
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onConfirmExit}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit to Admin Dashboard</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
