'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card } from '@edtech/ui';
import { useGlobalError } from '@/components/error/useGlobalError';
import { SendTestEmailModal } from '@/components/email/SendTestEmailModal';
import { Mail, ArrowRight, ArrowLeft, Loader2, Send } from 'lucide-react';

export interface EmailStepProps {
  onNext: () => void;
  onBack: () => void;
  onSkipStep: () => void;
}

export function EmailStep({
  onNext,
  onBack,
  onSkipStep
}: EmailStepProps) {
  const queryClient = useQueryClient();
  const { showError } = useGlobalError();

  const [provider, setProvider] = useState<'RESEND' | 'BREVO' | 'SMTP'>('RESEND');
  const [fromName, setFromName] = useState('DIDM LMS');
  const [fromEmail, setFromEmail] = useState('noreply@didm.edu');
  const [resendApiKey, setResendApiKey] = useState('');
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  // Fetch Existing Settings
  const { data } = useQuery({
    queryKey: ['organization-email-settings'],
    queryFn: async () => {
      const res = await fetch('/api/v1/organization/email');
      if (!res.ok) throw new Error('Failed to fetch email settings');
      return res.json();
    }
  });

  const emailDoc = data?.data || null;

  useEffect(() => {
    if (emailDoc) {
      setProvider(emailDoc.provider || 'RESEND');
      setFromName(emailDoc.fromName || 'DIDM LMS');
      setFromEmail(emailDoc.fromEmail || 'noreply@didm.edu');
    }
  }, [emailDoc]);

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/v1/organization/email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to save email config');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-email-settings'] });
      onNext();
    },
    onError: (err: Error) => {
      showError({ title: 'Email Save Error', message: err.message });
    }
  });

  const testEmailMutation = useMutation({
    mutationFn: async (recipientEmail: string) => {
      const res = await fetch('/api/v1/organization/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Test email failed');
      return json;
    },
    onError: (err: Error) => {
      showError({ title: 'Test Email Error', message: err.message });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { provider, fromName, fromEmail };
    if (provider === 'RESEND') payload.resend = { apiKey: resendApiKey };
    saveMutation.mutate(payload);
  };

  return (
    <Card className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-6 max-w-2xl mx-auto shadow-xl">
      <div className="flex items-center gap-3 pb-4 border-b border-[var(--brand-border)]">
        <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
          <Mail className="w-6 h-6" />
        </div>
        <div>
          <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-wider">
            Step 4 of 8
          </span>
          <h3 className="text-xl font-extrabold text-[var(--brand-text)]">Email Configuration</h3>
          <p className="text-xs text-[var(--text-muted)]">
            Configure Resend, Brevo, or custom SMTP servers for transactional LMS emails.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-[var(--brand-text)] block">From Name *</label>
            <input
              type="text"
              required
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-[var(--brand-text)] block">From Email *</label>
            <input
              type="email"
              required
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-[var(--brand-text)] block">Resend API Key</label>
          <input
            type="password"
            placeholder={emailDoc?.resend?.hasApiKey ? '••••••••••••••••' : 're_123456...'}
            value={resendApiKey}
            onChange={(e) => setResendApiKey(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs font-mono"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsTestModalOpen(true)}
            className="flex items-center gap-1.5 text-xs"
          >
            <Send className="w-3.5 h-3.5 text-emerald-500" />
            <span>Send Test Email</span>
          </Button>
        </div>

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
              disabled={saveMutation.isPending}
              className="flex items-center gap-1.5 btn-primary text-xs"
            >
              {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              <span>Save & Continue</span>
            </Button>
          </div>
        </div>
      </form>

      <SendTestEmailModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        onSendTest={(recipientEmail) => testEmailMutation.mutateAsync(recipientEmail)}
        isPending={testEmailMutation.isPending}
        defaultEmail={fromEmail}
      />
    </Card>
  );
}
