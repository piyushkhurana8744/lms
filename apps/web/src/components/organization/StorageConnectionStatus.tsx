'use client';

import React from 'react';
import { StorageProvider, StorageConnectionStatus as StatusType } from '@edtech/types';
import { Button, Badge } from '@edtech/ui';
import { Cloud, HardDrive, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Settings, Trash2 } from 'lucide-react';

export interface StorageConnectionStatusProps {
  provider?: StorageProvider;
  status?: StatusType;
  bucketName?: string;
  region?: string;
  cloudName?: string;
  lastTestedAt?: Date | string;
  lastError?: string;
  isTestPending?: boolean;
  onOpenConfigure: () => void;
  onTestConnection: () => void;
  onDisconnect?: () => void;
}

export function StorageConnectionStatus({
  provider,
  status = 'NOT_CONFIGURED',
  bucketName,
  region,
  cloudName,
  lastTestedAt,
  lastError,
  isTestPending = false,
  onOpenConfigure,
  onTestConnection,
  onDisconnect
}: StorageConnectionStatusProps) {
  const getProviderLabel = () => {
    switch (provider) {
      case 'CLOUDFLARE_R2':
        return 'Cloudflare R2 Storage';
      case 'AMAZON_S3':
      case 'AWS_S3':
        return 'Amazon S3 Bucket';
      case 'CLOUDINARY':
        return 'Cloudinary Media Asset Store';
      case 'LOCAL':
        return 'Local Development Disk';
      default:
        return 'Not Configured';
    }
  };

  const isConnected = status === 'CONNECTED';
  const isError = status === 'ERROR';

  return (
    <div className="p-5 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-4 shadow-lg text-[var(--brand-text)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--brand-border)]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-[var(--brand-text)]">{getProviderLabel()}</h4>
            <p className="text-[11px] text-[var(--text-muted)] font-mono">
              {cloudName ? `Cloud: ${cloudName}` : bucketName ? `Bucket: ${bucketName}` : 'No active storage provider selected'}
            </p>
          </div>
        </div>

        <div>
          {isConnected ? (
            <Badge variant="success" className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Connected
            </Badge>
          ) : isError ? (
            <Badge variant="brand" className="flex items-center gap-1 bg-red-500/10 text-red-500 border-red-500/20">
              <XCircle className="w-3.5 h-3.5" /> Connection Error
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Not Configured
            </Badge>
          )}
        </div>
      </div>

      {/* Error Message banner if any */}
      {isError && lastError && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="font-mono text-[11px]">{lastError}</span>
        </div>
      )}

      {/* Status Details */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)]">
          <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase block">Provider</span>
          <span className="font-bold text-[var(--brand-text)] truncate">{provider || 'LOCAL'}</span>
        </div>

        <div className="p-3 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)]">
          <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase block">Region / Account</span>
          <span className="font-bold text-[var(--brand-text)] truncate">{region || cloudName || 'auto'}</span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)]">
          <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase block">Last Verified</span>
          <span className="font-mono text-[11px] text-[var(--brand-text)]">
            {lastTestedAt ? new Date(lastTestedAt).toLocaleString() : 'Never'}
          </span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="pt-2 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onOpenConfigure}
          className="flex items-center gap-1.5 btn-primary text-xs"
        >
          <Settings className="w-3.5 h-3.5" /> Configure Storage
        </Button>

        <div className="flex items-center gap-2">
          {provider && provider !== 'LOCAL' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onTestConnection}
              disabled={isTestPending}
              className="flex items-center gap-1.5 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestPending ? 'animate-spin' : ''}`} />
              <span>{isTestPending ? 'Testing...' : 'Test Connection'}</span>
            </Button>
          )}

          {onDisconnect && isConnected && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDisconnect}
              className="text-red-500 hover:bg-red-500/10 text-xs flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Disconnect
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
