'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Badge } from '@edtech/ui';
import { useGlobalError } from '@/components/error/useGlobalError';
import { HardDrive, Cloud, Image as ImageIcon, ArrowRight, ArrowLeft, Loader2, RefreshCw, CheckCircle, Server } from 'lucide-react';

export interface StorageStepProps {
  onNext: () => void;
  onBack: () => void;
  onSkipStep: () => void;
}

export function StorageStep({
  onNext,
  onBack,
  onSkipStep
}: StorageStepProps) {
  const queryClient = useQueryClient();
  const { showError } = useGlobalError();

  const [platform, setPlatform] = useState<'LMS' | 'CLOUDINARY'>('LMS');
  const [lmsProvider, setLmsProvider] = useState<'CLOUDFLARE_R2' | 'AMAZON_S3' | 'LOCAL'>('CLOUDFLARE_R2');

  const [bucketName, setBucketName] = useState('');
  const [region, setRegion] = useState('');
  const [accountId, setAccountId] = useState('');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [cloudName, setCloudName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [publicBaseUrl, setPublicBaseUrl] = useState('');

  // Fetch Current Storage Settings
  const { data } = useQuery({
    queryKey: ['organization-storage'],
    queryFn: async () => {
      const res = await fetch('/api/v1/organization/settings/storage');
      if (!res.ok) throw new Error('Failed to fetch storage settings');
      return res.json();
    }
  });

  const storageDoc = data?.data || null;

  useEffect(() => {
    if (storageDoc) {
      if (storageDoc.provider === 'CLOUDINARY') {
        setPlatform('CLOUDINARY');
        if (storageDoc.cloudinary) {
          setCloudName(storageDoc.cloudinary.cloudName || '');
          setApiKey(storageDoc.cloudinary.apiKey || '');
        }
      } else {
        setPlatform('LMS');
        setLmsProvider(storageDoc.provider || 'CLOUDFLARE_R2');
        if (storageDoc.r2) {
          setAccountId(storageDoc.r2.accountId || '');
          setBucketName(storageDoc.r2.bucket || '');
          setPublicBaseUrl(storageDoc.r2.publicBaseUrl || '');
        } else if (storageDoc.s3) {
          setBucketName(storageDoc.s3.bucket || '');
          setRegion(storageDoc.s3.region || '');
          setPublicBaseUrl(storageDoc.s3.publicBaseUrl || '');
        }
      }
    }
  }, [storageDoc]);

  const provider = platform === 'CLOUDINARY' ? 'CLOUDINARY' : lmsProvider;

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/v1/organization/settings/storage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to save storage settings');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-storage'] });
      onNext();
    },
    onError: (err: Error) => {
      showError({ title: 'Storage Error', message: err.message });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { provider, isEnabled: true };

    if (provider === 'CLOUDFLARE_R2') {
      payload.r2 = { accountId, accessKeyId, secretAccessKey, bucket: bucketName, publicBaseUrl };
    } else if (provider === 'AMAZON_S3') {
      payload.s3 = { accessKeyId, secretAccessKey, bucket: bucketName, region, publicBaseUrl };
    } else if (provider === 'CLOUDINARY') {
      payload.cloudinary = { cloudName, apiKey, apiSecret };
    }

    saveMutation.mutate(payload);
  };

  return (
    <Card className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-6 max-w-2xl mx-auto shadow-xl text-[var(--brand-text)]">
      <div className="flex items-center gap-3 pb-4 border-b border-[var(--brand-border)]">
        <div className="p-3 rounded-2xl bg-[#BE1E2E]/10 text-[#BE1E2E]">
          <HardDrive className="w-6 h-6" />
        </div>
        <div>
          <span className="text-[10px] font-mono font-bold text-[#BE1E2E] uppercase tracking-wider">
            Step 3 of 8
          </span>
          <h3 className="text-xl font-extrabold text-[var(--brand-text)]">Storage Configuration</h3>
          <p className="text-xs text-[var(--text-muted)]">
            Choose your primary storage platform: LMS Native Storage or Cloudinary Media CDN.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 text-xs">
        {/* Top-Level Platform Selector */}
        <div className="space-y-2">
          <label className="font-bold text-[var(--brand-text)] block">Select Media Platform *</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPlatform('LMS')}
              className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                platform === 'LMS'
                  ? 'bg-[#BE1E2E]/10 border-[#BE1E2E] ring-2 ring-[#BE1E2E]/20'
                  : 'bg-[var(--brand-background)] border-[var(--brand-border)] hover:border-[#BE1E2E]/40'
              }`}
            >
              <div className={`p-2.5 rounded-xl ${platform === 'LMS' ? 'bg-[#BE1E2E] text-white' : 'bg-[var(--bg-surface-elevated)] text-[var(--text-muted)]'}`}>
                <Server className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-sm text-[var(--brand-text)]">LMS Storage</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Host media via Cloudflare R2, Amazon S3, or Local server storage.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPlatform('CLOUDINARY')}
              className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                platform === 'CLOUDINARY'
                  ? 'bg-[#BE1E2E]/10 border-[#BE1E2E] ring-2 ring-[#BE1E2E]/20'
                  : 'bg-[var(--brand-background)] border-[var(--brand-border)] hover:border-[#BE1E2E]/40'
              }`}
            >
              <div className={`p-2.5 rounded-xl ${platform === 'CLOUDINARY' ? 'bg-indigo-600 text-white' : 'bg-[var(--bg-surface-elevated)] text-[var(--text-muted)]'}`}>
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-sm text-[var(--brand-text)]">Cloudinary Platform</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Cloudinary Media & Video CDN optimization platform.
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* LMS Sub-Provider Options */}
        {platform === 'LMS' && (
          <div className="space-y-3 p-4 rounded-2xl bg-[var(--brand-background)] border border-[var(--brand-border)]">
            <label className="font-bold text-[var(--brand-text)] block">LMS Storage Backend Driver</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setLmsProvider('CLOUDFLARE_R2')}
                className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all ${
                  lmsProvider === 'CLOUDFLARE_R2'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold'
                    : 'bg-[var(--bg-surface)] border-[var(--brand-border)] text-[var(--text-muted)]'
                }`}
              >
                Cloudflare R2
              </button>

              <button
                type="button"
                onClick={() => setLmsProvider('AMAZON_S3')}
                className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all ${
                  lmsProvider === 'AMAZON_S3'
                    ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400 font-extrabold'
                    : 'bg-[var(--bg-surface)] border-[var(--brand-border)] text-[var(--text-muted)]'
                }`}
              >
                Amazon S3
              </button>

              <button
                type="button"
                onClick={() => setLmsProvider('LOCAL')}
                className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all ${
                  lmsProvider === 'LOCAL'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-extrabold'
                    : 'bg-[var(--bg-surface)] border-[var(--brand-border)] text-[var(--text-muted)]'
                }`}
              >
                Local Storage
              </button>
            </div>

            {/* Cloudflare R2 Credentials Form */}
            {lmsProvider === 'CLOUDFLARE_R2' && (
              <div className="space-y-2.5 pt-2">
                <input
                  type="text"
                  placeholder="Cloudflare Account ID *"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-xs font-mono"
                />
                <input
                  type="text"
                  placeholder="R2 Access Key ID *"
                  value={accessKeyId}
                  onChange={(e) => setAccessKeyId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-xs font-mono"
                />
                <input
                  type="password"
                  placeholder="R2 Secret Access Key *"
                  value={secretAccessKey}
                  onChange={(e) => setSecretAccessKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-xs font-mono"
                />
                <input
                  type="text"
                  placeholder="Bucket Name *"
                  value={bucketName}
                  onChange={(e) => setBucketName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-xs"
                />
              </div>
            )}

            {/* Amazon S3 Credentials Form */}
            {lmsProvider === 'AMAZON_S3' && (
              <div className="space-y-2.5 pt-2">
                <input
                  type="text"
                  placeholder="Bucket Name *"
                  value={bucketName}
                  onChange={(e) => setBucketName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-xs"
                />
                <input
                  type="text"
                  placeholder="AWS Region (e.g. us-east-1)"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-xs font-mono"
                />
                <input
                  type="text"
                  placeholder="AWS Access Key ID *"
                  value={accessKeyId}
                  onChange={(e) => setAccessKeyId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-xs font-mono"
                />
                <input
                  type="password"
                  placeholder="AWS Secret Access Key *"
                  value={secretAccessKey}
                  onChange={(e) => setSecretAccessKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-xs font-mono"
                />
              </div>
            )}
          </div>
        )}

        {/* Cloudinary Platform Form */}
        {platform === 'CLOUDINARY' && (
          <div className="space-y-3 p-4 rounded-2xl bg-[var(--brand-background)] border border-[var(--brand-border)]">
            <label className="font-bold text-[var(--brand-text)] block">Cloudinary API Credentials</label>
            <input
              type="text"
              placeholder="Cloud Name *"
              value={cloudName}
              onChange={(e) => setCloudName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-xs"
            />
            <input
              type="text"
              placeholder="API Key *"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-xs font-mono"
            />
            <input
              type="password"
              placeholder="API Secret *"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-xs font-mono"
            />
          </div>
        )}

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
    </Card>
  );
}

