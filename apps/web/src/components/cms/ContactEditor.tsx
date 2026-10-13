'use client';

import React from 'react';
import { IWebsiteContact } from '@edtech/types';
import { Mail, Phone, MapPin } from 'lucide-react';

export interface ContactEditorProps {
  contact: IWebsiteContact;
  onChange: (contact: IWebsiteContact) => void;
}

export function ContactEditor({ contact, onChange }: ContactEditorProps) {
  return (
    <div className="space-y-8 text-[var(--brand-text)]">
      <div className="p-6 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-6">
        <div>
          <h3 className="text-base font-extrabold flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#BE1E2E]" /> Contact & Support Details
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Configure public contact channels displayed on your portal.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
          <div className="space-y-1.5">
            <label className="font-bold text-[var(--brand-text)] flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#BE1E2E]" /> Support Email
            </label>
            <input
              type="email"
              placeholder="e.g. support@yourdomain.com"
              value={contact.email || ''}
              onChange={(e) => onChange({ ...contact, email: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs focus:outline-none focus:border-[#BE1E2E]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-[var(--brand-text)] flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#BE1E2E]" /> Phone Number
            </label>
            <input
              type="text"
              placeholder="e.g. +1 (800) 555-0199"
              value={contact.phone || ''}
              onChange={(e) => onChange({ ...contact, phone: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs focus:outline-none focus:border-[#BE1E2E]"
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <label className="font-bold text-[var(--brand-text)] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#BE1E2E]" /> Physical Address / Headquarters
            </label>
            <input
              type="text"
              placeholder="e.g. 100 Innovation Way, Suite 400, San Francisco, CA"
              value={contact.address || ''}
              onChange={(e) => onChange({ ...contact, address: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs focus:outline-none focus:border-[#BE1E2E]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
