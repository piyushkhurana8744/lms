'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

interface LandingMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  dashboardRoute: string;
  onLogout: () => void;
}

export function LandingMobileMenu({
  isOpen,
  onClose,
  isAuthenticated,
  dashboardRoute,
  onLogout
}: LandingMobileMenuProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const scrollToSection = (id: string) => {
    onClose();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 md:hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative z-10 w-4/5 max-w-sm bg-[var(--bg-surface)] border-l border-[var(--brand-border)] h-full p-6 flex flex-col justify-between shadow-2xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--brand-border)] pb-4">
            <span className="font-bold text-base text-[var(--brand-text)]">Navigation</span>
            <button
              onClick={onClose}
              aria-label="Close navigation menu"
              className="p-2 rounded-lg border border-[var(--brand-border)] text-[var(--text-muted)] hover:text-[var(--brand-text)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Links */}
          <div className="flex flex-col space-y-4">
            <a
              href="#architecture"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('architecture');
              }}
              className="text-base font-semibold text-[var(--brand-text)] hover:text-[#BE1E2E] transition-colors py-2 border-b border-[var(--brand-border)]/50"
            >
              Architecture
            </a>
            <a
              href="#subsystems"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('subsystems');
              }}
              className="text-base font-semibold text-[var(--brand-text)] hover:text-[#BE1E2E] transition-colors py-2 border-b border-[var(--brand-border)]/50"
            >
              Subsystems
            </a>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="space-y-3 pt-6 border-t border-[var(--brand-border)]">
          {isAuthenticated ? (
            <>
              <Link
                href={dashboardRoute}
                onClick={onClose}
                className="w-full block text-center py-3 text-sm font-semibold rounded-lg btn-primary shadow-md"
              >
                Go to Console
              </Link>
              <button
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="w-full text-center py-2.5 text-sm font-medium text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500/10"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={onClose}
                className="w-full block text-center py-3 text-sm font-semibold rounded-lg btn-primary shadow-md"
              >
                Launch Console
              </Link>
              <Link
                href="/login"
                onClick={onClose}
                className="w-full block text-center py-2.5 text-sm font-medium text-[var(--brand-text)] border border-[var(--brand-border)] rounded-lg hover:bg-[var(--bg-surface-elevated)]"
              >
                Login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
