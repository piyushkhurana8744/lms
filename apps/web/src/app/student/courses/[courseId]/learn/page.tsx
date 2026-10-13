'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@edtech/ui';
import { BackButton } from '@/components/navigation/BackButton';
import { parseExternalResource, sanitizeHtml } from '@edtech/utils';
import {
  PlayCircle,
  CheckCircle2,
  Lock,
  ChevronLeft,
  ChevronRight,
  FileText,
  Video,
  FileCode,
  Music,
  ExternalLink,
  Calendar,
  Menu,
  X,
  BookOpen,
  Sparkles,
  Award,
  AlertCircle
} from 'lucide-react';
import { IStudentLessonPlayerDTO } from '@edtech/types';

function StudentCoursePlayerContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const courseId = params.courseId as string;
  const initialLessonId = searchParams.get('lessonId');

  const [activeLessonId, setActiveLessonId] = useState<string | null>(initialLessonId);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Video playback ref for position checkpointing
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSavedPositionRef = useRef<number>(0);

  // 1. Fetch Student-Safe Player Payload
  const { data: playerData, isLoading, isError, error } = useQuery<IStudentLessonPlayerDTO>({
    queryKey: ['student-lesson-player', courseId, activeLessonId || 'initial'],
    queryFn: async () => {
      const url = activeLessonId
        ? `/api/v1/student/courses/${courseId}/lessons/${activeLessonId}/player`
        : `/api/v1/student/courses/${courseId}/resume`;

      const res = await fetch(url);
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Failed to load lesson player');
      }
      const json = await res.json();

      if (!activeLessonId && json.data?.resumableLesson) {
        // If we fetched resume info, now fetch the full player for that lesson
        const targetLessonId = json.data.resumableLesson.id;
        setActiveLessonId(targetLessonId);
        const playerRes = await fetch(`/api/v1/student/courses/${courseId}/lessons/${targetLessonId}/player`);
        const playerJson = await playerRes.json();
        return playerJson.data;
      }

      return json.data;
    },
    retry: 1
  });

  const lesson = playerData?.lesson;
  const navigation = playerData?.navigation;
  const curriculum = playerData?.curriculum || [];
  const allLessons = curriculum.flatMap((m) => m.lessons);

  // Synchronize URL search params with active lesson
  useEffect(() => {
    if (activeLessonId && activeLessonId !== searchParams.get('lessonId')) {
      const newUrl = `/student/courses/${courseId}/learn?lessonId=${activeLessonId}`;
      window.history.replaceState(null, '', newUrl);
    }
  }, [activeLessonId, courseId, searchParams]);

  // Set initial video position if resuming
  useEffect(() => {
    if (videoRef.current && lesson?.lastPositionSeconds && lesson.lastPositionSeconds > 0) {
      videoRef.current.currentTime = lesson.lastPositionSeconds;
      lastSavedPositionRef.current = lesson.lastPositionSeconds;
    }
  }, [lesson?.id, lesson?.lastPositionSeconds]);

  // Throttled / Debounced Video Position Checkpoint Mutation
  const progressUpdateMutation = useMutation({
    mutationFn: async ({ lId, pos }: { lId: string; pos: number }) => {
      await fetch(`/api/v1/student/courses/${courseId}/lessons/${lId}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionSeconds: Math.floor(pos) })
      });
    }
  });

  // Handle periodic position saving
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current || !lesson) return;
    const currentPos = videoRef.current.currentTime;
    // Save checkpoint every 10 seconds of playback
    if (Math.abs(currentPos - lastSavedPositionRef.current) >= 10) {
      lastSavedPositionRef.current = currentPos;
      progressUpdateMutation.mutate({ lId: lesson.id, pos: currentPos });
    }
  }, [lesson, progressUpdateMutation]);

  // Complete Lesson Mutation
  const completeMutation = useMutation({
    mutationFn: async (lId: string) => {
      const res = await fetch(`/api/v1/student/courses/${courseId}/lessons/${lId}/complete`, {
        method: 'POST'
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to complete lesson');
      return json.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['student-lesson-player', courseId] });
      queryClient.invalidateQueries({ queryKey: ['student-course-overview', courseId] });
      queryClient.invalidateQueries({ queryKey: ['student-dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['student-enrollments'] });

      if (data?.isCourseCompleted) {
        setShowCompletionModal(true);
      } else if (navigation?.nextLessonId) {
        setActiveLessonId(navigation.nextLessonId);
      }
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--brand-background)] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-[#BE1E2E] border-t-transparent rounded-full" />
        <p className="text-xs font-mono text-[var(--text-muted)]">Loading learning player workspace...</p>
      </div>
    );
  }

  if (isError || !lesson) {
    return (
      <div className="min-h-screen bg-[var(--brand-background)] flex items-center justify-center p-8">
        <div className="glass-card p-10 rounded-3xl border border-red-500/30 text-center space-y-4 max-w-md">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-extrabold text-[var(--brand-text)]">Course Access Restricted</h2>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            {(error as any)?.message || 'You must be enrolled in this course to access protected lesson content.'}
          </p>
          <Link href="/student/courses">
            <Button variant="primary" className="btn-primary text-xs px-6 py-2.5">
              My Courses →
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isCompleted = lesson.isCompleted;

  return (
    <div className="min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)] flex flex-col">
      {/* Top Player Navigation Header */}
      <header className="h-16 px-6 bg-[var(--bg-surface)] border-b border-[var(--brand-border)] flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <BackButton fallback={`/student/courses/${courseId}`} />
          <div className="min-w-0">
            <h1 className="text-sm font-extrabold text-[var(--brand-text)] truncate max-w-xs md:max-w-md">
              {lesson.title}
            </h1>
            <span className="text-[10px] font-mono text-[var(--text-muted)] block truncate">
              {playerData?.course?.title} • Progress: {playerData?.course?.progressPercent || 0}% (
              {playerData?.course?.completedLessons || 0}/{playerData?.course?.totalLessons || 0} Units)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
            className="md:hidden p-2 rounded-xl border border-[var(--brand-border)] text-[var(--brand-text)]"
          >
            {isSidebarOpenMobile ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Player Body (70% Content / 30% Sidebar Layout) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Content Player (70%) */}
        <main className="flex-1 flex flex-col justify-between overflow-y-auto p-6 md:p-10 space-y-8">
          <div className="space-y-6 max-w-4xl mx-auto w-full">
            {/* Lesson Title & Type Header */}
            <div className="space-y-2 border-b border-[var(--brand-border)] pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#BE1E2E]/10 text-[#BE1E2E] border border-[#BE1E2E]/20">
                  {lesson.type} LESSON
                </span>
                {isCompleted && (
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> COMPLETED
                  </span>
                )}
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--brand-text)] tracking-tight">
                {lesson.title}
              </h2>
              {lesson.description && (
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">{lesson.description}</p>
              )}
            </div>

            {/* Media Content Player Area */}
            <div className="glass-card p-6 md:p-8 rounded-3xl border border-[var(--brand-border)] space-y-6 shadow-xl min-h-[380px] flex flex-col justify-center">
              {lesson.type === 'TEXT' ? (
                /* TEXT LESSON */
                <div
                  className="prose dark:prose-invert text-sm leading-relaxed text-[var(--brand-text)] space-y-4 max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml((lesson.content as any)?.bodyHtml || '<p>Text lesson content.</p>') }}
                />
              ) : lesson.type === 'VIDEO' ? (
                /* VIDEO LESSON */
                <div className="space-y-4">
                  {(lesson.content as any)?.url ? (
                    <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border border-[var(--brand-border)]">
                      <video
                        ref={videoRef}
                        controls
                        src={(lesson.content as any).url}
                        className="w-full h-full object-contain"
                        poster={(lesson.content as any).posterUrl}
                        onTimeUpdate={handleTimeUpdate}
                        onPause={() => {
                          if (videoRef.current) {
                            progressUpdateMutation.mutate({ lId: lesson.id, pos: videoRef.current.currentTime });
                          }
                        }}
                        onEnded={() => {
                          if (!isCompleted) completeMutation.mutate(lesson.id);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="aspect-video w-full rounded-2xl bg-black/80 flex flex-col items-center justify-center text-white space-y-3">
                      <Video className="w-12 h-12 text-[#BE1E2E]" />
                      <p className="text-xs font-mono">Video Stream Ready</p>
                    </div>
                  )}
                </div>
              ) : lesson.type === 'PDF' ? (
                /* PDF LESSON */
                <div className="p-8 text-center space-y-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)]">
                  <FileCode className="w-12 h-12 text-[#BE1E2E] mx-auto" />
                  <h3 className="text-base font-extrabold text-[var(--brand-text)]">PDF Learning Document</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    View or download the official reference document for this module.
                  </p>
                  {(lesson.content as any)?.url && (
                    <a href={(lesson.content as any).url} target="_blank" rel="noreferrer">
                      <Button variant="primary" className="btn-primary text-xs px-6 py-2.5">
                        Download / View PDF Document →
                      </Button>
                    </a>
                  )}
                </div>
              ) : lesson.type === 'AUDIO' ? (
                /* AUDIO LESSON */
                <div className="p-8 text-center space-y-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)]">
                  <Music className="w-12 h-12 text-[#BE1E2E] mx-auto animate-pulse" />
                  <h3 className="text-base font-extrabold text-[var(--brand-text)]">Audio Masterclass Track</h3>
                  {(lesson.content as any)?.url && (
                    <audio
                      controls
                      src={(lesson.content as any).url}
                      className="w-full max-w-md mx-auto"
                      onEnded={() => {
                        if (!isCompleted) completeMutation.mutate(lesson.id);
                      }}
                    />
                  )}
                </div>
              ) : lesson.type === 'EXTERNAL_RESOURCE' ? (
                /* EXTERNAL RESOURCE LESSON */
                (() => {
                  const extParsed = parseExternalResource((lesson.content as any)?.url);
                  const embedUrl = (lesson.content as any)?.embedUrl || extParsed.embedUrl;
                  return (
                    <div className="space-y-4">
                      {embedUrl ? (
                        <div className="space-y-4">
                          <div className="aspect-video rounded-2xl overflow-hidden bg-black border border-[var(--brand-border)] shadow-xl relative">
                            <iframe
                              src={embedUrl}
                              title={lesson.title}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                              className="w-full h-full border-0"
                            />
                          </div>
                          {(lesson.content as any)?.url && (
                            <div className="flex justify-end">
                              <a href={(lesson.content as any).url} target="_blank" rel="noreferrer">
                                <Button variant="outline" className="text-xs px-4 py-2 flex items-center gap-1.5">
                                  <ExternalLink className="w-3.5 h-3.5" /> Open External Link ↗
                                </Button>
                              </a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-8 text-center space-y-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)]">
                          <ExternalLink className="w-12 h-12 text-[#BE1E2E] mx-auto" />
                          <h3 className="text-base font-extrabold text-[var(--brand-text)]">External Learning Resource</h3>
                          <p className="text-xs text-[var(--text-muted)]">Access interactive external documentation or lab exercise.</p>
                          {(lesson.content as any)?.url && (
                            <a href={(lesson.content as any).url} target="_blank" rel="noreferrer">
                              <Button variant="primary" className="btn-primary text-xs px-6 py-2.5">
                                Open Resource Link ↗
                              </Button>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                /* LIVE SESSION LESSON */
                <div className="p-8 text-center space-y-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)]">
                  <Calendar className="w-12 h-12 text-[#BE1E2E] mx-auto" />
                  <h3 className="text-base font-extrabold text-[var(--brand-text)]">Live Masterclass Session</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Provider: {(lesson.content as any)?.provider || 'Live Stream'}
                  </p>
                  {(lesson.content as any)?.meetingUrl && (
                    <a href={(lesson.content as any).meetingUrl} target="_blank" rel="noreferrer">
                      <Button variant="primary" className="btn-primary text-xs px-6 py-2.5">
                        Join Live Meeting ↗
                      </Button>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Action Controls Bar */}
          <div className="max-w-4xl mx-auto w-full pt-4 border-t border-[var(--brand-border)] flex flex-wrap items-center justify-between gap-4">
            <button
              disabled={!navigation?.hasPrev}
              onClick={() => navigation?.prevLessonId && setActiveLessonId(navigation.prevLessonId)}
              className="px-4 py-2.5 rounded-xl border border-[var(--brand-border)] hover:bg-[var(--bg-surface-elevated)] text-xs font-bold text-[var(--brand-text)] disabled:opacity-40 flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" /> Previous Lesson
            </button>

            <Button
              variant="primary"
              className="btn-primary text-xs px-6 py-3 font-extrabold shadow-lg shadow-[#BE1E2E]/20"
              disabled={completeMutation.isPending || isCompleted}
              onClick={() => completeMutation.mutate(lesson.id)}
            >
              {completeMutation.isPending
                ? 'Saving Progress...'
                : isCompleted
                ? 'Completed ✓'
                : 'Mark Complete & Next ✓'}
            </Button>

            <button
              disabled={!navigation?.hasNext}
              onClick={() => navigation?.nextLessonId && setActiveLessonId(navigation.nextLessonId)}
              className="px-4 py-2.5 rounded-xl border border-[var(--brand-border)] hover:bg-[var(--bg-surface-elevated)] text-xs font-bold text-[var(--brand-text)] disabled:opacity-40 flex items-center gap-1.5"
            >
              Next Lesson <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </main>

        {/* Right Curriculum Sidebar (~30% Desktop / Mobile Drawer) */}
        <aside
          className={`w-80 bg-[var(--bg-surface)] border-l border-[var(--brand-border)] flex flex-col justify-between p-4 overflow-y-auto transition-transform duration-200 ${
            isSidebarOpenMobile ? 'fixed inset-y-0 right-0 z-40 w-full max-w-xs' : 'hidden md:flex'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--brand-border)] pb-3">
              <h3 className="text-sm font-extrabold text-[var(--brand-text)] uppercase font-mono">
                Curriculum
              </h3>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                {allLessons.length} Units
              </span>
            </div>

            <div className="space-y-4">
              {curriculum.map((m, mIdx) => (
                <div key={m.id} className="space-y-2">
                  <div className="text-xs font-bold text-[var(--brand-text)] font-mono flex items-center gap-1.5">
                    <span className="text-[#BE1E2E]">0{mIdx + 1}.</span> {m.title}
                  </div>

                  <div className="space-y-1 pl-3 border-l-2 border-[var(--brand-border)]">
                    {m.lessons.map((l) => {
                      const isSelected = l.id === lesson.id;

                      return (
                        <button
                          key={l.id}
                          onClick={() => {
                            setActiveLessonId(l.id);
                            setIsSidebarOpenMobile(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between gap-2 transition-all ${
                            isSelected
                              ? 'bg-[#BE1E2E]/10 text-[#BE1E2E] font-bold border border-[#BE1E2E]/30'
                              : 'text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {l.isCompleted ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            ) : isSelected ? (
                              <PlayCircle className="w-3.5 h-3.5 text-[#BE1E2E] flex-shrink-0" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border border-[var(--brand-border)] flex-shrink-0" />
                            )}
                            <span className="truncate">{l.title}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Course Completion Celebration Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="glass-card p-8 rounded-3xl border border-emerald-500/40 bg-[var(--bg-surface)] text-center space-y-6 max-w-md w-full shadow-2xl">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/30">
              <Award className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold text-[var(--brand-text)]">
                Masterclass Completed! 🎉
              </h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Congratulations! You have completed all required lessons in <strong>{playerData?.course?.title}</strong>.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Link href="/student" className="w-full">
                <Button variant="primary" className="btn-primary w-full text-xs py-3">
                  Return to Student Dashboard →
                </Button>
              </Link>
              <button
                onClick={() => setShowCompletionModal(false)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--brand-text)] font-mono py-1"
              >
                Continue Reviewing Curriculum
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentCoursePlayerPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[var(--brand-background)] flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="inline-block animate-spin w-8 h-8 border-4 border-[#BE1E2E] border-t-transparent rounded-full" />
          <p className="text-xs font-mono text-[var(--text-muted)]">Initializing learning workspace...</p>
        </div>
      }
    >
      <StudentCoursePlayerContent />
    </React.Suspense>
  );
}

