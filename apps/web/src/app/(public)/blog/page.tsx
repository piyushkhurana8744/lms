'use client';

import React from 'react';
import Link from 'next/link';
import { usePublicBrand } from '@/components/public/PublicBrandProvider';
import { Sparkles, FileText, Calendar, ArrowRight } from 'lucide-react';

export default function PublicBlogPage() {
  const brand = usePublicBrand();

  const articles = [
    {
      slug: 'seo-trends-2026',
      title: 'Top Search Engine Optimization Strategies for 2026',
      excerpt: 'Discover how AI-driven search algorithms, core web vitals, and entity-based SEO are reshaping search rankings.',
      category: 'SEO',
      date: 'Aug 15, 2026'
    },
    {
      slug: 'social-media-funnels',
      title: 'Building High-Converting Social Media Funnels',
      excerpt: 'Learn step-by-step performance advertising techniques to capture leads and turn viewers into loyal customers.',
      category: 'Performance Marketing',
      date: 'Aug 10, 2026'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-16 space-y-10">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-[#BE1E2E]/10 text-[#BE1E2E] text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Knowledge & Insights</span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-[var(--brand-text)]">
          {brand.branding?.companyName || brand.name} Articles & Blog
        </h1>
        <p className="text-sm text-[var(--text-muted)] max-w-xl mx-auto leading-relaxed">
          Stay updated with industry guides, digital marketing trends, and learning strategies.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {articles.map((article) => (
          <div key={article.slug} className="glass-card p-6 rounded-3xl border border-[var(--brand-border)] space-y-3 hover:border-[#BE1E2E]/40 transition-colors">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="px-2.5 py-0.5 rounded-full font-bold bg-[#BE1E2E]/10 text-[#BE1E2E] border border-[#BE1E2E]/20 uppercase">
                {article.category}
              </span>
              <span className="text-[var(--text-muted)] flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {article.date}
              </span>
            </div>

            <h3 className="text-lg font-extrabold text-[var(--brand-text)] leading-snug">{article.title}</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">{article.excerpt}</p>

            <div className="pt-2 border-t border-[var(--brand-border)]">
              <Link href={`/blog/${article.slug}`} className="text-xs font-bold text-[#BE1E2E] hover:underline flex items-center gap-1 font-mono">
                Read Full Article <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
