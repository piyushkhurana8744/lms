'use client';

import React, { useState } from 'react';
import { IWebsiteSocialLinks } from '@edtech/types';
import { Share2, Facebook, Instagram, Youtube, Linkedin, Twitter, AlertTriangle } from 'lucide-react';

export interface SocialLinksEditorProps {
  socialLinks: IWebsiteSocialLinks;
  onChange: (socialLinks: IWebsiteSocialLinks) => void;
}

export function SocialLinksEditor({ socialLinks, onChange }: SocialLinksEditorProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const validateUrl = (url: string): boolean => {
    if (!url || url.trim() === '') return true;
    const trimmed = url.trim().toLowerCase();
    if (['javascript:', 'data:', 'file:', 'vbscript:'].some((p) => trimmed.startsWith(p))) {
      return false;
    }
    if (url.startsWith('/')) return true;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleUpdate = (key: keyof IWebsiteSocialLinks, value: string) => {
    if (!validateUrl(value)) {
      setErrorMsg('Invalid URL protocol. Use http://, https://, or relative paths. Dangerous protocols like javascript: are forbidden.');
    } else {
      setErrorMsg(null);
    }
    onChange({ ...socialLinks, [key]: value });
  };

  return (
    <div className="space-y-8 text-[var(--brand-text)]">
      <div className="p-6 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-6">
        <div>
          <h3 className="text-base font-extrabold flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#BE1E2E]" /> Social Media Channels
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Connect your official social channels for header & footer icons.</p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
          <div className="space-y-1.5">
            <label className="font-bold text-[var(--brand-text)] flex items-center gap-1.5">
              <Facebook className="w-3.5 h-3.5 text-blue-600" /> Facebook Page URL
            </label>
            <input
              type="text"
              placeholder="https://facebook.com/your-page"
              value={socialLinks.facebook || ''}
              onChange={(e) => handleUpdate('facebook', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] font-mono text-xs focus:outline-none focus:border-[#BE1E2E]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-[var(--brand-text)] flex items-center gap-1.5">
              <Instagram className="w-3.5 h-3.5 text-pink-500" /> Instagram Profile URL
            </label>
            <input
              type="text"
              placeholder="https://instagram.com/your-handle"
              value={socialLinks.instagram || ''}
              onChange={(e) => handleUpdate('instagram', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] font-mono text-xs focus:outline-none focus:border-[#BE1E2E]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-[var(--brand-text)] flex items-center gap-1.5">
              <Youtube className="w-3.5 h-3.5 text-red-600" /> YouTube Channel URL
            </label>
            <input
              type="text"
              placeholder="https://youtube.com/@your-channel"
              value={socialLinks.youtube || ''}
              onChange={(e) => handleUpdate('youtube', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] font-mono text-xs focus:outline-none focus:border-[#BE1E2E]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-[var(--brand-text)] flex items-center gap-1.5">
              <Linkedin className="w-3.5 h-3.5 text-blue-700" /> LinkedIn Organization URL
            </label>
            <input
              type="text"
              placeholder="https://linkedin.com/company/your-org"
              value={socialLinks.linkedin || ''}
              onChange={(e) => handleUpdate('linkedin', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] font-mono text-xs focus:outline-none focus:border-[#BE1E2E]"
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <label className="font-bold text-[var(--brand-text)] flex items-center gap-1.5">
              <Twitter className="w-3.5 h-3.5 text-sky-500" /> Twitter / X Profile URL
            </label>
            <input
              type="text"
              placeholder="https://twitter.com/your-handle"
              value={socialLinks.twitter || ''}
              onChange={(e) => handleUpdate('twitter', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] font-mono text-xs focus:outline-none focus:border-[#BE1E2E]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
