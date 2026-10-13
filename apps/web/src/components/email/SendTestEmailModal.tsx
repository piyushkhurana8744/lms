'use client';

import React, { useState } from 'react';
import { Button } from '@edtech/ui';
import { Mail, Send, Loader2, AlertTriangle } from 'lucide-react';

export interface SendTestEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendTest: (recipientEmail: string) => Promise<void>;
  isPending: boolean;
  defaultEmail?: string;
}

export function SendTestEmailModal({
  isOpen,
  onClose,
  onSendTest,
  isPending,
  defaultEmail = ''
}: SendTestEmailModalProps) {
  const [recipientEmail, setRecipientEmail] = useState(defaultEmail || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail.trim() || !recipientEmail.includes('@')) {
      setErrorMsg('Please enter a valid recipient email address.');
      return;
    }

    setErrorMsg(null);
    try {
      await onSendTest(recipientEmail.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send test email.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl text-[var(--brand-text)]">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--brand-border)]">
          <h3 className="font-extrabold text-base flex items-center gap-2">
            <Send className="w-5 h-5 text-[#BE1E2E]" /> Send Test Email
          </h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--brand-text)] text-xs">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <p className="text-[var(--text-muted)] text-xs leading-relaxed">
            We will send a sample LMS test email using your organization&apos;s active email provider settings to verify deliverability.
          </p>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="font-bold text-[var(--brand-text)] flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#BE1E2E]" /> Recipient Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="admin@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs focus:outline-none focus:border-[#BE1E2E]"
            />
          </div>

          <div className="pt-3 border-t border-[var(--brand-border)] flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isPending} className="flex items-center gap-1.5">
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Send Test Email</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
