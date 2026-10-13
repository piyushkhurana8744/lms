'use client';

import React, { useState } from 'react';
import { usePublicBrand } from '@/components/public/PublicBrandProvider';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@edtech/ui';

export default function PublicContactPage() {
  const brand = usePublicBrand();
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="max-w-4xl mx-auto px-6 py-16 space-y-12">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-[var(--brand-text)]">
          Contact & Support
        </h1>
        <p className="text-sm text-[var(--text-muted)] max-w-lg mx-auto">
          Have questions about our programs or workspace admissions? Get in touch with our team.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Info Box */}
        <div className="glass-card p-8 rounded-3xl border border-[var(--brand-border)] space-y-6">
          <h2 className="text-lg font-extrabold text-[var(--brand-text)] border-b border-[var(--brand-border)] pb-3">
            {brand.branding?.companyName || brand.name} Headquarters
          </h2>

          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#BE1E2E]/10 text-[#BE1E2E] flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-mono">Email Us</span>
                <span className="font-bold text-[var(--brand-text)]">support@{brand.slug || 'didm'}.edu</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-mono">Call Us</span>
                <span className="font-bold text-[var(--brand-text)]">+1 (800) 555-DIDM</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-mono">Workspace Campus</span>
                <span className="font-bold text-[var(--brand-text)]">DIDM Digital Learning Hub, Delhi NCR</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Contact Form */}
        <div className="glass-card p-8 rounded-3xl border border-[var(--brand-border)] space-y-4">
          <h2 className="text-lg font-extrabold text-[var(--brand-text)] border-b border-[var(--brand-border)] pb-3">
            Send Us a Message
          </h2>

          {submitted ? (
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold space-y-2 text-center">
              <CheckCircle2 className="w-8 h-8 mx-auto" />
              <p>Message sent successfully! Our team will contact you shortly.</p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold mb-1 text-[var(--brand-text)]">Your Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] text-xs text-[var(--brand-text)]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[var(--brand-text)]">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="rahul@example.com"
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] text-xs text-[var(--brand-text)]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[var(--brand-text)]">Message *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="How can we help you?"
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] text-xs text-[var(--brand-text)]"
                />
              </div>

              <Button type="submit" variant="primary" className="btn-primary w-full text-xs py-2.5">
                <Send className="w-3.5 h-3.5 mr-1.5" /> Send Message
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
