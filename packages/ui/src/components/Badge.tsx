import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'brand' | 'success' | 'outline';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'brand',
  className = ''
}) => {
  const variantClasses = {
    brand: 'bg-[#BE1E2E]/10 text-[#BE1E2E] border border-[#BE1E2E]/25',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25',
    outline: 'border border-[var(--brand-border)] text-[var(--text-muted)]'
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono leading-none ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
};
