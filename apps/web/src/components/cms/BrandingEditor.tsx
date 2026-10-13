'use client';

import React, { useState } from 'react';
import { IWebsiteBranding } from '@edtech/types';
import { Button } from '@edtech/ui';
import { MediaSelector } from './MediaSelector';
import { Palette, Image as ImageIcon, Sparkles, Check } from 'lucide-react';

export interface BrandingEditorProps {
  branding: IWebsiteBranding;
  onChange: (branding: IWebsiteBranding) => void;
}

export function BrandingEditor({ branding, onChange }: BrandingEditorProps) {
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [isFaviconModalOpen, setIsFaviconModalOpen] = useState(false);

  const presetColors = ['#BE1E2E', '#2563EB', '#059669', '#7C3AED', '#D97706', '#09090B'];

  return (
    <div className="space-y-8 text-[var(--brand-text)]">
      {/* Organization Identity */}
      <div className="p-6 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-6">
        <h3 className="text-base font-extrabold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#BE1E2E]" /> Organization Identity
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
          <div className="space-y-1.5">
            <label className="font-bold text-[var(--brand-text)]">Organization Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. DIDM Academy"
              value={branding.organizationName}
              onChange={(e) => onChange({ ...branding, organizationName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs focus:outline-none focus:border-[#BE1E2E]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-[var(--brand-text)]">Tagline / Slogan</label>
            <input
              type="text"
              placeholder="e.g. Learn Digital Skills That Drive Success"
              value={branding.tagline || ''}
              onChange={(e) => onChange({ ...branding, tagline: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs focus:outline-none focus:border-[#BE1E2E]"
            />
          </div>
        </div>

        {/* Logo & Favicon Media Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-[var(--brand-border)] text-xs">
          {/* Logo Picker */}
          <div className="space-y-2">
            <label className="font-bold text-[var(--brand-text)] block">Website Logo</label>
            <div className="p-4 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] overflow-hidden flex items-center justify-center">
                  {branding.logoUrl ? (
                    <img src={branding.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-[var(--text-muted)] opacity-50" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-xs">{branding.logoUrl ? 'Logo Selected' : 'No Logo'}</div>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono">PNG / SVG / WebP</div>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsLogoModalOpen(true)}
              >
                {branding.logoUrl ? 'Change' : 'Select'}
              </Button>
            </div>
          </div>

          {/* Favicon Picker */}
          <div className="space-y-2">
            <label className="font-bold text-[var(--brand-text)] block">Favicon</label>
            <div className="p-4 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] overflow-hidden flex items-center justify-center">
                  {branding.faviconUrl ? (
                    <img src={branding.faviconUrl} alt="Favicon" className="w-8 h-8 object-contain" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-[var(--text-muted)] opacity-50" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-xs">{branding.faviconUrl ? 'Favicon Selected' : 'No Favicon'}</div>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono">Square 32x32 PNG / ICO</div>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsFaviconModalOpen(true)}
              >
                {branding.faviconUrl ? 'Change' : 'Select'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Brand Palette & Styling */}
      <div className="p-6 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-6">
        <h3 className="text-base font-extrabold flex items-center gap-2">
          <Palette className="w-5 h-5 text-[#BE1E2E]" /> Color Palette & Theme Styling
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs">
          {/* Primary Color */}
          <div className="space-y-2">
            <label className="font-bold text-[var(--brand-text)]">Primary Brand Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.primaryColor || '#BE1E2E'}
                onChange={(e) => onChange({ ...branding, primaryColor: e.target.value })}
                className="w-10 h-10 rounded-xl border border-[var(--brand-border)] cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={branding.primaryColor}
                onChange={(e) => onChange({ ...branding, primaryColor: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] font-mono text-xs uppercase"
              />
            </div>
            <div className="flex gap-1.5 mt-1">
              {presetColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChange({ ...branding, primaryColor: c })}
                  style={{ backgroundColor: c }}
                  className="w-5 h-5 rounded-full border border-white/30 transition-transform hover:scale-110"
                />
              ))}
            </div>
          </div>

          {/* Secondary Color */}
          <div className="space-y-2">
            <label className="font-bold text-[var(--brand-text)]">Secondary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.secondaryColor || '#1F2937'}
                onChange={(e) => onChange({ ...branding, secondaryColor: e.target.value })}
                className="w-10 h-10 rounded-xl border border-[var(--brand-border)] cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={branding.secondaryColor}
                onChange={(e) => onChange({ ...branding, secondaryColor: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] font-mono text-xs uppercase"
              />
            </div>
          </div>

          {/* Accent Color */}
          <div className="space-y-2">
            <label className="font-bold text-[var(--brand-text)]">Accent Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.accentColor || '#F59E0B'}
                onChange={(e) => onChange({ ...branding, accentColor: e.target.value })}
                className="w-10 h-10 rounded-xl border border-[var(--brand-border)] cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={branding.accentColor || '#F59E0B'}
                onChange={(e) => onChange({ ...branding, accentColor: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] font-mono text-xs uppercase"
              />
            </div>
          </div>
        </div>

        {/* Typography & Border Radius */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-4 border-t border-[var(--brand-border)] text-xs">
          <div className="space-y-1.5">
            <label className="font-bold text-[var(--brand-text)]">Heading Font</label>
            <select
              value={branding.headingFont || 'Inter'}
              onChange={(e) => onChange({ ...branding, headingFont: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs"
            >
              <option value="Inter">Inter (Clean Modern)</option>
              <option value="Roboto">Roboto (Classic Sans)</option>
              <option value="Poppins">Poppins (Geometric Sans)</option>
              <option value="Outfit">Outfit (Display Bold)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-[var(--brand-text)]">Body Font</label>
            <select
              value={branding.bodyFont || 'Inter'}
              onChange={(e) => onChange({ ...branding, bodyFont: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs"
            >
              <option value="Inter">Inter</option>
              <option value="Roboto">Roboto</option>
              <option value="Poppins">Poppins</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-[var(--brand-text)]">Border Radius Style</label>
            <select
              value={branding.borderRadius || 'MEDIUM'}
              onChange={(e) => onChange({ ...branding, borderRadius: e.target.value as any })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs"
            >
              <option value="NONE">Sharp (0px)</option>
              <option value="SMALL">Small (6px)</option>
              <option value="MEDIUM">Medium (12px)</option>
              <option value="LARGE">Pill / Rounded (24px)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Live Branding Preview */}
      <div className="p-6 rounded-2xl bg-[var(--brand-background)] border border-[var(--brand-border)] space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] font-extrabold">Live Branding Component Preview</span>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: branding.primaryColor || '#BE1E2E' }} />
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: branding.secondaryColor || '#1F2937' }} />
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: branding.accentColor || '#F59E0B' }} />
          </div>
        </div>

        <div className="p-5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface-elevated)] space-y-4 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--brand-border)]">
            <div className="flex items-center gap-3">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="Logo" className="h-8 object-contain" />
              ) : (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-white" style={{ backgroundColor: branding.primaryColor || '#BE1E2E' }}>
                  {(branding.organizationName || 'D')[0]}
                </div>
              )}
              <span className="font-extrabold text-sm tracking-tight" style={{ fontFamily: branding.headingFont }}>
                {branding.organizationName || 'Organization Name'}
              </span>
            </div>

            <button
              type="button"
              style={{ backgroundColor: branding.primaryColor || '#BE1E2E' }}
              className="px-4 py-2 rounded-xl text-white text-xs font-bold shadow"
            >
              Enroll Now
            </button>
          </div>

          <p className="text-xs text-[var(--text-muted)]" style={{ fontFamily: branding.bodyFont }}>
            {branding.tagline || 'Your organization tagline will render prominently across public headers and footers.'}
          </p>
        </div>
      </div>

      {/* Media Selectors */}
      <MediaSelector
        isOpen={isLogoModalOpen}
        onClose={() => setIsLogoModalOpen(false)}
        selectedMediaId={branding.logoMediaId}
        onSelect={(id, url) => onChange({ ...branding, logoMediaId: id, logoUrl: url })}
        title="Select Organization Logo"
      />

      <MediaSelector
        isOpen={isFaviconModalOpen}
        onClose={() => setIsFaviconModalOpen(false)}
        selectedMediaId={branding.faviconMediaId}
        onSelect={(id, url) => onChange({ ...branding, faviconMediaId: id, faviconUrl: url })}
        title="Select Website Favicon"
      />
    </div>
  );
}
