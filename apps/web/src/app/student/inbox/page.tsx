'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Inbox,
  Megaphone,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  Eye,
  Search,
  Filter,
  ArrowRight,
  MessageSquare
} from 'lucide-react';
import { formatDate, formatDateTime } from '@edtech/utils';

export default function StudentInboxPage() {
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // 1. Fetch unread count
  const { data: unreadData } = useQuery({
    queryKey: ['student-inbox-unread-count'],
    queryFn: async () => {
      const res = await fetch('/api/v1/communications/unread-count');
      if (!res.ok) return { data: { unreadAnnouncements: 0, totalUnread: 0 } };
      return res.json();
    }
  });

  // 2. Fetch inbox feed
  const { data: inboxData, isLoading, refetch } = useQuery({
    queryKey: ['student-inbox-items', unreadOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (unreadOnly) params.set('unreadOnly', 'true');
      const res = await fetch(`/api/v1/communications/inbox?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load inbox items');
      return res.json();
    }
  });

  const inboxItems = inboxData?.data?.items || [];
  const unreadCount = unreadData?.data?.totalUnread ?? 0;

  // 3. Mark Read Mutation
  const markReadMutation = useMutation({
    mutationFn: async ({ itemType, itemId }: { itemType: string; itemId: string }) => {
      const res = await fetch('/api/v1/communications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemType, itemId })
      });
      if (!res.ok) throw new Error('Failed to mark read');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-inbox-items'] });
      queryClient.invalidateQueries({ queryKey: ['student-inbox-unread-count'] });
    }
  });

  const handleSelectItem = (item: any) => {
    setSelectedItem(item);
    if (!item.isRead) {
      markReadMutation.mutate({ itemType: item.type, itemId: item.id });
    }
  };

  const filteredItems = inboxItems.filter((item: any) => {
    if (!searchQuery.trim()) return true;
    return (
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.bodySnippet?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-6 pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-[#BE1E2E] text-white shadow-md shadow-[#BE1E2E]/25">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[var(--brand-text)]">Inbox & Announcements</h1>
            <p className="text-xs text-[var(--text-muted)]">Official institute notices, academic broadcasts, and course updates</p>
          </div>
        </div>

        {unreadCount > 0 && (
          <div className="px-3.5 py-1.5 rounded-xl bg-[#BE1E2E]/10 border border-[#BE1E2E]/25 text-[#BE1E2E] text-xs font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#BE1E2E] animate-pulse" />
            <span>{unreadCount} Unread Notification{unreadCount > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--brand-border)]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUnreadOnly(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              !unreadOnly
                ? 'bg-[#BE1E2E] text-white'
                : 'text-[var(--text-muted)] hover:text-[var(--brand-text)]'
            }`}
          >
            All Updates
          </button>
          <button
            onClick={() => setUnreadOnly(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              unreadOnly
                ? 'bg-[#BE1E2E] text-white'
                : 'text-[var(--text-muted)] hover:text-[var(--brand-text)]'
            }`}
          >
            Unread Only
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search updates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-[var(--brand-background)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:border-[#BE1E2E]"
          />
        </div>
      </div>

      {/* Two Column Feed & Detail */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Left 2 Cols: Feed */}
        <div className="md:col-span-2 space-y-3">
          {isLoading ? (
            <div className="p-12 text-center rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)]">
              <div className="w-6 h-6 border-2 border-[#BE1E2E] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-[var(--text-muted)]">Loading updates...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-2">
              <Inbox className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
              <p className="text-xs text-[var(--text-muted)]">Your inbox is completely caught up.</p>
            </div>
          ) : (
            filteredItems.map((item: any) => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                    isSelected
                      ? 'bg-[var(--bg-surface-elevated)] border-[#BE1E2E] shadow-sm'
                      : !item.isRead
                      ? 'bg-[var(--bg-surface)] border-[#BE1E2E]/30 font-semibold'
                      : 'bg-[var(--bg-surface)] border-[var(--brand-border)] opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-[#BE1E2E]" />
                      )}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          item.priority === 'URGENT'
                            ? 'bg-red-500/10 text-red-500'
                            : item.priority === 'IMPORTANT'
                            ? 'bg-amber-500/10 text-amber-500'
                            : 'bg-zinc-500/10 text-zinc-400'
                        }`}
                      >
                        {item.priority}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                      {item.date ? formatDate(item.date) : ''}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-[var(--brand-text)] line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                    {item.bodySnippet}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Right 3 Cols: Detail Reader */}
        <div className="md:col-span-3">
          {selectedItem ? (
            <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-6 shadow-sm sticky top-6">
              <div className="space-y-2 pb-4 border-b border-[var(--brand-border)]">
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      selectedItem.priority === 'URGENT'
                        ? 'bg-red-500/10 text-red-500'
                        : selectedItem.priority === 'IMPORTANT'
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-zinc-500/10 text-zinc-400'
                    }`}
                  >
                    {selectedItem.priority} Announcement
                  </span>

                  <span className="text-xs font-mono text-[var(--text-muted)] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {selectedItem.date ? formatDateTime(selectedItem.date) : ''}
                  </span>
                </div>

                <h2 className="text-lg font-black text-[var(--brand-text)]">{selectedItem.title}</h2>
              </div>

              <div className="text-xs text-[var(--brand-text)] leading-relaxed whitespace-pre-wrap">
                {selectedItem.bodySnippet}
              </div>

              <div className="pt-4 border-t border-[var(--brand-border)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5 text-emerald-500">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Marked as read
                </span>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] text-center space-y-2">
              <Megaphone className="w-10 h-10 text-[var(--text-muted)] mx-auto stroke-1" />
              <h3 className="text-sm font-bold text-[var(--brand-text)]">Select an announcement</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
                Choose any broadcast or notification from your inbox to read the complete message.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
