'use client';

import React, { useState, Suspense } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useBranding } from '@/components/branding-provider';
import { useRouter, useSearchParams } from 'next/navigation';
import { sanitizeRedirectUrl, getDashboardRoute } from '@/utils/navigation';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { Mail, Lock, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';

function LoginForm() {
  const { login, user } = useAuth();
  const branding = useBranding();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loggedUser = await login({ email, password });
      const targetDestination = sanitizeRedirectUrl(redirectParam, getDashboardRoute(loggedUser));
      router.push(targetDestination);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl glass-card-premium border border-[var(--brand-border)] shadow-2xl space-y-6 relative overflow-hidden animate-fade-in">
      {/* Decorative ambient orb inside card */}
      <div className="absolute -top-16 -right-16 w-44 h-44 bg-[#BE1E2E]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col items-center text-center relative z-10">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#BE1E2E] to-rose-600 text-white font-black text-2xl flex items-center justify-center mb-3 shadow-xl shadow-[#BE1E2E]/30 ring-4 ring-[#BE1E2E]/10">
          D
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#BE1E2E]/10 border border-[#BE1E2E]/20 text-[#BE1E2E] text-[10px] font-mono font-bold uppercase tracking-wider mb-1.5">
          <Sparkles className="w-3 h-3" /> Secure Gateway
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--brand-text)] font-heading">
          Sign In to {branding.companyName || 'DIDM'}
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">
          Enterprise Digital Education Platform
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-500 text-xs font-bold flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
        <div>
          <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@didm.in"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface-elevated)]/80 text-[var(--brand-text)] placeholder-[var(--text-muted)]/60 focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] focus:border-transparent text-xs font-medium transition-all"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs font-bold text-[#BE1E2E] hover:underline font-mono">
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface-elevated)]/80 text-[var(--brand-text)] placeholder-[var(--text-muted)]/60 focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] focus:border-transparent text-xs font-medium transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#BE1E2E] via-red-600 to-[#BE1E2E] hover:from-[#a01826] hover:to-red-700 text-white font-black transition-all shadow-xl shadow-[#BE1E2E]/25 text-xs disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>Sign In to Console</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="pt-3 border-t border-[var(--brand-border)] flex items-center justify-between text-xs text-[var(--text-muted)] relative z-10">
        <span>Need workspace access?</span>
        <Link href="/register" className="text-[#BE1E2E] font-bold hover:underline font-mono">
          Request onboarding →
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--brand-background)] text-[var(--brand-text)] px-4 py-8 transition-colors relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#BE1E2E]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <Suspense fallback={<div className="text-xs text-[var(--text-muted)] font-mono">Loading authentication portal...</div>}>
        <LoginForm />
      </Suspense>

      <div className="mt-6 text-center text-[11px] text-[var(--text-muted)] font-mono flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>Secured by DIDM RBAC multi-tenant infrastructure</span>
      </div>
    </div>
  );
}
