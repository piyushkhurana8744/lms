'use client';

import React from 'react';
import { Button } from '@edtech/ui';
import { Globe, X, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export interface PublishWebsiteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending?: boolean;
}

export function PublishWebsiteDialog({
  isOpen,
  onClose,
  onConfirm,
  isPending = false
}: PublishWebsiteDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl text-[var(--brand-text)]">
        <div className="flex items-center justify-between border-b border-[var(--brand-border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base">Publish Website Live?</h3>
          </div>

          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--brand-text)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-[var(--text-muted)]">
          <p className="text-[var(--brand-text)] font-semibold">
            Your current draft configuration will immediately become visible to all public visitors on your LMS website.
          </p>

          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Live Website Deployment
            </div>
            <p className="text-[11px]">
              Branding colors, logo, hero banner, navigation links, and featured courses will be updated live.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-[var(--brand-border)] flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onConfirm}
            disabled={isPending}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Publishing...
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" /> Publish Website Now
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
