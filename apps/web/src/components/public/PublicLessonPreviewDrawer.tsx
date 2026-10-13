'use client';

import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  X,
  Lock,
  Eye,
  Video,
  FileText,
  Music,
  ExternalLink,
  Radio,
  Calendar,
  AlertTriangle,
  Loader2
} from 'lucide-react';

export interface LessonSummary {
  id: string;
  title: string;
  description?: string;
  type: 'TEXT' | 'VIDEO' | 'PDF' | 'AUDIO' | 'EXTERNAL_RESOURCE' | 'LIVE';
  estimatedDurationMinutes?: number;
  isPreview: boolean;
}

interface PublicLessonPreviewDrawerProps {
  courseSlug: string;
  lesson: LessonSummary | null;
  onClose: () => void;
}

export function PublicLessonPreviewDrawer({ courseSlug, lesson, onClose }: PublicLessonPreviewDrawerProps) {
  // Close drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isPreviewable = lesson?.isPreview === true;

  // Query lesson preview details if lesson is previewable
  const { data: previewData, isLoading, isError } = useQuery({
    queryKey: ['public-lesson-preview', courseSlug, lesson?.id],
    queryFn: async () => {
      if (!lesson || !lesson.isPreview) return null;
      const res = await fetch(`/api/v1/public/courses/${courseSlug}/lessons/${lesson.id}/preview`);
      if (!res.ok) throw new Error('Preview unavailable for this lesson');
      const json = await res.json();
      return json.data?.lesson || null;
    },
    enabled: !!lesson && isPreviewable
  });

  if (!lesson) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={onClose}
      data-testid="lesson-preview-drawer"
    >
      <div
        className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-3xl p-6 sm:p-8 w-full max-w-2xl space-y-6 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--brand-border)] pb-4 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {isPreviewable ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Free Preview
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Course Access Required
                </span>
              )}
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">
                {lesson.type}
              </span>
            </div>

            <h3 className="text-lg font-extrabold text-[var(--brand-text)] leading-snug">
              {lesson.title}
            </h3>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-xl border border-[var(--brand-border)] text-[var(--text-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)] transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        {isPreviewable ? (
          <div className="space-y-4">
            {lesson.description && (
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {lesson.description}
              </p>
            )}

            {isLoading && (
              <div className="p-12 text-center space-y-3 bg-[var(--brand-background)] border border-[var(--brand-border)] rounded-2xl">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#BE1E2E]" />
                <p className="text-xs font-mono text-[var(--text-muted)]">Loading preview content...</p>
              </div>
            )}

            {isError && (
              <div className="p-6 text-center space-y-2 bg-red-500/5 border border-red-500/20 rounded-2xl">
                <AlertTriangle className="w-6 h-6 text-red-500 mx-auto" />
                <p className="text-xs font-semibold text-[var(--brand-text)]">Preview Unavailable</p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Unable to load content for this preview lesson.
                </p>
              </div>
            )}

            {!isLoading && !isError && previewData && (
              <div className="space-y-4">
                {/* TEXT PREVIEW */}
                {lesson.type === 'TEXT' && (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none text-xs p-5 rounded-2xl bg-[var(--brand-background)] border border-[var(--brand-border)] max-h-80 overflow-y-auto leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: previewData.content?.bodyHtml || '<p>No text preview available.</p>' }}
                  />
                )}

                {/* VIDEO PREVIEW */}
                {lesson.type === 'VIDEO' && (
                  <div className="space-y-2">
                    {previewData.content?.videoUrl ? (
                      <div className="aspect-video rounded-2xl overflow-hidden bg-black border border-[var(--brand-border)]">
                        <video
                          controls
                          src={previewData.content.videoUrl}
                          className="w-full h-full object-contain"
                          controlsList="nodownload"
                        >
                          Your browser does not support HTML5 video preview.
                        </video>
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-[var(--brand-background)] border border-[var(--brand-border)] rounded-2xl text-xs font-mono text-[var(--text-muted)] space-y-2">
                        <Video className="w-8 h-8 mx-auto text-[#BE1E2E]" />
                        <p>Video preview stream will be available upon enrollment.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* PDF PREVIEW */}
                {lesson.type === 'PDF' && (
                  <div className="p-6 text-center bg-[var(--brand-background)] border border-[var(--brand-border)] rounded-2xl space-y-3">
                    <FileText className="w-8 h-8 text-red-500 mx-auto" />
                    <p className="text-xs font-semibold text-[var(--brand-text)]">PDF Learning Document</p>
                    {previewData.content?.pdfUrl ? (
                      <a
                        href={previewData.content.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#BE1E2E] text-white font-bold text-xs hover:bg-[#a01825] transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" /> View PDF Resource
                      </a>
                    ) : (
                      <p className="text-[11px] text-[var(--text-muted)] font-mono">
                        Document attachment ready for enrolled students.
                      </p>
                    )}
                  </div>
                )}

                {/* AUDIO PREVIEW */}
                {lesson.type === 'AUDIO' && (
                  <div className="p-6 text-center bg-[var(--brand-background)] border border-[var(--brand-border)] rounded-2xl space-y-3">
                    <Music className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="text-xs font-semibold text-[var(--brand-text)]">Audio Masterclass Track</p>
                    {previewData.content?.audioUrl ? (
                      <audio controls src={previewData.content.audioUrl} className="w-full max-w-md mx-auto">
                        Your browser does not support audio playback.
                      </audio>
                    ) : (
                      <p className="text-[11px] text-[var(--text-muted)] font-mono">
                        Audio stream included in full course.
                      </p>
                    )}
                  </div>
                )}

                {/* EXTERNAL RESOURCE */}
                {lesson.type === 'EXTERNAL_RESOURCE' && (
                  <div className="space-y-4">
                    {previewData.content?.embedUrl ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-mono">
                          <span className="px-2.5 py-0.5 rounded-full font-bold uppercase bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center gap-1.5">
                            <Video className="w-3.5 h-3.5" />
                            {previewData.content.provider || 'VIDEO EMBED'}
                          </span>
                          {previewData.content.url && (
                            <a
                              href={previewData.content.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-[var(--text-muted)] hover:text-[#BE1E2E] flex items-center gap-1 hover:underline"
                            >
                              Open Link <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        <div className="aspect-video rounded-2xl overflow-hidden bg-black border border-[var(--brand-border)] shadow-lg relative">
                          <iframe
                            src={previewData.content.embedUrl}
                            title={lesson.title || 'Video Resource'}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            className="w-full h-full border-0"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 bg-[var(--brand-background)] border border-[var(--brand-border)] rounded-2xl space-y-3">
                        <div className="flex items-center gap-2">
                          <ExternalLink className="w-5 h-5 text-blue-500" />
                          <span className="text-xs font-bold text-[var(--brand-text)]">
                            {previewData.content?.provider || 'External Learning Resource'}
                          </span>
                        </div>

                        {previewData.content?.url ? (
                          <div className="space-y-2">
                            <p className="text-[11px] text-[var(--text-muted)]">
                              Access verified interactive external documentation or resource:
                            </p>
                            <a
                              href={previewData.content.url}
                              target={previewData.content.openInNewTab ? '_blank' : '_self'}
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#BE1E2E] hover:underline break-all"
                            >
                              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                              {previewData.content.url}
                            </a>
                          </div>
                        ) : (
                          <p className="text-[11px] text-[var(--text-muted)] font-mono">
                            Verified link available for enrolled participants.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}


                {/* LIVE PREVIEW */}
                {lesson.type === 'LIVE' && (
                  <div className="p-6 bg-[var(--brand-background)] border border-[var(--brand-border)] rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-amber-500 font-bold text-xs">
                      <Radio className="w-4 h-4 animate-pulse" />
                      Live Masterclass Schedule
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">Provider</span>
                        <span className="font-semibold text-[var(--brand-text)]">
                          {previewData.content?.provider || 'Live Stream'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">Session Timing</span>
                        <span className="font-semibold text-[var(--brand-text)] flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-amber-500" />
                          {previewData.content?.startAt
                            ? new Date(previewData.content.startAt).toLocaleString()
                            : 'Scheduled Live'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* LOCKED LESSON STATE */
          <div className="py-8 px-4 text-center space-y-4 bg-[var(--brand-background)] border border-[var(--brand-border)] rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-[var(--brand-text)]">
                Preview is not available for this lesson
              </h4>
              <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
                This lesson is part of the full course curriculum. Continue learning after enrollment or sign in to access your course materials.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href={`/login?redirect=${encodeURIComponent(`/courses/${courseSlug}`)}`}
                className="px-4 py-2 rounded-xl bg-[#BE1E2E] text-white font-bold text-xs hover:bg-[#a01825] transition-colors"
              >
                Login to Continue
              </Link>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end pt-4 border-t border-[var(--brand-border)]">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold border border-[var(--brand-border)] rounded-xl text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
