'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, PlayCircle, CheckCircle2, Clock, Filter, Compass } from 'lucide-react';
import { Button } from '@edtech/ui';
import { BackButton } from '@/components/navigation/BackButton';

export default function StudentCoursesPage() {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');

  const { data: enrollmentsData, isLoading } = useQuery({
    queryKey: ['student-enrollments'],
    queryFn: async () => {
      const res = await fetch('/api/v1/student/enrollments');
      if (!res.ok) throw new Error('Failed to fetch enrollments');
      const json = await res.json();
      return json.data || [];
    }
  });

  const enrollments = enrollmentsData || [];

  const filtered = enrollments.filter((item: any) => {
    if (filterStatus === 'ALL') return true;
    return item.status === filterStatus;
  });

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-6">
      <BackButton fallback="/student" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--brand-border)] pb-6">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#BE1E2E] bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
            My Learning Catalog
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--brand-text)] mt-2">
            My Enrolled Courses
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Access your active courses, continue video modules, and view completed programs.
          </p>
        </div>

        <Link href="/courses">
          <Button variant="primary" className="btn-primary text-xs px-4">
            <Compass className="w-3.5 h-3.5 mr-1.5" /> Browse All Courses
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--brand-border)] pb-3 text-xs font-mono">
        <button
          onClick={() => setFilterStatus('ALL')}
          className={`px-3 py-1.5 rounded-lg transition-colors font-bold ${
            filterStatus === 'ALL'
              ? 'bg-[#BE1E2E] text-white'
              : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--brand-text)]'
          }`}
        >
          All Enrolled ({enrollments.length})
        </button>

        <button
          onClick={() => setFilterStatus('ACTIVE')}
          className={`px-3 py-1.5 rounded-lg transition-colors font-bold ${
            filterStatus === 'ACTIVE'
              ? 'bg-[#BE1E2E] text-white'
              : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--brand-text)]'
          }`}
        >
          In Progress ({enrollments.filter((e: any) => e.status === 'ACTIVE').length})
        </button>

        <button
          onClick={() => setFilterStatus('COMPLETED')}
          className={`px-3 py-1.5 rounded-lg transition-colors font-bold ${
            filterStatus === 'COMPLETED'
              ? 'bg-[#BE1E2E] text-white'
              : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--brand-text)]'
          }`}
        >
          Completed ({enrollments.filter((e: any) => e.status === 'COMPLETED').length})
        </button>
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="glass-card p-12 text-center text-xs font-mono text-[var(--text-muted)]">
          Loading courses...
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 rounded-3xl border border-[var(--brand-border)] text-center space-y-3 max-w-lg mx-auto">
          <BookOpen className="w-8 h-8 mx-auto text-[var(--text-muted)]" />
          <h3 className="text-base font-extrabold text-[var(--brand-text)]">No courses match filter</h3>
          <p className="text-xs text-[var(--text-muted)]">Select another filter tab or browse the course catalog.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item: any) => {
            const course = item.course;
            if (!course) return null;

            return (
              <div
                key={item.id}
                className="glass-card rounded-2xl overflow-hidden border border-[var(--brand-border)] flex flex-col justify-between hover:border-[#BE1E2E]/50 transition-all shadow-md"
              >
                <div>
                  {course.thumbnailUrl ? (
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      className="w-full aspect-video object-cover border-b border-[var(--brand-border)]"
                    />
                  ) : (
                    <div className="w-full aspect-video bg-[var(--bg-surface-elevated)] border-b border-[var(--brand-border)] flex items-center justify-center text-[var(--text-muted)]">
                      <BookOpen className="w-8 h-8 text-[#BE1E2E]" />
                    </div>
                  )}

                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#BE1E2E]/10 text-[#BE1E2E]">
                        {course.level || 'BEGINNER'}
                      </span>
                      <span className="text-[var(--text-muted)] text-[10px]">
                        {item.completedLessons}/{item.totalLessons} Lessons
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-[var(--brand-text)] line-clamp-2 leading-snug">
                      {course.title}
                    </h3>

                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[10px] font-mono text-[var(--text-muted)]">
                        <span>Progress</span>
                        <span className="font-bold text-[var(--brand-text)]">{item.progressPercent}%</span>
                      </div>
                      <div className="w-full h-2 bg-[var(--bg-surface-elevated)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#BE1E2E] rounded-full transition-all duration-300"
                          style={{ width: `${item.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0 border-t border-[var(--brand-border)] mt-4">
                  <Link href={`/student/courses/${course.id}/learn`} className="block w-full">
                    <button className="w-full py-2.5 px-4 text-xs font-extrabold bg-[#BE1E2E] text-white rounded-xl hover:bg-[#a01826] transition-colors shadow-md shadow-[#BE1E2E]/20 flex items-center justify-center gap-1.5">
                      <PlayCircle className="w-4 h-4" /> Continue Learning →
                    </button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
