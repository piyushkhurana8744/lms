'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/auth-provider';
import { PublicCurriculum } from '@/components/public/PublicCurriculum';
import { CourseDetailSkeleton } from '@/components/public/CourseDetailSkeleton';
import { BackButton } from '@/components/navigation/BackButton';
import {
  Clock,
  BarChart,
  Globe,
  BookOpen,
  ArrowLeft,
  Layers,
  Sparkles,
  Lock,
  ArrowUpRight,
  RefreshCw,
  Home,
  Video,
  Building2,
  Calendar,
  MapPin,
  Users,
  CheckCircle2
} from 'lucide-react';
import { IBatch } from '@edtech/types';

export default function PublicCourseDetailPage() {
  const params = useParams();
  const rawSlug = params?.courseSlug;
  const courseSlug = Array.isArray(rawSlug) ? rawSlug[0] : (rawSlug as string) || '';

  const { isAuthenticated } = useAuth();

  // 1. Fetch Public Course Detail DTO
  const {
    data: course,
    isLoading: isCourseLoading,
    isError: isCourseError,
    error: courseError,
    refetch: refetchCourse
  } = useQuery({
    queryKey: ['public-course', courseSlug],
    queryFn: async () => {
      if (!courseSlug) throw new Error('Course slug is required');
      const res = await fetch(`/api/v1/public/courses/${encodeURIComponent(courseSlug)}`);
      if (!res.ok) {
        throw new Error('Course not found or access denied');
      }
      const json = await res.json();
      return json.data;
    },
    enabled: !!courseSlug
  });

  // 2. Fetch Public Curriculum Hierarchy
  const {
    data: curriculumData,
    isLoading: isCurriculumLoading,
    refetch: refetchCurriculum
  } = useQuery({
    queryKey: ['public-course-curriculum', courseSlug],
    queryFn: async () => {
      if (!courseSlug) return null;
      const res = await fetch(`/api/v1/public/courses/${encodeURIComponent(courseSlug)}/curriculum`);
      if (!res.ok) throw new Error('Failed to load course curriculum');
      const json = await res.json();
      return json.data;
    },
    enabled: !!courseSlug && !isCourseError
  });

  const [batchTab, setBatchTab] = React.useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');

  // 3. Fetch Public Upcoming Batches for this Course
  const {
    data: batches = [],
    isLoading: isBatchesLoading
  } = useQuery<IBatch[]>({
    queryKey: ['public-course-batches', courseSlug],
    queryFn: async () => {
      if (!courseSlug) return [];
      const res = await fetch(`/api/v1/public/courses/${encodeURIComponent(courseSlug)}/batches`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!courseSlug && !isCourseError
  });

  // Loading skeleton state
  if (isCourseLoading) {
    return <CourseDetailSkeleton />;
  }

  // Safe 404 / Error State (never leaks private or draft status)
  if (isCourseError || !course) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center space-y-6" data-testid="course-not-found">
        <div className="w-16 h-16 rounded-3xl bg-[#BE1E2E]/10 text-[#BE1E2E] border border-[#BE1E2E]/20 flex items-center justify-center mx-auto shadow-lg">
          <BookOpen className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--brand-text)]">
            Course Not Found
          </h1>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
            This course may no longer be available, or the direct link is invalid.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-4 flex-wrap">
          <button
            onClick={() => {
              refetchCourse();
              refetchCurriculum();
            }}
            className="px-4 py-2.5 rounded-xl border border-[var(--brand-border)] text-xs font-bold text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)] transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry Loading
          </button>

          <Link
            href="/courses"
            className="px-5 py-2.5 rounded-xl bg-[#BE1E2E] text-white font-bold text-xs hover:bg-[#a01825] transition-colors flex items-center gap-1.5 shadow-md shadow-[#BE1E2E]/20"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Browse All Courses
          </Link>

          <Link
            href="/"
            className="px-4 py-2.5 rounded-xl border border-[var(--brand-border)] text-xs font-bold text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)] transition-colors flex items-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" /> Go Home
          </Link>
        </div>
      </div>
    );
  }

  const modules = curriculumData?.modules || [];
  const moduleCount = course.curriculumSummary?.moduleCount ?? modules.length;
  const lessonCount =
    course.curriculumSummary?.lessonCount ??
    modules.reduce((sum: number, m: any) => sum + (m.lessons?.length || 0), 0);
  const previewCount =
    course.curriculumSummary?.previewLessonCount ??
    modules.reduce(
      (sum: number, m: any) => sum + (m.lessons?.filter((l: any) => l.isPreview).length || 0),
      0
    );

  // Dynamic JSON-LD Course Schema for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.shortDescription || course.description,
    provider: {
      '@type': 'Organization',
      name: 'DIDM Digital Learning Platform'
    },
    inLanguage: course.language || 'English',
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'Online',
      courseWorkload: course.durationMinutes ? `PT${course.durationMinutes}M` : 'PT0M'
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6 sm:space-y-8">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between gap-4">
          <BackButton fallback="/courses" />

          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)] min-w-0">
            <Link href="/" className="hover:text-[#BE1E2E] transition-colors hidden sm:inline">
              Home
            </Link>
            <span className="hidden sm:inline">/</span>
            <Link href="/courses" className="hover:text-[#BE1E2E] transition-colors flex items-center gap-1 truncate">
              Courses
            </Link>
            <span>/</span>
            <span className="text-[var(--brand-text)] font-semibold truncate max-w-[180px] sm:max-w-xs">
              {course.title}
            </span>
          </div>
        </div>

        {/* Hero Card */}
        <div className="glass-card p-6 md:p-8 rounded-3xl border border-[var(--brand-border)] grid grid-cols-1 md:grid-cols-3 gap-8 shadow-xl relative overflow-hidden">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-0.5 rounded-full text-xs font-mono font-bold uppercase bg-[#BE1E2E]/10 text-[#BE1E2E] border border-[#BE1E2E]/20">
                {course.level}
              </span>
              <span className="px-3 py-0.5 rounded-full text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--brand-border)]">
                {course.language || 'English'}
              </span>
              {previewCount > 0 && (
                <span className="px-3 py-0.5 rounded-full text-xs font-mono font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {previewCount} Free Preview Lessons
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[var(--brand-text)] leading-tight">
              {course.title}
            </h1>

            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              {course.shortDescription || course.description}
            </p>

            {/* Quick Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[var(--brand-border)] text-xs font-mono">
              <div>
                <span className="text-[var(--text-muted)] block text-[10px] uppercase">Duration</span>
                <span className="font-bold text-[var(--brand-text)] flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-[#BE1E2E]" />
                  {course.durationMinutes ? `${course.durationMinutes} mins` : 'Self-Paced'}
                </span>
              </div>

              <div>
                <span className="text-[var(--text-muted)] block text-[10px] uppercase">Level</span>
                <span className="font-bold text-[var(--brand-text)] flex items-center gap-1.5 mt-0.5">
                  <BarChart className="w-3.5 h-3.5 text-blue-500" />
                  {course.level}
                </span>
              </div>

              <div>
                <span className="text-[var(--text-muted)] block text-[10px] uppercase">Curriculum</span>
                <span className="font-bold text-[var(--brand-text)] flex items-center gap-1.5 mt-0.5">
                  <Layers className="w-3.5 h-3.5 text-purple-500" />
                  {moduleCount} Modules • {lessonCount} Lessons
                </span>
              </div>

              <div>
                <span className="text-[var(--text-muted)] block text-[10px] uppercase">Language</span>
                <span className="font-bold text-[var(--brand-text)] flex items-center gap-1.5 mt-0.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-500" />
                  {course.language || 'English'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Course Thumbnail & Auth-Aware CTA */}
          <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              {course.thumbnail ? (
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full aspect-video object-cover rounded-xl border border-[var(--brand-border)] shadow-md"
                />
              ) : (
                <div className="w-full aspect-video rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] flex items-center justify-center text-[var(--text-muted)]">
                  <BookOpen className="w-10 h-10 text-[#BE1E2E]" />
                </div>
              )}

              <div className="text-center pt-1">
                <span className="text-sm font-extrabold text-[var(--brand-text)] block font-mono">
                  Masterclass Curriculum
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono block">
                  Includes Free Interactive Previews
                </span>
              </div>
            </div>

            {/* Auth-Aware CTA Section */}
            <div className="space-y-3">
              {!isAuthenticated ? (
                <Link
                  href={`/login?redirect=${encodeURIComponent(`/courses/${courseSlug}`)}`}
                  className="w-full py-3 px-4 rounded-xl bg-[#BE1E2E] text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#a01825] transition-colors shadow-lg shadow-[#BE1E2E]/20"
                >
                  Login to Continue <ArrowUpRight className="w-4 h-4" />
                </Link>
              ) : (
                <div className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-center space-y-1">
                  <span className="text-xs font-bold text-[var(--brand-text)] flex items-center justify-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" /> Course Access Coming Soon
                  </span>
                  <p className="text-[10px] font-mono text-[var(--text-muted)]">
                    Explore available preview lessons below.
                  </p>
                </div>
              )}

              <a
                href="#curriculum-section"
                className="w-full py-2.5 px-4 rounded-xl border border-[var(--brand-border)] text-[var(--brand-text)] font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[var(--bg-surface-elevated)] transition-colors"
              >
                Preview Curriculum Lessons
              </a>
            </div>
          </div>
        </div>

        {/* Detailed Course Description */}
        <div className="glass-card p-6 md:p-8 rounded-3xl border border-[var(--brand-border)] space-y-4">
          <h2 className="text-base font-extrabold text-[var(--brand-text)] border-b border-[var(--brand-border)] pb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#BE1E2E]" /> Course Overview & Learning Goals
          </h2>
          <div className="text-sm text-[var(--brand-text)] leading-relaxed whitespace-pre-line">
            {course.description ||
              course.shortDescription ||
              'This masterclass offers a comprehensive curriculum designed for hands-on, practical understanding.'}
          </div>
        </div>

        {/* Upcoming Batches & Live Class Schedule Section */}
        <div id="batches-section" className="glass-card p-6 md:p-8 rounded-3xl border border-[var(--brand-border)] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--brand-border)] pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#BE1E2E] uppercase tracking-wider">
                <Calendar className="w-4 h-4" /> Available Schedules
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[var(--brand-text)] mt-1">
                Upcoming Batches & Training Modes
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Join live online interactive sessions via Zoom or attend physical classroom training at our center campuses.
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs font-bold">
              <button
                type="button"
                onClick={() => setBatchTab('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  batchTab === 'ALL'
                    ? 'bg-[#BE1E2E] text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--brand-text)]'
                }`}
              >
                All Batches
              </button>
              <button
                type="button"
                onClick={() => setBatchTab('ONLINE')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  batchTab === 'ONLINE'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-blue-500'
                }`}
              >
                <Video className="w-3.5 h-3.5" /> Online (Zoom)
              </button>
              <button
                type="button"
                onClick={() => setBatchTab('OFFLINE')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  batchTab === 'OFFLINE'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-emerald-500'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" /> Classroom
              </button>
            </div>
          </div>

          {/* Batches Cards Grid */}
          {isBatchesLoading ? (
            <div className="p-8 text-center text-xs font-mono text-[var(--text-muted)] animate-pulse">
              Loading batch schedules...
            </div>
          ) : batches.filter((b) => batchTab === 'ALL' || (batchTab === 'ONLINE' ? b.mode === 'ONLINE' || b.mode === 'HYBRID' : b.mode === 'OFFLINE' || b.mode === 'HYBRID')).length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-[var(--brand-border)] rounded-2xl bg-[var(--bg-surface-elevated)] space-y-2 text-xs">
              <Calendar className="w-8 h-8 mx-auto text-[var(--text-muted)] opacity-50" />
              <p className="font-bold text-[var(--brand-text)]">New batches announced soon</p>
              <p className="text-[var(--text-muted)]">
                Our next live cohort is currently being scheduled. Contact our admissions team for immediate seat booking.
              </p>
              <div className="pt-2">
                <Link href="/contact">
                  <button className="px-4 py-2 rounded-xl bg-[#BE1E2E] text-white font-bold text-xs hover:bg-[#a01825] transition-colors">
                    Inquire Next Batch Dates
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {batches
                .filter((b) => batchTab === 'ALL' || (batchTab === 'ONLINE' ? b.mode === 'ONLINE' || b.mode === 'HYBRID' : b.mode === 'OFFLINE' || b.mode === 'HYBRID'))
                .map((batch) => {
                  const isOnline = batch.mode === 'ONLINE' || batch.mode === 'HYBRID';
                  const isOffline = batch.mode === 'OFFLINE' || batch.mode === 'HYBRID';
                  const seatsLeft = Math.max(0, batch.maxSeats - batch.enrolledCount);

                  return (
                    <div
                      key={batch.id}
                      className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] hover:border-[#BE1E2E]/50 transition-all shadow-md space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                                batch.mode === 'ONLINE'
                                  ? 'bg-blue-500/10 text-blue-500 border border-blue-500/30'
                                  : batch.mode === 'OFFLINE'
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                                  : 'bg-purple-500/10 text-purple-500 border border-purple-500/30'
                              }`}
                            >
                              {batch.mode === 'ONLINE' ? (
                                <Video className="w-3 h-3" />
                              ) : batch.mode === 'OFFLINE' ? (
                                <Building2 className="w-3 h-3" />
                              ) : (
                                <Globe className="w-3 h-3" />
                              )}
                              {batch.mode === 'ONLINE' ? 'Live Online (Zoom)' : batch.mode === 'OFFLINE' ? 'Classroom (Campus)' : 'Hybrid Training'}
                            </span>
                            <h3 className="font-extrabold text-sm sm:text-base text-[var(--brand-text)] mt-1.5">
                              {batch.name}
                            </h3>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-[var(--brand-background)] border border-[var(--brand-border)] text-[10px] font-mono font-bold text-[#BE1E2E]">
                            {batch.batchCode}
                          </span>
                        </div>

                        {/* Batch Timing & Details */}
                        <div className="space-y-1.5 text-xs text-[var(--brand-text)]">
                          <div className="flex items-center gap-2 text-[var(--text-muted)]">
                            <Clock className="w-3.5 h-3.5 text-[#BE1E2E]" />
                            <span className="font-bold text-[var(--brand-text)] font-mono">
                              {batch.timing.startTime} - {batch.timing.endTime}
                            </span>
                            <span>•</span>
                            <span className="font-mono">
                              Starts {new Date(batch.startDate).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Days: </span>
                            <div className="flex gap-1">
                              {batch.daysOfWeek.map((d) => (
                                <span key={d} className="px-1.5 py-0.2 rounded bg-[var(--brand-background)] font-mono font-bold">
                                  {d.slice(0, 3)}
                                </span>
                              ))}
                            </div>
                          </div>

                          {isOffline && batch.classroomDetails && (
                            <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-[11px] text-[var(--brand-text)] flex items-start gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                              <div>
                                <div className="font-bold">{batch.classroomDetails.branch || 'Campus Center'}</div>
                                <div className="text-[10px] text-[var(--text-muted)]">{batch.classroomDetails.roomNumber && `${batch.classroomDetails.roomNumber} • `}{batch.classroomDetails.venueAddress}</div>
                              </div>
                            </div>
                          )}

                          {isOnline && (
                            <div className="p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/20 text-[11px] text-[var(--brand-text)] flex items-start gap-1.5">
                              <Video className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                              <div>
                                <div className="font-bold">Zoom Live Interactive Class</div>
                                <div className="text-[10px] text-[var(--text-muted)]">Meeting link & passcode shared directly on student dashboard upon enrollment.</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer: Seats & Action */}
                      <div className="pt-3 border-t border-[var(--brand-border)] flex items-center justify-between gap-3">
                        <div className="text-[11px] font-mono">
                          {seatsLeft <= 5 ? (
                            <span className="text-amber-500 font-bold">⚠️ Filling Fast ({seatsLeft} seats left)</span>
                          ) : (
                            <span className="text-emerald-500 font-bold">✓ Seats Available</span>
                          )}
                        </div>

                        <Link href={isAuthenticated ? `/student/courses` : `/register`}>
                          <button className="px-3.5 py-1.5 rounded-xl bg-[#BE1E2E] text-white font-bold text-xs hover:bg-[#a01825] transition-colors shadow-md shadow-[#BE1E2E]/20">
                            Book / Enroll Seat
                          </button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Curriculum Accordion Section */}
        <div id="curriculum-section" className="space-y-4">
          <div className="border-b border-[var(--brand-border)] pb-3">
            <h2 className="text-2xl font-extrabold text-[var(--brand-text)]">Course Curriculum</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 font-mono">
              Explore modules and interactive preview lessons included in this masterclass.
            </p>
          </div>

          {isCurriculumLoading ? (
            <div className="p-8 text-center text-xs font-mono text-[var(--text-muted)] animate-pulse">
              Loading course modules...
            </div>
          ) : (
            <PublicCurriculum courseSlug={courseSlug} modules={modules} />
          )}
        </div>
      </div>
    </>
  );
}
