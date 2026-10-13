'use client';

import React from 'react';
import { usePublicBrand } from '@/components/public/PublicBrandProvider';
import { Sparkles, BookOpen, ShieldCheck, Award } from 'lucide-react';

export default function PublicAboutPage() {
  const brand = usePublicBrand();

  return (
    <div className="max-w-5xl mx-auto px-6 py-16 space-y-12">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-[#BE1E2E]/10 text-[#BE1E2E] text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>About {brand.branding?.companyName || brand.name}</span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-[var(--brand-text)]">
          Empowering Learners Worldwide
        </h1>
        <p className="text-sm text-[var(--text-muted)] max-w-xl mx-auto leading-relaxed">
          {brand.branding?.companyName || brand.name} delivers modern digital education with structured curricula and practical learning resources.
        </p>
      </div>

      <div className="glass-card p-8 md:p-10 rounded-3xl border border-[var(--brand-border)] grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        <div className="space-y-2 p-4">
          <div className="w-10 h-10 rounded-xl bg-[#BE1E2E]/10 text-[#BE1E2E] flex items-center justify-center mx-auto">
            <BookOpen className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-extrabold text-[var(--brand-text)]">Expert Curricula</h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Curated by industry practitioners with real-world case studies and project goals.
          </p>
        </div>

        <div className="space-y-2 p-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-extrabold text-[var(--brand-text)]">Enterprise Quality</h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Built on a multi-tenant workspace engine for reliability, security, and scalability.
          </p>
        </div>

        <div className="space-y-2 p-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-extrabold text-[var(--brand-text)]">Career Advancement</h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Gain practical competencies in digital marketing, analytics, and performance engineering.
          </p>
        </div>
      </div>
    </div>
  );
}
