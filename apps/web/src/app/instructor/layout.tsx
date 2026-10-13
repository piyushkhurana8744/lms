'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { useConfirmation } from '@/components/confirmation/useConfirmation';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  LogOut,
  ShieldCheck,
  Menu,
  X,
  GraduationCap,
  ChevronRight,
} from 'lucide-react';
import { INSTRUCTOR_NAVIGATION_CONFIG } from '@/config/navigation';
import { filterNavigationTree, type NavigationItem } from '@edtech/permissions';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboardRoute } from '@/utils/navigation';
import { NotificationBell } from '@/components/notifications/NotificationBell';

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const { confirm } = useConfirmation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Portal Authorization Guard: Ensure current authenticated identity has instructor/faculty authority
  useEffect(() => {
    if (!isLoading && user) {
      if (user.isSuperAdmin) return;
      const roles = (user.roles || []).map((r: any) =>
        typeof r === 'string' ? r.toUpperCase() : (r.slug || r.name || '').toUpperCase()
      );
      const isStudentOnly = roles.includes('STUDENT') && !roles.some((r) => r.includes('INSTRUCTOR') || r.includes('ADMIN'));
      if (isStudentOnly) {
        const target = getDashboardRoute(user);
        router.replace(target === '/instructor' ? '/student' : target);
      }
    }
  }, [user, isLoading, router]);

  // Compute permission-filtered navigation from single source of truth
  const navigation: NavigationItem[] = useMemo(() => {
    if (isLoading || !user) return [];
    const userPerms = (user as any)?.permissions || [];
    const tree = filterNavigationTree(INSTRUCTOR_NAVIGATION_CONFIG, userPerms, user?.isSuperAdmin);

    return tree.map((item) => ({
      ...item,
      current:
        item.href === '/instructor'
          ? pathname === '/instructor'
          : item.href !== '#' && pathname.startsWith(item.href),
    }));
  }, [user, pathname, isLoading]);

  return (
    <div className="min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)] flex flex-col md:flex-row transition-colors">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[var(--bg-surface)] border-b border-[var(--brand-border)] sticky top-0 z-40 backdrop-blur-md">
        <Link href="/instructor" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-blue-500/20">
            T
          </div>
          <div>
            <span className="text-sm font-extrabold tracking-tight text-[var(--brand-text)] block leading-tight">
              DIDM Faculty
            </span>
            <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider block">
              Instructor OS
            </span>
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

      {/* Sidebar Desktop */}
      <aside
        className={`fixed md:sticky top-0 z-50 h-screen w-64 bg-[var(--bg-surface)] border-r border-[var(--brand-border)] flex flex-col justify-between p-4 transition-transform duration-200 ease-in-out shadow-xs ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0 space-y-4">
          {/* Logo Brand */}
          <div className="flex items-center justify-between pb-3.5 border-b border-[var(--brand-border)]">
            <Link href="/instructor" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-lg shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-[var(--brand-text)] block leading-none">
                  DIDM Faculty
                </span>
                <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider block mt-1 font-mono">
                  Trainer OS
                </span>
              </div>
            </Link>
          </div>

          {/* Faculty Status Strip */}
          <div className="px-3 py-2 rounded-xl bg-blue-500/5 border border-blue-500/15 flex items-center justify-between text-xs">
            <span className="text-[11px] font-medium text-muted-foreground">Faculty Status</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              Assigned Active
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {isLoading ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-9 rounded-xl bg-muted/60 animate-pulse" />
                ))}
              </div>
            ) : navigation.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground rounded-xl bg-muted/30 border">
                No modules are currently available for this account. Contact your administrator.
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
                        ? 'bg-blue-600 text-white font-bold shadow-xs shadow-blue-600/20'
                        : 'text-foreground/80 hover:bg-muted/70 hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {Icon && (
                        <Icon
                          className={`w-4 h-4 flex-shrink-0 ${
                            item.current ? 'text-white' : 'text-muted-foreground'
                          }`}
                        />
                      )}
                      <span className="truncate">{item.name}</span>
                    </div>
                    {item.current && (
                      <ChevronRight className="w-3.5 h-3.5 text-white/90 flex-shrink-0" />
                    )}
                  </Link>
                );
              })
            )}
          </nav>
        </div>

        {/* Bottom Actions & User Profile */}
        <div className="pt-3 mt-2 border-t border-[var(--brand-border)] space-y-2.5 flex-shrink-0">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-center border border-white/10 flex-shrink-0 shadow-xs">
                {(user?.name || 'F').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate text-[var(--brand-text)] leading-tight">
                  {user?.name || 'Faculty Member'}
                </p>
                <p className="text-[10px] font-mono text-blue-500 font-bold truncate">
                  {user?.email || 'trainer@didm.edu'}
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>

          {user?.isSuperAdmin && (
            <Link
              href="/platform"
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold hover:bg-purple-500/20 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Platform SuperAdmin</span>
            </Link>
          )}

          <button
            onClick={async () => {
              const confirmed = await confirm({
                title: 'Sign out of Faculty Portal?',
                description: 'You will need to log in again to access instructor tools.',
                type: 'primary',
                confirmText: 'Sign Out',
                cancelText: 'Cancel',
              });
              if (confirmed) {
                logout();
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 text-xs font-semibold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
