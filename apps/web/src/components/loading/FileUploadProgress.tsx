'use client';

import React from 'react';
import { Upload, CheckCircle2, AlertCircle, Loader2, X, RefreshCw } from 'lucide-react';

export type FileUploadStatus =
  | 'PREPARING'
  | 'UPLOADING'
  | 'PROCESSING'
  | 'SAVING_METADATA'
  | 'SUCCESS'
  | 'COMPLETED'
  | 'ERROR'
  | 'FAILED';

interface FileUploadProgressProps {
  fileName: string;
  fileSize?: string;
  progress?: number;
  status: FileUploadStatus;
  error?: string;
  onCancel?: () => void;
  onRetry?: () => void;
}

export function FileUploadProgress({
  fileName,
  fileSize,
  progress,
  status,
  error,
  onCancel,
  onRetry
}: FileUploadProgressProps) {
  const isSuccess = status === 'SUCCESS' || status === 'COMPLETED';
  const isError = status === 'ERROR' || status === 'FAILED';
  const isUploading = !isSuccess && !isError;

  const isIndeterminate = progress === undefined || progress === null;

  const getStatusLabel = () => {
    switch (status) {
      case 'PREPARING':
        return 'Preparing Upload...';
      case 'UPLOADING':
        return 'Uploading...';
      case 'PROCESSING':
        return 'Processing Video...';
      case 'SAVING_METADATA':
        return 'Saving Metadata...';
      case 'SUCCESS':
      case 'COMPLETED':
        return 'Upload Complete';
      case 'ERROR':
      case 'FAILED':
        return 'Upload Failed';
      default:
        return 'Uploading...';
    }
  };

  return (
    <div className="p-4 rounded-xl border border-[var(--brand-border,rgba(255,255,255,0.1))] bg-[var(--brand-card,#1A1A1A)] space-y-3 transition-all">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold">
        <div className="flex items-center gap-2 truncate">
          {isUploading && <Loader2 className="w-4 h-4 text-[#BE1E2E] animate-spin shrink-0" />}
          {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
          {isError && <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
          <span className="truncate text-[var(--brand-text,#FFFFFF)] font-sans">{fileName}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {fileSize && (
            <span className="text-[11px] text-[var(--brand-text-secondary,rgba(255,255,255,0.6))] font-mono">
              {fileSize}
            </span>
          )}

          {isUploading && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
              title="Cancel Upload"
              aria-label="Cancel upload"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {isError && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-[11px] font-medium flex items-center gap-1 transition-colors"
              title="Retry Upload"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          )}
        </div>
      </div>

      {isUploading && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono text-[var(--brand-text-secondary,rgba(255,255,255,0.6))]">
            <span>{getStatusLabel()}</span>
            {!isIndeterminate && <span>{Math.round(progress)}%</span>}
          </div>
          <div className="w-full h-2 bg-black/20 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r from-[#BE1E2E] to-[#E52D3D] transition-all duration-200 ${
                isIndeterminate ? 'w-full animate-pulse' : ''
              }`}
              style={{
                width: isIndeterminate ? '100%' : `${Math.min(100, Math.max(0, progress))}%`
              }}
            />
          </div>
        </div>
      )}

      {isSuccess && (
        <p className="text-[11px] font-medium text-emerald-500 font-sans">
          File uploaded successfully and ready to use!
        </p>
      )}

      {isError && error && (
        <p className="text-[11px] font-medium text-rose-500 font-sans">
          {error}
        </p>
      )}
    </div>
  );
}
