'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function LoadingButton({
  loading = false,
  loadingText,
  variant = 'primary',
  size = 'md',
  icon,
  children,
  disabled,
  className = '',
  onClick,
  ...props
}: LoadingButtonProps) {
  const isDisabled = disabled || loading;

  const handlePreventDoubleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDisabled) {
      e.preventDefault();
      return;
    }
    if (onClick) {
      onClick(e);
    }
  };

  // Base styles
  const baseStyle =
    'inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed select-none relative overflow-hidden';

  // Variants
  const variantStyles = {
    primary:
      'bg-gradient-to-r from-[#BE1E2E] to-[#E52D3D] text-white hover:brightness-110 active:scale-[0.99] shadow-md shadow-[#BE1E2E]/20 focus:ring-[#BE1E2E]',
    secondary:
      'bg-[var(--brand-card,#1A1A1A)] text-[var(--brand-text,#FFFFFF)] border border-[var(--brand-border,rgba(255,255,255,0.1))] hover:bg-neutral-800 focus:ring-neutral-500',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.99] shadow-md shadow-rose-600/20 focus:ring-rose-500',
    outline:
      'border border-[var(--brand-border,rgba(255,255,255,0.2))] text-[var(--brand-text,#FFFFFF)] hover:bg-white/5 focus:ring-neutral-400',
    ghost:
      'text-[var(--brand-text,#FFFFFF)] hover:bg-white/10 focus:ring-neutral-400'
  };

  // Sizes
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5 min-h-[32px]',
    md: 'px-4 py-2 text-xs sm:text-sm rounded-xl gap-2 min-h-[40px]',
    lg: 'px-6 py-3 text-sm sm:text-base rounded-xl gap-2.5 min-h-[48px]'
  };

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-busy={loading}
      onClick={handlePreventDoubleClick}
      className={`${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}
