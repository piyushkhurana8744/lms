'use client';

import React from 'react';
import { IWebsiteFooter } from '@edtech/types';
import { AlignLeft } from 'lucide-react';

export interface FooterEditorProps {
  footer: IWebsiteFooter;
  onChange: (footer: IWebsiteFooter) => void;
}

export function FooterEditor({ footer, onChange }: FooterEditorProps) {
  return (
    <div className="space-y-8 text-[var(--brand-text)]">
      <div className="p-6 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-6">
        <div>
          <h3 className="text-base font-extrabold flex items-center gap-2">
            <AlignLeft className="w-5 h-5 text-[#BE1E2E]" /> Footer Copy & Notice
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Customize description copy and legal copyright notice in the public footer.</p>
        </div>

        <div className="space-y-5 text-xs">
          <div className="space-y-1.5">
            <label className="font-bold text-[var(--brand-text)]">Footer Summary Description</label>
            <textarea
              rows={3}
              placeholder="e.g. Empowering learners worldwide with practical, high-impact digital skills."
              value={footer.description || ''}
              onChange={(e) => onChange({ ...footer, description: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs focus:outline-none focus:border-[#BE1E2E]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-[var(--brand-text)]">Copyright Notice</label>
            <input
              type="text"
              placeholder={`e.g. © ${new Date().getFullYear()} DIDM Academy. All rights reserved.`}
              value={footer.copyrightText || ''}
              onChange={(e) => onChange({ ...footer, copyrightText: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs focus:outline-none focus:border-[#BE1E2E]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
