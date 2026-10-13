'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Megaphone,
  ArrowLeft,
  Calendar,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  Archive,
  Users,
  Eye,
  AlertCircle,
  BarChart2,
  Mail,
  Bell,
  Layers,
  Sparkles
} from 'lucide-react';
import { formatDateTime } from '@edtech/utils';

export default function AnnouncementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const announcementId = params.id as string;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-announcement-detail', announcementId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/communications/announcements/${announcementId}`);
      if (!res.ok) throw new Error('Failed to load announcement details');
      return res.json();
    }
  });

  const announcement = data?.data;

  // Lifecycle Mutations
  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/communications/announcements/${announcementId}/publish`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to publish');
      return res.json();
    },
    onSuccess: () => refetch()
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/communications/announcements/${announcementId}/cancel`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to cancel');
      return res.json();
    },
    onSuccess: () => refetch()
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/communications/announcements/${announcementId}/archive`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to archive');
      return res.json();
    },
    onSuccess: () => refetch()
  });

  if (isLoading) {
    return (
      <div className="p-12 text-center rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)]">
        <div className="w-8 h-8 border-2 border-[#BE1E2E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-[var(--text-muted)]">Loading announcement details...</p>
      </div>
    );
  }

  if (isError || !announcement) {
    return (
      <div className="p-12 text-center rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-3">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h3 className="text-sm font-bold text-[var(--brand-text)]">Announcement not found or access denied</h3>
        <Link
          href="/admin/communications"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#BE1E2E] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to announcements
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)]">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/communications"
            className="p-2 rounded-xl border border-[var(--brand-border)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--brand-text)]" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Announcement #{announcement._id?.slice(-6) || announcement.id?.slice(-6)}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  announcement.status === 'PUBLISHED'
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : announcement.status === 'SCHEDULED'
                    ? 'bg-blue-500/10 text-blue-500'
                    : 'bg-zinc-500/10 text-zinc-400'
                }`}
              >
                {announcement.status}
              </span>
            </div>
            <h1 className="text-lg font-black text-[var(--brand-text)] mt-0.5">{announcement.title}</h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {announcement.status === 'DRAFT' && (
            <button
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
              className="px-3.5 py-1.5 rounded-xl bg-[#BE1E2E] text-white text-xs font-bold hover:bg-[#a01825] transition-colors flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Publish Now
            </button>
          )}

          {announcement.status === 'SCHEDULED' && (
            <button
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="px-3.5 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold hover:bg-red-500/20 transition-colors flex items-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" /> Cancel Schedule
            </button>
          )}

          {announcement.status === 'PUBLISHED' && (
            <button
              onClick={() => archiveMutation.mutate()}
              disabled={archiveMutation.isPending}
              className="px-3.5 py-1.5 rounded-xl border border-[var(--brand-border)] text-xs font-bold text-[var(--text-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)] transition-colors flex items-center gap-1.5"
            >
              <Archive className="w-3.5 h-3.5" /> Archive
            </button>
          )}
        </div>
      </div>

      {/* Delivery Metrics Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)]">
            <span>Target Audience</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-black text-[var(--brand-text)] font-mono">
            {announcement.deliverySummary?.totalRecipients ?? announcement.audienceSnapshot?.recipientCount ?? 0}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] block truncate">
            {announcement.audience?.selector || 'RESOLVED'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)]">
            <span>Delivery Queued</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black text-[var(--brand-text)] font-mono">
            {announcement.deliverySummary?.queuedCount ?? 0}
          </div>
          <span className="text-[10px] text-amber-500 font-semibold block">Phase 14 Outbox</span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)]">
            <span>Delivered</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-[var(--brand-text)] font-mono">
            {announcement.deliverySummary?.deliveredCount ?? 0}
          </div>
          <span className="text-[10px] text-emerald-500 font-semibold block">Confirmed Received</span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)]">
            <span>Read Count</span>
            <Eye className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-black text-[var(--brand-text)] font-mono">
            {announcement.deliverySummary?.readCount ?? 0}
          </div>
          <span className="text-[10px] text-purple-500 font-semibold block">Opened by Recipient</span>
        </div>
      </div>

      {/* Main Content Body Card */}
      <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-6">
        <div className="space-y-2">
          <h2 className="text-base font-bold text-[var(--brand-text)]">Announcement Content Snapshot</h2>
          <div className="p-4 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs text-[var(--brand-text)] whitespace-pre-wrap leading-relaxed">
            {announcement.body}
          </div>
        </div>

        {/* Snapshot & Audit Info */}
        <div className="pt-4 border-t border-[var(--brand-border)] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Audit Metadata</h3>
            <div className="space-y-1 text-[11px] font-mono text-[var(--text-muted)]">
              <div>Sender User ID: <span className="text-[var(--brand-text)]">{announcement.senderUserId}</span></div>
              <div>Revision CAS: <span className="text-[var(--brand-text)]">{announcement.revision ?? 1}</span></div>
              <div>Priority: <span className="text-[var(--brand-text)]">{announcement.priority}</span></div>
              <div>Channels: <span className="text-[var(--brand-text)]">{announcement.channels?.join(', ')}</span></div>
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Timestamp Audit</h3>
            <div className="space-y-1 text-[11px] font-mono text-[var(--text-muted)]">
              <div>Created: <span className="text-[var(--brand-text)]">{formatDateTime(announcement.createdAt)}</span></div>
              {announcement.publishedAt && (
                <div>Published: <span className="text-[var(--brand-text)]">{formatDateTime(announcement.publishedAt)}</span></div>
              )}
              {announcement.scheduledAt && (
                <div>Scheduled: <span className="text-[var(--brand-text)]">{formatDateTime(announcement.scheduledAt)}</span></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
