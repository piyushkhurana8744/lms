'use client';

import React, { useEffect, useState, useRef } from 'react';
import { AlertTriangle, RefreshCw, X, ChevronDown, ChevronUp, ShieldAlert, Code } from 'lucide-react';
import { Button } from '@edtech/ui';
import { NormalizedAppError } from '@/lib/error-handler';

export interface GlobalErrorModalProps {
  error: NormalizedAppError | null;
  isOpen: boolean;
  onClose: () => void;
  onRetry?: () => void | Promise<any>;
}

export function GlobalErrorModal({ error, isOpen, onClose, onRetry }: GlobalErrorModalProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape key press & lock body scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    // Auto focus close button for accessibility
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !error) return null;

  const isDev = process.env.NODE_ENV === 'development';
  const hasRetry = typeof onRetry === 'function';

  const handleRetryClick = async () => {
    if (!onRetry) return;
    setIsRetrying(true);
    try {
      await onRetry();
      onClose();
    } catch {
      // If retry fails again, keep modal open
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="global-error-title"
      aria-describedby="global-error-description"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] text-[var(--brand-text)] shadow-2xl overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
      >
        {/* Top Header */}
        <div className="p-6 pb-4 border-b border-[var(--brand-border)] flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#BE1E2E]/10 border border-[#BE1E2E]/20 text-[#BE1E2E] flex items-center justify-center flex-shrink-0 shadow-sm">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 id="global-error-title" className="text-lg font-extrabold tracking-tight leading-snug text-[var(--brand-text)]">
                {error.title}
              </h2>
              {(error.code || error.statusCode) && (
                <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider text-[#BE1E2E] bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 mt-1">
                  {error.code ? `Error: ${error.code}` : `HTTP ${error.statusCode}`}
                </span>
              )}
            </div>
          </div>

          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close error dialog"
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <p id="global-error-description" className="text-sm text-[var(--brand-text)] leading-relaxed whitespace-pre-line">
            {error.message}
          </p>

          {/* Field Errors List */}
          {error.fieldErrors && Object.keys(error.fieldErrors).length > 0 && (
            <div className="p-3.5 rounded-xl bg-red-500/5 border border-red-500/20 space-y-1.5 font-mono text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 block">Specific Errors:</span>
              <ul className="space-y-1 text-[var(--brand-text)]">
                {Object.entries(error.fieldErrors).map(([field, msg]) => (
                  <li key={field} className="flex items-center gap-1.5">
                    <span className="font-bold text-[#BE1E2E]">• {field}:</span> {msg}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Collapsible Technical Details (Dev Mode Only) */}
          {isDev && error.technicalDetails && (
            <div className="pt-2 border-t border-[var(--brand-border)]">
              <button
                onClick={() => setShowTechnicalDetails((prev) => !prev)}
                className="flex items-center justify-between w-full text-xs font-mono text-[var(--text-muted)] hover:text-[var(--brand-text)] transition-colors py-1"
              >
                <span className="flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-[#BE1E2E]" /> Technical Details (Development Only)
                </span>
                {showTechnicalDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showTechnicalDetails && (
                <pre className="mt-2 p-3.5 rounded-xl bg-black/80 text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-48 border border-white/10 select-all">
                  {error.technicalDetails}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 px-6 bg-[var(--bg-surface-elevated)] border-t border-[var(--brand-border)] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold border border-[var(--brand-border)] rounded-xl hover:bg-[var(--bg-surface)] transition-colors text-[var(--brand-text)]"
          >
            Close
          </button>

          {hasRetry && (
            <Button
              variant="primary"
              className="btn-primary text-xs px-5 shadow-lg shadow-[#BE1E2E]/20"
              disabled={isRetrying}
              onClick={handleRetryClick}
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Try Again
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
