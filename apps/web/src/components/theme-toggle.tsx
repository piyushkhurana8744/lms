'use client';

import React from 'react';
import { useTheme } from './theme-provider';
import { Sun, Moon, Monitor } from 'lucide-react';
import { ThemeMode } from '@edtech/types';

const options: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { mode, setMode } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Select theme mode"
      className={`inline-flex items-center gap-0.5 p-1 rounded-xl border backdrop-blur-md shadow-inner
        bg-[var(--bg-surface-elevated)] border-[var(--brand-border)] ${className}`}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={`${opt.label} theme`}
            onClick={() => setMode(opt.value)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
              transition-all duration-200 cursor-pointer select-none
              ${isActive
                ? 'bg-[#BE1E2E] text-white shadow-md shadow-[#BE1E2E]/30'
                : 'text-[var(--text-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--brand-border)]'
              }
            `}
            title={`Switch to ${opt.label} theme`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
