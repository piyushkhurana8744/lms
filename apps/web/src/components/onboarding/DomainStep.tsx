'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card } from '@edtech/ui';
import { useGlobalError } from '@/components/error/useGlobalError';
import { Globe, ArrowRight, ArrowLeft, Loader2, Server } from 'lucide-react';

export interface DomainStepProps {
  onNext: () => void;
  onBack: () => void;
  onSkipStep: () => void;
}

export function DomainStep({
  onNext,
  onBack,
  onSkipStep
}: DomainStepProps) {
  const queryClient = useQueryClient();
  const { showError } = useGlobalError();

  const [customDomain, setCustomDomain] = useState('');

  const { data } = useQuery({
    queryKey: ['organization-domain'],
    queryFn: async () => {
      const res = await fetch('/api/v1/organization/domain');
      if (!res.ok) throw new Error('Failed to fetch domain settings');
      return res.json();
    }
  });

  const domainDoc = data?.data || null;

  const configureDomainMutation = useMutation({
    mutationFn: async (domain: string) => {
      const res = await fetch('/api/v1/organization/domain', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customDomain: domain })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to configure custom domain');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-domain'] });
      onNext();
    },
    onError: (err: Error) => {
      showError({ title: 'Domain Error', message: err.message });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDomain.trim()) {
      onNext();
      return;
    }
    configureDomainMutation.mutate(customDomain.trim());
  };

  return (
    <Card className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-6 max-w-2xl mx-auto shadow-xl">
      <div className="flex items-center gap-3 pb-4 border-b border-[var(--brand-border)]">
        <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
          <Globe className="w-6 h-6" />
        </div>
        <div>
          <span className="text-[10px] font-mono font-bold text-emerald-500 uppercase tracking-wider">
            Step 5 of 8
          </span>
          <h3 className="text-xl font-extrabold text-[var(--brand-text)]">Domain & Website</h3>
          <p className="text-xs text-[var(--text-muted)]">
            Review auto-generated platform web address or connect a custom domain.
          </p>
        </div>
      </div>

      <div className="space-y-4 text-xs">
        <div className="p-4 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] space-y-1">
          <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] font-bold">Auto-Generated Platform Address</span>
          <div className="font-mono text-xs font-bold text-[#BE1E2E] flex items-center gap-2">
            <Server className="w-4 h-4" />
            <span>https://{domainDoc?.platformSubdomain || 'academy.platform.com'}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="font-bold text-[var(--brand-text)] block">Custom Domain (Optional)</label>
          <input
            type="text"
            placeholder="learn.yourorganization.com"
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs font-mono"
          />
          <p className="text-[11px] text-[var(--text-muted)]">
            You can configure DNS CNAME records and SSL verification later.
          </p>

          <div className="pt-6 border-t border-[var(--brand-border)] flex items-center justify-between gap-4">
            <Button type="button" variant="outline" size="sm" onClick={onBack} className="flex items-center gap-1.5 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </Button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSkipStep}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--brand-text)] font-semibold px-3"
              >
                Configure later
              </button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={configureDomainMutation.isPending}
                className="flex items-center gap-1.5 btn-primary text-xs"
              >
                {configureDomainMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                <span>Continue</span>
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Card>
  );
}
