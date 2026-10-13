'use client';

import React, { useState, useEffect } from 'react';
import { ILesson, LessonType } from '@edtech/types';
import { Button } from '@edtech/ui';
import { X, Upload, ExternalLink, FileText, Video, Music, Calendar } from 'lucide-react';
import { uploadMediaFile } from '@/lib/uploadMedia';


interface LessonEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: ILesson | null;
  onSave: (data: {
    title: string;
    description?: string;
    type: LessonType;
    content?: any;
    isPreview?: boolean;
    estimatedDurationMinutes?: number;
  }) => Promise<void>;
  isPending: boolean;
}

export function LessonEditorDialog({
  isOpen,
  onClose,
  lesson,
  onSave,
  isPending
}: LessonEditorDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<LessonType>('TEXT');
  const [isPreview, setIsPreview] = useState(false);
  const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState(10);
  const [error, setError] = useState<string | null>(null);

  // Content state fields
  const [bodyHtml, setBodyHtml] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [openInNewTab, setOpenInNewTab] = useState(true);
  const [mediaId, setMediaId] = useState('');
  const [assetUrl, setAssetUrl] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [meetingUrl, setMeetingUrl] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title);
      setDescription(lesson.description || '');
      setType(lesson.type);
      setIsPreview(lesson.isPreview || false);
      setEstimatedDurationMinutes(lesson.estimatedDurationMinutes || 0);

      const contentAny = (lesson.content as any) || {};
      setBodyHtml(contentAny.bodyHtml || '');
      setExternalUrl(contentAny.url || '');
      setOpenInNewTab(contentAny.openInNewTab ?? true);
      setMediaId(contentAny.mediaId || '');
      setAssetUrl(contentAny.url || contentAny.assetUrl || '');
      setDurationSeconds(contentAny.durationSeconds || 0);
      setMeetingUrl(contentAny.meetingUrl || '');
      setStartAt(contentAny.startAt ? new Date(contentAny.startAt).toISOString().slice(0, 16) : '');
      setEndAt(contentAny.endAt ? new Date(contentAny.endAt).toISOString().slice(0, 16) : '');
    } else {
      setTitle('');
      setDescription('');
      setType('TEXT');
      setIsPreview(false);
      setEstimatedDurationMinutes(10);
      setBodyHtml('');
      setExternalUrl('');
      setOpenInNewTab(true);
      setMediaId('');
      setAssetUrl('');
      setDurationSeconds(0);
      setMeetingUrl('');
      setStartAt('');
      setEndAt('');
    }
    setError(null);
  }, [lesson, isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const data = await uploadMediaFile(file);

      setMediaId(data.id || data._id);
      setAssetUrl(data.url);
    } catch (err: any) {

      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let contentPayload: any = {};

    if (type === 'TEXT') {
      if (!bodyHtml.trim()) {
        setError('bodyHtml is required for TEXT lesson type');
        return;
      }
      contentPayload = { bodyHtml };
    } else if (type === 'EXTERNAL_RESOURCE') {
      if (!externalUrl.trim()) {
        setError('Resource URL is required');
        return;
      }
      contentPayload = { url: externalUrl, openInNewTab };
    } else if (type === 'VIDEO') {
      contentPayload = { mediaId: mediaId || undefined, url: assetUrl || undefined, durationSeconds };
    } else if (type === 'PDF') {
      contentPayload = { mediaId: mediaId || undefined, url: assetUrl || undefined };
    } else if (type === 'AUDIO') {
      contentPayload = { mediaId: mediaId || undefined, url: assetUrl || undefined, durationSeconds };
    } else if (type === 'LIVE') {
      if (startAt && endAt && new Date(startAt) >= new Date(endAt)) {
        setError('startAt time must be strictly before endAt time');
        return;
      }
      contentPayload = { meetingUrl: meetingUrl || undefined, startAt: startAt || undefined, endAt: endAt || undefined };
    }

    try {
      await onSave({
        title,
        description,
        type,
        content: contentPayload,
        isPreview,
        estimatedDurationMinutes
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save lesson');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl p-6 w-full max-w-xl space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[var(--brand-border)] pb-4">
          <h3 className="text-lg font-bold text-[var(--brand-text)]">
            {lesson ? 'Edit Lesson' : 'Create New Lesson'}
          </h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--brand-text)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1 text-[var(--brand-text)]">Lesson Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Lesson 1: Keyword Research Techniques"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] text-sm text-[var(--brand-text)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-[var(--brand-text)]">Description</label>
            <textarea
              rows={2}
              placeholder="Summary of lesson learning objectives"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] text-sm text-[var(--brand-text)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1 text-[var(--brand-text)]">Lesson Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as LessonType)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] text-sm text-[var(--brand-text)] font-semibold"
              >
                <option value="TEXT">Text Article</option>
                <option value="VIDEO">Video</option>
                <option value="PDF">PDF Document</option>
                <option value="AUDIO">Audio</option>
                <option value="EXTERNAL_RESOURCE">External Resource</option>
                <option value="LIVE">Live Session</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-[var(--brand-text)]">Est. Duration (mins)</label>
              <input
                type="number"
                min={0}
                value={estimatedDurationMinutes}
                onChange={(e) => setEstimatedDurationMinutes(parseInt(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] text-sm text-[var(--brand-text)]"
              />
            </div>
          </div>

          {/* Type-Specific Content Editors */}
          {type === 'TEXT' && (
            <div>
              <label className="block text-xs font-semibold mb-1 text-[var(--brand-text)]">Lesson HTML Body *</label>
              <textarea
                rows={5}
                required
                placeholder="Enter HTML or text content for article lesson..."
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] text-sm text-[var(--brand-text)] font-mono"
              />
            </div>
          )}

          {type === 'EXTERNAL_RESOURCE' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-[var(--brand-text)]">Resource URL (http/https only) *</label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/documentation"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] text-sm text-[var(--brand-text)] font-mono"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="openNewTabToggle"
                  checked={openInNewTab}
                  onChange={(e) => setOpenInNewTab(e.target.checked)}
                  className="rounded border-[var(--brand-border)] text-[#BE1E2E] focus:ring-[#BE1E2E]"
                />
                <label htmlFor="openNewTabToggle" className="text-xs font-semibold text-[var(--brand-text)]">
                  Open link in new tab
                </label>
              </div>
            </div>
          )}

          {(type === 'VIDEO' || type === 'PDF' || type === 'AUDIO') && (
            <div className="space-y-3 p-4 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)]">
              <label className="block text-xs font-semibold text-[var(--brand-text)]">
                Attach {type} Media Asset
              </label>

              <div className="flex items-center gap-3">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-[var(--text-muted)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#BE1E2E] file:text-white hover:file:bg-[#a01826] cursor-pointer"
                />
              </div>

              {isUploading && <p className="text-xs text-[var(--text-muted)] font-mono animate-pulse">Uploading file to media vault...</p>}

              {assetUrl && (
                <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--brand-border)] text-xs font-mono truncate">
                  <span className="text-[var(--text-muted)] block text-[10px]">Attached Asset URL:</span>
                  <span className="text-[#BE1E2E] font-bold">{assetUrl}</span>
                </div>
              )}
            </div>
          )}

          {type === 'LIVE' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-[var(--brand-text)]">Meeting URL</label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/abc-defg-hij"
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] text-sm text-[var(--brand-text)] font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-[var(--brand-text)]">Start Time</label>
                  <input
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs text-[var(--brand-text)] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-[var(--brand-text)]">End Time</label>
                  <input
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs text-[var(--brand-text)] font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isPreviewToggleDialog"
              checked={isPreview}
              onChange={(e) => setIsPreview(e.target.checked)}
              className="rounded border-[var(--brand-border)] text-[#BE1E2E] focus:ring-[#BE1E2E]"
            />
            <label htmlFor="isPreviewToggleDialog" className="text-xs font-semibold text-[var(--brand-text)]">
              Enable as Free Preview Lesson
            </label>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[var(--brand-border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium border border-[var(--brand-border)] rounded-lg text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)]"
            >
              Cancel
            </button>
            <Button
              type="submit"
              variant="primary"
              className="btn-primary px-5 text-xs"
              disabled={isPending || isUploading}
            >
              {isPending ? 'Saving...' : lesson ? 'Update Lesson' : 'Create Lesson'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

