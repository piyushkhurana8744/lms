'use client';

import React from 'react';
import Link from 'next/link';
import { useBranding } from '@/components/branding-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { ShieldCheck, Mail, ArrowLeft, Building2, Sparkles } from 'lucide-react';

export default function RegisterPage() {
  const branding = useBranding();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--brand-background)] text-[var(--brand-text)] px-4 py-8 transition-colors relative overflow-hidden">
      {/* Ambient background lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#BE1E2E]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl glass-card-premium border border-[var(--brand-border)] shadow-2xl text-center space-y-6 relative overflow-hidden animate-fade-in">
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#BE1E2E] to-rose-600 text-white font-black text-2xl flex items-center justify-center mb-3 shadow-xl shadow-[#BE1E2E]/30 ring-4 ring-[#BE1E2E]/10">
            D
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#BE1E2E]/10 border border-[#BE1E2E]/20 text-[#BE1E2E] text-[10px] font-mono font-bold uppercase tracking-wider mb-1.5">
            <Sparkles className="w-3 h-3" /> Enterprise Provisioning
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--brand-text)] font-heading">
            Organization Onboarding
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">Controlled Tenant Account Provisioning</p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)]/80 border border-[var(--brand-border)] text-xs text-[var(--text-muted)] leading-relaxed text-left space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs text-[var(--brand-text)]">
            <Building2 className="w-4 h-4 text-[#BE1E2E]" />
            <span>Controlled Access Governance:</span>
          </div>
          <p>
            {branding.companyName || 'DIDM'} operates as a strict enterprise multi-tenant LMS platform. Tenant workspace accounts, instructor faculties, and branch staff accounts must be provisioned by an authorized platform administrator.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <a
            href="mailto:support@didm.in?subject=LMS%20Tenant%20Access%20Request"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#BE1E2E] via-red-600 to-[#BE1E2E] hover:from-[#a01826] hover:to-red-700 text-white font-bold transition-all shadow-lg shadow-[#BE1E2E]/25 text-xs hover:scale-[1.02] active:scale-[0.98]"
          >
            <Mail className="w-4 h-4" />
            <span>Contact Administrator / Request Access</span>
          </a>

          <Link
            href="/login"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface-elevated)]/60 hover:bg-[var(--bg-surface-elevated)] text-xs font-bold text-[var(--brand-text)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Sign In</span>
          </Link>
        </div>
      </div>

      <div className="mt-6 text-center text-[11px] text-[var(--text-muted)] font-mono flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>Secured by DIDM RBAC multi-tenant infrastructure</span>
      </div>
    </div>
  );
}
