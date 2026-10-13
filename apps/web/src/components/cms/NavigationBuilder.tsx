'use client';

import React, { useState } from 'react';
import { IWebsiteNavigation, IWebsiteNavigationLink } from '@edtech/types';
import { Button } from '@edtech/ui';
import { Compass, Plus, Trash2, ArrowUp, ArrowDown, ExternalLink, Link2, AlertTriangle } from 'lucide-react';

export interface NavigationBuilderProps {
  navigation: IWebsiteNavigation;
  onChange: (navigation: IWebsiteNavigation) => void;
}

export function NavigationBuilder({ navigation, onChange }: NavigationBuilderProps) {
  const [newLabel, setNewLabel] = useState('');
  const [newHref, setNewHref] = useState('');
  const [newExternal, setNewExternal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const links = navigation.links || [];

  const validateUrl = (url: string): boolean => {
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

  const handleAddLink = () => {
    if (!newLabel.trim() || !newHref.trim()) {
      setErrorMsg('Both link label and URL/path are required.');
      return;
    }

    if (!validateUrl(newHref)) {
      setErrorMsg('Invalid or unsafe URL format. Use relative paths like /courses or http:// / https:// protocols.');
      return;
    }

    setErrorMsg(null);
    onChange({
      ...navigation,
      links: [...links, { label: newLabel.trim(), href: newHref.trim(), external: newExternal }]
    });

    setNewLabel('');
    setNewHref('');
    setNewExternal(false);
  };

  const handleRemoveLink = (index: number) => {
    onChange({
      ...navigation,
      links: links.filter((_, i) => i !== index)
    });
  };

  const handleMoveLink = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= links.length) return;
    const newLinks = [...links];
    const temp = newLinks[index];
    newLinks[index] = newLinks[targetIdx];
    newLinks[targetIdx] = temp;
    onChange({ ...navigation, links: newLinks });
  };

  const handleAddPreset = (label: string, href: string) => {
    if (links.some((l) => l.href === href)) return;
    onChange({
      ...navigation,
      links: [...links, { label, href, external: false }]
    });
  };

  return (
    <div className="space-y-8 text-[var(--brand-text)]">
      {/* Navigation Links Manager */}
      <div className="p-6 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-6">
        <div>
          <h3 className="text-base font-extrabold flex items-center gap-2">
            <Compass className="w-5 h-5 text-[#BE1E2E]" /> Header Navigation Links
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Customize links displayed in your public website header navigation bar.</p>
        </div>

        {/* Preset Link Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-bold text-[var(--text-muted)] font-mono">Quick Presets:</span>
          <button
            type="button"
            onClick={() => handleAddPreset('Home', '/')}
            className="px-2.5 py-1 rounded-full bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs hover:border-[#BE1E2E]/50"
          >
            + Home (/)
          </button>
          <button
            type="button"
            onClick={() => handleAddPreset('Courses', '/courses')}
            className="px-2.5 py-1 rounded-full bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs hover:border-[#BE1E2E]/50"
          >
            + Courses (/courses)
          </button>
          <button
            type="button"
            onClick={() => handleAddPreset('About Us', '/about')}
            className="px-2.5 py-1 rounded-full bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs hover:border-[#BE1E2E]/50"
          >
            + About (/about)
          </button>
          <button
            type="button"
            onClick={() => handleAddPreset('Contact', '/contact')}
            className="px-2.5 py-1 rounded-full bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs hover:border-[#BE1E2E]/50"
          >
            + Contact (/contact)
          </button>
        </div>

        {/* Existing Navigation List */}
        <div className="space-y-2 text-xs">
          {links.length === 0 ? (
            <div className="p-6 text-center border-2 border-dashed border-[var(--brand-border)] rounded-xl bg-[var(--brand-background)] text-[var(--text-muted)]">
              No navigation links added yet. Add custom links below.
            </div>
          ) : (
            links.map((link, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] flex items-center justify-between gap-3 hover:border-[#BE1E2E]/40 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] flex items-center justify-center font-mono font-bold text-[11px] text-[var(--text-muted)] flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="font-extrabold text-xs text-[var(--brand-text)] flex items-center gap-1.5">
                      <span>{link.label}</span>
                      {link.external && <ExternalLink className="w-3 h-3 text-[var(--text-muted)]" />}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] font-mono truncate">{link.href}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMoveLink(idx, 'up')}
                    className="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--bg-surface-elevated)] disabled:opacity-30"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === links.length - 1}
                    onClick={() => handleMoveLink(idx, 'down')}
                    className="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--bg-surface-elevated)] disabled:opacity-30"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveLink(idx)}
                    className="p-1 rounded text-red-500 hover:bg-red-500/10 ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add New Link Form */}
        <div className="p-4 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] space-y-4 pt-4">
          <h4 className="font-bold text-xs flex items-center gap-1.5 text-[var(--brand-text)]">
            <Plus className="w-4 h-4 text-[#BE1E2E]" /> Add Custom Navigation Link
          </h4>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <input
                type="text"
                placeholder="Link Label (e.g. Blog)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--brand-border)] bg-[var(--bg-surface)] text-xs"
              />
            </div>

            <div>
              <input
                type="text"
                placeholder="Path / URL (e.g. /blog or https://...)"
                value={newHref}
                onChange={(e) => setNewHref(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--brand-border)] bg-[var(--bg-surface)] font-mono text-xs"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={newExternal}
                  onChange={(e) => setNewExternal(e.target.checked)}
                  className="rounded border-[var(--brand-border)] text-[#BE1E2E] focus:ring-[#BE1E2E]"
                />
                <span>Open in New Tab</span>
              </label>

              <Button type="button" variant="primary" size="sm" onClick={handleAddLink} className="ml-auto">
                Add Link
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
