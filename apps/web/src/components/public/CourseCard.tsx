'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen, Clock, Globe, ArrowRight, Star, Award, Sparkles } from 'lucide-react';

export interface PublicCourseItem {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  thumbnail: string | null;
  level: string;
  language: string;
  durationMinutes: number;
  category?: string | null;
  publishedAt?: string | null;
}

function formatLevel(level: string): string {
  switch (level) {
    case 'BEGINNER':
      return 'Beginner';
    case 'INTERMEDIATE':
      return 'Intermediate';
    case 'ADVANCED':
      return 'Advanced';
    case 'ALL_LEVELS':
      return 'All Levels';
    default:
      return level || 'All Levels';
  }
}

function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return 'Self-paced';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

export function CourseCard({ course }: { course: PublicCourseItem }) {
  return (
    <div className="group relative bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl hover:border-[#BE1E2E]/40 transition-all duration-300 flex flex-col h-full hover:-translate-y-1.5">
      {/* Thumbnail or Fallback Visual */}
      <div className="relative aspect-video w-full overflow-hidden bg-[var(--bg-surface-elevated)]">
        {course.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-red-950/40 via-[var(--bg-surface-elevated)] to-[var(--bg-surface)] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-[#BE1E2E]/10 border border-[#BE1E2E]/20 text-[#BE1E2E] flex items-center justify-center mb-2 shadow-inner group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#BE1E2E] font-bold">
              {course.category || 'Career Track'}
            </span>
          </div>
        )}

        {/* Badges Over Image */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/70 backdrop-blur-md text-white border border-white/10 shadow-sm">
            {formatLevel(course.level)}
          </span>
          {course.category && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[#BE1E2E]/90 text-white shadow-sm">
              {course.category}
            </span>
          )}
        </div>

        {/* Certificate Included Badge */}
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-950/80 backdrop-blur-md text-emerald-300 border border-emerald-500/30 shadow-sm">
            <Award className="w-3 h-3 text-emerald-400" /> Cert
          </span>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          {/* Rating Strip */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-bold text-[var(--brand-text)]">4.9</span>
              <span className="text-[10px] text-[var(--text-muted)]">(120+ reviews)</span>
            </div>
            <span className="text-[11px] font-mono text-[var(--text-muted)]">
              {formatDuration(course.durationMinutes)}
            </span>
          </div>

          <h3 className="text-base font-bold text-[var(--brand-text)] line-clamp-2 group-hover:text-[#BE1E2E] transition-colors leading-snug">
            <Link href={`/courses/${course.slug}`} className="focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] rounded">
              {course.title}
            </Link>
          </h3>

          <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
            {course.shortDescription || 'Master key competencies and earn verified certification.'}
          </p>
        </div>

        {/* Footer Bar */}
        <div className="pt-3.5 border-t border-[var(--brand-border)] flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-[11px]">
            <Globe className="w-3.5 h-3.5" />
            <span>{course.language || 'English'}</span>
          </div>

          <Link
            href={`/courses/${course.slug}`}
            className="inline-flex items-center gap-1 font-bold text-xs text-[#BE1E2E] hover:underline focus:outline-none group/link"
            aria-label={`View ${course.title} course details`}
          >
            <span>Learn More</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
