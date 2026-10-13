'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Megaphone,
  Send,
  Calendar,
  Save,
  Users,
  AlertCircle,
  CheckCircle2,
  Paperclip,
  ArrowLeft,
  Sparkles,
  Layers,
  ShieldCheck,
  Eye
} from 'lucide-react';
import Link from 'next/link';

export default function NewAnnouncementPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<'NORMAL' | 'IMPORTANT' | 'URGENT'>('NORMAL');
  const [selector, setSelector] = useState<string>('ALL_AUTHORIZED');
  const [channels, setChannels] = useState<string[]>(['IN_APP', 'EMAIL']);
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [batchIds, setBatchIds] = useState<string[]>([]);
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [actionType, setActionType] = useState<'DRAFT' | 'PUBLISH' | 'SCHEDULE'>('PUBLISH');
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load branches for targeting
  const { data: branchData } = useQuery({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const res = await fetch('/api/v1/branches');
      if (!res.ok) return { data: [] };
      return res.json();
    }
  });

  // Audience Preview Mutation
  const previewMutation = useMutation({
    mutationFn: async (audiencePayload: any) => {
      const res = await fetch('/api/v1/communications/announcements/preview-audience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience: audiencePayload })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to preview audience');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setPreviewResult(data.data);
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.message);
    }
  });

  // Create & Action Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const audiencePayload: any = {
        selector,
        branchIds: branchIds.length ? branchIds : undefined,
        batchIds: batchIds.length ? batchIds : undefined,
        courseIds: courseIds.length ? courseIds : undefined
      };

      // 1. Create announcement
      const createRes = await fetch('/api/v1/communications/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          priority,
          channels,
          audience: audiencePayload
        })
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.message || 'Failed to create announcement');
      }

      const created = await createRes.json();
      const announcementId = created.data._id || created.data.id;

      // 2. Perform requested lifecycle action
      if (actionType === 'PUBLISH') {
        const pubRes = await fetch(`/api/v1/communications/announcements/${announcementId}/publish`, {
          method: 'POST'
        });
        if (!pubRes.ok) {
          const err = await pubRes.json();
          throw new Error(err.message || 'Failed to publish announcement');
        }
      } else if (actionType === 'SCHEDULE') {
        if (!scheduledAt) throw new Error('Please select a valid schedule date and time');
        const schedRes = await fetch(`/api/v1/communications/announcements/${announcementId}/schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scheduledAt: new Date(scheduledAt).toISOString() })
        });
        if (!schedRes.ok) {
          const err = await schedRes.json();
          throw new Error(err.message || 'Failed to schedule announcement');
        }
      }

      return announcementId;
    },
    onSuccess: (announcementId) => {
      router.push(`/admin/communications/${announcementId}`);
    },
    onError: (err: any) => {
      setErrorMsg(err.message);
    }
  });

  const handlePreview = () => {
    previewMutation.mutate({
      selector,
      branchIds: branchIds.length ? branchIds : undefined,
      batchIds: batchIds.length ? batchIds : undefined,
      courseIds: courseIds.length ? courseIds : undefined
    });
  };

  const branches = branchData?.data || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/communications"
            className="p-2 rounded-xl border border-[var(--brand-border)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--brand-text)]" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-[var(--brand-text)]">New Broadcast Announcement</h1>
            <p className="text-xs text-[var(--text-muted)]">Compose institutional announcements with deterministic audience targeting</p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Composer Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Content */}
        <div className="md:col-span-2 space-y-5">
          <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                Announcement Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Schedule Update: Upcoming Workshop on Next.js 15"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-[var(--brand-background)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:border-[#BE1E2E]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                Message Body <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={8}
                placeholder="Provide clear, concise institutional communication details..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-[var(--brand-background)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:border-[#BE1E2E] leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                  Priority Level
                </label>
                <select
                  value={priority}
                  onChange={(e: any) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--brand-background)] border border-[var(--brand-border)] text-[var(--brand-text)]"
                >
                  <option value="NORMAL">NORMAL (Standard)</option>
                  <option value="IMPORTANT">IMPORTANT (Highlighted)</option>
                  <option value="URGENT">URGENT (Critical Notice)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                  Delivery Channels
                </label>
                <div className="flex items-center gap-3 pt-2">
                  <label className="flex items-center gap-1.5 text-xs text-[var(--brand-text)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channels.includes('IN_APP')}
                      onChange={(e) => {
                        if (e.target.checked) setChannels([...channels, 'IN_APP']);
                        else setChannels(channels.filter((c) => c !== 'IN_APP'));
                      }}
                      className="rounded accent-[#BE1E2E]"
                    />
                    In-App Notification
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-[var(--brand-text)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channels.includes('EMAIL')}
                      onChange={(e) => {
                        if (e.target.checked) setChannels([...channels, 'EMAIL']);
                        else setChannels(channels.filter((c) => c !== 'EMAIL'));
                      }}
                      className="rounded accent-[#BE1E2E]"
                    />
                    Email Broadcast
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Audience & Dispatch Controls */}
        <div className="space-y-5">
          {/* Audience Targeting Card */}
          <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--brand-text)] flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-500" /> Audience Targeting
              </h3>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">Target Selector</label>
              <select
                value={selector}
                onChange={(e) => {
                  setSelector(e.target.value);
                  setPreviewResult(null);
                }}
                className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--brand-background)] border border-[var(--brand-border)] text-[var(--brand-text)]"
              >
                <option value="ALL_AUTHORIZED">All Authorized Members</option>
                <option value="STUDENTS">All Active Students</option>
                <option value="INSTRUCTORS">All Instructors</option>
                <option value="STAFF">All Staff Members</option>
                <option value="BRANCH">Specific Branch</option>
                <option value="BATCH">Specific Batch</option>
                <option value="COURSE">Specific Course</option>
              </select>
            </div>

            {selector === 'BRANCH' && (
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">Select Branch</label>
                <select
                  value={branchIds[0] || ''}
                  onChange={(e) => setBranchIds(e.target.value ? [e.target.value] : [])}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--brand-background)] border border-[var(--brand-border)] text-[var(--brand-text)]"
                >
                  <option value="">-- Choose Branch --</option>
                  {branches.map((b: any) => (
                    <option key={b._id || b.id} value={b._id || b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={handlePreview}
              disabled={previewMutation.isPending}
              className="w-full py-2 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] hover:bg-[var(--bg-surface-elevated)] text-xs font-bold text-[var(--brand-text)] transition-colors flex items-center justify-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-blue-500" />
              {previewMutation.isPending ? 'Resolving Audience...' : 'Preview Eligible Recipients'}
            </button>

            {previewResult && (
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-1.5">
                <div className="flex items-center justify-between font-bold text-blue-500">
                  <span>Eligible Recipients:</span>
                  <span className="text-sm font-mono">{previewResult.recipientCount}</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] leading-tight">
                  {previewResult.summary}
                </p>
              </div>
            )}
          </div>

          {/* Action & Publishing Mode */}
          <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--brand-text)]">Publishing Mode</h3>

            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-[var(--brand-border)] cursor-pointer text-xs font-semibold">
                <input
                  type="radio"
                  name="actionType"
                  value="PUBLISH"
                  checked={actionType === 'PUBLISH'}
                  onChange={() => setActionType('PUBLISH')}
                  className="accent-[#BE1E2E]"
                />
                <span>Publish Immediately</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-[var(--brand-border)] cursor-pointer text-xs font-semibold">
                <input
                  type="radio"
                  name="actionType"
                  value="SCHEDULE"
                  checked={actionType === 'SCHEDULE'}
                  onChange={() => setActionType('SCHEDULE')}
                  className="accent-[#BE1E2E]"
                />
                <span>Schedule for Later</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-[var(--brand-border)] cursor-pointer text-xs font-semibold">
                <input
                  type="radio"
                  name="actionType"
                  value="DRAFT"
                  checked={actionType === 'DRAFT'}
                  onChange={() => setActionType('DRAFT')}
                  className="accent-[#BE1E2E]"
                />
                <span>Save as Draft</span>
              </label>
            </div>

            {actionType === 'SCHEDULE' && (
              <div className="space-y-1.5 pt-2">
                <label className="block text-[11px] font-semibold text-[var(--text-muted)]">
                  Scheduled Time (Local Timezone)
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-[var(--brand-background)] border border-[var(--brand-border)] text-[var(--brand-text)]"
                />
              </div>
            )}

            <button
              type="button"
              disabled={!title.trim() || !body.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="w-full py-2.5 rounded-xl bg-[#BE1E2E] hover:bg-[#a01825] disabled:opacity-40 text-white text-xs font-bold transition-colors shadow-md shadow-[#BE1E2E]/25 flex items-center justify-center gap-2"
            >
              {createMutation.isPending ? (
                <span>Processing...</span>
              ) : actionType === 'PUBLISH' ? (
                <>
                  <Send className="w-3.5 h-3.5" /> Publish Announcement Now
                </>
              ) : actionType === 'SCHEDULE' ? (
                <>
                  <Calendar className="w-3.5 h-3.5" /> Schedule Announcement
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" /> Save as Draft
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
