'use client';

import React, { useState } from 'react';
import { IWebsiteHero } from '@edtech/types';
import { Button } from '@edtech/ui';
import { MediaSelector } from './MediaSelector';
import { Sparkles, Image as ImageIcon, ExternalLink, Eye } from 'lucide-react';

export interface HeroEditorProps {
  hero: IWebsiteHero;
  onChange: (hero: IWebsiteHero) => void;
}

export function HeroEditor({ hero, onChange }: HeroEditorProps) {
  const [isBgModalOpen, setIsBgModalOpen] = useState(false);

  return (
    <div className="space-y-8 text-[var(--brand-text)]">
      {/* Hero Control Card */}
      <div className="p-6 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--brand-border)] pb-4">
          <div>
            <h3 className="text-base font-extrabold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#BE1E2E]" /> Hero Banner Section
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Configure the main hero banner on your public LMS homepage.</p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={hero.enabled !== false}
              onChange={(e) => onChange({ ...hero, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#BE1E2E]"></div>
            <span className="ml-2 text-xs font-bold">{hero.enabled !== false ? 'Enabled' : 'Disabled'}</span>
          </label>
        </div>

        {hero.enabled !== false && (
          <div className="space-y-5 text-xs">
            {/* Eyebrow & Title */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-[var(--brand-text)]">Eyebrow / Badge Text</label>
                <input
                  type="text"
                  placeholder="e.g. #1 Digital Skill Platform"
                  value={hero.eyebrow || ''}
                  onChange={(e) => onChange({ ...hero, eyebrow: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[var(--brand-text)]">Hero Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Skills That Drive Your Future"
                  value={hero.title || ''}
                  onChange={(e) => onChange({ ...hero, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>
            </div>

            {/* Subtitle */}
            <div className="space-y-1.5">
              <label className="font-bold text-[var(--brand-text)]">Hero Subtitle</label>
              <textarea
                rows={2}
                placeholder="e.g. Industry-aligned certified courses taught by expert instructors."
                value={hero.subtitle || ''}
                onChange={(e) => onChange({ ...hero, subtitle: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs focus:outline-none focus:border-[#BE1E2E]"
              />
            </div>

            {/* Background Media */}
            <div className="space-y-2 pt-2">
              <label className="font-bold text-[var(--brand-text)] block">Background Image</label>
              <div className="p-4 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-12 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] overflow-hidden flex items-center justify-center">
                    {hero.backgroundUrl ? (
                      <img src={hero.backgroundUrl} alt="Hero Background" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-[var(--text-muted)] opacity-50" />
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-xs">{hero.backgroundUrl ? 'Background Selected' : 'No Background Image'}</div>
                    <div className="text-[10px] text-[var(--text-muted)] font-mono">1920x1080 High-Res Image</div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBgModalOpen(true)}
                >
                  {hero.backgroundUrl ? 'Change Image' : 'Select Image'}
                </Button>
              </div>
            </div>

            {/* Primary & Secondary Call To Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-[var(--brand-border)]">
              {/* Primary CTA */}
              <div className="space-y-3 p-4 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)]">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-xs text-[var(--brand-text)]">Primary Button (CTA)</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hero.primaryButton?.enabled !== false}
                      onChange={(e) =>
                        onChange({
                          ...hero,
                          primaryButton: { ...hero.primaryButton, enabled: e.target.checked }
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#BE1E2E]"></div>
                  </label>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Label (e.g. Explore Courses)"
                    value={hero.primaryButton?.label || ''}
                    onChange={(e) =>
                      onChange({
                        ...hero,
                        primaryButton: { ...hero.primaryButton, label: e.target.value }
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[var(--brand-border)] bg-[var(--bg-surface)] text-xs"
                  />
                  <input
                    type="text"
                    placeholder="URL (e.g. /courses)"
                    value={hero.primaryButton?.href || ''}
                    onChange={(e) =>
                      onChange({
                        ...hero,
                        primaryButton: { ...hero.primaryButton, href: e.target.value }
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[var(--brand-border)] bg-[var(--bg-surface)] font-mono text-xs"
                  />
                </div>
              </div>

              {/* Secondary CTA */}
              <div className="space-y-3 p-4 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)]">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-xs text-[var(--brand-text)]">Secondary Button</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(hero.secondaryButton?.enabled)}
                      onChange={(e) =>
                        onChange({
                          ...hero,
                          secondaryButton: { ...hero.secondaryButton, enabled: e.target.checked }
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#BE1E2E]"></div>
                  </label>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Label (e.g. Contact Us)"
                    value={hero.secondaryButton?.label || ''}
                    onChange={(e) =>
                      onChange({
                        ...hero,
                        secondaryButton: { ...hero.secondaryButton, label: e.target.value }
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[var(--brand-border)] bg-[var(--bg-surface)] text-xs"
                  />
                  <input
                    type="text"
                    placeholder="URL (e.g. /contact)"
                    value={hero.secondaryButton?.href || ''}
                    onChange={(e) =>
                      onChange({
                        ...hero,
                        secondaryButton: { ...hero.secondaryButton, href: e.target.value }
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[var(--brand-border)] bg-[var(--bg-surface)] font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Hero Banner Preview */}
      {hero.enabled !== false && (
        <div className="p-8 rounded-2xl bg-gradient-to-r from-gray-900 via-gray-800 to-black text-white space-y-5 relative overflow-hidden shadow-2xl border border-[var(--brand-border)]">
          {hero.backgroundUrl && (
            <img src={hero.backgroundUrl} alt="Bg" className="absolute inset-0 w-full h-full object-cover opacity-20" />
          )}

          <div className="relative z-10 max-w-xl space-y-3">
            {hero.eyebrow && (
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#BE1E2E] bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
                {hero.eyebrow}
              </span>
            )}
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              {hero.title || 'Your Hero Banner Title Here'}
            </h2>
            <p className="text-xs text-gray-300">
              {hero.subtitle || 'Your hero banner subtitle describing your academy and value proposition.'}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              {hero.primaryButton?.enabled !== false && (
                <button type="button" className="px-5 py-2.5 rounded-xl bg-[#BE1E2E] text-white text-xs font-bold shadow-lg shadow-red-500/20">
                  {hero.primaryButton?.label || 'Explore Courses'}
                </button>
              )}
              {hero.secondaryButton?.enabled && (
                <button type="button" className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold backdrop-blur-sm">
                  {hero.secondaryButton?.label || 'Contact Us'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <MediaSelector
        isOpen={isBgModalOpen}
        onClose={() => setIsBgModalOpen(false)}
        selectedMediaId={hero.backgroundMediaId}
        onSelect={(id, url) => onChange({ ...hero, backgroundMediaId: id, backgroundUrl: url })}
        title="Select Hero Background Image"
      />
    </div>
  );
}
