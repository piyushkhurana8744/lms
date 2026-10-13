'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card } from '@edtech/ui';
import { useGlobalError } from '@/components/error/useGlobalError';
import { Building2, ArrowRight, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

export interface OrganizationProfileStepProps {
  onNext: () => void;
  onBack: () => void;
  onSkipStep: () => void;
}

export function OrganizationProfileStep({
  onNext,
  onBack,
  onSkipStep
}: OrganizationProfileStepProps) {
  const queryClient = useQueryClient();
  const { showError } = useGlobalError();

  const [organizationName, setOrganizationName] = useState('DIDM Academy');
  const [supportEmail, setSupportEmail] = useState('support@didm.edu');
  const [supportPhone, setSupportPhone] = useState('+1 (800) 555-DIDM');
  const [address, setAddress] = useState('DIDM Digital Hub, Delhi NCR');
  const [timezone, setTimezone] = useState('UTC');
  const [defaultLanguage, setDefaultLanguage] = useState('English');
  const [currency, setCurrency] = useState('USD');

  // Fetch Existing Settings
  const { data } = useQuery({
    queryKey: ['organization-settings'],
    queryFn: async () => {
      const res = await fetch('/api/v1/organization/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    }
  });

  useEffect(() => {
    if (data?.data?.profile) {
      const p = data.data.profile;
      if (p.organizationName) setOrganizationName(p.organizationName);
      if (p.supportEmail) setSupportEmail(p.supportEmail);
      if (p.supportPhone) setSupportPhone(p.supportPhone);
      if (p.address) setAddress(p.address);
      if (p.timezone) setTimezone(p.timezone);
      if (p.defaultLanguage) setDefaultLanguage(p.defaultLanguage);
      if (p.currency) setCurrency(p.currency);
    }
  }, [data]);

  const profileMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/v1/organization/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to save profile');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
      onNext();
    },
    onError: (err: Error) => {
      showError({ title: 'Profile Save Error', message: err.message });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    profileMutation.mutate({
      organizationName,
      supportEmail,
      supportPhone,
      address,
      timezone,
      defaultLanguage,
      currency
    });
  };

  return (
    <Card className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-6 max-w-2xl mx-auto shadow-xl">
      <div className="flex items-center gap-3 pb-4 border-b border-[var(--brand-border)]">
        <div className="p-3 rounded-2xl bg-[#BE1E2E]/10 text-[#BE1E2E]">
          <Building2 className="w-6 h-6" />
        </div>
        <div>
          <span className="text-[10px] font-mono font-bold text-[#BE1E2E] uppercase tracking-wider">
            Step 1 of 8
          </span>
          <h3 className="text-xl font-extrabold text-[var(--brand-text)]">Organization Profile</h3>
          <p className="text-xs text-[var(--text-muted)]">
            Set your academy name, official support details, and default locale preferences.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="font-bold text-[var(--brand-text)] block">Organization Name *</label>
            <input
              type="text"
              required
              placeholder="DIDM LMS Academy"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs focus:outline-none focus:border-[#BE1E2E]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-[var(--brand-text)] block">Support Email *</label>
            <input
              type="email"
              required
              placeholder="support@didm.edu"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs focus:outline-none focus:border-[#BE1E2E]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-[var(--brand-text)] block">Support Phone</label>
            <input
              type="text"
              placeholder="+1 (800) 555-DIDM"
              value={supportPhone}
              onChange={(e) => setSupportPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs focus:outline-none focus:border-[#BE1E2E]"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="font-bold text-[var(--brand-text)] block">Office Address</label>
            <input
              type="text"
              placeholder="Digital Learning Hub, Delhi NCR"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs focus:outline-none focus:border-[#BE1E2E]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-[var(--brand-text)] block">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs focus:outline-none focus:border-[#BE1E2E]"
            >
              <option value="UTC">UTC (Coordinated Universal Time)</option>
              <option value="America/New_York">Eastern Time (US & Canada)</option>
              <option value="Asia/Kolkata">India Standard Time (IST)</option>
              <option value="Europe/London">London (GMT/BST)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-[var(--brand-text)] block">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs focus:outline-none focus:border-[#BE1E2E]"
            >
              <option value="USD">USD ($)</option>
              <option value="INR">INR (₹)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
        </div>

        <div className="pt-6 border-t border-[var(--brand-border)] flex items-center justify-between gap-4">
          <Button type="button" variant="outline" size="sm" onClick={onBack} className="flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSkipStep}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--brand-text)] font-semibold px-3"
            >
              Skip for now
            </button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={profileMutation.isPending}
              className="flex items-center gap-1.5 btn-primary shadow-lg shadow-[#BE1E2E]/20"
            >
              {profileMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              <span>Save & Continue</span>
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
