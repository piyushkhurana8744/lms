'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { useConfirmation } from '@/components/confirmation/useConfirmation';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  ShieldAlert,
  Building2,
  Users,
  KeyRound,
  Search,
  ExternalLink,
  Activity,
  Server,
  Zap,
  Globe,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  Radio,
  Lock,
  Sparkles,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Cpu
} from 'lucide-react';

interface ITenantSummary {
  id: string;
  name: string;
  slug: string;
  customDomain?: string;
  isCustomDomainVerified?: boolean;
  status: string;
  createdAt: string;
}

interface IPlatformUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  isSuperAdmin: boolean;
  tenantId: string | null;
  tenantName: string;
  roles: string[];
  memberships: Array<{
    tenantId: string;
    tenantName: string;
    role: string;
    status: string;
  }>;
  createdAt: string;
}

interface ICommandCenterMetrics {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  totalRegisteredUsers: number;
  databaseState: string;
}

export default function PlatformCommandCenterPage() {
  const { user, impersonate, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { confirm } = useConfirmation();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'tenants' | 'users' | 'system'>('tenants');
  const [metrics, setMetrics] = useState<ICommandCenterMetrics | null>(null);
  const [tenants, setTenants] = useState<ITenantSummary[]>([]);
  const [users, setUsers] = useState<IPlatformUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('');
  const [isActionPending, setIsActionPending] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [impersonationModalTarget, setImpersonationModalTarget] = useState<IPlatformUser | null>(null);
  const [impersonationReasonInput, setImpersonationReasonInput] = useState('');

  const fetchPlatformData = useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const [summaryRes, usersRes] = await Promise.all([
        fetch('/api/v1/platform/command-center/summary'),
        fetch(
          `/api/v1/platform/users?limit=50${
            selectedTenantFilter ? `&tenantId=${selectedTenantFilter}` : ''
          }${userSearch ? `&search=${encodeURIComponent(userSearch)}` : ''}`
        )
      ]);

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        if (summaryData.success) {
          setMetrics(summaryData.data.metrics);
          setTenants(summaryData.data.tenants || []);
        }
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        if (usersData.success && Array.isArray(usersData.data)) {
          setUsers(usersData.data);
        }
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to load platform data.' });
    } finally {
      setIsLoading(false);
    }
  }, [selectedTenantFilter, userSearch]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      if (!user.isSuperAdmin) {
        router.push('/admin');
        return;
      }
      fetchPlatformData();
    }
  }, [authLoading, isAuthenticated, user, router, fetchPlatformData]);

  const handleSwitchTenant = async (tenant: ITenantSummary) => {
    setIsActionPending(tenant.id);
    try {
      const res = await fetch(`/api/v1/platform/switch-tenant/${tenant.id}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to switch tenant context');
      }

      setFeedback({
        type: 'success',
        message: `Switched active organization to ${tenant.name}. Redirecting to Admin Console...`
      });

      setTimeout(() => {
        router.push('/admin');
      }, 800);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
      setIsActionPending(null);
    }
  };

  const handleConfirmImpersonate = async () => {
    if (!impersonationModalTarget) return;
    const reason = impersonationReasonInput.trim();
    if (!reason) {
      setFeedback({ type: 'error', message: 'An audit reason is required to initiate impersonation.' });
      return;
    }

    const targetUser = impersonationModalTarget;
    setIsActionPending(targetUser.id);
    try {
      await impersonate(targetUser.id, reason);

      // Determine appropriate panel destination based on role
      const primaryRole = (
        targetUser.roles?.[0] ||
        targetUser.memberships?.[0]?.role ||
        ''
      ).toUpperCase();
      let destination = '/admin';
      if (primaryRole.includes('STUDENT')) {
        destination = '/student';
      } else if (primaryRole.includes('INSTRUCTOR') || primaryRole.includes('TRAINER') || primaryRole.includes('FACULTY')) {
        destination = '/instructor';
      }

      setFeedback({
        type: 'success',
        message: `Impersonation active. Launching ${primaryRole} portal...`
      });
      setImpersonationModalTarget(null);

      setTimeout(() => {
        window.location.href = destination;
      }, 400);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to initiate secret login' });
      setIsActionPending(null);
    }
  };

  if (authLoading || (!user?.isSuperAdmin && isAuthenticated)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--brand-background)] text-[var(--brand-text)]">
        <div className="flex flex-col items-center gap-3 p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-xl">
          <Loader2 className="w-8 h-8 animate-spin text-[#BE1E2E]" />
          <p className="text-xs font-bold text-[var(--text-muted)]">Verifying SuperAdmin privileges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)] transition-colors flex flex-col selection:bg-[#BE1E2E] selection:text-white">
      {/* Top Universal Navbar */}
      <header className="sticky top-0 z-40 bg-[var(--bg-surface)]/90 backdrop-blur-md border-b border-[var(--brand-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#BE1E2E] to-purple-700 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-[#BE1E2E]/20">
              D
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-[var(--brand-text)]">
                  DIDM Platform Console
                </span>
                <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  SuperAdmin
                </span>
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)] block">
                Enterprise Multi-Tenant Engine
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/admin"
              className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface-elevated)] hover:bg-[var(--brand-border)] text-xs font-bold text-[var(--brand-text)] transition-colors"
            >
              <Building2 className="w-3.5 h-3.5 text-[#BE1E2E]" />
              <span>Admin Workspace</span>
            </Link>

            <Link
              href="/"
              target="_blank"
              className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface-elevated)] hover:bg-[var(--brand-border)] text-xs font-bold text-[var(--brand-text)] transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              <span>Live Website</span>
            </Link>

            <ThemeToggle />

            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-8 space-y-8 pb-20">
        {/* Hero Section Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-950/10 via-purple-950/10 to-[var(--bg-surface)] p-6 sm:p-8 border border-[var(--brand-border)] shadow-sm backdrop-blur-sm">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#BE1E2E]/10 border border-[#BE1E2E]/20 text-[#BE1E2E] text-xs font-extrabold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Central Governance & Impersonation</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--brand-text)]">
                Platform Command Center
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-2xl leading-relaxed">
                Centralized multi-tenant oversight. Seamlessly switch between institute workspaces, monitor database state, and execute audit-logged secret login into any account.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchPlatformData}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-elevated)] text-xs font-bold text-[var(--brand-text)] shadow-sm transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#BE1E2E] ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Data</span>
              </button>
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="hover:underline text-[11px]">
              Dismiss
            </button>
          </div>
        )}

        {/* KPI Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-sm flex flex-col justify-between space-y-2 hover:border-[#BE1E2E]/30 transition-all">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              <span>Total Institutes</span>
              <Building2 className="w-4 h-4 text-[#BE1E2E]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[var(--brand-text)]">
              {metrics?.totalTenants ?? '...'}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <span>{metrics?.activeTenants ?? 0} active</span>
              <span className="text-[var(--text-muted)]">•</span>
              <span className="text-[var(--text-muted)]">{metrics?.suspendedTenants ?? 0} suspended</span>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-sm flex flex-col justify-between space-y-2 hover:border-blue-500/30 transition-all">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              <span>Registered Accounts</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[var(--brand-text)]">
              {metrics?.totalRegisteredUsers ?? '...'}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] font-medium">
              Students, Instructors & Admins
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-sm flex flex-col justify-between space-y-2 hover:border-emerald-500/30 transition-all">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              <span>Database Engine</span>
              <Database className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[var(--brand-text)] capitalize">
              {metrics?.databaseState ?? 'Connected'}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Operational (MongoDB Isolation)</span>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-sm flex flex-col justify-between space-y-2 hover:border-amber-500/30 transition-all">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              <span>Secret Login Engine</span>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-500">Active</div>
            <div className="text-[11px] text-[var(--text-muted)] font-medium">
              1-Click SuperAdmin Impersonation
            </div>
          </div>
        </div>

        {/* Segmented Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[var(--brand-border)] pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('tenants')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'tenants'
                ? 'bg-[#BE1E2E] text-white shadow-md shadow-[#BE1E2E]/20'
                : 'text-[var(--text-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Organizations ({tenants.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'users'
                ? 'bg-[#BE1E2E] text-white shadow-md shadow-[#BE1E2E]/20'
                : 'text-[var(--text-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)]'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Secret Login & User Directory</span>
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'system'
                ? 'bg-[#BE1E2E] text-white shadow-md shadow-[#BE1E2E]/20'
                : 'text-[var(--text-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)]'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>System Architecture</span>
          </button>
        </div>

        {/* TAB 1: TENANTS LIST */}
        {activeTab === 'tenants' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tenants.map((t) => (
                <div
                  key={t.id}
                  className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--brand-border)] hover:border-[#BE1E2E]/40 transition-all flex flex-col justify-between gap-5 group shadow-sm hover:shadow-lg hover:shadow-red-500/5"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#BE1E2E]/10 text-[#BE1E2E] font-extrabold flex items-center justify-center text-sm">
                          {t.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-base text-[var(--brand-text)] group-hover:text-[#BE1E2E] transition-colors">
                            {t.name}
                          </h3>
                          <span className="text-[10px] font-mono text-[var(--text-muted)] block">
                            slug: {t.slug}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold ${
                          t.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--brand-border)]">
                      {t.customDomain ? (
                        <p className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-medium">
                          <Globe className="w-3.5 h-3.5" />
                          <span>{t.customDomain}</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-[var(--text-muted)] italic">
                          Standard subdomain routing
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[var(--brand-border)] flex items-center gap-2">
                    <button
                      onClick={() => handleSwitchTenant(t)}
                      disabled={isActionPending === t.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#BE1E2E] to-red-600 hover:from-red-600 hover:to-[#BE1E2E] text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    >
                      {isActionPending === t.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Zap className="w-3.5 h-3.5" />
                      )}
                      <span>Switch Workspace</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedTenantFilter(t.id);
                        setActiveTab('users');
                      }}
                      className="p-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface-elevated)] hover:bg-[var(--brand-border)] text-[var(--text-muted)] hover:text-[var(--brand-text)] transition-colors"
                      title="View Users of this organization"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: USER DIRECTORY & SECRET LOGIN */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Filter and Search */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search user by name or email..."
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-[var(--brand-text)] focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={selectedTenantFilter}
                  onChange={(e) => setSelectedTenantFilter(e.target.value)}
                  className="px-3.5 py-2.5 text-xs rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-[var(--brand-text)] focus:outline-none focus:border-[#BE1E2E]"
                >
                  <option value="">All Organizations</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={fetchPlatformData}
                  className="px-4 py-2.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-xs font-bold text-[var(--brand-text)] hover:bg-[var(--brand-border)]"
                >
                  Filter
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="rounded-3xl border border-[var(--brand-border)] bg-[var(--bg-surface)] overflow-hidden shadow-sm">
              {isLoading ? (
                <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-[#BE1E2E]" />
                  <p className="text-xs text-[var(--text-muted)]">Loading user accounts...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="p-16 text-center text-[var(--text-muted)] text-xs">
                  No users found matching the search criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[var(--brand-text)]">
                    <thead className="bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] uppercase text-[10px] font-extrabold tracking-wider border-b border-[var(--brand-border)]">
                      <tr>
                        <th className="p-4">User Details</th>
                        <th className="p-4">Assigned Role</th>
                        <th className="p-4">Organization Context</th>
                        <th className="p-4">Account Status</th>
                        <th className="p-4 text-right">Secret Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--brand-border)]">
                      {users.map((u) => {
                        const isSelf = u.id === user?.id;
                        const roleName = (u.roles?.[0] || u.memberships?.[0]?.role || 'User').toUpperCase();

                        return (
                          <tr key={u.id} className="hover:bg-[var(--bg-surface-elevated)]/60 transition-colors">
                            <td className="p-4">
                              <div className="font-extrabold text-[var(--brand-text)] flex items-center gap-2">
                                <span>{u.name}</span>
                                {u.isSuperAdmin && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                    SuperAdmin
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[var(--text-muted)] font-mono">{u.email}</div>
                            </td>

                            <td className="p-4">
                              <span
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase font-mono ${
                                  roleName.includes('ADMIN')
                                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                                    : roleName.includes('INSTRUCTOR')
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                }`}
                              >
                                {roleName}
                              </span>
                            </td>

                            <td className="p-4 text-[var(--brand-text)] font-medium">
                              {u.tenantName || 'Global Platform'}
                            </td>

                            <td className="p-4">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  u.status === 'ACTIVE'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                }`}
                              >
                                {u.status}
                              </span>
                            </td>

                            <td className="p-4 text-right">
                              {isSelf ? (
                                <span className="text-[11px] text-[var(--text-muted)] italic">
                                  Current Session
                                </span>
                              ) : (
                                <button
                                  onClick={() => {
                                    setImpersonationModalTarget(u);
                                    setImpersonationReasonInput('');
                                  }}
                                  disabled={isActionPending === u.id || u.status !== 'ACTIVE'}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-[#BE1E2E] to-purple-600 text-white font-bold text-[11px] shadow-md shadow-red-500/20 hover:opacity-95 active:scale-95 transition-all disabled:opacity-40"
                                >
                                  {isActionPending === u.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <KeyRound className="w-3.5 h-3.5" />
                                  )}
                                  <span>Secret Login</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SYSTEM ARCHITECTURE & HEALTH */}
        {activeTab === 'system' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-extrabold text-[var(--brand-text)]">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <span>Multi-Tenancy Security Engine</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Every API transaction strictly enforces tenant-level database isolation via Mongoose middleware plugin and Node.js `AsyncLocalStorage` context storage.
              </p>
              <div className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] font-mono text-[11px] text-[var(--brand-text)] space-y-1">
                <div>✓ Tenant Isolation Plugin: ACTIVE</div>
                <div>✓ AsyncLocalStorage Context: ATTACHED</div>
                <div>✓ Strict RBAC Resolution: ENFORCED</div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-extrabold text-[var(--brand-text)]">
                <Activity className="w-5 h-5 text-[#BE1E2E]" />
                <span>Audit & Security Telemetry</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                All SuperAdmin impersonations, tenant context switches, and grade alterations produce immutable audit log entries tagged with actor IDs and IP metadata.
              </p>
              <div className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] font-mono text-[11px] text-[var(--brand-text)] space-y-1">
                <div>✓ Impersonation Logging: ENABLED</div>
                <div>✓ Exit Banner Session Sync: LIVE</div>
                <div>✓ Tamper-proof Action Log: PERSISTED</div>
              </div>
            </div>
          </div>
        )}

        {/* Impersonation Reason & Confirmation Modal */}
        {impersonationModalTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-lg rounded-3xl bg-[var(--bg-surface)] border border-[var(--brand-border)] p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="flex items-center gap-3 pb-4 border-b border-[var(--brand-border)]">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[var(--brand-text)]">
                    Secure User Impersonation
                  </h3>
                  <span className="text-[11px] text-[var(--text-muted)] block">
                    Audit-Logged Support Session
                  </span>
                </div>
              </div>

              <div className="space-y-3 p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Target User:</span>
                  <span className="font-bold text-[var(--brand-text)]">{impersonationModalTarget.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Target Email:</span>
                  <span className="font-mono text-[var(--brand-text)]">{impersonationModalTarget.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Organization:</span>
                  <span className="font-medium text-[var(--brand-text)]">{impersonationModalTarget.tenantName || 'Global Platform'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Target Role:</span>
                  <span className="font-mono uppercase font-bold text-blue-500">
                    {impersonationModalTarget.roles?.[0] || impersonationModalTarget.memberships?.[0]?.role || 'User'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-[var(--brand-text)]">
                  Reason for Impersonation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={impersonationReasonInput}
                  onChange={(e) => setImpersonationReasonInput(e.target.value)}
                  placeholder="e.g. Investigating instructor grading issue for ticket #402"
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface-elevated)] text-xs text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E]"
                />
                <p className="text-[10px] text-[var(--text-muted)]">
                  This reason will be immutably recorded in the platform security audit log.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setImpersonationModalTarget(null)}
                  disabled={Boolean(isActionPending)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImpersonate}
                  disabled={!impersonationReasonInput.trim() || Boolean(isActionPending)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-[#BE1E2E] to-purple-600 hover:opacity-95 active:scale-95 text-white text-xs font-bold shadow-md shadow-red-500/20 flex items-center gap-2 transition-all disabled:opacity-40"
                >
                  {isActionPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Establishing Session...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Launch Impersonation</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
