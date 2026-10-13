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
  ChevronDown,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { ADMIN_NAVIGATION_CONFIG } from '@/config/navigation';
import { filterNavigationTree, type NavigationItem } from '@edtech/permissions';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboardRoute } from '@/utils/navigation';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { BranchSwitcher } from '@/components/branch/BranchSwitcher';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const { confirm } = useConfirmation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Portal Authorization Guard: Ensure current authenticated identity has admin authority
  useEffect(() => {
    if (!isLoading && user) {
      if (user.isSuperAdmin) return;
      const roles = (user.roles || []).map((r: any) =>
        typeof r === 'string' ? r.toUpperCase() : (r.slug || r.name || '').toUpperCase()
      );
      const isStudentOnly = roles.includes('STUDENT') && !roles.some((r) => r.includes('ADMIN'));
      if (isStudentOnly) {
        const target = getDashboardRoute(user);
        router.replace(target === '/admin' ? '/student' : target);
      }
    }
  }, [user, isLoading, router]);

  // Compute permission-filtered navigation from single source of truth
  const navigation: NavigationItem[] = useMemo(() => {
    if (isLoading || !user) return [];
    const userPerms = (user as any)?.permissions || [];
    const tree = filterNavigationTree(ADMIN_NAVIGATION_CONFIG, userPerms, user?.isSuperAdmin);

    return tree.map((item) => {
      const isCurrent =
        item.href === '/admin'
          ? pathname === '/admin'
          : item.href !== '#' && pathname.startsWith(item.href);

      return {
        ...item,
        current: isCurrent,
        children: item.children?.map((sub) => ({
          ...sub,
          current: pathname === sub.href,
        })),
      };
    });
  }, [user, pathname, isLoading]);

  return (
    <div className="min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)] flex flex-col md:flex-row transition-colors">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[var(--bg-surface)] border-b border-[var(--brand-border)] sticky top-0 z-40 backdrop-blur-md">
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#BE1E2E] to-[#E11D48] text-white font-bold flex items-center justify-center text-sm shadow-md shadow-[#BE1E2E]/20">
            D
          </div>
          <div>
            <span className="text-sm font-extrabold tracking-tight text-[var(--brand-text)] block leading-tight">
              DIDM LMS
            </span>
            <span className="text-[10px] text-[var(--text-muted)] font-mono block">Enterprise Console</span>
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
            <Link href="/admin" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#BE1E2E] to-[#E11D48] text-white font-black text-lg flex items-center justify-center shadow-md shadow-[#BE1E2E]/25 group-hover:scale-105 transition-transform">
                D
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-[var(--brand-text)] block leading-none">
                  DIDM LMS
                </span>
                <span className="text-[10px] font-mono font-bold text-primary tracking-wider block mt-1 uppercase">
                  Workspace Admin
                </span>
              </div>
            </Link>
          </div>

          {/* Active Workspace & Branch Switcher */}
          <div className="space-y-2">
            <BranchSwitcher />
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="w-full py-1.5 px-3 rounded-xl text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Visit Public Site</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          </div>

          {/* Scrollable Navigation Items */}
          <nav className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {isLoading ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
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
                  <div key={item.name} className="space-y-0.5">
                    {item.href !== '#' ? (
                      <Link
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          item.current
                            ? 'bg-primary/10 text-primary font-bold border border-primary/25 shadow-2xs'
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
                        {item.children ? (
                          <ChevronDown
                            className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${
                              item.current ? 'text-primary rotate-180' : 'text-muted-foreground'
                            }`}
                          />
                        ) : (
                          item.current && (
                            <ChevronRight className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          )
                        )}
                      </Link>
                    ) : (
                      <div className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground opacity-70">
                        <div className="flex items-center gap-2.5">
                          {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                          <span className="truncate">{item.name}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted border">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Sub-items if expanded */}
                    {item.children && item.current && (
                      <div className="pl-6 space-y-0.5 border-l border-primary/20 ml-4 py-1 animate-in fade-in duration-150">
                        {item.children.map((sub) => (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`block px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                              pathname === sub.href
                                ? 'text-primary font-bold bg-primary/10'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                            }`}
                          >
                            {sub.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </nav>
        </div>

        {/* User Profile & Theme Footer */}
        <div className="pt-3 mt-2 border-t border-[var(--brand-border)] space-y-2.5 flex-shrink-0">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 text-white text-xs font-bold flex items-center justify-center border border-white/10 flex-shrink-0 shadow-2xs">
                {(user?.name || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate text-[var(--brand-text)] leading-tight">
                  {user?.name || 'Admin User'}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground truncate">
                  {user?.isSuperAdmin ? 'SuperAdmin' : 'Tenant Admin'}
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>

          <button
            onClick={async () => {
              const confirmed = await confirm({
                title: 'Log out of your account?',
                description: 'You will need to sign in again to access your LMS admin dashboard.',
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
