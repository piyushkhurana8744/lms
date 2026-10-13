'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  GraduationCap,
  Calendar,
  ClipboardCheck,
  IndianRupee,
  Award,
  History,
  Clock,
  AlertCircle,
  Video
} from 'lucide-react';

export default function StudentAcademicProfilePage() {
  const profileQuery = useQuery({
    queryKey: ['student-self-academic-profile'],
    queryFn: async () => {
      const res = await fetch('/api/v1/students/self/profile', { credentials: 'include' });
      const text = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(text);
      } catch {}
      if (!res.ok) throw new Error(json.message || json.error?.message || 'Failed to load profile');
      return json.data;
    }
  });

  const timelineQuery = useQuery({
    queryKey: ['student-self-academic-timeline'],
    queryFn: async () => {
      const res = await fetch('/api/v1/students/self/timeline', { credentials: 'include' });
      const text = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(text);
      } catch {}
      if (!res.ok) throw new Error(json.message || json.error?.message || 'Failed to load timeline');
      return json.data;
    }
  });

  const profile = profileQuery.data;

  if (profileQuery.isLoading) {
    return (
      <div className="p-16 text-center text-zinc-500 flex flex-col items-center justify-center gap-3">
        <Clock className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium">Loading Academic Journey...</p>
      </div>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <div className="p-16 text-center text-rose-600 flex flex-col items-center justify-center gap-3">
        <AlertCircle className="h-8 w-8" />
        <p className="text-base font-semibold">{(profileQuery.error as Error)?.message || 'Unable to load your academic profile'}</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      {/* Profile Header */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-2xl">
              {profile.identity.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{profile.identity.name}</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                Student ID: {profile.lifecycle?.studentNumber || 'Assigned on Activation'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              Standing: {profile.lifecycle?.currentStatus || 'ACTIVE'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Course & Cohort */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Enrolled Course</span>
            <GraduationCap className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100">{profile.academic.course?.title || 'Course'}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">{profile.academic.batch?.name || 'Cohort'}</p>
          </div>
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between text-xs">
            <span className="text-zinc-500">Curriculum Progress</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{profile.academic.progressPercent}%</span>
          </div>
        </div>

        {/* Attendance Summary */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Attendance Standing</span>
            <ClipboardCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {profile.attendance?.attendancePercentage !== null && profile.attendance?.attendancePercentage !== undefined
                ? `${profile.attendance.attendancePercentage}%`
                : '100%'}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {profile.attendance?.attended || 0} Attended of {profile.attendance?.totalFinalizedEligibleSessions || 0} Sessions
            </p>
          </div>
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between text-xs text-zinc-500">
            <span>Present: {profile.attendance?.present || 0}</span>
            <span>Late: {profile.attendance?.late || 0}</span>
            <span>Absent: {profile.attendance?.absent || 0}</span>
          </div>
        </div>

        {/* Credentials */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Earned Credentials</span>
            <Award className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {profile.credentials.length ? `${profile.credentials.length} Certificate(s)` : 'In Progress'}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {profile.credentials[0]?.certificateNumber || 'Complete all modules to graduate'}
            </p>
          </div>
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between text-xs">
            <span className="text-zinc-500">Graduation Status</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {profile.academic.progressPercent === 100 ? 'Completed' : 'Active Learner'}
            </span>
          </div>
        </div>
      </div>

      {/* Upcoming Classes */}
      {profile.upcomingClasses && profile.upcomingClasses.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Video className="h-5 w-5 text-indigo-600" />
            Upcoming Class Schedule
          </h2>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {profile.upcomingClasses.map((cls: any) => (
              <div key={cls.id} className="py-3 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{cls.name}</h4>
                  <p className="text-xs text-zinc-500">
                    {new Date(cls.startDate).toLocaleDateString()} • {cls.timing?.startTime || '10:00 AM'} - {cls.timing?.endTime || '12:00 PM'} ({cls.mode})
                  </p>
                </div>
                {cls.meetingUrl && (
                  <a
                    href={cls.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Join Class
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Academic Journey Timeline */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-6">
          <History className="h-5 w-5 text-indigo-600" />
          Academic Journey Milestones
        </h2>

        {timelineQuery.isLoading ? (
          <p className="text-sm text-zinc-500">Loading milestones...</p>
        ) : (timelineQuery.data || []).length === 0 ? (
          <p className="text-sm text-zinc-500 italic">No milestone events recorded yet.</p>
        ) : (
          <div className="relative pl-6 border-l-2 border-zinc-200 dark:border-zinc-800 space-y-6">
            {timelineQuery.data.map((event: any) => (
              <div key={event.id} className="relative">
                <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full bg-indigo-600 border-2 border-white dark:border-zinc-900" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{event.eventType}</span>
                  <span className="text-xs text-zinc-400">{new Date(event.effectiveAt).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">{event.reason || 'Milestone achieved'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
