'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePublicBrand } from './PublicBrandProvider';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@edtech/ui';
import { Search, Menu, X, BookOpen, User, Sparkles, ShieldCheck } from 'lucide-react';

export function PublicHeader() {
  const pathname = usePathname();
  const brand = usePublicBrand();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const defaultNavItems = [
    { name: 'Home', href: '/' },
    { name: 'Courses', href: '/courses' },
    { name: 'Batches', href: '/batches' },
    { name: 'Quizzes', href: '/quizzes' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' }
  ];

  const navItems = (brand.navigation?.links && brand.navigation.links.length > 0)
    ? brand.navigation.links.map((l) => ({ name: l.label, href: l.href, external: l.external }))
    : defaultNavItems;

  return (
    <header className="sticky top-0 z-50 bg-[var(--bg-surface)]/85 backdrop-blur-xl border-b border-[var(--brand-border)] transition-all">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {/* Tenant Logo & Name */}
        <Link href="/" className="flex items-center gap-3 group">
          {brand.branding?.logoUrl ? (
            <img
              src={brand.branding.logoUrl}
              alt={brand.name}
              className="h-8 max-w-[140px] object-contain group-hover:opacity-90 transition-opacity"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#BE1E2E] to-[#80101B] text-white font-black text-lg flex items-center justify-center shadow-md shadow-[#BE1E2E]/20 group-hover:scale-105 transition-transform">
              D
            </div>
          )}
          <span className="font-extrabold text-base tracking-tight text-[var(--brand-text)] hidden sm:inline-block">
            {brand.branding?.companyName || brand.name}
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-xs font-semibold p-1 rounded-full bg-[var(--bg-surface-elevated)]/60 border border-[var(--brand-border)]">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[var(--bg-surface)] text-[#BE1E2E] font-bold shadow-sm border border-[var(--brand-border)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--brand-text)]'
                }`}
              >
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Action Bar */}
        <div className="hidden md:flex items-center gap-2.5">
          <ThemeToggle />

          <Link href="/login">
            <button className="px-3.5 py-2 text-xs font-bold border border-[var(--brand-border)] rounded-xl hover:bg-[var(--bg-surface-elevated)] transition-colors flex items-center gap-1.5 text-[var(--brand-text)]">
              <User className="w-3.5 h-3.5" /> Sign In
            </button>
          </Link>

          <Link href="/courses">
            <Button variant="primary" className="btn-primary text-xs px-4 py-2 rounded-xl font-bold shadow-md shadow-[#BE1E2E]/20 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Explore Courses
            </Button>
          </Link>
        </div>

        {/* Mobile Hamburger Control */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl border border-[var(--brand-border)] text-[var(--brand-text)]"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-[var(--brand-border)] bg-[var(--bg-surface)] px-6 py-5 space-y-4 shadow-xl">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-sm font-semibold text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)]"
              >
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="pt-3 border-t border-[var(--brand-border)] space-y-2">
            <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
              <button className="w-full py-2.5 text-xs font-bold border border-[var(--brand-border)] rounded-xl text-[var(--brand-text)]">
                Sign In
              </button>
            </Link>
            <Link href="/courses" onClick={() => setIsMobileMenuOpen(false)}>
              <Button variant="primary" className="btn-primary w-full text-xs py-2.5 font-bold rounded-xl">
                Explore Courses
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
