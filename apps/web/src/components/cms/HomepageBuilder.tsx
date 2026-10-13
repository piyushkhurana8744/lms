'use client';

import React from 'react';
import { IWebsiteHomepage } from '@edtech/types';
import { CourseSelector } from './CourseSelector';
import { Layout, Eye, EyeOff, BookOpen, Layers, Info, Star, Mail } from 'lucide-react';

export interface HomepageBuilderProps {
  homepage: IWebsiteHomepage;
  onChange: (homepage: IWebsiteHomepage) => void;
}

export function HomepageBuilder({ homepage, onChange }: HomepageBuilderProps) {
  const sections = [
    { key: 'showFeaturedCourses', label: 'Featured Courses Section', desc: 'Highlight top published courses on homepage grid', icon: <BookOpen className="w-4 h-4 text-blue-500" /> },
    { key: 'showCategories', label: 'Course Categories Grid', desc: 'Display category badges and course filters', icon: <Layers className="w-4 h-4 text-purple-500" /> },
    { key: 'showAbout', label: 'About Organization Section', desc: 'Display academy background and vision statement', icon: <Info className="w-4 h-4 text-amber-500" /> },
    { key: 'showTestimonials', label: 'Student Testimonials', desc: 'Display social proof and student reviews', icon: <Star className="w-4 h-4 text-emerald-500" /> },
    { key: 'showContact', label: 'Contact Section', desc: 'Display contact information and inquiry form', icon: <Mail className="w-4 h-4 text-red-500" /> }
  ];

  return (
    <div className="space-y-8 text-[var(--brand-text)]">
      {/* Section Visibility Controls */}
      <div className="p-6 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-6">
        <div>
          <h3 className="text-base font-extrabold flex items-center gap-2">
            <Layout className="w-5 h-5 text-[#BE1E2E]" /> Homepage Section Architecture
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Toggle and organize homepage sections for your public portal.</p>
        </div>

        <div className="space-y-3 text-xs">
          {sections.map((sec) => {
            const isEnabled = (homepage as any)[sec.key] !== false;
            return (
              <div
                key={sec.key}
                className="p-4 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)]">
                    {sec.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-[var(--brand-text)]">{sec.label}</h4>
                    <p className="text-[11px] text-[var(--text-muted)]">{sec.desc}</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => onChange({ ...homepage, [sec.key]: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#BE1E2E]"></div>
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {/* Featured Courses Manager */}
      {homepage.showFeaturedCourses !== false && (
        <div className="p-6 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)]">
          <CourseSelector
            selectedCourseIds={homepage.featuredCourseIds || []}
            onChange={(featuredCourseIds) => onChange({ ...homepage, featuredCourseIds })}
          />
        </div>
      )}
    </div>
  );
}
