'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IMedia, MediaType, StorageProvider } from '@edtech/types';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@edtech/ui';
import { FileText, Video, Music, Image as ImageIcon, Trash2, Upload, Search, Filter, ExternalLink, HardDrive } from 'lucide-react';
import { BackButton } from '@/components/navigation/BackButton';
import { useConfirmation } from '@/components/confirmation/useConfirmation';
import { useGlobalError } from '@/components/error/useGlobalError';
import { uploadMediaFile } from '@/lib/uploadMedia';
import { MediaLibrarySkeleton } from '@/components/loading/SkeletonLoaders';
import { LoadingButton } from '@/components/ui/LoadingButton';

export default function AdminMediaLibraryPage() {

  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const { confirm } = useConfirmation();
  const { showError } = useGlobalError();

  const canUploadMedia = hasPermission('media.upload');
  const canDeleteMedia = hasPermission('media.delete');

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<MediaType | ''>('');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [page, setPage] = useState(1);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch Storage Config for status check
  const { data: storageConfig } = useQuery({
    queryKey: ['organization-storage'],
    queryFn: async () => {
      const res = await fetch('/api/v1/organization/settings/storage');
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    }
  });

  // Fetch Media List
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-media', page, search, selectedType, selectedProvider],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');
      if (search) params.set('search', search);
      if (selectedType) params.set('mediaType', selectedType);
      if (selectedProvider) params.set('storageProvider', selectedProvider);

      const res = await fetch(`/api/v1/media?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch media library');
      return res.json();
    }
  });

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      return uploadMediaFile(file);
    },
    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: ['admin-media'] });
      setIsUploadModalOpen(false);
      setUploadFile(null);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.message);
      showError({
        title: 'Media Upload Failed',
        error: err
      });
    }
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (mediaId: string) => {
      const res = await fetch(`/api/v1/media/${mediaId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.message || 'Failed to delete media');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-media'] });
    },
    onError: (err: any) => {
      showError({
        title: 'Delete Failed',
        error: err
      });
    }
  });


  const mediaList: IMedia[] = data?.data || [];
  const meta = data?.meta || { page: 1, totalPages: 1, total: 0 };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getMediaIcon = (type: MediaType) => {
    switch (type) {
      case 'VIDEO':
        return <Video className="w-4 h-4 text-purple-500" />;
      case 'PDF':
        return <FileText className="w-4 h-4 text-red-500" />;
      case 'AUDIO':
        return <Music className="w-4 h-4 text-emerald-500" />;
      case 'IMAGE':
        return <ImageIcon className="w-4 h-4 text-blue-500" />;
      default:
        return <FileText className="w-4 h-4 text-[var(--text-muted)]" />;
    }
  };

  const getProviderBadge = (provider?: string) => {
    switch (provider) {
      case 'CLOUDINARY':
        return <span className="px-2 py-0.5 rounded font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">Cloudinary</span>;
      case 'CLOUDFLARE_R2':
        return <span className="px-2 py-0.5 rounded font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">Cloudflare R2</span>;
      case 'AWS_S3':
      case 'AMAZON_S3':
        return <span className="px-2 py-0.5 rounded font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">Amazon S3</span>;
      case 'LOCAL':
        return <span className="px-2 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Local Disk</span>;
      default:
        return <span className="px-2 py-0.5 rounded font-bold bg-[var(--bg-surface)] border border-[var(--brand-border)]">Cloudflare R2</span>;
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)]">
      <BackButton fallback="/admin" />
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--brand-border)] pb-6">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#BE1E2E] bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
            Media Asset Library
          </span>
          <div className="flex items-center gap-2 mt-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--brand-text)]">
              Media Management
            </h1>
            {storageConfig?.status === 'CONNECTED' && storageConfig?.isEnabled ? (
              <a
                href="/admin/organization/storage"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 hover:underline"
              >
                <span>● Storage: {storageConfig.provider === 'CLOUDINARY' ? 'Cloudinary' : storageConfig.provider === 'CLOUDFLARE_R2' ? 'Cloudflare R2' : 'Amazon S3'}</span>
              </a>
            ) : (
              <a
                href="/admin/organization/storage"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-600 border border-amber-500/25 hover:underline"
              >
                <span>⚠ Storage Not Configured</span>
              </a>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Centralized media asset vault for your active workspace.
          </p>
        </div>

        {canUploadMedia && (
          <Button
            variant="primary"
            className="btn-primary text-xs shadow-lg shadow-[#BE1E2E]/20"
            onClick={() => {
              setUploadFile(null);
              setErrorMessage(null);
              setIsUploadModalOpen(true);
            }}
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Media
          </Button>
        )}
      </div>

      {/* Filter Controls Bar */}
      <div className="glass-card p-4 rounded-xl flex flex-wrap items-center gap-4 border border-[var(--brand-border)]">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search files by original filename..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--brand-border)] text-xs focus:outline-none focus:ring-2 focus:ring-[#BE1E2E]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value as any);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--brand-border)] text-xs font-mono"
          >
            <option value="">All Media Types</option>
            <option value="VIDEO">Videos</option>
            <option value="PDF">PDF Documents</option>
            <option value="AUDIO">Audio Tracks</option>
            <option value="IMAGE">Images</option>
          </select>

          <select
            value={selectedProvider}
            onChange={(e) => {
              setSelectedProvider(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--brand-border)] text-xs font-mono"
          >
            <option value="">All Storage Providers</option>
            <option value="CLOUDINARY">Cloudinary</option>
            <option value="CLOUDFLARE_R2">Cloudflare R2</option>
            <option value="AWS_S3">Amazon S3</option>
            <option value="LOCAL">Local Disk</option>
          </select>
        </div>
      </div>

      {/* Media Table / Cards */}
      {isLoading ? (
        <MediaLibrarySkeleton />
      ) : isError ? (
        <div className="glass-card p-8 border-red-500/30 text-red-500 text-center text-xs space-y-1">
          <p className="font-bold">Failed to load media assets</p>
          <p>{(error as any)?.message}</p>
        </div>
      ) : mediaList.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3 rounded-2xl border border-[var(--brand-border)]">
          <p className="text-sm font-semibold text-[var(--brand-text)]">No media assets found</p>
          <p className="text-xs text-[var(--text-muted)]">Upload video, PDF, audio, or image files to populate your media vault.</p>
          {canUploadMedia && (
            <Button
              variant="primary"
              className="btn-primary text-xs mt-2"
              onClick={() => setIsUploadModalOpen(true)}
            >
              + Upload First File
            </Button>
          )}
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden border border-[var(--brand-border)] shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] border-b border-[var(--brand-border)] uppercase text-[10px] font-mono tracking-wider">
                <tr>
                  <th className="py-3 px-4">Filename</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Storage Provider</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Uploaded Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--brand-border)]">
                {mediaList.map((item) => (
                  <tr key={item.id || (item as any)._id} className="hover:bg-[var(--bg-surface-elevated)]/50 transition-colors">
                    <td className="py-3.5 px-4 font-medium max-w-[280px]">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--brand-border)] flex-shrink-0">
                          {getMediaIcon(item.mediaType)}
                        </div>
                        <span className="truncate text-[var(--brand-text)] font-semibold">{item.originalFileName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--brand-border)]">
                        {item.mediaType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      {getProviderBadge(item.storageProvider)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[var(--text-muted)]">
                      {formatFileSize(item.sizeBytes)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[10px]">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold ${
                          item.status === 'READY'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : item.status === 'FAILED'
                            ? 'bg-red-500/10 text-red-500'
                            : 'bg-amber-500/10 text-amber-600'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[var(--text-muted)]">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[var(--brand-text)] hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" /> View
                        </a>
                      )}
                      {canDeleteMedia && item.status !== 'DELETED' && (
                        <button
                          onClick={async () => {
                            await confirm({
                              title: 'Delete this file?',
                              description: 'This file will be permanently removed from the media library. This action cannot be undone.',
                              resourceName: item.originalFileName,
                              type: 'danger',
                              confirmText: 'Delete File',
                              cancelText: 'Cancel',
                              onConfirm: async () => {
                                await deleteMutation.mutateAsync(item.id || (item as any)._id);
                              }
                            });
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-red-500 hover:bg-red-500/10 rounded transition-colors"
                        >
                          Delete
                        </button>
                      )}

                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-[var(--brand-border)] flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
            <span>
              Page {meta.page} of {meta.totalPages} ({meta.total} Total Files)
            </span>
            <div className="space-x-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded bg-[var(--bg-surface)] border border-[var(--brand-border)] disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded bg-[var(--bg-surface)] border border-[var(--brand-border)] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Media Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl p-6 w-full max-w-md space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--brand-border)] pb-4">
              <h3 className="text-base font-bold text-[var(--brand-text)]">Upload Media Asset</h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--brand-text)] text-sm"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-xs">
                {errorMessage}
              </div>
            )}

            <div className="space-y-4">
              <div className="border-2 border-dashed border-[var(--brand-border)] rounded-xl p-6 text-center space-y-2 hover:border-[#BE1E2E]/50 transition-colors">
                <Upload className="w-8 h-8 mx-auto text-[#BE1E2E] opacity-70" />
                <p className="text-xs font-semibold text-[var(--brand-text)]">
                  {uploadFile ? uploadFile.name : 'Select file to upload'}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] font-mono">
                  Supported formats: Video (MP4/WebM), PDF, Audio (MP3/WAV), Images (JPG/PNG/WebP)
                </p>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="mt-2 block w-full text-xs text-[var(--text-muted)] file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#BE1E2E] file:text-white hover:file:bg-[#a01826] cursor-pointer"
                />
              </div>

              {uploadFile && (
                <div className="p-3 rounded-lg bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs font-mono space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Selected Size:</span>
                    <span className="font-bold text-[var(--brand-text)]">{formatFileSize(uploadFile.size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">MIME Type:</span>
                    <span className="font-bold text-[var(--brand-text)]">{uploadFile.type || 'Unknown'}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-[var(--brand-border)]">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 text-xs font-medium border border-[var(--brand-border)] rounded-lg"
              >
                Cancel
              </button>
              <LoadingButton
                variant="primary"
                size="sm"
                loading={uploadMutation.isPending}
                loadingText="Uploading File..."
                disabled={!uploadFile || uploadMutation.isPending}
                onClick={() => {
                  if (uploadFile) uploadMutation.mutate(uploadFile);
                }}
              >
                Start Upload
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
