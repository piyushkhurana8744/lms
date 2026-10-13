'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@edtech/ui';
import {
  PlayCircle,
  ArrowLeft,
  BookOpen,
  Clock,
  CheckCircle2,
  Lock,
  FileText,
  Video,
  FileCode,
  Sparkles,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { BackButton } from '@/components/navigation/BackButton';
import { IStudentCourseDetailDTO } from '@edtech/types';

export default function StudentCourseDetailPage() {
  const params = useParams();
  const courseId = params.courseId as string;

  // 1. Fetch Student-Safe Course Overview with Modules & Linked Assessments
  const { data: overview, isLoading, isError, error } = useQuery<IStudentCourseDetailDTO>({
    queryKey: ['student-course-overview', courseId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/student/courses/${courseId}/overview`);
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Failed to load course overview');
      }
      const json = await res.json();
      return json.data;
    }
  });

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs font-mono text-[var(--text-muted)] space-y-3">
        <div className="inline-block animate-spin w-6 h-6 border-2 border-[#BE1E2E] border-t-transparent rounded-full" />
        <p>Loading course outline...</p>
      </div>
    );
  }

  if (isError || !overview) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="glass-card p-8 rounded-3xl border border-red-500/30 space-y-3">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-base font-extrabold text-[var(--brand-text)]">Course Access Restricted</h2>
          <p className="text-xs text-[var(--text-muted)]">
            {(error as any)?.message || 'You must be actively enrolled to access this course.'}
          </p>
          <Link href="/courses">
            <Button variant="primary" className="btn-primary text-xs px-5 py-2">
              Browse Available Courses →
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { course, enrollment, modules, assessments } = overview;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      <BackButton fallback="/student/courses" />

      {/* Course Hero Header Card */}
      <div className="glass-card p-6 md:p-8 rounded-3xl border border-[var(--brand-border)] flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl bg-gradient-to-r from-[var(--bg-surface)] to-[var(--bg-surface-elevated)]">
        <div className="space-y-3 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-[#BE1E2E]/10 text-[#BE1E2E] border border-[#BE1E2E]/20">
              ENROLLED MASTERCLASS
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-[var(--bg-surface-elevated)] text-[var(--text-muted)]">
              {course.level}
            </span>
            {enrollment.status === 'COMPLETED' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                COMPLETED
              </span>
            )}
          </div>

          <h1 className="text-3xl font-extrabold text-[var(--brand-text)] leading-tight">
            {course.title}
          </h1>

          {course.shortDescription && (
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              {course.shortDescription}
            </p>
          )}

          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="font-bold text-[var(--brand-text)]">Progress: {enrollment.progressPercent}%</span>
              <span className="text-[var(--text-muted)]">
                {enrollment.completedLessons} / {enrollment.totalLessons} Units Completed
              </span>
            </div>
            <div className="w-full h-2.5 bg-[var(--bg-surface-elevated)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#BE1E2E] to-red-500 rounded-full transition-all duration-500"
                style={{ width: `${enrollment.progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center md:items-end gap-3 flex-shrink-0">
          <Link
            href={
              enrollment.lastLessonId
                ? `/student/courses/${courseId}/learn?lessonId=${enrollment.lastLessonId}`
                : `/student/courses/${courseId}/learn`
            }
          >
            <button className="px-6 py-3.5 text-xs font-extrabold bg-[#BE1E2E] text-white rounded-xl hover:bg-[#a01826] transition-colors shadow-lg shadow-[#BE1E2E]/20 flex items-center gap-2">
              <PlayCircle className="w-4 h-4" />
              {enrollment.status === 'COMPLETED' ? 'Review Lessons →' : 'Continue Learning →'}
            </button>
          </Link>
          <span className="text-[10px] font-mono text-[var(--text-muted)]">
            Enrolled on {new Date(enrollment.enrolledAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Linked Assessments / Quizzes Section if any */}
      {assessments && assessments.length > 0 && (
        <div className="glass-card p-6 rounded-3xl border border-[var(--brand-border)] space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--brand-border)] pb-3">
            <HelpCircle className="w-4 h-4 text-[#BE1E2E]" />
            <h3 className="text-base font-extrabold text-[var(--brand-text)]">Course Quizzes & Tests</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {assessments.map((a) => (
              <div
                key={a.id}
                className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--brand-border)] flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#BE1E2E]/10 text-[#BE1E2E]">
                    {a.type}
                  </span>
                  <h4 className="font-extrabold text-[var(--brand-text)] truncate">{a.title}</h4>
                  <p className="text-[10px] font-mono text-[var(--text-muted)]">
                    Pass Score: {a.passingScorePercent}% • Max Attempts: {a.maxAttempts}
                  </p>
                </div>

                <Link href="/student/assessments">
                  <Button variant="primary" className="btn-primary text-xs px-3.5 py-1.5">
                    Take Quiz
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Curriculum Breakdown */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[var(--brand-text)] border-b border-[var(--brand-border)] pb-3">
          Curriculum Syllabus & Lessons
        </h2>

        <div className="space-y-4">
          {modules.map((m, mIdx) => (
            <div key={m.id} className="glass-card p-5 rounded-2xl border border-[var(--brand-border)] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-[var(--brand-text)] font-mono">
                  <span className="text-[#BE1E2E]">0{mIdx + 1}.</span> {m.title}
                </h3>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                  {m.lessons.filter((l) => l.isCompleted).length}/{m.lessons.length} Completed
                </span>
              </div>

              <div className="space-y-2">
                {m.lessons.map((l) => (
                  <Link
                    key={l.id}
                    href={`/student/courses/${courseId}/learn?lessonId=${l.id}`}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                      l.isCompleted
                        ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40'
                        : 'bg-[var(--bg-surface)] border-[var(--brand-border)] hover:border-[#BE1E2E]/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {l.isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <PlayCircle className="w-4 h-4 text-[#BE1E2E] flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <span className="font-semibold text-[var(--brand-text)] block truncate">{l.title}</span>
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">{l.type} Lesson</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">
                        {l.estimatedDurationMinutes ? `${l.estimatedDurationMinutes} mins` : 'Lesson'}
                      </span>
                      {l.isCompleted ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600">
                          DONE
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-[#BE1E2E] font-bold">START →</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
