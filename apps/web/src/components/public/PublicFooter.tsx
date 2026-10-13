'use client';

import React from 'react';
import Link from 'next/link';
import { usePublicBrand } from './PublicBrandProvider';
import { BookOpen, ShieldCheck, CheckCircle2 } from 'lucide-react';

export function PublicFooter() {
  const brand = usePublicBrand();

  return (
    <footer className="border-t border-[var(--brand-border)] bg-[var(--bg-surface)] text-[var(--brand-text)] py-12 px-6 transition-colors">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Col 1: Branding & Bio */}
        <div className="space-y-3 md:col-span-1">
          <div className="flex items-center gap-2.5">
            {brand.branding?.logoUrl ? (
              <img
                src={brand.branding.logoUrl}
                alt={brand.name}
                className="h-8 max-w-[140px] object-contain"
              />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-[#BE1E2E] text-white font-extrabold text-base flex items-center justify-center shadow-md">
                D
              </div>
            )}
            <span className="font-extrabold text-base tracking-tight">
              {brand.branding?.companyName || brand.name}
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            {brand.footer?.description || 'Enterprise Digital Learning Management Platform empowering students with industry-grade skills and interactive curriculum.'}
          </p>
        </div>

        {/* Col 2: Quick Links */}
        <div className="space-y-2 text-xs">
          <h4 className="font-mono font-bold uppercase text-[10px] text-[#BE1E2E] tracking-wider">Quick Links</h4>
          <ul className="space-y-1.5 font-medium">
            <li>
              <Link href="/" className="hover:text-[#BE1E2E] transition-colors">
                Home Page
              </Link>
            </li>
            <li>
              <Link href="/courses" className="hover:text-[#BE1E2E] transition-colors">
                Course Catalog
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-[#BE1E2E] transition-colors">
                About Platform
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-[#BE1E2E] transition-colors">
                Contact & Support
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Learning Categories */}
        <div className="space-y-2 text-xs">
          <h4 className="font-mono font-bold uppercase text-[10px] text-[#BE1E2E] tracking-wider">Learning Tracks</h4>
          <ul className="space-y-1.5 font-medium text-[var(--text-muted)]">
            <li>Digital Marketing Masterclass</li>
            <li>Search Engine Optimization (SEO)</li>
            <li>Social Media & Performance Ads</li>
            <li>Analytics & Growth Engineering</li>
          </ul>
        </div>

        {/* Col 4: Operational Status */}
        <div className="space-y-3 text-xs">
          <h4 className="font-mono font-bold uppercase text-[10px] text-[#BE1E2E] tracking-wider">System Status</h4>
          <div className="p-3 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" /> Tenant System Operational
            </div>
            <p className="text-[10px] text-[var(--text-muted)] font-mono">
              Workspace ID: {brand.slug || 'main'}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Copyright Bar */}
      <div className="max-w-7xl mx-auto pt-8 mt-8 border-t border-[var(--brand-border)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[var(--text-muted)]">
        <span>Copyright © {new Date().getFullYear()} {brand.branding?.companyName || brand.name}. All rights reserved.</span>
        <span className="text-[10px]">Powered by DIDM LMS Platform</span>
      </div>
    </footer>
  );
}
