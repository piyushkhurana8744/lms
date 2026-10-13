'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/components/auth-provider';
import { useBranding } from '@/components/branding-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { useConfirmation } from '@/components/confirmation/useConfirmation';
import { getDashboardRoute } from '@/utils/navigation';
import { LandingMobileMenu } from './landing-mobile-menu';
import { Menu } from 'lucide-react';

export function LandingHeader() {
  const branding = useBranding();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { confirm } = useConfirmation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const dashboardRoute = getDashboardRoute(user);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <nav className="relative z-30 border-b border-[var(--brand-border)] bg-[var(--nav-bg)] backdrop-blur-xl sticky top-0 px-6 py-3.5 transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Brand Identity */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] flex items-center justify-center p-0.5 group-hover:border-[#BE1E2E]/50 transition-colors">
              <Image
                src={branding.logoUrl || '/didmlogo.png'}
                alt={branding.companyName || 'DIDM'}
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-[var(--brand-text)] flex items-center gap-2">
                {branding.companyName}
                {!branding.isWhiteLabel && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#BE1E2E]/10 text-[#BE1E2E] border border-[#BE1E2E]/25 font-mono font-semibold leading-none">
                    Platform
                  </span>
                )}
              </span>
              <span className="text-[11px] text-[var(--text-muted)] block leading-none mt-0.5">Digital LMS Ecosystem</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <a
              href="#architecture"
              onClick={(e) => scrollToSection(e, 'architecture')}
              className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--brand-text)] transition-colors"
            >
              Architecture
            </a>
            <a
              href="#subsystems"
              onClick={(e) => scrollToSection(e, 'subsystems')}
              className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--brand-text)] transition-colors"
            >
              Subsystems
            </a>
          </div>

          {/* Desktop Right Action Area */}
          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />

            {!isLoading && (
              <>
                {isAuthenticated ? (
                  <div className="flex items-center gap-3">
                    <Link
                      href={dashboardRoute}
                      className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg btn-primary shadow-md hover:scale-[1.03] transition-transform"
                    >
                      Console ({user?.name?.split(' ')[0] || 'Dashboard'})
                    </Link>
                    <button
                      onClick={async () => {
                        const confirmed = await confirm({
                          title: 'Log out of your account?',
                          description: 'You will need to sign in again to access your LMS account.',
                          type: 'primary',
                          confirmText: 'Log Out',
                          cancelText: 'Stay Logged In'
                        });
                        if (confirmed) {
                          logout();
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-red-500 transition-colors border border-[var(--brand-border)] rounded-lg"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Link
                      href="/login"
                      className="px-4 py-2 text-xs sm:text-sm font-medium text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] rounded-lg transition-colors"
                    >
                      Login
                    </Link>
                    <Link
                      href="/login"
                      className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg btn-primary shadow-md hover:scale-[1.03] transition-transform"
                    >
                      Launch Console
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex items-center gap-3 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open mobile navigation menu"
              aria-expanded={isMobileMenuOpen}
              className="p-2 rounded-lg border border-[var(--brand-border)] text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Navigation */}
      <LandingMobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isAuthenticated={isAuthenticated}
        dashboardRoute={dashboardRoute}
        onLogout={logout}
      />
    </>
  );
}
