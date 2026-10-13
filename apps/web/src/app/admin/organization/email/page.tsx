'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeOrganizationEmailSettings, EmailProviderType } from '@edtech/types';
import { Button, Card, Badge } from '@edtech/ui';
import { SendTestEmailModal } from '@/components/email/SendTestEmailModal';
import { useConfirmation } from '@/components/confirmation/useConfirmation';
import { useGlobalError } from '@/components/error/useGlobalError';
import {
  Mail,
  Send,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Key,
  Server,
  ShieldCheck,
  Eye,
  EyeOff,
  Trash2,
  Bell,
  RefreshCw,
  Loader2
} from 'lucide-react';

export default function AdminEmailSettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { confirm } = useConfirmation();
  const { showError } = useGlobalError();

  const [activeProvider, setActiveProvider] = useState<EmailProviderType>('RESEND');
  const [showSecret, setShowSecret] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form State
  const [fromName, setFromName] = useState('DIDM LMS');
  const [fromEmail, setFromEmail] = useState('noreply@didm.com');
  const [replyTo, setReplyTo] = useState('');

  // Resend / Brevo API Keys
  const [resendApiKey, setResendApiKey] = useState('');
  const [brevoApiKey, setBrevoApiKey] = useState('');

  // SMTP Settings
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Fetch Current Email Settings
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['organization-email-settings'],
    queryFn: async () => {
      const res = await fetch('/api/v1/organization/email');
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message || 'Failed to fetch email settings');
      }
      return res.json();
    }
  });

  const settings: SafeOrganizationEmailSettings | null = data?.data || null;

  useEffect(() => {
    if (settings) {
      setActiveProvider(settings.provider || 'RESEND');
      setFromName(settings.fromName || 'DIDM LMS');
      setFromEmail(settings.fromEmail || 'noreply@didm.com');
      setReplyTo(settings.replyTo || '');
      if (settings.smtp) {
        setSmtpHost(settings.smtp.host || '');
        setSmtpPort(settings.smtp.port || 587);
        setSmtpSecure(Boolean(settings.smtp.secure));
      }
    }
  }, [settings]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/v1/organization/email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to save email configuration');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-email-settings'] });
      queryClient.invalidateQueries({ queryKey: ['organization-setup-progress'] });
      showToast('Email configuration saved');
    },
    onError: (err: Error) => {
      showError({ title: 'Save Failed', message: err.message });
    }
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/organization/email/verify', {
        method: 'POST'
      });
      const json = await res.json();
      if (!res.ok || !json.data?.success) {
        throw new Error(json.data?.error || json.error?.message || 'Verification failed');
      }
      return json.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organization-email-settings'] });
      queryClient.invalidateQueries({ queryKey: ['organization-setup-progress'] });
      showToast(data.message || 'Provider connection verified');
    },
    onError: (err: Error) => {
      showError({ title: 'Verification Failed', message: err.message });
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
      if (!res.ok) throw new Error(json.error?.message || 'Failed to send test email');
      return json;
    },
    onSuccess: (json) => {
      queryClient.invalidateQueries({ queryKey: ['organization-email-settings'] });
      queryClient.invalidateQueries({ queryKey: ['organization-setup-progress'] });
      showToast(json.message || 'Test email sent successfully');
    },
    onError: (err: Error) => {
      showError({ title: 'Test Email Error', message: err.message });
    }
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/organization/email', {
        method: 'DELETE'
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to remove configuration');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-email-settings'] });
      queryClient.invalidateQueries({ queryKey: ['organization-setup-progress'] });
      showToast('Configuration removed');
    },
    onError: (err: Error) => {
      showError({ title: 'Removal Error', message: err.message });
    }
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      provider: activeProvider,
      fromName,
      fromEmail,
      replyTo
    };

    if (activeProvider === 'RESEND') {
      payload.resend = { apiKey: resendApiKey };
    } else if (activeProvider === 'BREVO') {
      payload.brevo = { apiKey: brevoApiKey };
    } else if (activeProvider === 'SMTP') {
      payload.smtp = {
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        username: smtpUsername,
        password: smtpPassword
      };
    }

    saveMutation.mutate(payload);
  };

  const handleRemove = async () => {
    const isConfirmed = await confirm({
      title: 'Remove email configuration?',
      description: 'This will disconnect your organization’s email provider. LMS emails will not be sent until another provider is configured.',
      confirmText: 'Remove Configuration',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (isConfirmed) {
      removeMutation.mutate();
    }
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/admin/organization');
    }
  };

  const currentStatus = settings?.status || 'NOT_CONFIGURED';

  const statusBadge =
    currentStatus === 'VERIFIED'
      ? { text: '● Verified', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' }
      : currentStatus === 'CONFIGURED'
      ? { text: '● Configured', color: 'bg-blue-500/10 text-blue-500 border-blue-500/30' }
      : currentStatus === 'ERROR'
      ? { text: '● Error', color: 'bg-red-500/10 text-red-500 border-red-500/30' }
      : { text: '○ Not Configured', color: 'bg-amber-500/10 text-amber-500 border-amber-500/30' };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8 min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)]">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-xl bg-emerald-500 text-white shadow-2xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <CheckCircle className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--brand-border)]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#BE1E2E] uppercase tracking-wider">
            <Mail className="w-4 h-4" /> Transactional Messaging
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--brand-text)] mt-1">
            Email & Notifications
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Configure how your organization sends transactional LMS emails and alerts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={handleGoBack} className="flex items-center gap-1.5 text-xs">
            <ArrowLeft className="w-4 h-4" /> Go Back
          </Button>

          <Link href="/admin/organization/notifications">
            <Button type="button" variant="secondary" size="sm" className="flex items-center gap-1.5 text-xs">
              <Bell className="w-4 h-4 text-purple-500" /> Notification Rules
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Bar */}
      <Card className="p-5 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-bold text-sm text-[var(--brand-text)]">
            <span>Provider Connection Status:</span>
            <span className={`px-2.5 py-0.5 rounded-full border text-xs font-mono font-extrabold uppercase ${statusBadge.color}`}>
              {statusBadge.text}
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Active Provider: <strong>{settings?.provider || 'None'}</strong>
            {settings?.lastVerifiedAt && (
              <span> • Last Verified: {new Date(settings.lastVerifiedAt).toLocaleString()}</span>
            )}
          </p>
          {settings?.lastError && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-mono text-[11px] mt-2">
              Error: {settings.lastError}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {currentStatus !== 'NOT_CONFIGURED' && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => verifyMutation.mutate()}
                disabled={verifyMutation.isPending}
                className="flex items-center gap-1.5 text-xs"
              >
                {verifyMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 text-blue-500" />}
                <span>Verify Connection</span>
              </Button>

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

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemove}
                disabled={removeMutation.isPending}
                className="flex items-center gap-1.5 text-xs text-red-500 border-red-500/30 hover:bg-red-500/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Provider</span>
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Main Settings Form Card */}
      <Card className="p-6 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-6">
        {/* Provider Tabs */}
        <div className="space-y-2">
          <label className="text-xs font-mono font-bold uppercase text-[var(--text-muted)] tracking-wider block">
            Select Email Provider Abstraction *
          </label>

          <div className="grid grid-cols-3 gap-3 max-w-xl text-xs">
            <button
              type="button"
              onClick={() => setActiveProvider('RESEND')}
              className={`p-3.5 rounded-xl border text-center font-bold transition-all flex items-center justify-center gap-2 ${
                activeProvider === 'RESEND'
                  ? 'bg-[#BE1E2E]/10 border-[#BE1E2E] text-[#BE1E2E] shadow-md'
                  : 'bg-[var(--brand-background)] border-[var(--brand-border)] text-[var(--text-muted)] hover:text-[var(--brand-text)]'
              }`}
            >
              <Key className="w-4 h-4" /> Resend API
            </button>

            <button
              type="button"
              onClick={() => setActiveProvider('BREVO')}
              className={`p-3.5 rounded-xl border text-center font-bold transition-all flex items-center justify-center gap-2 ${
                activeProvider === 'BREVO'
                  ? 'bg-[#BE1E2E]/10 border-[#BE1E2E] text-[#BE1E2E] shadow-md'
                  : 'bg-[var(--brand-background)] border-[var(--brand-border)] text-[var(--text-muted)] hover:text-[var(--brand-text)]'
              }`}
            >
              <Mail className="w-4 h-4" /> Brevo (Sendinblue)
            </button>

            <button
              type="button"
              onClick={() => setActiveProvider('SMTP')}
              className={`p-3.5 rounded-xl border text-center font-bold transition-all flex items-center justify-center gap-2 ${
                activeProvider === 'SMTP'
                  ? 'bg-[#BE1E2E]/10 border-[#BE1E2E] text-[#BE1E2E] shadow-md'
                  : 'bg-[var(--brand-background)] border-[var(--brand-border)] text-[var(--text-muted)] hover:text-[var(--brand-text)]'
              }`}
            >
              <Server className="w-4 h-4" /> Generic SMTP
            </button>
          </div>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSave} className="space-y-5 text-xs max-w-2xl">
          {/* General Sender Details */}
          <div className="p-4 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] space-y-4">
            <h4 className="font-extrabold text-xs text-[var(--brand-text)] uppercase font-mono tracking-wider">
              Sender Configuration
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-[var(--brand-text)] block">From Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DIDM LMS Academy"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[var(--brand-text)] block">From Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="noreply@yourorganization.com"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[var(--brand-text)] block">Reply-To Email Address (Optional)</label>
              <input
                type="email"
                placeholder="support@yourorganization.com"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-xs focus:outline-none focus:border-[#BE1E2E]"
              />
            </div>
          </div>

          {/* Resend Provider Form */}
          {activeProvider === 'RESEND' && (
            <div className="p-4 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-xs text-[var(--brand-text)] uppercase font-mono tracking-wider flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#BE1E2E]" /> Resend API Credentials
                </h4>
                {settings?.resend?.hasApiKey && (
                  <Badge variant="success" className="text-[10px]">
                    ✓ API Key Configured
                  </Badge>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[var(--brand-text)] block">Resend API Key *</label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    placeholder={settings?.resend?.hasApiKey ? '••••••••••••••••' : 're_123456789_abcdef...'}
                    value={resendApiKey}
                    onChange={(e) => setResendApiKey(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-xs focus:outline-none focus:border-[#BE1E2E] font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-2.5 text-[var(--text-muted)] hover:text-[var(--brand-text)]"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Enter your Resend API Key. Secrets are encrypted using AES-256-GCM.
                </p>
              </div>
            </div>
          )}

          {/* Brevo Provider Form */}
          {activeProvider === 'BREVO' && (
            <div className="p-4 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-xs text-[var(--brand-text)] uppercase font-mono tracking-wider flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#BE1E2E]" /> Brevo API Credentials
                </h4>
                {settings?.brevo?.hasApiKey && (
                  <Badge variant="success" className="text-[10px]">
                    ✓ API Key Configured
                  </Badge>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[var(--brand-text)] block">Brevo API Key (xkeysib...) *</label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    placeholder={settings?.brevo?.hasApiKey ? '••••••••••••••••' : 'xkeysib-123456...'}
                    value={brevoApiKey}
                    onChange={(e) => setBrevoApiKey(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-xs focus:outline-none focus:border-[#BE1E2E] font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-2.5 text-[var(--text-muted)] hover:text-[var(--brand-text)]"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Obtain your API Key from Brevo Dashboard (SMTP & API settings).
                </p>
              </div>
            </div>
          )}

          {/* SMTP Provider Form */}
          {activeProvider === 'SMTP' && (
            <div className="p-4 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] space-y-4">
              <h4 className="font-extrabold text-xs text-[var(--brand-text)] uppercase font-mono tracking-wider flex items-center gap-2">
                <Server className="w-4 h-4 text-[#BE1E2E]" /> Generic SMTP Server Credentials
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="font-bold text-[var(--brand-text)] block">SMTP Host *</label>
                  <input
                    type="text"
                    required
                    placeholder="smtp.sendgrid.net or smtp.gmail.com"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-[var(--brand-text)] block">SMTP Port *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={65535}
                    placeholder="587"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(parseInt(e.target.value, 10) || 587)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="font-bold text-[var(--brand-text)]">Security Type:</label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="smtpSecure"
                    checked={!smtpSecure}
                    onChange={() => setSmtpSecure(false)}
                    className="text-[#BE1E2E]"
                  />
                  <span>STARTTLS (Port 587/25)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="smtpSecure"
                    checked={smtpSecure}
                    onChange={() => setSmtpSecure(true)}
                    className="text-[#BE1E2E]"
                  />
                  <span>SSL / TLS (Port 465)</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-[var(--brand-text)] block">SMTP Username</label>
                  <input
                    type="text"
                    placeholder={settings?.smtp?.hasUsername ? '••••••••' : 'apikey or username'}
                    value={smtpUsername}
                    onChange={(e) => setSmtpUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-[var(--brand-text)] block">SMTP Password</label>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      placeholder={settings?.smtp?.hasPassword ? '••••••••••••••••' : '••••••••••••'}
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-xs focus:outline-none focus:border-[#BE1E2E] font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-2.5 text-[var(--text-muted)] hover:text-[var(--brand-text)]"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Action Buttons */}
          <div className="pt-4 flex items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 btn-primary shadow-lg shadow-[#BE1E2E]/20"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Save Configuration</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* Send Test Email Modal */}
      <SendTestEmailModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        onSendTest={(recipientEmail) => testEmailMutation.mutateAsync(recipientEmail)}
        isPending={testEmailMutation.isPending}
        defaultEmail={fromEmail}
      />
    </div>
  );
}
