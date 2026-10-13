'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { usePublicBrand } from '@/components/public/PublicBrandProvider';
import { ArrowLeft, Calendar, User, Sparkles } from 'lucide-react';

export default function PublicBlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const brand = usePublicBrand();

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
      <Link href="/blog" className="text-xs font-mono text-[var(--text-muted)] hover:text-[#BE1E2E] flex items-center gap-1">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Blog
      </Link>

      <div className="glass-card p-8 md:p-10 rounded-3xl border border-[var(--brand-border)] space-y-6">
        <div className="space-y-3 border-b border-[var(--brand-border)] pb-6">
          <span className="px-3 py-0.5 rounded-full text-xs font-mono font-bold uppercase bg-[#BE1E2E]/10 text-[#BE1E2E] border border-[#BE1E2E]/20">
            INDUSTRY INSIGHTS
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--brand-text)]">
            Digital Marketing & SEO Strategy Breakdown
          </h1>
          <div className="flex items-center gap-4 text-xs font-mono text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-[#BE1E2E]" /> {brand.branding?.companyName || brand.name} Editorial
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Published August 2026
            </span>
          </div>
        </div>

        <div className="prose prose-invert text-xs text-[var(--brand-text)] leading-relaxed space-y-4 font-sans">
          <p>
            In the rapidly evolving digital landscape, organizations require agile marketing strategies to capture target audience attention and sustain organic growth momentum.
          </p>
          <h3 className="text-base font-bold text-[var(--brand-text)] mt-4">1. Entity-Based Optimization</h3>
          <p>
            Search algorithms prioritize comprehensive entity topical authority over simple keyword density. Structuring content into clear curriculum-style modules helps establish search intent authority.
          </p>
          <h3 className="text-base font-bold text-[var(--brand-text)] mt-4">2. Performance Advertising Funnels</h3>
          <p>
            Combining organic search content with targeted social performance campaigns builds high-converting customer acquisition pathways.
          </p>
        </div>
      </div>
    </div>
  );
}
