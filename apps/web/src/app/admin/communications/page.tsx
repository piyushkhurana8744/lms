'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  Calendar,
  Send,
  CheckCircle2,
  Clock,
  Archive,
  XCircle,
  AlertCircle,
  Users,
  Eye,
  ArrowRight,
  Sparkles,
  Inbox,
  MessageSquare
} from 'lucide-react';
import { formatDate, formatDateTime } from '@edtech/utils';

export default function AdminCommunicationsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-announcements', statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      params.set('page', page.toString());
      params.set('limit', '15');
      const res = await fetch(`/api/v1/communications/announcements?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load announcements');
      return res.json();
    }
  });

  const announcements = data?.data?.announcements || [];
  const pagination = data?.data?.pagination || { total: 0, pages: 1 };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Published
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <Clock className="w-3.5 h-3.5" /> Scheduled
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> Draft
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
            <XCircle className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            <Archive className="w-3.5 h-3.5" /> Archived
          </span>
        );
      default:
        return null;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
            Urgent
          </span>
        );
      case 'IMPORTANT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Important
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            Normal
          </span>
        );
    }
  };

  const filteredAnnouncements = announcements.filter((item: any) => {
    if (!searchQuery.trim()) return true;
    return (
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.body?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[#BE1E2E] to-rose-500 text-white shadow-md shadow-[#BE1E2E]/20">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-[var(--brand-text)]">
                Institutional Communications
              </h1>
              <p className="text-xs text-[var(--text-muted)]">
                Targeted institutional broadcast announcements, scheduling, delivery audit & conversations
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/admin/communications/conversations"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-[var(--brand-border)] bg-[var(--brand-background)] text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)] transition-colors shadow-sm"
          >
            <MessageSquare className="w-4 h-4 text-blue-500" />
            Conversations
          </Link>
          <Link
            href="/admin/communications/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#BE1E2E] text-white hover:bg-[#a01825] transition-colors shadow-md shadow-[#BE1E2E]/25"
          >
            <Plus className="w-4 h-4" />
            New Announcement
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--brand-border)]">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          {['ALL', 'PUBLISHED', 'SCHEDULED', 'DRAFT', 'ARCHIVED'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-[#BE1E2E] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-[var(--brand-background)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:border-[#BE1E2E]"
          />
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)]">
            <div className="w-8 h-8 border-2 border-[#BE1E2E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-[var(--text-muted)]">Loading institutional announcements...</p>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-3">
            <Megaphone className="w-12 h-12 text-[var(--text-muted)] mx-auto stroke-1" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[var(--brand-text)]">No announcements found</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'Try adjusting your filters or search terms'
                  : 'Create your first targeted broadcast announcement to notify students, instructors, and staff.'}
              </p>
            </div>
            <Link
              href="/admin/communications/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#BE1E2E] text-white hover:bg-[#a01825] transition-colors"
            >
              <Plus className="w-4 h-4" /> Compose Announcement
            </Link>
          </div>
        ) : (
          filteredAnnouncements.map((item: any) => (
            <div
              key={item._id || item.id}
              className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] hover:border-[#BE1E2E]/40 transition-all shadow-sm space-y-4 group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  {getStatusBadge(item.status)}
                  {getPriorityBadge(item.priority)}
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    Audience: <strong className="text-[var(--brand-text)]">{item.audience?.selector || 'RESOLVED'}</strong>
                  </span>
                </div>

                <div className="text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  {item.publishedAt
                    ? `Published ${formatDateTime(item.publishedAt)}`
                    : item.scheduledAt
                    ? `Scheduled for ${formatDateTime(item.scheduledAt)}`
                    : `Draft saved ${formatDate(item.updatedAt || item.createdAt)}`}
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-[var(--brand-text)] group-hover:text-[#BE1E2E] transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                  {item.body}
                </p>
              </div>

              {/* Delivery & Read Summary Footer */}
              <div className="pt-3 border-t border-[var(--brand-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4 text-[11px] font-mono text-[var(--text-muted)]">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    <span>Recipients: <strong className="text-[var(--brand-text)]">{item.deliverySummary?.totalRecipients ?? item.audienceSnapshot?.recipientCount ?? 0}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Delivered: <strong className="text-[var(--brand-text)]">{item.deliverySummary?.deliveredCount ?? 0}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-purple-400" />
                    <span>Read: <strong className="text-[var(--brand-text)]">{item.deliverySummary?.readCount ?? 0}</strong></span>
                  </div>
                </div>

                <Link
                  href={`/admin/communications/${item._id || item.id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#BE1E2E] hover:underline"
                >
                  View Details & Audit <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-[var(--brand-border)] disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs font-mono text-[var(--text-muted)]">
            Page {page} of {pagination.pages}
          </span>
          <button
            disabled={page >= pagination.pages}
            onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-[var(--brand-border)] disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
