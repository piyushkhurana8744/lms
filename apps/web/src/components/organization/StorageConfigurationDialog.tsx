'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@edtech/ui';
import { useGlobalError } from '@/components/error/useGlobalError';
import { useConfirmation } from '@/components/confirmation/useConfirmation';
import {
  Cloud,
  HardDrive,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Loader2,
  Eye,
  EyeOff,
  Activity,
  Save,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Server
} from 'lucide-react';
import { StorageProvider, IOrganizationStorageResponse } from '@edtech/types';

export interface StorageConfigurationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig?: IOrganizationStorageResponse;
}

export function StorageConfigurationDialog({
  isOpen,
  onClose,
  currentConfig
}: StorageConfigurationDialogProps) {
  const queryClient = useQueryClient();
  const { showError } = useGlobalError();
  const { confirm } = useConfirmation();

  const [platform, setPlatform] = useState<'LMS' | 'CLOUDINARY'>('LMS');
  const [provider, setProvider] = useState<StorageProvider>('CLOUDFLARE_R2');

  // Cloudflare R2 Form
  const [r2Form, setR2Form] = useState({
    accountId: '',
    endpoint: '',
    bucket: '',
    accessKeyId: '',
    secretAccessKey: '',
    publicBaseUrl: ''
  });

  // Amazon S3 Form
  const [s3Form, setS3Form] = useState({
    bucket: '',
    region: 'us-east-1',
    endpoint: '',
    accessKeyId: '',
    secretAccessKey: '',
    publicBaseUrl: ''
  });

  // Cloudinary Form
  const [cloudinaryForm, setCloudinaryForm] = useState({
    cloudName: '',
    apiKey: '',
    apiSecret: '',
    folderPrefix: ''
  });

  const [showSecret, setShowSecret] = useState(false);
  const [replaceCredentials, setReplaceCredentials] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (currentConfig) {
      if (currentConfig.provider) {
        setProvider(currentConfig.provider);
        if (currentConfig.provider === 'CLOUDINARY') {
          setPlatform('CLOUDINARY');
        } else {
          setPlatform('LMS');
        }
      }

      if (currentConfig.r2) {
        setR2Form({
          accountId: currentConfig.r2.accountId || '',
          endpoint: currentConfig.r2.endpoint || '',
          bucket: currentConfig.r2.bucket || '',
          accessKeyId: '',
          secretAccessKey: '',
          publicBaseUrl: currentConfig.r2.publicBaseUrl || ''
        });
      }

      if (currentConfig.s3) {
        setS3Form({
          bucket: currentConfig.s3.bucket || '',
          region: currentConfig.s3.region || 'us-east-1',
          endpoint: currentConfig.s3.endpoint || '',
          accessKeyId: '',
          secretAccessKey: '',
          publicBaseUrl: currentConfig.s3.publicBaseUrl || ''
        });
      }

      if (currentConfig.cloudinary) {
        setCloudinaryForm({
          cloudName: currentConfig.cloudinary.cloudName || '',
          apiKey: currentConfig.cloudinary.apiKey || '',
          apiSecret: '',
          folderPrefix: currentConfig.cloudinary.folderPrefix || ''
        });
      }

      const isSecretConfigured = Boolean(
        currentConfig.r2?.secretAccessKeyConfigured ||
        currentConfig.s3?.secretAccessKeyConfigured ||
        currentConfig.cloudinary?.apiSecretConfigured
      );

      setReplaceCredentials(!isSecretConfigured);
    }
  }, [currentConfig]);

  // Handle Top-level platform switch
  const handlePlatformSwitch = (selectedPlatform: 'LMS' | 'CLOUDINARY') => {
    setPlatform(selectedPlatform);
    setTestResult(null);
    if (selectedPlatform === 'CLOUDINARY') {
      setProvider('CLOUDINARY');
    } else {
      setProvider('CLOUDFLARE_R2');
    }
  };

  // Test Connection Mutation
  const testMutation = useMutation({
    mutationFn: async () => {
      const activeProvider = platform === 'CLOUDINARY' ? 'CLOUDINARY' : provider;
      const payload = {
        provider: activeProvider,
        r2: activeProvider === 'CLOUDFLARE_R2' ? r2Form : undefined,
        s3: (activeProvider === 'AMAZON_S3' || activeProvider === 'AWS_S3') ? s3Form : undefined,
        cloudinary: activeProvider === 'CLOUDINARY' ? cloudinaryForm : undefined
      };
      const res = await fetch('/api/v1/organization/settings/storage/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Storage connection test failed');
      return json.data;
    },
    onSuccess: (data) => {
      setTestResult({ success: true, message: data.message || 'Connection successful. Ready to store media.' });
    },
    onError: (err: Error) => {
      setTestResult({ success: false, message: err.message || 'Unable to connect to storage provider.' });
      showError({ title: 'Storage Connection Failed', message: err.message });
    }
  });

  // Save Storage Config Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const activeProvider = platform === 'CLOUDINARY' ? 'CLOUDINARY' : provider;
      const payload = {
        provider: activeProvider,
        r2: activeProvider === 'CLOUDFLARE_R2' ? r2Form : undefined,
        s3: (activeProvider === 'AMAZON_S3' || activeProvider === 'AWS_S3') ? s3Form : undefined,
        cloudinary: activeProvider === 'CLOUDINARY' ? cloudinaryForm : undefined,
        isEnabled: true
      };
      const res = await fetch('/api/v1/organization/settings/storage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to save storage configuration');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-storage'] });
      queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
      queryClient.invalidateQueries({ queryKey: ['organization-setup-progress'] });
      onClose();
    },
    onError: (err: Error) => {
      showError({ title: 'Storage Configuration Save Failed', message: err.message });
    }
  });

  const handleSaveWithSwitchCheck = async () => {
    const activeProvider = platform === 'CLOUDINARY' ? 'CLOUDINARY' : provider;
    if (
      currentConfig?.provider &&
      currentConfig.status === 'CONNECTED' &&
      currentConfig.provider !== activeProvider
    ) {
      const providerNames: Record<string, string> = {
        CLOUDFLARE_R2: 'Cloudflare R2',
        AWS_S3: 'Amazon S3',
        AMAZON_S3: 'Amazon S3',
        CLOUDINARY: 'Cloudinary Platform',
        LOCAL: 'Local Storage'
      };

      const newProviderName = providerNames[activeProvider] || activeProvider;

      const confirmed = await confirm({
        title: 'Switch storage provider?',
        description: `New uploads will use ${newProviderName}.\nExisting files will remain in their original storage provider and will not be automatically migrated.`,
        type: 'danger',
        confirmText: 'Switch Provider',
        cancelText: 'Cancel'
      });

      if (!confirmed) return;
    }

    saveMutation.mutate();
  };

  if (!isOpen) return null;

  const activeProvider = platform === 'CLOUDINARY' ? 'CLOUDINARY' : provider;
  const isConfigured = Boolean(
    (activeProvider === 'CLOUDFLARE_R2' && currentConfig?.r2?.secretAccessKeyConfigured) ||
    ((activeProvider === 'AMAZON_S3' || activeProvider === 'AWS_S3') && currentConfig?.s3?.secretAccessKeyConfigured) ||
    (activeProvider === 'CLOUDINARY' && currentConfig?.cloudinary?.apiSecretConfigured)
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh] text-[var(--brand-text)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--brand-border)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#BE1E2E]/10 text-[#BE1E2E]">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold tracking-tight">Configure Object Storage Platform</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Choose whether to use LMS Native Storage (Local/R2/S3) or Cloudinary for course media.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-surface-elevated)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top-Level Platform Selector Cards */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-[var(--brand-text)] block">Platform Selection</label>
          <div className="grid grid-cols-2 gap-3">
            {/* LMS Storage Platform Card */}
            <button
              type="button"
              onClick={() => handlePlatformSwitch('LMS')}
              className={`p-3.5 rounded-xl border text-left flex items-start justify-between transition-all ${
                platform === 'LMS'
                  ? 'bg-[#BE1E2E]/10 border-[#BE1E2E] ring-2 ring-[#BE1E2E]/20'
                  : 'bg-[var(--bg-surface-elevated)] border-[var(--brand-border)] hover:border-[#BE1E2E]/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${platform === 'LMS' ? 'bg-[#BE1E2E] text-white' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-[var(--brand-text)]">LMS Native Storage</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Cloudflare R2, S3, or Local</div>
                </div>
              </div>
              {platform === 'LMS' && <CheckCircle2 className="w-4 h-4 text-[#BE1E2E]" />}
            </button>

            {/* Cloudinary Platform Card */}
            <button
              type="button"
              onClick={() => handlePlatformSwitch('CLOUDINARY')}
              className={`p-3.5 rounded-xl border text-left flex items-start justify-between transition-all ${
                platform === 'CLOUDINARY'
                  ? 'bg-[#BE1E2E]/10 border-[#BE1E2E] ring-2 ring-[#BE1E2E]/20'
                  : 'bg-[var(--bg-surface-elevated)] border-[var(--brand-border)] hover:border-[#BE1E2E]/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${platform === 'CLOUDINARY' ? 'bg-indigo-600 text-white' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-[var(--brand-text)]">Cloudinary Platform</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Media & Video Optimization</div>
                </div>
              </div>
              {platform === 'CLOUDINARY' && <CheckCircle2 className="w-4 h-4 text-[#BE1E2E]" />}
            </button>
          </div>
        </div>

        {/* LMS Sub-Drivers Selector */}
        {platform === 'LMS' && (
          <div className="space-y-2 pt-1 border-t border-[var(--brand-border)]">
            <label className="text-xs font-bold text-[var(--brand-text)] block">LMS Storage Engine</label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setProvider('CLOUDFLARE_R2');
                  setTestResult(null);
                }}
                className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all ${
                  provider === 'CLOUDFLARE_R2'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold'
                    : 'bg-[var(--bg-surface-elevated)] border-[var(--brand-border)] text-[var(--text-muted)]'
                }`}
              >
                Cloudflare R2
              </button>

              <button
                type="button"
                onClick={() => {
                  setProvider('AMAZON_S3');
                  setTestResult(null);
                }}
                className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all ${
                  (provider === 'AMAZON_S3' || provider === 'AWS_S3')
                    ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400 font-extrabold'
                    : 'bg-[var(--bg-surface-elevated)] border-[var(--brand-border)] text-[var(--text-muted)]'
                }`}
              >
                Amazon S3
              </button>

              <button
                type="button"
                onClick={() => {
                  setProvider('LOCAL');
                  setTestResult(null);
                }}
                className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all ${
                  provider === 'LOCAL'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-extrabold'
                    : 'bg-[var(--bg-surface-elevated)] border-[var(--brand-border)] text-[var(--text-muted)]'
                }`}
              >
                Local Disk
              </button>
            </div>
          </div>
        )}

        {/* Credentials Mask Banner */}
        {isConfigured && !replaceCredentials && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Encrypted secrets stored safely on server</span>
            </div>
            <button
              type="button"
              onClick={() => setReplaceCredentials(true)}
              className="text-[11px] font-bold text-[#BE1E2E] hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Replace Secret
            </button>
          </div>
        )}

        {/* Cloudflare R2 Form */}
        {provider === 'CLOUDFLARE_R2' && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-[var(--brand-text)]">Bucket Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. didm-media-bucket"
                  value={r2Form.bucket}
                  onChange={(e) => setR2Form({ ...r2Form, bucket: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] font-mono text-xs focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[var(--brand-text)]">Cloudflare Account ID</label>
                <input
                  type="text"
                  placeholder="e.g. 52f9b1c7a8..."
                  value={r2Form.accountId}
                  onChange={(e) => setR2Form({ ...r2Form, accountId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] font-mono text-xs focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[var(--brand-text)]">S3 Endpoint URL (https://)</label>
              <input
                type="url"
                placeholder="https://<account_id>.r2.cloudflarestorage.com"
                value={r2Form.endpoint}
                onChange={(e) => setR2Form({ ...r2Form, endpoint: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] font-mono text-xs focus:outline-none focus:border-[#BE1E2E]"
              />
            </div>

            {(!isConfigured || replaceCredentials) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-[var(--brand-text)]">Access Key ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="Access Key ID"
                    value={r2Form.accessKeyId}
                    onChange={(e) => setR2Form({ ...r2Form, accessKeyId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] font-mono text-xs focus:outline-none focus:border-[#BE1E2E]"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[var(--brand-text)]">Secret Access Key *</label>
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="text-[10px] text-[var(--text-muted)] hover:text-[var(--brand-text)] flex items-center gap-1"
                    >
                      {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showSecret ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    type={showSecret ? 'text' : 'password'}
                    required
                    placeholder="Secret Access Key"
                    value={r2Form.secretAccessKey}
                    onChange={(e) => setR2Form({ ...r2Form, secretAccessKey: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] font-mono text-xs focus:outline-none focus:border-[#BE1E2E]"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="font-bold text-[var(--brand-text)]">Public Base URL (Optional Custom CDN Domain)</label>
              <input
                type="url"
                placeholder="https://media.yourdomain.com"
                value={r2Form.publicBaseUrl}
                onChange={(e) => setR2Form({ ...r2Form, publicBaseUrl: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] font-mono text-xs focus:outline-none focus:border-[#BE1E2E]"
              />
            </div>
          </div>
        )}

        {/* Amazon S3 Form */}
        {(provider === 'AMAZON_S3' || provider === 'AWS_S3') && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-[var(--brand-text)]">S3 Bucket Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. my-s3-course-bucket"
                  value={s3Form.bucket}
                  onChange={(e) => setS3Form({ ...s3Form, bucket: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] font-mono text-xs focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[var(--brand-text)]">AWS Region</label>
                <input
                  type="text"
                  placeholder="us-east-1"
                  value={s3Form.region}
                  onChange={(e) => setS3Form({ ...s3Form, region: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] font-mono text-xs focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[var(--brand-text)]">Custom S3 Endpoint (Optional HTTPS)</label>
              <input
                type="url"
                placeholder="https://s3.us-east-1.amazonaws.com"
                value={s3Form.endpoint}
                onChange={(e) => setS3Form({ ...s3Form, endpoint: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] font-mono text-xs focus:outline-none focus:border-[#BE1E2E]"
              />
            </div>

            {(!isConfigured || replaceCredentials) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-[var(--brand-text)]">AWS Access Key ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    value={s3Form.accessKeyId}
                    onChange={(e) => setS3Form({ ...s3Form, accessKeyId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] font-mono text-xs focus:outline-none focus:border-[#BE1E2E]"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[var(--brand-text)]">AWS Secret Access Key *</label>
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="text-[10px] text-[var(--text-muted)] hover:text-[var(--brand-text)] flex items-center gap-1"
                    >
                      {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showSecret ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    type={showSecret ? 'text' : 'password'}
                    required
                    placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                    value={s3Form.secretAccessKey}
                    onChange={(e) => setS3Form({ ...s3Form, secretAccessKey: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] font-mono text-xs focus:outline-none focus:border-[#BE1E2E]"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="font-bold text-[var(--brand-text)]">Public Base URL (Optional CDN)</label>
              <input
                type="url"
                placeholder="https://cdn.yourdomain.com"
                value={s3Form.publicBaseUrl}
                onChange={(e) => setS3Form({ ...s3Form, publicBaseUrl: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] font-mono text-xs focus:outline-none focus:border-[#BE1E2E]"
              />
            </div>
          </div>
        )}

        {/* Cloudinary Form */}
        {provider === 'CLOUDINARY' && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-[var(--brand-text)]">Cloud Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. didm-lms-cloud"
                  value={cloudinaryForm.cloudName}
                  onChange={(e) => setCloudinaryForm({ ...cloudinaryForm, cloudName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] font-mono text-xs focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[var(--brand-text)]">API Key *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 123456789012345"
                  value={cloudinaryForm.apiKey}
                  onChange={(e) => setCloudinaryForm({ ...cloudinaryForm, apiKey: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] font-mono text-xs focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-[var(--brand-text)]">API Secret *</label>
                {(!isConfigured || replaceCredentials) && (
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="text-[10px] text-[var(--text-muted)] hover:text-[var(--brand-text)] flex items-center gap-1"
                  >
                    {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showSecret ? 'Hide' : 'Show'}
                  </button>
                )}
              </div>

              {isConfigured && !replaceCredentials ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    disabled
                    value="••••••••••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface-elevated)] font-mono text-xs text-[var(--text-muted)]"
                  />
                </div>
              ) : (
                <input
                  type={showSecret ? 'text' : 'password'}
                  required
                  placeholder="Cloudinary API Secret"
                  value={cloudinaryForm.apiSecret}
                  onChange={(e) => setCloudinaryForm({ ...cloudinaryForm, apiSecret: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] font-mono text-xs focus:outline-none focus:border-[#BE1E2E]"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[var(--brand-text)]">Folder Prefix (Optional)</label>
              <input
                type="text"
                placeholder="e.g. course-assets (No ../ or absolute paths)"
                value={cloudinaryForm.folderPrefix}
                onChange={(e) => setCloudinaryForm({ ...cloudinaryForm, folderPrefix: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] font-mono text-xs focus:outline-none focus:border-[#BE1E2E]"
              />
              <p className="text-[10px] text-[var(--text-muted)]">
                Files will be saved in <code className="font-mono bg-[var(--bg-surface-elevated)] px-1 py-0.5 rounded">tenants/&#123;tenantId&#125;/media/&#123;folderPrefix&#125;/...</code>
              </p>
            </div>
          </div>
        )}

        {/* Test Result Message */}
        {testResult && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400'
                : 'bg-red-500/10 border border-red-500/25 text-red-700 dark:text-red-400'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            ) : (
              <X className="w-4 h-4 text-red-500 flex-shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="pt-4 border-t border-[var(--brand-border)] flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || saveMutation.isPending}
            className="flex items-center gap-2"
          >
            {testMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Testing...
              </>
            ) : (
              <>
                <Activity className="w-4 h-4 text-[#BE1E2E]" /> Test Connection
              </>
            )}
          </Button>

          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSaveWithSwitchCheck}
              disabled={saveMutation.isPending || testMutation.isPending}
              className="flex items-center gap-2"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Configuration
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
