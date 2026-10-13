import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const variantClasses = {
    primary: 'btn-primary font-semibold rounded-lg shadow-md hover:scale-[1.02] transition-transform',
    secondary: 'bg-[var(--bg-surface-elevated)] text-[var(--brand-text)] font-semibold rounded-lg border border-[var(--brand-border)] hover:bg-[var(--brand-border)] transition-colors',
    outline: 'border border-[var(--brand-primary)] text-[#BE1E2E] font-semibold rounded-lg hover:bg-[#BE1E2E]/10 transition-colors',
    ghost: 'text-[var(--text-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)] font-medium rounded-lg transition-colors'
  };

  return (
    <button
      className={`${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
