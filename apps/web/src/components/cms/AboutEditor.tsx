'use client';

import React, { useState } from 'react';
import { IWebsiteAbout } from '@edtech/types';
import { Button } from '@edtech/ui';
import { MediaSelector } from './MediaSelector';
import { Info, Image as ImageIcon } from 'lucide-react';

export interface AboutEditorProps {
  about: IWebsiteAbout;
  onChange: (about: IWebsiteAbout) => void;
}

export function AboutEditor({ about, onChange }: AboutEditorProps) {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  return (
    <div className="space-y-8 text-[var(--brand-text)]">
      <div className="p-6 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-6">
        <div>
          <h3 className="text-base font-extrabold flex items-center gap-2">
            <Info className="w-5 h-5 text-[#BE1E2E]" /> About Organization Section
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Describe your academy mission, credentials, and background.</p>
        </div>

        <div className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-bold text-[var(--brand-text)]">Section Title</label>
            <input
              type="text"
              placeholder="e.g. About DIDM Digital Academy"
              value={about.title || ''}
              onChange={(e) => onChange({ ...about, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs focus:outline-none focus:border-[#BE1E2E]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-[var(--brand-text)]">Description / Story</label>
            <textarea
              rows={5}
              placeholder="Write a detailed introduction about your courses, expert faculty, and student success track record..."
              value={about.description || ''}
              onChange={(e) => onChange({ ...about, description: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs focus:outline-none focus:border-[#BE1E2E]"
            />
          </div>

          {/* About Section Image */}
          <div className="space-y-2 pt-2 border-t border-[var(--brand-border)]">
            <label className="font-bold text-[var(--brand-text)] block">Section Media / Feature Graphic</label>
            <div className="p-4 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-12 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] overflow-hidden flex items-center justify-center">
                  {about.imageUrl ? (
                    <img src={about.imageUrl} alt="About Image" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-[var(--text-muted)] opacity-50" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-xs">{about.imageUrl ? 'Image Selected' : 'No Section Image'}</div>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono">High quality photo or illustration</div>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsImageModalOpen(true)}
              >
                {about.imageUrl ? 'Change Image' : 'Select Image'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <MediaSelector
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        selectedMediaId={about.imageMediaId}
        onSelect={(id, url) => onChange({ ...about, imageMediaId: id, imageUrl: url })}
        title="Select About Section Image"
      />
    </div>
  );
}
