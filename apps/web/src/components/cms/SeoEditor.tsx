'use client';

import React, { useState } from 'react';
import { IWebsiteSeo } from '@edtech/types';
import { Button } from '@edtech/ui';
import { MediaSelector } from './MediaSelector';
import { Globe, Image as ImageIcon, Search } from 'lucide-react';

export interface SeoEditorProps {
  seo: IWebsiteSeo;
  onChange: (seo: IWebsiteSeo) => void;
}

export function SeoEditor({ seo, onChange }: SeoEditorProps) {
  const [isOgModalOpen, setIsOgModalOpen] = useState(false);

  const titleLength = seo.title?.length || 0;
  const descLength = seo.description?.length || 0;

  return (
    <div className="space-y-8 text-[var(--brand-text)]">
      <div className="p-6 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-6">
        <div>
          <h3 className="text-base font-extrabold flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#BE1E2E]" /> Search Engine Optimization (SEO) & Social Sharing
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Optimize browser title tags, search preview snippets, and social media OpenGraph cards.</p>
        </div>

        <div className="space-y-5 text-xs">
          {/* Meta Title */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[var(--brand-text)]">SEO Meta Title</label>
              <span className={`text-[10px] font-mono font-bold ${titleLength > 60 ? 'text-amber-500' : 'text-[var(--text-muted)]'}`}>
                {titleLength} / 60 characters (recommended 50–60)
              </span>
            </div>
            <input
              type="text"
              placeholder="e.g. DIDM Academy | Digital Skills & Certification Platform"
              value={seo.title || ''}
              onChange={(e) => onChange({ ...seo, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs focus:outline-none focus:border-[#BE1E2E]"
            />
          </div>

          {/* Meta Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[var(--brand-text)]">SEO Meta Description</label>
              <span className={`text-[10px] font-mono font-bold ${descLength > 160 ? 'text-amber-500' : 'text-[var(--text-muted)]'}`}>
                {descLength} / 160 characters (recommended 150–160)
              </span>
            </div>
            <textarea
              rows={3}
              placeholder="e.g. Master in-demand digital skills with industry experts. Certified online courses with flexible learning options."
              value={seo.description || ''}
              onChange={(e) => onChange({ ...seo, description: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs focus:outline-none focus:border-[#BE1E2E]"
            />
          </div>

          {/* Keywords */}
          <div className="space-y-1.5">
            <label className="font-bold text-[var(--brand-text)]">Keywords (Comma-separated)</label>
            <input
              type="text"
              placeholder="e.g. digital marketing, online courses, certification, LMS"
              value={seo.keywords ? seo.keywords.join(', ') : ''}
              onChange={(e) =>
                onChange({
                  ...seo,
                  keywords: e.target.value
                    .split(',')
                    .map((k) => k.trim())
                    .filter(Boolean)
                })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs focus:outline-none focus:border-[#BE1E2E]"
            />
          </div>

          {/* OpenGraph Image */}
          <div className="space-y-2 pt-2 border-t border-[var(--brand-border)]">
            <label className="font-bold text-[var(--brand-text)] block">OpenGraph Social Sharing Graphic (OG Image)</label>
            <div className="p-4 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-12 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] overflow-hidden flex items-center justify-center">
                  {seo.ogImageUrl ? (
                    <img src={seo.ogImageUrl} alt="OG Image" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-[var(--text-muted)] opacity-50" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-xs">{seo.ogImageUrl ? 'OG Image Selected' : 'No OG Image'}</div>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono">1200x630 Social Banner</div>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOgModalOpen(true)}
              >
                {seo.ogImageUrl ? 'Change Image' : 'Select Image'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Google Search Result Preview */}
      <div className="p-6 rounded-2xl bg-[var(--brand-background)] border border-[var(--brand-border)] space-y-3">
        <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] font-extrabold flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5" /> Google Search Preview
        </span>

        <div className="p-4 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface-elevated)] space-y-1 font-sans">
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono truncate">https://yourdomain.com</div>
          <div className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer truncate">
            {seo.title || 'DIDM Academy | Digital Skills Platform'}
          </div>
          <div className="text-xs text-[var(--text-muted)] line-clamp-2">
            {seo.description || 'Explore certified online courses and professional skills programs.'}
          </div>
        </div>
      </div>

      <MediaSelector
        isOpen={isOgModalOpen}
        onClose={() => setIsOgModalOpen(false)}
        selectedMediaId={seo.ogImageMediaId}
        onSelect={(id, url) => onChange({ ...seo, ogImageMediaId: id, ogImageUrl: url })}
        title="Select Social Sharing (OG) Image"
      />
    </div>
  );
}
