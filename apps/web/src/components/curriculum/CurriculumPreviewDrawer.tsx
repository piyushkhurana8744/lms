'use client';

import React from 'react';
import { ILesson } from '@edtech/types';
import { sanitizeHtml, parseExternalResource } from '@edtech/utils';

import { X, ExternalLink, FileText, Video, File, Music, Radio } from 'lucide-react';

interface CurriculumPreviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: ILesson | null;
}

export function CurriculumPreviewDrawer({ isOpen, onClose, lesson }: CurriculumPreviewDrawerProps) {
  if (!isOpen || !lesson) return null;

  const contentAny = (lesson.content as any) || {};

  const getTypeIcon = () => {
    switch (lesson.type) {
      case 'TEXT':
        return <FileText className="w-4 h-4 text-[#BE1E2E]" />;
      case 'VIDEO':
        return <Video className="w-4 h-4 text-blue-500" />;
      case 'PDF':
        return <File className="w-4 h-4 text-red-500" />;
      case 'AUDIO':
        return <Music className="w-4 h-4 text-purple-500" />;
      case 'EXTERNAL_RESOURCE':
        return <ExternalLink className="w-4 h-4 text-emerald-500" />;
      case 'LIVE':
        return <Radio className="w-4 h-4 text-amber-500" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl p-6 w-full max-w-2xl space-y-6 shadow-2xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--brand-border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#BE1E2E]/10 border border-[#BE1E2E]/20">
              {getTypeIcon()}
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-[var(--brand-text)] uppercase">
                {lesson.type} PREVIEW
              </span>
              <h3 className="text-lg font-bold text-[var(--brand-text)] mt-1">{lesson.title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close lesson preview"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="space-y-4">
          {lesson.description && (
            <p className="text-xs text-[var(--text-muted)] italic bg-[var(--bg-surface-elevated)] p-3 rounded-lg border border-[var(--brand-border)]">
              {lesson.description}
            </p>
          )}

          {lesson.type === 'TEXT' ? (
            <div
              className="p-4 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-sm leading-relaxed text-[var(--brand-text)] font-sans"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(contentAny.bodyHtml || '<p>No text content available.</p>') }}
            />
          ) : lesson.type === 'VIDEO' ? (
            <div className="p-4 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] space-y-3">
              <p className="text-xs font-semibold text-[var(--brand-text)]">Video Stream Preview:</p>
              {contentAny.url ? (
                <video src={contentAny.url} controls className="w-full rounded-lg max-h-[320px] bg-black" />
              ) : (
                <div className="p-6 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--brand-border)] rounded-lg">
                  No video file attached. Upload a video file in the lesson editor.
                </div>
              )}
            </div>
          ) : lesson.type === 'PDF' ? (
            <div className="p-4 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] space-y-3">
              <p className="text-xs font-semibold text-[var(--brand-text)]">PDF Document Asset:</p>
              {contentAny.url ? (
                <a
                  href={contentAny.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-500 hover:bg-red-500/20"
                >
                  <File className="w-4 h-4" /> View / Download PDF Document
                </a>
              ) : (
                <div className="p-6 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--brand-border)] rounded-lg">
                  No PDF document attached.
                </div>
              )}
            </div>
          ) : lesson.type === 'AUDIO' ? (
            <div className="p-4 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] space-y-3">
              <p className="text-xs font-semibold text-[var(--brand-text)]">Audio Track Preview:</p>
              {contentAny.url ? (
                <audio src={contentAny.url} controls className="w-full" />
              ) : (
                <div className="p-6 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--brand-border)] rounded-lg">
                  No audio file attached.
                </div>
              )}
            </div>
          ) : lesson.type === 'EXTERNAL_RESOURCE' ? (
            (() => {
              const extParsed = parseExternalResource(contentAny.url);
              const embedUrl = contentAny.embedUrl || extParsed.embedUrl;
              return (
                <div className="space-y-4">
                  {embedUrl ? (
                    <div className="space-y-3">
                      <div className="aspect-video rounded-xl overflow-hidden bg-black border border-[var(--brand-border)] relative">
                        <iframe
                          src={embedUrl}
                          title={lesson.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          className="w-full h-full border-0"
                        />
                      </div>
                      {contentAny.url && (
                        <div className="text-right">
                          <a
                            href={contentAny.url}
                            target={contentAny.openInNewTab ? '_blank' : '_self'}
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-[#BE1E2E] font-bold hover:underline"
                          >
                            Open Link <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-sm space-y-3">
                      <p className="text-xs font-semibold text-[var(--brand-text)]">External Resource Link:</p>
                      <a
                        href={contentAny.url || '#'}
                        target={contentAny.openInNewTab ? '_blank' : '_self'}
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-[#BE1E2E] font-mono hover:underline break-all font-bold"
                      >
                        {contentAny.url || 'No URL provided'}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              );
            })()
          ) : lesson.type === 'LIVE' ? (

            <div className="p-4 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] space-y-3 text-xs font-mono">
              <p className="font-semibold text-[var(--brand-text)] font-sans">Live Class Session Metadata:</p>
              {contentAny.meetingUrl && (
                <div>
                  <span className="text-[var(--text-muted)] block">Meeting URL:</span>
                  <a href={contentAny.meetingUrl} target="_blank" rel="noreferrer" className="text-[#BE1E2E] underline">
                    {contentAny.meetingUrl}
                  </a>
                </div>
              )}
              {contentAny.startAt && (
                <div>
                  <span className="text-[var(--text-muted)] block">Start Time:</span>
                  <span className="font-bold text-[var(--brand-text)]">{new Date(contentAny.startAt).toLocaleString()}</span>
                </div>
              )}
              {contentAny.endAt && (
                <div>
                  <span className="text-[var(--text-muted)] block">End Time:</span>
                  <span className="font-bold text-[var(--brand-text)]">{new Date(contentAny.endAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="pt-4 flex items-center justify-between border-t border-[var(--brand-border)] text-xs font-mono text-[var(--text-muted)]">
          <span>Est. Duration: {lesson.estimatedDurationMinutes || 0} mins</span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium border border-[var(--brand-border)] rounded-lg hover:bg-[var(--bg-surface-elevated)]"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
