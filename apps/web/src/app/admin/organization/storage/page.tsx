'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Badge } from '@edtech/ui';
import { BackButton } from '@/components/navigation/BackButton';
import { StorageConfigurationDialog } from '@/components/organization/StorageConfigurationDialog';
import { useGlobalError } from '@/components/error/useGlobalError';
import { useConfirmation } from '@/components/confirmation/useConfirmation';
import {
  HardDrive,
  Cloud,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Settings,
  Power,
  Trash2,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Lock
} from 'lucide-react';
import { IOrganizationStorageResponse } from '@edtech/types';

export default function AdminOrganizationStoragePage() {
  const queryClient = useQueryClient();
  const { showError } = useGlobalError();
  const { confirm } = useConfirmation();

  const [isDialogOpened, setIsDialogOpened] = useState(false);

  // Query Storage Configuration
  const {
    data: storageConfig,
    isLoading,
    error
  } = useQuery<IOrganizationStorageResponse>({
    queryKey: ['organization-storage'],
    queryFn: async () => {
      const res = await fetch('/api/v1/organization/settings/storage');
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message || 'Failed to fetch storage configuration');
      }
      const json = await res.json();
      return json.data;
    }
  });

  // Enable Mutation
  const enableMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/organization/settings/storage/enable', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to enable storage');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-storage'] });
      queryClient.invalidateQueries({ queryKey: ['organization-setup-progress'] });
    },
    onError: (err: Error) => showError({ title: 'Enable Failed', message: err.message })
  });

  // Disable Mutation
  const disableMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/organization/settings/storage/disable', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to disable storage');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-storage'] });
      queryClient.invalidateQueries({ queryKey: ['organization-setup-progress'] });
    },
    onError: (err: Error) => showError({ title: 'Disable Failed', message: err.message })
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/organization/settings/storage', { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to delete storage configuration');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-storage'] });
      queryClient.invalidateQueries({ queryKey: ['organization-setup-progress'] });
    },
    onError: (err: Error) => showError({ title: 'Delete Failed', message: err.message })
  });

  // Test Mutation
  const testMutation = useMutation({
    mutationFn: async () => {
      if (!storageConfig || storageConfig.status === 'NOT_CONFIGURED') return;
      const res = await fetch('/api/v1/organization/settings/storage/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: storageConfig.provider
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Storage connection test failed');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-storage'] });
    },
    onError: (err: Error) => showError({ title: 'Test Failed', message: err.message })
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#BE1E2E]" />
        <p className="text-sm text-[var(--text-muted)] font-medium">Loading Storage Configuration...</p>
      </div>
    );
  }

  const isConnected = storageConfig?.status === 'CONNECTED' && storageConfig?.isEnabled;
  const isConfigured = storageConfig?.status !== 'NOT_CONFIGURED' && Boolean(storageConfig?.provider);
  const activeProvider = storageConfig?.provider || 'CLOUDFLARE_R2';

  const getProviderIcon = () => {
    switch (activeProvider) {
      case 'CLOUDFLARE_R2':
        return <Cloud className="w-6 h-6 text-amber-500" />;
      case 'CLOUDINARY':
        return <ImageIcon className="w-6 h-6 text-indigo-500" />;
      case 'AWS_S3':
      case 'AMAZON_S3':
        return <HardDrive className="w-6 h-6 text-blue-500" />;
      default:
        return <HardDrive className="w-6 h-6 text-emerald-500" />;
    }
  };

  const getProviderTitle = () => {
    switch (activeProvider) {
      case 'CLOUDFLARE_R2':
        return 'Cloudflare R2 Storage';
      case 'CLOUDINARY':
        return 'Cloudinary Media CDN';
      case 'AWS_S3':
      case 'AMAZON_S3':
        return 'Amazon S3 Storage';
      default:
        return 'Local File Storage';
    }
  };

  const getProviderSubtitle = () => {
    switch (activeProvider) {
      case 'CLOUDFLARE_R2':
        return 'Cloudflare R2 Object Storage (Zero Egress Fees)';
      case 'CLOUDINARY':
        return 'Cloudinary Image, Video & Media Optimization Platform';
      case 'AWS_S3':
      case 'AMAZON_S3':
        return 'Amazon Web Services Simple Storage Service (S3)';
      default:
        return 'Local Development File Storage';
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-8 text-[var(--brand-text)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[var(--brand-border)]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <BackButton fallback="/admin/organization" label="Back to Settings" />
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Storage Configuration</h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">
            Configure Cloudflare R2, Amazon S3, or Cloudinary object storage for tenant-isolated course media hosting.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsDialogOpened(true)}
          className="flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          <span>{isConfigured ? 'Edit Configuration' : 'Configure Storage'}</span>
        </Button>
      </div>

      {/* Primary Status Card */}
      <Card className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--brand-border)]">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#BE1E2E]/10 text-[#BE1E2E]">
              {getProviderIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold tracking-tight">
                  {getProviderTitle()}
                </h2>
                {isConnected ? (
                  <Badge variant="success">● Connected</Badge>
                ) : storageConfig?.status === 'DISABLED' ? (
                  <Badge variant="outline">Disabled</Badge>
                ) : storageConfig?.status === 'ERROR' ? (
                  <Badge variant="brand">⚠ Error</Badge>
                ) : (
                  <Badge variant="outline">Not Configured</Badge>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 font-mono">
                {getProviderSubtitle()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isConfigured && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testMutation.mutate()}
                  disabled={testMutation.isPending}
                  className="flex items-center gap-1.5"
                >
                  {testMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Activity className="w-3.5 h-3.5 text-[#BE1E2E]" />
                  )}
                  <span>Test Connection</span>
                </Button>

                {storageConfig?.isEnabled ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => disableMutation.mutate()}
                    disabled={disableMutation.isPending}
                    className="flex items-center gap-1 text-amber-600 dark:text-amber-400"
                  >
                    <Power className="w-3.5 h-3.5" /> Disable
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => enableMutation.mutate()}
                    disabled={enableMutation.isPending}
                    className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"
                  >
                    <Power className="w-3.5 h-3.5" /> Enable
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Storage Details Grid */}
        {isConfigured ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-1">
              <span className="text-[var(--text-muted)] block font-mono">
                {activeProvider === 'CLOUDINARY' ? 'Cloud Name' : 'Bucket Name'}
              </span>
              <span className="font-bold text-[var(--brand-text)] font-mono truncate block">
                {storageConfig?.cloudinary?.cloudName || storageConfig?.r2?.bucket || storageConfig?.s3?.bucket || 'N/A'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-1">
              <span className="text-[var(--text-muted)] block font-mono">
                {activeProvider === 'CLOUDINARY' ? 'Folder Prefix' : 'Region / Endpoint'}
              </span>
              <span className="font-bold text-[var(--brand-text)] font-mono truncate block">
                {activeProvider === 'CLOUDINARY'
                  ? storageConfig?.cloudinary?.folderPrefix || 'Default (tenants/{tenantId}/media)'
                  : storageConfig?.s3?.region || 'Auto / Cloudflare Global'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-1">
              <span className="text-[var(--text-muted)] block font-mono">
                {activeProvider === 'CLOUDINARY' ? 'API Key' : 'Access Key ID'}
              </span>
              <span className="font-bold text-[var(--brand-text)] font-mono truncate block flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-500" />
                {activeProvider === 'CLOUDINARY'
                  ? storageConfig?.cloudinary?.apiKey || 'Configured'
                  : storageConfig?.r2?.accessKeyIdMasked || storageConfig?.s3?.accessKeyIdMasked || '••••••••'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-1">
              <span className="text-[var(--text-muted)] block font-mono">Secret Key Status</span>
              <span className="font-bold text-emerald-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Encrypted & Secured
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-1">
              <span className="text-[var(--text-muted)] block font-mono">CDN / Base URL</span>
              <span className="font-bold text-[var(--brand-text)] font-mono truncate block">
                {activeProvider === 'CLOUDINARY'
                  ? 'res.cloudinary.com'
                  : storageConfig?.r2?.publicBaseUrl || storageConfig?.s3?.publicBaseUrl || 'Default Presigned URLs'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-1">
              <span className="text-[var(--text-muted)] block font-mono">Last Connected</span>
              <span className="font-bold text-[var(--brand-text)] font-mono truncate block flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[var(--text-muted)]" />
                {storageConfig?.lastConnectedAt
                  ? new Date(storageConfig.lastConnectedAt).toLocaleString()
                  : 'Never'}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center space-y-4 bg-[var(--bg-surface-elevated)] rounded-2xl border border-[var(--brand-border)]">
            <div className="w-12 h-12 rounded-2xl bg-[#BE1E2E]/10 text-[#BE1E2E] mx-auto flex items-center justify-center">
              <HardDrive className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base font-extrabold text-[var(--brand-text)]">Storage Not Configured</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Your organization needs object storage configured before course media, video lessons, PDFs, and audio assets can be uploaded.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsDialogOpened(true)}
              className="inline-flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              <span>Configure Storage Provider</span>
            </Button>
          </div>
        )}

        {/* Delete Storage Danger Zone */}
        {isConfigured && (
          <div className="pt-6 border-t border-[var(--brand-border)] flex items-center justify-between">
            <div>
              <h4 className="text-xs font-extrabold text-red-500">Danger Zone</h4>
              <p className="text-[11px] text-[var(--text-muted)]">
                Delete encrypted storage credentials configuration for this tenant.
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const confirmed = await confirm({
                  title: 'Delete Storage Configuration?',
                  description: 'This will remove encrypted credentials for this organization. New media uploads will fail until re-configured.',
                  type: 'danger',
                  confirmText: 'Delete Configuration',
                  cancelText: 'Cancel'
                });
                if (confirmed) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
              className="text-red-500 hover:bg-red-500/10 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Configuration
            </Button>
          </div>
        )}
      </Card>

      {/* Storage Configuration Dialog */}
      <StorageConfigurationDialog
        isOpen={isDialogOpened}
        onClose={() => setIsDialogOpened(false)}
        currentConfig={storageConfig}
      />
    </div>
  );
}
