'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { ThemeMode, ActiveTheme, IThemeContext } from '@edtech/types';

const STORAGE_KEY = 'didm_theme_preference';

function getSystemPreference(): ActiveTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeToDOM(theme: ActiveTheme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
}

function resolveActiveTheme(mode: ThemeMode): ActiveTheme {
  if (mode === 'light' || mode === 'dark') return mode;
  return getSystemPreference();
}

const ThemeContext = createContext<IThemeContext | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeRaw] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'system';
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    return 'system';
  });

  const [activeTheme, setActiveTheme] = useState<ActiveTheme>(() => {
    if (typeof window === 'undefined') return 'light';
    // Read what the anti-flash script already applied
    const current = document.documentElement.getAttribute('data-theme');
    if (current === 'light' || current === 'dark') return current;
    return resolveActiveTheme('system');
  });

  const modeRef = useRef(mode);
  modeRef.current = mode;

  // On mount, ensure DOM is in sync with state
  useEffect(() => {
    const resolved = resolveActiveTheme(mode);
    setActiveTheme(resolved);
    applyThemeToDOM(resolved);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for OS preference changes (for 'system' mode)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (modeRef.current === 'system') {
        const resolved = getSystemPreference();
        setActiveTheme(resolved);
        applyThemeToDOM(resolved);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeRaw(newMode);
    modeRef.current = newMode;
    try { localStorage.setItem(STORAGE_KEY, newMode); } catch {}
    const resolved = resolveActiveTheme(newMode);
    setActiveTheme(resolved);
    applyThemeToDOM(resolved);
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, activeTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): IThemeContext {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
