'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { IMedia, MediaType } from '@edtech/types';
import { Button } from '@edtech/ui';
import { Image as ImageIcon, FileText, Video, Music, X, Search, Check, Loader2 } from 'lucide-react';

export interface MediaSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mediaId: string, mediaUrl?: string) => void;
  selectedMediaId?: string;
  mediaTypeFilter?: MediaType;
  title?: string;
}

export function MediaSelector({
  isOpen,
  onClose,
  onSelect,
  selectedMediaId,
  mediaTypeFilter = 'IMAGE',
  title = 'Select Media Asset'
}: MediaSelectorProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['cms-media-selector', page, search, mediaTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '12');
      if (search) params.set('search', search);
      if (mediaTypeFilter) params.set('mediaType', mediaTypeFilter);

      const res = await fetch(`/api/v1/media?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch media assets');
      return res.json();
    },
    enabled: isOpen
  });

  if (!isOpen) return null;

  const mediaList: IMedia[] = data?.data || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[85vh] text-[var(--brand-text)]">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--brand-border)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#BE1E2E]/10 text-[#BE1E2E]">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold">{title}</h3>
              <p className="text-xs text-[var(--text-muted)]">Select an asset from your organization media library.</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-surface-elevated)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search media by filename..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
          />
        </div>

        {/* Media Grid */}
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[var(--text-muted)] flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#BE1E2E]" />
            <span>Loading media library...</span>
          </div>
        ) : mediaList.length === 0 ? (
          <div className="p-10 text-center space-y-2 bg-[var(--bg-surface-elevated)] rounded-xl border border-[var(--brand-border)]">
            <p className="text-xs font-semibold text-[var(--brand-text)]">No media assets found</p>
            <p className="text-[11px] text-[var(--text-muted)]">Upload media assets in Admin Media Library first.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {mediaList.map((item) => {
              const isSelected = selectedMediaId === item.id || selectedMediaId === (item as any)._id;
              return (
                <button
                  key={item.id || (item as any)._id}
                  type="button"
                  onClick={() => {
                    onSelect(item.id || (item as any)._id, item.url);
                    onClose();
                  }}
                  className={`p-2.5 rounded-xl border text-left flex flex-col items-center space-y-2 transition-all relative group ${
                    isSelected
                      ? 'bg-[#BE1E2E]/10 border-[#BE1E2E] ring-2 ring-[#BE1E2E]/30'
                      : 'bg-[var(--bg-surface-elevated)] border-[var(--brand-border)] hover:border-[#BE1E2E]/50'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 p-1 rounded-full bg-[#BE1E2E] text-white">
                      <Check className="w-3 h-3" />
                    </div>
                  )}

                  <div className="w-full h-24 rounded-lg bg-[var(--brand-background)] border border-[var(--brand-border)] overflow-hidden flex items-center justify-center">
                    {item.url && item.mediaType === 'IMAGE' ? (
                      <img src={item.url} alt={item.originalFileName} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-[var(--text-muted)] opacity-60" />
                    )}
                  </div>

                  <span className="text-[11px] font-semibold truncate w-full text-center text-[var(--brand-text)]">
                    {item.originalFileName}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[var(--brand-border)] flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onSelect('', '');
              onClose();
            }}
            className="text-xs text-red-500 hover:underline font-semibold"
          >
            Clear Selection
          </button>

          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
