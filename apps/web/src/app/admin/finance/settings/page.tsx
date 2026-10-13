'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Badge, Button } from '@edtech/ui';

import { IPaymentGatewayConfig } from '@edtech/types';
import {
  Settings,
  ShieldCheck,
  CreditCard,
  Key,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Zap
} from 'lucide-react';

export default function PaymentGatewaySettingsPage() {
  const queryClient = useQueryClient();

  const [provider, setProvider] = useState<'RAZORPAY' | 'STRIPE' | 'MANUAL'>('RAZORPAY');
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);

  // Razorpay Secrets (never shown plain text from server)
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [razorpayWebhookSecret, setRazorpayWebhookSecret] = useState('');

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery<{ success: boolean; data: IPaymentGatewayConfig }>({
    queryKey: ['admin-payment-gateway-config'],
    queryFn: async () => {
      const res = await fetch('/api/v1/finance/settings/gateway');
      if (!res.ok) throw new Error('Failed to load gateway configurations');
      return res.json();
    }
  });

  useEffect(() => {
    if (data?.data) {
      const cfg = data.data;
      setProvider(cfg.provider || 'RAZORPAY');
      setIsEnabled(cfg.isEnabled || false);
      setIsLiveMode(cfg.isLiveMode || false);
      if (cfg.razorpay) {
        setRazorpayKeyId(cfg.razorpay.keyId || '');
      }
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/v1/finance/settings/gateway', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to save gateway configuration');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payment-gateway-config'] });
      setSuccessMessage('Payment gateway settings securely encrypted and saved.');
      setRazorpayKeySecret('');
      setRazorpayWebhookSecret('');
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (err: any) => {
      setErrorMessage(err.message);
      setTimeout(() => setErrorMessage(null), 5000);
    }
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    saveMutation.mutate({
      provider,
      isEnabled,
      isLiveMode,
      razorpay: {
        keyId: razorpayKeyId.trim() || undefined,
        keySecret: razorpayKeySecret.trim() || undefined,
        webhookSecret: razorpayWebhookSecret.trim() || undefined
      }
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#BE1E2E]" />
          <p className="text-sm font-medium text-[var(--text-muted)]">Loading security credentials...</p>
        </div>
      </div>
    );
  }

  const cfg = data?.data;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-black tracking-tight text-[var(--brand-text)]">
                Payment Gateway Configuration
              </h1>
              <p className="text-xs text-[var(--text-muted)] font-mono">
                Provider-independent online checkout with AES-256 encrypted credential storage
              </p>
            </div>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-500 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-500 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {errorMessage}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Provider Selection & Status */}
        <Card className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-5">
          <h2 className="text-sm font-bold text-[var(--brand-text)] flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#BE1E2E]" /> Payment Provider Setup
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'RAZORPAY', label: 'Razorpay (India UPI, Cards, Netbanking)' },
              { id: 'STRIPE', label: 'Stripe Global (International Cards)' },
              { id: 'MANUAL', label: 'Offline / Manual Collection Only' }
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProvider(p.id as any)}
                className={`p-4 rounded-xl border text-left transition-all space-y-1.5 ${
                  provider === p.id
                    ? 'border-[#BE1E2E] bg-[#BE1E2E]/5 shadow-sm'
                    : 'border-[var(--brand-border)] bg-[var(--bg-surface-elevated)] opacity-70 hover:opacity-100'
                }`}
              >
                <div className="text-xs font-black text-[var(--brand-text)]">{p.id}</div>
                <div className="text-[11px] text-[var(--text-muted)] leading-tight">{p.label}</div>
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-[var(--brand-border)] flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-[var(--brand-text)] flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  className="rounded border-[var(--brand-border)] text-[#BE1E2E] focus:ring-[#BE1E2E]"
                />
                Enable Online Gateway Checkout for Students
              </label>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-[var(--brand-text)] flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isLiveMode}
                  onChange={(e) => setIsLiveMode(e.target.checked)}
                  className="rounded border-[var(--brand-border)] text-[#BE1E2E] focus:ring-[#BE1E2E]"
                />
                Live Production Mode (Uncheck for Sandbox Test)
              </label>
            </div>
          </div>
        </Card>

        {/* Razorpay Credentials */}
        {provider === 'RAZORPAY' && (
          <Card className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--brand-text)] flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-500" /> Razorpay API Credentials
              </h2>
              <div className="flex items-center gap-2">
                {cfg?.razorpay?.isKeySecretConfigured ? (
                  <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px]">
                    SECRET STORED SECURELY
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px]">
                    SECRET NOT CONFIGURED
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--brand-text)]">Razorpay Key ID *</label>
                <input
                  value={razorpayKeyId}
                  onChange={(e) => setRazorpayKeyId(e.target.value)}
                  placeholder="rzp_test_..."
                  className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs font-mono focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--brand-text)]">
                  Razorpay Key Secret (Encrypted at Rest)
                </label>
                <input
                  type="password"
                  value={razorpayKeySecret}
                  onChange={(e) => setRazorpayKeySecret(e.target.value)}
                  placeholder={
                    cfg?.razorpay?.isKeySecretConfigured
                      ? '•••••••••••••••••••• (Leave blank to keep existing secret)'
                      : 'Enter Razorpay Key Secret'
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs font-mono focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--brand-text)]">
                  Razorpay Webhook Secret (Encrypted at Rest)
                </label>
                <input
                  type="password"
                  value={razorpayWebhookSecret}
                  onChange={(e) => setRazorpayWebhookSecret(e.target.value)}
                  placeholder={
                    cfg?.razorpay?.isWebhookSecretConfigured
                      ? '•••••••••••••••••••• (Leave blank to keep existing secret)'
                      : 'Enter Webhook Signing Secret'
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs font-mono focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>
            </div>

          </Card>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button
            type="submit"
            disabled={saveMutation.isPending}
            className="text-xs font-bold gap-1.5 bg-[#BE1E2E] hover:bg-[#a01826] text-white shadow-md shadow-[#BE1E2E]/20"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saveMutation.isPending ? 'Saving...' : 'Save & Encrypt Gateway Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}
