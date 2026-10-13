'use client';

import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { ActiveOperationItem } from '../loading/OperationToast';

interface GlobalOperationOverlayProps {
  operations: ActiveOperationItem[];
}

export function GlobalOperationOverlay({ operations }: GlobalOperationOverlayProps) {
  // Find the active global operation (if any)
  const activeGlobalOp = operations.find(
    (op) => op.status === 'IN_PROGRESS' && op.type === 'GLOBAL'
  );

  // Lock body scroll when overlay is active
  useEffect(() => {
    if (activeGlobalOp) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeGlobalOp]);

  if (!activeGlobalOp) return null;

  const title = activeGlobalOp.title || activeGlobalOp.label || 'Processing Request';
  const description =
    activeGlobalOp.description || activeGlobalOp.message || 'Please wait while we process your request...';
  const progress = activeGlobalOp.progress;
  const isIndeterminate = progress === undefined || progress === null;

  return (
    <div
      className="fixed inset-0 z-[9995] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-live="polite"
      aria-labelledby="global-operation-title"
      aria-describedby="global-operation-description"
    >
      <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl bg-[var(--bg-surface, #121212)] border border-[var(--brand-border,rgba(255,255,255,0.1))] text-[var(--brand-text,#FFFFFF)] shadow-2xl space-y-6 text-center transform transition-all animate-in zoom-in-95 duration-200">
        {/* Animated Brand Pulse Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#BE1E2E] to-[#E52D3D] flex items-center justify-center shadow-lg shadow-[#BE1E2E]/25 relative animate-pulse">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>

        {/* Dynamic Titles */}
        <div className="space-y-2">
          <h3
            id="global-operation-title"
            className="text-lg sm:text-xl font-bold tracking-tight text-[var(--brand-text,#FFFFFF)]"
          >
            {title}
          </h3>
          <p
            id="global-operation-description"
            className="text-xs sm:text-sm text-[var(--brand-text-secondary,rgba(255,255,255,0.7))] leading-relaxed max-w-xs mx-auto"
          >
            {description}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-2">
          {!isIndeterminate && (
            <div className="flex justify-between text-[11px] font-mono text-[var(--brand-text-secondary,rgba(255,255,255,0.6))]">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
          )}
          <div className="w-full h-2 bg-black/20 dark:bg-white/10 rounded-full overflow-hidden relative">
            <div
              className={`h-full bg-gradient-to-r from-[#BE1E2E] via-[#E52D3D] to-[#BE1E2E] transition-all duration-300 shadow-[0_0_10px_rgba(190,30,46,0.6)] ${
                isIndeterminate ? 'w-full animate-pulse' : ''
              }`}
              style={{
                width: isIndeterminate ? '100%' : `${Math.min(100, Math.max(0, progress))}%`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
