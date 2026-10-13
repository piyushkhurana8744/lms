'use client';

import React from 'react';
import Link from 'next/link';
import { Card, Badge, Button } from '@edtech/ui';
import { HardDrive, Cloud, Image as ImageIcon, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { IOrganizationStorageResponse, StorageProvider } from '@edtech/types';

export interface StorageConfigurationCardProps {
  storageConfig?: IOrganizationStorageResponse | null;
  onConfigureClick?: () => void;
}

export function StorageConfigurationCard({
  storageConfig,
  onConfigureClick
}: StorageConfigurationCardProps) {
  const isConnected = storageConfig?.status === 'CONNECTED' && storageConfig?.isEnabled;
  const activeProvider: StorageProvider = storageConfig?.provider || 'CLOUDFLARE_R2';

  const providerLabels: Record<string, { title: string; subtitle: string; icon: React.ReactNode }> = {
    CLOUDFLARE_R2: {
      title: 'Cloudflare R2',
      subtitle: 'Zero egress fees object storage',
      icon: <Cloud className="w-5 h-5 text-amber-500" />
    },
    AWS_S3: {
      title: 'Amazon S3',
      subtitle: 'AWS Simple Storage Service',
      icon: <HardDrive className="w-5 h-5 text-blue-500" />
    },
    AMAZON_S3: {
      title: 'Amazon S3',
      subtitle: 'AWS Simple Storage Service',
      icon: <HardDrive className="w-5 h-5 text-blue-500" />
    },
    CLOUDINARY: {
      title: 'Cloudinary',
      subtitle: 'Image, video & media optimization CDN',
      icon: <ImageIcon className="w-5 h-5 text-indigo-500" />
    },
    LOCAL: {
      title: 'Local / Development',
      subtitle: 'Local disk storage mode',
      icon: <HardDrive className="w-5 h-5 text-emerald-500" />
    }
  };

  const activeInfo = providerLabels[activeProvider] || providerLabels.CLOUDFLARE_R2;

  return (
    <Card interactive className="space-y-5 flex flex-col justify-between border-[var(--brand-border)]">
      <div className="space-y-4">
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
            <HardDrive className="w-5 h-5" />
          </div>
          {isConnected ? (
            <Badge variant="success" className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Connected
            </Badge>
          ) : storageConfig?.status === 'DISABLED' ? (
            <Badge variant="outline">Disabled</Badge>
          ) : storageConfig?.status === 'ERROR' ? (
            <Badge variant="brand" className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Error
            </Badge>
          ) : (
            <Badge variant="outline">Not Configured</Badge>
          )}
        </div>

        <div>
          <h3 className="font-extrabold text-base text-[var(--brand-text)]">Storage Configuration</h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Choose where your LMS course media, video lessons, PDFs, and audio assets are stored.
          </p>
        </div>

        {/* Available Provider Options Matrix */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Cloudflare R2 */}
          <div
            className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
              activeProvider === 'CLOUDFLARE_R2' && isConnected
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold'
                : 'bg-[var(--bg-surface-elevated)] border-[var(--brand-border)] text-[var(--text-muted)]'
            }`}
          >
            <Cloud className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <div className="truncate">
              <div className="font-bold text-[11px] truncate">Cloudflare R2</div>
              <div className="text-[9px] opacity-75 font-mono truncate">S3 compatible</div>
            </div>
          </div>

          {/* Amazon S3 */}
          <div
            className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
              (activeProvider === 'AMAZON_S3' || activeProvider === 'AWS_S3') && isConnected
                ? 'bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-300 font-bold'
                : 'bg-[var(--bg-surface-elevated)] border-[var(--brand-border)] text-[var(--text-muted)]'
            }`}
          >
            <HardDrive className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <div className="truncate">
              <div className="font-bold text-[11px] truncate">Amazon S3</div>
              <div className="text-[9px] opacity-75 font-mono truncate">AWS Cloud</div>
            </div>
          </div>

          {/* Cloudinary */}
          <div
            className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
              activeProvider === 'CLOUDINARY' && isConnected
                ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-700 dark:text-indigo-300 font-bold'
                : 'bg-[var(--bg-surface-elevated)] border-[var(--brand-border)] text-[var(--text-muted)]'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            <div className="truncate">
              <div className="font-bold text-[11px] truncate">Cloudinary</div>
              <div className="text-[9px] opacity-75 font-mono truncate">Media & CDN</div>
            </div>
          </div>

          {/* Local */}
          <div
            className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
              activeProvider === 'LOCAL' && isConnected
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold'
                : 'bg-[var(--bg-surface-elevated)] border-[var(--brand-border)] text-[var(--text-muted)]'
            }`}
          >
            <HardDrive className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <div className="truncate">
              <div className="font-bold text-[11px] truncate">Local / Dev</div>
              <div className="text-[9px] opacity-75 font-mono truncate">Disk Storage</div>
            </div>
          </div>
        </div>

        {/* Active Provider Status Box */}
        <div className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-muted)] font-mono text-[10px]">Active Provider:</span>
            <span className="font-bold text-[var(--brand-text)] flex items-center gap-1.5">
              {activeInfo.icon}
              {activeInfo.title}
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] pt-0.5">
            {isConnected
              ? `Connected & storing workspace media in ${activeInfo.title}.`
              : 'Configure a storage provider to enable media uploads.'}
          </p>
        </div>
      </div>

      {onConfigureClick ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={onConfigureClick}
          className="w-full flex items-center justify-center gap-2"
        >
          <span>Configure Storage</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      ) : (
        <Link href="/admin/organization/storage" className="w-full">
          <Button variant="secondary" size="sm" className="w-full flex items-center justify-center gap-2">
            <span>Configure Storage</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      )}
    </Card>
  );
}
