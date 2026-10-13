'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@edtech/ui';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  PlayCircle,
  Award,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Compass,
  Video,
  FileCheck,
  HelpCircle,
  Calendar,
  AlertCircle,
  MapPin,
  ChevronRight
} from 'lucide-react';
import { IStudentDashboardSummary } from '@edtech/types';
import { LiveClassJoinButton } from '@/components/classes/LiveClassJoinButton';

export default function StudentDashboardPage() {
  const { user } = useAuth();

  // Fetch comprehensive student dashboard summary
  const { data: summary, isLoading, isError, error } = useQuery<IStudentDashboardSummary>({
    queryKey: ['student-dashboard-summary'],
    queryFn: async () => {
      const res = await fetch('/api/v1/student/dashboard');
      if (!res.ok) throw new Error('Failed to load student dashboard');
      const json = await res.json();
      return json.data;
    }
  });

  const stats = summary?.stats;
  const continueLearning = summary?.continueLearning;
  const upcomingClasses = summary?.upcomingClasses || [];
  const pendingAssessments = summary?.pendingAssessments || [];
  const recentResults = summary?.recentResults || [];

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[var(--brand-border)] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#BE1E2E]/10 border border-[#BE1E2E]/20 text-[#BE1E2E] text-[11px] font-bold uppercase tracking-wider mb-2 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Learner Command Center</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--brand-text)] font-heading">
            Welcome back 👋, <span className="bg-gradient-to-r from-[var(--brand-text)] to-[#BE1E2E] bg-clip-text text-transparent">{user?.name || 'Learner'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 max-w-2xl leading-relaxed">
            Resume your courses, attend upcoming live masterclasses, take quizzes, and track your milestone achievements.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/student/courses">
            <Button variant="outline" className="text-xs px-4 py-2.5 rounded-xl border border-[var(--brand-border)] hover:bg-[var(--bg-surface-elevated)] transition-colors">
              <BookOpen className="w-3.5 h-3.5 mr-1.5 text-[#BE1E2E]" /> My Enrolled Courses
            </Button>
          </Link>
          <Link href="/courses">
            <Button variant="primary" className="btn-primary text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-[#BE1E2E]/20 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" /> Explore Catalog
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="glass-card p-16 text-center text-xs font-mono text-[var(--text-muted)] space-y-3">
          <div className="w-8 h-8 border-3 border-[#BE1E2E] border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Syncing your student workspace...</p>
        </div>
      ) : isError ? (
        <div className="glass-card p-8 text-center text-xs text-red-500 font-mono border border-red-500/30 rounded-2xl">
          {(error as any)?.message || 'Failed to load dashboard data'}
        </div>
      ) : stats?.totalEnrolledCourses === 0 ? (
        /* Empty State */
        <div className="glass-card-premium p-12 rounded-3xl border border-[var(--brand-border)] text-center space-y-4 max-w-lg mx-auto my-8">
          <div className="w-14 h-14 rounded-2xl bg-[#BE1E2E]/10 text-[#BE1E2E] flex items-center justify-center mx-auto shadow-inner">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-black text-[var(--brand-text)] font-heading">No Active Course Enrollments</h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Browse our catalog of verified practical courses and enroll in your first program to start learning today.
          </p>
          <Link href="/courses">
            <Button variant="primary" className="btn-primary text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-[#BE1E2E]/20">
              Browse Available Courses →
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Upcoming Live Class Alert if any */}
          {upcomingClasses.length > 0 && (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-950/60 via-indigo-950/50 to-purple-950/60 border border-blue-500/40 shadow-xl space-y-4 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" /> Next Upcoming Session
                  </div>
                  <h3 className="text-lg font-black text-white font-heading">
                    {upcomingClasses[0].name}
                  </h3>
                  <div className="text-xs text-blue-200 flex items-center gap-3 flex-wrap">
                    <span className="font-semibold">{upcomingClasses[0].courseTitle}</span>
                    {upcomingClasses[0].timing && (
                      <span>• {upcomingClasses[0].timing.startTime} - {upcomingClasses[0].timing.endTime}</span>
                    )}
                    {upcomingClasses[0].mode === 'OFFLINE' && upcomingClasses[0].venueAddress && (
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-red-400" /> {upcomingClasses[0].venueAddress}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {upcomingClasses[0].mode !== 'OFFLINE' ? (
                    <LiveClassJoinButton classId={upcomingClasses[0].id} />
                  ) : (
                    <span className="text-xs px-4 py-2 rounded-xl bg-white/10 text-white/90 font-mono">
                      {upcomingClasses[0].mode} Session
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Canonical Continue Learning Featured Card */}
          {continueLearning && (
            <div className="glass-card-premium p-6 md:p-8 rounded-3xl border border-[#BE1E2E]/30 bg-gradient-to-r from-[#BE1E2E]/10 via-[var(--bg-surface)] to-[var(--bg-surface-elevated)] space-y-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute -right-16 -top-16 w-60 h-60 bg-[#BE1E2E]/10 rounded-full blur-3xl pointer-events-none group-hover:bg-[#BE1E2E]/15 transition-all" />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-3 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase bg-[#BE1E2E]/10 text-[#BE1E2E] border border-[#BE1E2E]/25">
                      RESUME LEARNING
                    </span>
                    {continueLearning.isCompleted && (
                      <span className="px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/25">
                        COMPLETED COURSE 🎉
                      </span>
                    )}
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black text-[var(--brand-text)] leading-tight font-heading">
                    {continueLearning.courseTitle}
                  </h2>

                  {continueLearning.resumableLesson && (
                    <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-elevated)]/80 border border-[var(--brand-border)] text-xs space-y-1">
                      <div className="text-[10px] font-mono text-[#BE1E2E] font-bold uppercase tracking-wider">
                        Current Unit: {continueLearning.resumableLesson.moduleTitle}
                      </div>
                      <div className="font-extrabold text-[var(--brand-text)] flex items-center gap-2">
                        <PlayCircle className="w-4 h-4 text-[#BE1E2E]" />
                        <span>{continueLearning.resumableLesson.title}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-start md:items-end gap-3 flex-shrink-0 relative z-10">
                  <Link
                    href={
                      continueLearning.resumableLesson
                        ? `/student/courses/${continueLearning.courseId}/learn?lessonId=${continueLearning.resumableLesson.id}`
                        : `/student/courses/${continueLearning.courseId}/learn`
                    }
                  >
                    <button className="px-6 py-3.5 text-xs font-black bg-[#BE1E2E] hover:bg-[#a01826] text-white rounded-xl transition-all shadow-lg shadow-[#BE1E2E]/25 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]">
                      <PlayCircle className="w-4 h-4" />
                      <span>{continueLearning.isCompleted ? 'Review Syllabus' : 'Resume Lesson'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </Link>

                  <Link
                    href={`/student/courses/${continueLearning.courseId}`}
                    className="text-xs text-[var(--text-muted)] hover:text-[#BE1E2E] font-mono underline transition-colors"
                  >
                    View Full Syllabus
                  </Link>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2 pt-3 border-t border-[var(--brand-border)]/70 relative z-10">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[var(--brand-text)] font-extrabold">
                    Course Progress: {continueLearning.progressPercent}%
                  </span>
                  <span className="text-[var(--text-muted)]">
                    {continueLearning.completedLessons} of {continueLearning.totalLessons} Units Completed
                  </span>
                </div>
                <div className="w-full h-2.5 bg-[var(--bg-surface-elevated)] rounded-full overflow-hidden border border-[var(--brand-border)]">
                  <div
                    className="h-full bg-gradient-to-r from-[#BE1E2E] via-red-500 to-rose-400 rounded-full transition-all duration-700 shadow-sm"
                    style={{ width: `${continueLearning.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Metrics Summary Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-card p-5 rounded-2xl border border-[var(--brand-border)] hover:border-[#BE1E2E]/40 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider">Courses</span>
                <div className="p-2 rounded-xl bg-[#BE1E2E]/10 text-[#BE1E2E]">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-[var(--brand-text)] font-heading">{stats?.totalEnrolledCourses || 0}</p>
              <p className="text-[11px] text-[var(--text-muted)] font-mono">Enrolled Programs</p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-[var(--brand-border)] hover:border-amber-500/40 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider">In Progress</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-[var(--brand-text)] font-heading">{stats?.inProgressCourses || 0}</p>
              <p className="text-[11px] text-[var(--text-muted)] font-mono">Active Masterclasses</p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-[var(--brand-border)] hover:border-emerald-500/40 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider">Lessons Done</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-[var(--brand-text)] font-heading">
                {stats?.completedLessons || 0} <span className="text-sm font-normal text-[var(--text-muted)]">/ {stats?.totalLessons || 0}</span>
              </p>
              <p className="text-[11px] text-[var(--text-muted)] font-mono">Completed Units</p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-[var(--brand-border)] hover:border-purple-500/40 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider">Certificates</span>
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-[var(--brand-text)] font-heading">{stats?.completedCourses || 0}</p>
              <p className="text-[11px] text-[var(--text-muted)] font-mono">Completed Masterclasses</p>
            </div>
          </div>

          {/* 2-Column Split: Pending Quizzes & Assignments + Recent Graded Results */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Assessments */}
            <div className="glass-card p-6 rounded-3xl border border-[var(--brand-border)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--brand-border)] pb-3">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-[#BE1E2E]" />
                  <h3 className="text-base font-extrabold text-[var(--brand-text)] font-heading">Pending Quizzes & Tasks</h3>
                </div>
                <Link href="/student/assessments" className="text-xs text-[#BE1E2E] font-mono hover:underline font-bold">
                  View All →
                </Link>
              </div>

              {pendingAssessments.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-[var(--text-muted)]">
                  All quizzes and assignments up to date! 🎉
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingAssessments.map((a) => (
                    <div
                      key={a.id}
                      className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] hover:border-[#BE1E2E]/30 transition-all flex items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-[#BE1E2E]/10 text-[#BE1E2E] border border-[#BE1E2E]/20">
                            {a.type}
                          </span>
                          {a.courseTitle && (
                            <span className="text-[10px] font-mono text-[var(--text-muted)] truncate">
                              {a.courseTitle}
                            </span>
                          )}
                        </div>
                        <h4 className="font-extrabold text-[var(--brand-text)] truncate">{a.title}</h4>
                        <p className="text-[10px] font-mono text-[var(--text-muted)]">
                          Attempts: {a.attemptCount}/{a.maxAttempts} • Pass score: {a.passingScorePercent}%
                        </p>
                      </div>

                      <Link href={`/student/assessments`}>
                        <Button variant="primary" className="btn-primary text-xs px-4 py-2 rounded-xl">
                          Attempt
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Submissions & Graded Results */}
            <div className="glass-card p-6 rounded-3xl border border-[var(--brand-border)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--brand-border)] pb-3">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-base font-extrabold text-[var(--brand-text)] font-heading">Recent Graded Results</h3>
                </div>
                <Link href="/student/assessments" className="text-xs text-[#BE1E2E] font-mono hover:underline font-bold">
                  All Results →
                </Link>
              </div>

              {recentResults.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-[var(--text-muted)]">
                  No submissions yet. Complete a quiz or assignment to view your scores.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentResults.map((r) => (
                    <div
                      key={r.id}
                      className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] flex items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[var(--brand-text)] truncate">{r.assessmentTitle}</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                              r.passed
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : r.status === 'SUBMITTED'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-red-500/10 text-red-500 border border-red-500/20'
                            }`}
                          >
                            {r.status === 'SUBMITTED' ? 'IN REVIEW' : r.passed ? 'PASSED' : 'RETRY'}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-[var(--text-muted)]">
                          Attempt #{r.attemptNumber} • Submitted on {new Date(r.submittedAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="text-right font-mono flex-shrink-0">
                        <div className="text-sm font-black text-[var(--brand-text)]">
                          {r.scorePercentage}%
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)]">
                          {r.score} / {r.maxScore} pts
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
