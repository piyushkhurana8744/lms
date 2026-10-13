'use client';

import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';

export interface ActiveOperationItem {
  id: string;
  label: string;
  title?: string;
  progress?: number;
  type?: 'GLOBAL' | 'PAGE' | 'SECTION' | 'UPLOAD' | 'ACTION' | 'MUTATION';
  status: 'IN_PROGRESS' | 'SUCCESS' | 'FAILED';
  message?: string;
  description?: string;
  successMessage?: string;
}

interface OperationToastProps {
  operations: ActiveOperationItem[];
  onDismiss?: (id: string) => void;
}

export function OperationToast({ operations, onDismiss }: OperationToastProps) {
  // Only display background & upload operations or completed feedback items
  const visibleItems = operations.filter(
    (op) => op.type === 'UPLOAD' || op.type === 'ACTION' || op.type === 'MUTATION' || op.status !== 'IN_PROGRESS'
  );

  if (visibleItems.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9990] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {visibleItems.map((op) => {
        const isSuccess = op.status === 'SUCCESS';
        const isFailed = op.status === 'FAILED';
        const isInProgress = op.status === 'IN_PROGRESS';

        return (
          <div
            key={op.id}
            className={`pointer-events-auto p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 transform translate-y-0 ${
              isSuccess
                ? 'bg-emerald-950/90 border-emerald-700/50 text-emerald-100'
                : isFailed
                ? 'bg-rose-950/90 border-rose-700/50 text-rose-100'
                : 'bg-[var(--brand-card)]/95 border-[var(--brand-border)] text-[var(--brand-text)]'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {isInProgress && (
                  <Loader2 className="w-4 h-4 text-[#BE1E2E] animate-spin shrink-0" />
                )}
                {isSuccess && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                {isFailed && (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold leading-tight">
                    {op.label}
                  </p>
                  {op.message && (
                    <p className="text-[11px] opacity-80 leading-tight">
                      {op.message}
                    </p>
                  )}
                  {isSuccess && op.successMessage && (
                    <p className="text-[11px] text-emerald-300 font-medium leading-tight">
                      {op.successMessage}
                    </p>
                  )}
                </div>
              </div>

              {onDismiss && !isInProgress && (
                <button
                  onClick={() => onDismiss(op.id)}
                  className="p-1 rounded-lg hover:bg-black/10 transition-colors opacity-70 hover:opacity-100"
                  aria-label="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {isInProgress && op.progress !== undefined && op.progress !== null && (
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-[10px] font-mono opacity-70">
                  <span>Progress</span>
                  <span>{Math.round(op.progress)}%</span>
                </div>
                <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#BE1E2E] transition-all duration-200"
                    style={{ width: `${Math.min(100, Math.max(0, op.progress))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
