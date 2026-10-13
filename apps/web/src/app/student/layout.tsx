'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { useConfirmation } from '@/components/confirmation/useConfirmation';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  LogOut,
  Menu,
  X,
  ChevronRight,
  GraduationCap,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { STUDENT_NAVIGATION_CONFIG } from '@/config/navigation';
import { filterNavigationTree, type NavigationItem } from '@edtech/permissions';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout, isLoading } = useAuth();
  const { confirm } = useConfirmation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Compute permission-filtered navigation from single source of truth
  const navigation: NavigationItem[] = useMemo(() => {
    if (isLoading || !user) return [];
    const userPerms = (user as any)?.permissions || [];
    const tree = filterNavigationTree(STUDENT_NAVIGATION_CONFIG, userPerms, user?.isSuperAdmin);

    return tree.map((item) => ({
      ...item,
      current:
        item.href === '/student'
          ? pathname === '/student'
          : item.href !== '#' && pathname.startsWith(item.href),
    }));
  }, [user, pathname, isLoading]);

  return (
    <div className="min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)] flex flex-col md:flex-row transition-colors">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[var(--bg-surface)] border-b border-[var(--brand-border)] sticky top-0 z-40 backdrop-blur-md">
        <Link href="/student" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#BE1E2E] to-[#E11D48] text-white font-bold flex items-center justify-center text-sm shadow-md shadow-[#BE1E2E]/20">
            D
          </div>
          <div>
            <span className="text-sm font-extrabold tracking-tight text-[var(--brand-text)] block leading-tight">
              DIDM LMS
            </span>
            <span className="text-[10px] text-[var(--text-muted)] font-mono block">Student Portal</span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <ThemeToggle />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl border border-[var(--brand-border)] text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Backdrop for Mobile Drawer */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden animate-in fade-in"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 z-50 h-screen w-64 bg-[var(--bg-surface)] border-r border-[var(--brand-border)] flex flex-col justify-between p-4 transition-transform duration-200 ease-in-out shadow-xs ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0 space-y-4">
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-[var(--brand-border)]">
            <Link href="/student" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#BE1E2E] to-[#E11D48] text-white font-black text-lg flex items-center justify-center shadow-md shadow-[#BE1E2E]/25 group-hover:scale-105 transition-transform">
                D
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-[var(--brand-text)] block leading-none">
                  DIDM LMS
                </span>
                <span className="text-[10px] font-mono text-primary tracking-wider block mt-1 uppercase font-bold">
                  Student Portal
                </span>
              </div>
            </Link>
          </div>

          {/* Quick Learning Status Strip */}
          <div className="px-3 py-2 rounded-xl bg-primary/5 border border-primary/15 flex items-center justify-between text-xs">
            <span className="text-[11px] font-medium text-muted-foreground">Academic Status</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {isLoading ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} className="h-9 rounded-xl bg-muted/60 animate-pulse" />
                ))}
              </div>
            ) : navigation.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground rounded-xl bg-muted/30 border">
                No active modules available. Please contact your coordinator.
              </div>
            ) : (
              navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      item.current
                        ? 'bg-primary/10 text-primary font-bold border border-primary/25 shadow-xs'
                        : 'text-foreground/80 hover:bg-muted/70 hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {Icon && (
                        <Icon
                          className={`w-4 h-4 flex-shrink-0 ${
                            item.current ? 'text-primary' : 'text-muted-foreground'
                          }`}
                        />
                      )}
                      <span className="truncate">{item.name}</span>
                    </div>
                    {item.current && (
                      <ChevronRight className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    )}
                  </Link>
                );
              })
            )}
          </nav>
        </div>

        {/* User Profile & Theme Footer */}
        <div className="pt-3 mt-2 border-t border-[var(--brand-border)] space-y-2.5 flex-shrink-0">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-center border border-white/10 flex-shrink-0 shadow-xs">
                {(user?.name || 'S').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate text-[var(--brand-text)] leading-tight">
                  {user?.name || 'Student User'}
                </p>
                <p className="text-[10px] font-mono text-[var(--text-muted)] truncate">
                  {user?.email || 'student@didm.edu'}
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>

          <button
            onClick={async () => {
              const confirmed = await confirm({
                title: 'Log out of your account?',
                description: 'You will need to sign in again to access your student learning portal.',
                type: 'primary',
                confirmText: 'Log Out',
                cancelText: 'Stay Logged In',
              });
              if (confirmed) {
                logout();
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl border border-red-500/20 text-red-500 text-xs font-semibold hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
