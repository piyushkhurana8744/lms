'use client';

import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, Globe, LogOut, Info, AlertCircle, RefreshCw, X } from 'lucide-react';
import { Button } from '@edtech/ui';

export type ConfirmationType = 'danger' | 'warning' | 'primary' | 'info';

export interface ConfirmationOptions {
  title: string;
  description?: string;
  resourceName?: string;
  type?: ConfirmationType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => Promise<any> | void;
}


export interface ConfirmationModalProps extends ConfirmationOptions {
  isOpen: boolean;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmationModal({
  isOpen,
  title,
  description,
  resourceName,
  type = 'danger',
  confirmText,
  cancelText = 'Cancel',
  isLoading = false,
  onConfirm,
  onCancel
}: ConfirmationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape key press (unless loading) & lock body scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    // Focus Cancel button by default for safety on destructive actions
    setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 50);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  const getIconAndColors = () => {
    switch (type) {
      case 'danger':
        return {
          icon: <Trash2 className="w-6 h-6 text-red-500" />,
          badgeBg: 'bg-red-500/10 border-red-500/20',
          confirmBtnClass: 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20',
          defaultConfirmText: 'Yes, Delete'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-500" />,
          badgeBg: 'bg-amber-500/10 border-amber-500/20',
          confirmBtnClass: 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20',
          defaultConfirmText: 'Yes, Proceed'
        };
      case 'primary':
        return {
          icon: <Globe className="w-6 h-6 text-[#BE1E2E]" />,
          badgeBg: 'bg-[#BE1E2E]/10 border-[#BE1E2E]/20',
          confirmBtnClass: 'btn-primary bg-[#BE1E2E] hover:bg-[#a01826] text-white shadow-lg shadow-[#BE1E2E]/20',
          defaultConfirmText: 'Confirm'
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-6 h-6 text-blue-500" />,
          badgeBg: 'bg-blue-500/10 border-blue-500/20',
          confirmBtnClass: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20',
          defaultConfirmText: 'Confirm'
        };
    }
  };

  const styling = getIconAndColors();
  const finalConfirmText = confirmText || styling.defaultConfirmText;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
      aria-describedby="confirmation-modal-description"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onCancel();
        }
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-3xl bg-[var(--bg-surface)] border border-[var(--brand-border)] text-[var(--brand-text)] shadow-2xl overflow-hidden transform transition-all animate-in zoom-in-95 duration-200 text-center p-6 sm:p-8 space-y-6"
      >
        {/* Top Icon Badge */}
        <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto shadow-md ${styling.badgeBg}`}>
          {styling.icon}
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <h2 id="confirmation-modal-title" className="text-xl font-extrabold tracking-tight text-[var(--brand-text)] leading-snug">
            {title}
          </h2>

          {description && (
            <p id="confirmation-modal-description" className="text-xs text-[var(--text-muted)] leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Optional Resource Name Highlight Card */}
        {resourceName && (
          <div className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-xs font-semibold text-[var(--brand-text)] truncate max-w-xs mx-auto">
            &ldquo;{resourceName}&rdquo;
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            ref={cancelButtonRef}
            disabled={isLoading}
            onClick={onCancel}
            className="w-full sm:w-1/2 px-5 py-2.5 text-xs font-semibold border border-[var(--brand-border)] rounded-xl hover:bg-[var(--bg-surface-elevated)] transition-colors text-[var(--brand-text)] disabled:opacity-40"
          >
            {cancelText}
          </button>

          <button
            disabled={isLoading}
            onClick={() => onConfirm()}
            className={`w-full sm:w-1/2 px-5 py-2.5 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-40 ${styling.confirmBtnClass}`}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing...
              </>
            ) : (
              finalConfirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
