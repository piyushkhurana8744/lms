'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeOrganizationDomain, IWhiteLabelConfig } from '@edtech/types';
import { Button, Card, Badge } from '@edtech/ui';
import { useConfirmation } from '@/components/confirmation/useConfirmation';
import { useGlobalError } from '@/components/error/useGlobalError';
import {
  Globe,
  ArrowLeft,
  Copy,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Trash2,
  Lock,
  Layers,
  Mail,
  Loader2,
  Sparkles,
  AlertTriangle,
  Server
} from 'lucide-react';

export default function AdminDomainSettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { confirm } = useConfirmation();
  const { showError } = useGlobalError();

  const [customDomainInput, setCustomDomainInput] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // White-label State
  const [hidePlatformBranding, setHidePlatformBranding] = useState(false);
  const [useCustomLogo, setUseCustomLogo] = useState(true);
  const [useCustomFavicon, setUseCustomFavicon] = useState(true);
  const [useCustomColors, setUseCustomColors] = useState(true);
  const [publicPoweredByEnabled, setPublicPoweredByEnabled] = useState(true);
  const [customSupportEmail, setCustomSupportEmail] = useState('');

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Fetch Domain Record
  const { data: domainRes, isLoading: isDomainLoading } = useQuery({
    queryKey: ['organization-domain'],
    queryFn: async () => {
      const res = await fetch('/api/v1/organization/domain');
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message || 'Failed to fetch domain configuration');
      }
      return res.json();
    }
  });

  // Fetch White-label Preferences
  const { data: wlRes, isLoading: isWlLoading } = useQuery({
    queryKey: ['organization-whitelabel'],
    queryFn: async () => {
      const res = await fetch('/api/v1/organization/whitelabel');
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message || 'Failed to fetch white-label settings');
      }
      return res.json();
    }
  });

  const domainData: SafeOrganizationDomain | null = domainRes?.data || null;
  const whiteLabelData: IWhiteLabelConfig | null = wlRes?.data || null;

  useEffect(() => {
    if (domainData?.customDomain) {
      setCustomDomainInput(domainData.customDomain);
    }
  }, [domainData]);

  useEffect(() => {
    if (whiteLabelData) {
      setHidePlatformBranding(Boolean(whiteLabelData.hidePlatformBranding));
      setUseCustomLogo(Boolean(whiteLabelData.useCustomLogo));
      setUseCustomFavicon(Boolean(whiteLabelData.useCustomFavicon));
      setUseCustomColors(Boolean(whiteLabelData.useCustomColors));
      setPublicPoweredByEnabled(Boolean(whiteLabelData.publicPoweredByEnabled));
      setCustomSupportEmail(whiteLabelData.customSupportEmail || '');
    }
  }, [whiteLabelData]);

  // Domain Mutations
  const configureDomainMutation = useMutation({
    mutationFn: async (customDomain: string) => {
      const res = await fetch('/api/v1/organization/domain', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customDomain })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to configure custom domain');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-domain'] });
      queryClient.invalidateQueries({ queryKey: ['organization-setup-progress'] });
      showToast('Custom domain configured. Please complete DNS record verification.');
    },
    onError: (err: Error) => {
      showError({ title: 'Configuration Error', message: err.message });
    }
  });

  const verifyDomainMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/organization/domain/verify', {
        method: 'POST'
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'DNS verification failed');
      return json;
    },
    onSuccess: (json) => {
      queryClient.invalidateQueries({ queryKey: ['organization-domain'] });
      queryClient.invalidateQueries({ queryKey: ['organization-setup-progress'] });
      showToast(json.message || 'DNS record verified');
    },
    onError: (err: Error) => {
      showError({ title: 'Verification Error', message: err.message });
    }
  });

  const activateDomainMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/organization/domain/activate', {
        method: 'POST'
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Domain activation failed');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-domain'] });
      queryClient.invalidateQueries({ queryKey: ['organization-setup-progress'] });
      showToast('Custom domain activated successfully!');
    },
    onError: (err: Error) => {
      showError({ title: 'Activation Error', message: err.message });
    }
  });

  const disconnectDomainMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/organization/domain', {
        method: 'DELETE'
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to disconnect domain');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-domain'] });
      queryClient.invalidateQueries({ queryKey: ['organization-setup-progress'] });
      setCustomDomainInput('');
      showToast('Custom domain disconnected');
    },
    onError: (err: Error) => {
      showError({ title: 'Disconnect Error', message: err.message });
    }
  });

  // White-label Mutation
  const saveWhiteLabelMutation = useMutation({
    mutationFn: async (payload: Partial<IWhiteLabelConfig>) => {
      const res = await fetch('/api/v1/organization/whitelabel', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to update white-label settings');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-whitelabel'] });
      showToast('White-label settings updated');
    },
    onError: (err: Error) => {
      showError({ title: 'White-label Save Failed', message: err.message });
    }
  });

  const handleConfigureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDomainInput.trim()) return;
    configureDomainMutation.mutate(customDomainInput.trim());
  };

  const handleDisconnect = async () => {
    const isConfirmed = await confirm({
      title: 'Disconnect custom domain?',
      description: 'Visitors will no longer be able to access your LMS public website through this custom domain.',
      confirmText: 'Disconnect Domain',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (isConfirmed) {
      disconnectDomainMutation.mutate();
    }
  };

  const handleSaveWhiteLabel = (e: React.FormEvent) => {
    e.preventDefault();
    saveWhiteLabelMutation.mutate({
      hidePlatformBranding,
      useCustomLogo,
      useCustomFavicon,
      useCustomColors,
      publicPoweredByEnabled,
      customSupportEmail
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard`);
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/admin/organization');
    }
  };

  const currentStatus = domainData?.status || 'NOT_CONFIGURED';

  const statusBadge =
    currentStatus === 'ACTIVE'
      ? { text: '● Active', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' }
      : currentStatus === 'VERIFIED'
      ? { text: '● Verified', color: 'bg-blue-500/10 text-blue-500 border-blue-500/30' }
      : currentStatus === 'PENDING'
      ? { text: '○ Pending Verification', color: 'bg-amber-500/10 text-amber-500 border-amber-500/30' }
      : currentStatus === 'ERROR'
      ? { text: '● DNS Error', color: 'bg-red-500/10 text-red-500 border-red-500/30' }
      : { text: '○ Not Configured', color: 'bg-gray-500/10 text-[var(--text-muted)] border-[var(--brand-border)]' };

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
            <Globe className="w-4 h-4" /> Multi-Tenant Domain Routing
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--brand-text)] mt-1">
            Custom Domain & White-label
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Connect your own custom domain name and customize public branding for your LMS website.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={handleGoBack} className="flex items-center gap-1.5 text-xs">
            <ArrowLeft className="w-4 h-4" /> Go Back
          </Button>
        </div>
      </div>

      {/* 1. Platform Subdomain Card */}
      <Card className="p-6 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-[var(--brand-text)] flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-500" /> Auto-Generated Platform Address
              </h3>
              <Badge variant="success" className="text-[10px]">
                ● Active
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Your default platform web address is always active and accessible globally.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(`https://${domainData?.platformSubdomain || 'academy.platform.com'}`, 'Platform Address')}
              className="flex items-center gap-1.5 text-xs"
            >
              <Copy className="w-3.5 h-3.5" /> Copy
            </Button>
            <a
              href={`https://${domainData?.platformSubdomain || '#'}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button type="button" variant="secondary" size="sm" className="flex items-center gap-1.5 text-xs">
                <ExternalLink className="w-3.5 h-3.5" /> Visit Website
              </Button>
            </a>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] font-mono text-xs font-bold text-[#BE1E2E] flex items-center justify-between">
          <span>https://{domainData?.platformSubdomain || 'loading...'}</span>
          <span className="text-[10px] text-[var(--text-muted)] font-normal uppercase">Immutable System Domain</span>
        </div>
      </Card>

      {/* 2. Custom Domain Configuration Card */}
      <Card className="p-6 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--brand-border)]">
          <div>
            <h3 className="font-extrabold text-base text-[var(--brand-text)] flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#BE1E2E]" /> Custom Domain Name
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Point your existing domain (e.g. <code>learn.yourcompany.com</code>) to your LMS academy.
            </p>
          </div>

          <span className={`px-3 py-1 rounded-full border text-xs font-mono font-extrabold uppercase ${statusBadge.color}`}>
            {statusBadge.text}
          </span>
        </div>

        {/* Custom Domain Input Form */}
        <form onSubmit={handleConfigureSubmit} className="space-y-4 max-w-xl text-xs">
          <div className="space-y-1.5">
            <label className="font-bold text-[var(--brand-text)] block">
              Custom Domain Hostname *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                placeholder="learn.yourorganization.com"
                value={customDomainInput}
                onChange={(e) => setCustomDomainInput(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs focus:outline-none focus:border-[#BE1E2E] font-mono"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={configureDomainMutation.isPending}
                className="flex items-center gap-1.5"
              >
                {configureDomainMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                <span>Save Domain</span>
              </Button>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Do not include <code>http://</code> or <code>https://</code>. Example: <code>learn.academy.org</code>.
            </p>
          </div>
        </form>

        {/* DNS Verification Record Table */}
        {domainData?.customDomain && (
          <div className="space-y-4 pt-2 border-t border-[var(--brand-border)]">
            <h4 className="font-extrabold text-xs text-[var(--brand-text)] uppercase font-mono tracking-wider">
              DNS Configuration Instructions
            </h4>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Add the following CNAME record in your DNS provider control panel (e.g., Cloudflare, GoDaddy, Namecheap):
            </p>

            <div className="overflow-x-auto rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)]">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[var(--bg-surface-elevated)] border-b border-[var(--brand-border)] text-[var(--text-muted)] uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Type</th>
                    <th className="p-3">Host / Name</th>
                    <th className="p-3">Target / Value</th>
                    <th className="p-3">TTL</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--brand-border)] text-[var(--brand-text)]">
                  <tr>
                    <td className="p-3 font-bold text-blue-500">
                      {domainData.verificationRecord?.type || 'CNAME'}
                    </td>
                    <td className="p-3 font-bold">
                      {domainData.verificationRecord?.name || 'learn'}
                    </td>
                    <td className="p-3 text-[#BE1E2E] font-bold">
                      {domainData.verificationRecord?.value || 'verify.platform.com'}
                    </td>
                    <td className="p-3 text-[var(--text-muted)]">
                      {domainData.verificationRecord?.ttl || 'Auto'}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(
                            `${domainData.verificationRecord?.type} ${domainData.verificationRecord?.name} -> ${domainData.verificationRecord?.value}`,
                            'DNS Record'
                          )
                        }
                        className="text-[10px] py-1 px-2.5"
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Action Bar for DNS Verification / Activation / Disconnect */}
            <div className="pt-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => verifyDomainMutation.mutate()}
                  disabled={verifyDomainMutation.isPending}
                  className="flex items-center gap-1.5 text-xs"
                >
                  {verifyDomainMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 text-blue-500" />}
                  <span>Verify DNS Record</span>
                </Button>

                {currentStatus === 'VERIFIED' && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => activateDomainMutation.mutate()}
                    disabled={activateDomainMutation.isPending}
                    className="flex items-center gap-1.5 text-xs btn-primary shadow-md"
                  >
                    {activateDomainMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    <span>Activate Custom Domain</span>
                  </Button>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnectDomainMutation.isPending}
                className="flex items-center gap-1.5 text-xs text-red-500 border-red-500/30 hover:bg-red-500/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Disconnect Domain</span>
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* 3. White-label Settings Card */}
      <Card className="p-6 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-500 uppercase tracking-wider">
            <Sparkles className="w-4 h-4" /> White-label Branding Engine
          </div>
          <h3 className="text-xl font-black tracking-tight text-[var(--brand-text)] mt-1">
            Public Website White-label Customization
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Customize which platform branding elements appear on your public LMS website. Admin console retains DIDM platform identity.
          </p>
        </div>

        <form onSubmit={handleSaveWhiteLabel} className="space-y-5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Toggle 1: Hide Platform Branding */}
            <div className="p-4 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-extrabold text-xs text-[var(--brand-text)]">Hide Platform Branding</h4>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Suppress default platform references from your public LMS website header and footer.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHidePlatformBranding(!hidePlatformBranding)}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 flex-shrink-0 focus:outline-none ${
                  hidePlatformBranding ? 'bg-[#BE1E2E]' : 'bg-[var(--brand-border)]'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform block ${
                    hidePlatformBranding ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 2: Use Organization Logo */}
            <div className="p-4 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-extrabold text-xs text-[var(--brand-text)]">Use Organization Logo</h4>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Display your custom organization logo across navigation bars and headers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUseCustomLogo(!useCustomLogo)}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 flex-shrink-0 focus:outline-none ${
                  useCustomLogo ? 'bg-[#BE1E2E]' : 'bg-[var(--brand-border)]'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform block ${
                    useCustomLogo ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 3: Use Organization Favicon */}
            <div className="p-4 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-extrabold text-xs text-[var(--brand-text)]">Use Custom Favicon</h4>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Use your organization&apos;s custom favicon media asset for browser tabs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUseCustomFavicon(!useCustomFavicon)}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 flex-shrink-0 focus:outline-none ${
                  useCustomFavicon ? 'bg-[#BE1E2E]' : 'bg-[var(--brand-border)]'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform block ${
                    useCustomFavicon ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 4: Use Custom Theme Colors */}
            <div className="p-4 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-extrabold text-xs text-[var(--brand-text)]">Use Custom Theme Colors</h4>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Apply your primary/secondary branding palette to buttons, links, and accents.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUseCustomColors(!useCustomColors)}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 flex-shrink-0 focus:outline-none ${
                  useCustomColors ? 'bg-[#BE1E2E]' : 'bg-[var(--brand-border)]'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform block ${
                    useCustomColors ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Custom Support Email Input */}
          <div className="p-4 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] space-y-2 max-w-md">
            <label className="font-bold text-[var(--brand-text)] block">
              Custom Support Email Address
            </label>
            <input
              type="email"
              placeholder="support@yourcompany.com"
              value={customSupportEmail}
              onChange={(e) => setCustomSupportEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-xs focus:outline-none focus:border-[#BE1E2E]"
            />
            <p className="text-[11px] text-[var(--text-muted)]">
              Displayed in website footer and help links for student inquiries.
            </p>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={saveWhiteLabelMutation.isPending}
              className="flex items-center gap-2 btn-primary shadow-lg shadow-[#BE1E2E]/20"
            >
              {saveWhiteLabelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Save White-label Settings</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
