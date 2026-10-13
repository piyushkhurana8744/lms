'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useGoBack } from '@/hooks/use-go-back';

export interface BackButtonProps {
  fallback?: string;
  label?: string;
  className?: string;
  hasUnsavedChanges?: boolean;
  unsavedMessage?: string;
}

/**
 * Reusable Global BackButton Component
 * Supports internal browser history back, query parameter preservation,
 * context-sensitive fallback, light/dark/system themes, and keyboard accessibility.
 */
export function BackButton({
  fallback = '/admin',
  label = 'Go Back',
  className = '',
  hasUnsavedChanges = false,
  unsavedMessage
}: BackButtonProps) {
  const { goBack } = useGoBack({
    fallback,
    hasUnsavedChanges,
    unsavedMessage
  });

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Go back to previous page"
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold text-[var(--brand-text)] bg-[var(--bg-surface)] border border-[var(--brand-border)] hover:border-[#BE1E2E]/60 hover:text-[#BE1E2E] hover:bg-[var(--bg-surface-elevated)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] active:scale-95 shadow-sm min-h-[36px] ${className}`}
    >
      <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
      <span>{label}</span>
    </button>
  );
}
