'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/auth-provider';
import { ICourse, IOrganizationLaunchReadinessResponse } from '@edtech/types';
import { Button } from '@edtech/ui';
import { getPublicSiteUrl } from '@/lib/public-site-url';
import {
  BookOpen,
  Layers,
  Building2,
  PlusCircle,
  FolderKanban,
  Image as ImageIcon,
  Palette,
  Globe,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Circle,
  ExternalLink,
  Rocket,
  Sparkles,
  ChevronRight,
  Users,
  CreditCard,
  BarChart3,
  ShieldAlert
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { user, hasPermission } = useAuth();
  const canCreateCourse = hasPermission('course.create');
  const canViewCourses = hasPermission('course.view');
  const canViewLaunchReadiness = hasPermission('organization.settings.update');

  // Fetch real workspace courses from API
  const { data: coursesData, isLoading: isCoursesLoading } = useQuery({
    queryKey: ['admin-dashboard-courses'],
    enabled: !!user && canViewCourses,
    queryFn: async () => {
      const res = await fetch('/api/v1/courses?limit=5');
      if (res.status === 401 || res.status === 403) return { data: [], meta: { total: 0 } };
      if (!res.ok) throw new Error('Failed to fetch courses');
      return res.json();
    }
  });

  // Fetch Launch Readiness status from API
  const { data: readinessData, isLoading: isReadinessLoading } = useQuery<IOrganizationLaunchReadinessResponse>({
    queryKey: ['organization-launch-readiness'],
    enabled: !!user && canViewLaunchReadiness,
    queryFn: async () => {
      const res = await fetch('/api/v1/organization/launch/readiness');
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    }
  });

  const courses: ICourse[] = coursesData?.data || [];
  const totalCoursesCount = coursesData?.meta?.total ?? courses.length;
  const publicSiteUrl = getPublicSiteUrl({ slug: user?.tenantId });

  const orgStatus = readinessData?.organizationStatus || 'SETUP';
  const isLive = orgStatus === 'LIVE';
  const completionPercentage = readinessData?.completionPercentage ?? 0;
  const checks = readinessData?.checks || [];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[var(--brand-border)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#BE1E2E] bg-[#BE1E2E]/10 px-2.5 py-1 rounded-full border border-[#BE1E2E]/20 flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3 h-3" /> DIDM Enterprise Console
            </span>
            <span className="text-[10px] font-mono font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Workspace Overview
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--brand-text)] font-heading">
            Welcome back, <span className="bg-gradient-to-r from-[var(--brand-text)] via-[var(--brand-text)] to-[#BE1E2E] bg-clip-text text-transparent">{user?.name || 'Admin'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 max-w-2xl leading-relaxed">
            Manage your academic curriculum, verified branches, CRM pipelines, media vault, and live public storefront.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <a
            href={publicSiteUrl}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2.5 text-xs font-bold bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] hover:border-[#BE1E2E]/50 text-[var(--brand-text)] rounded-xl transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 group"
          >
            <Globe className="w-3.5 h-3.5 text-[#BE1E2E] group-hover:rotate-12 transition-transform" />
            <span>Visit Storefront</span>
            <ExternalLink className="w-3 h-3 text-[var(--text-muted)]" />
          </a>

          {canCreateCourse && (
            <Link href="/admin/courses/create">
              <Button variant="primary" className="btn-primary text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-[#BE1E2E]/25 flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition-all">
                <PlusCircle className="w-4 h-4" />
                <span>Create New Course</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* 4J Launch Readiness Card */}
      <div className="glass-card-premium p-6 md:p-8 rounded-3xl border border-[#BE1E2E]/30 bg-gradient-to-r from-[#BE1E2E]/10 via-[var(--bg-surface)] to-[var(--bg-surface-elevated)] space-y-6 shadow-2xl relative overflow-hidden group">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#BE1E2E]/10 rounded-full blur-3xl pointer-events-none group-hover:bg-[#BE1E2E]/15 transition-all" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {isLive ? (
                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5" /> SYSTEM STATUS: LIVE 🚀
                </span>
              ) : orgStatus === 'READY' ? (
                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/25 flex items-center gap-1.5 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" /> STATUS: READY TO LAUNCH
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase bg-amber-500/10 text-amber-500 border border-amber-500/25 flex items-center gap-1.5 shadow-sm">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> STATUS: SETUP IN PROGRESS ({orgStatus})
                </span>
              )}
              <span className="text-xs font-mono text-[var(--text-muted)]">Launch Readiness Engine</span>
            </div>

            <h2 className="text-2xl font-black text-[var(--brand-text)] flex items-center gap-2.5 font-heading">
              <Rocket className="w-6 h-6 text-[#BE1E2E]" />
              <span>{isLive ? 'Your LMS Organization is Live' : 'Organization Launch Readiness'}</span>
            </h2>

            <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-2xl leading-relaxed">
              {isLive
                ? 'Your organization is live. Public storefront visitors can explore verified programs, apply for admissions, and access student portals.'
                : 'Evaluate system infrastructure readiness across storage, custom domain, branding, payment gateways, and curriculum before going live.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end justify-between gap-4 flex-shrink-0">
            <div className="text-left md:text-right">
              <span className="text-3xl sm:text-4xl font-black text-[#BE1E2E] tracking-tight">{completionPercentage}%</span>
              <span className="text-xs text-[var(--text-muted)] block font-mono">Infrastructure Ready</span>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/admin/organization">
                <Button variant="secondary" className="text-xs px-3.5 py-2 rounded-xl border border-[var(--brand-border)] hover:bg-[var(--bg-surface-elevated)] transition-colors">
                  View Setup
                </Button>
              </Link>

              {!isLive && (
                <Link href="/admin/organization">
                  <Button variant="primary" className="btn-primary text-xs px-4 py-2 rounded-xl shadow-lg shadow-[#BE1E2E]/25 flex items-center gap-1.5">
                    <Rocket className="w-3.5 h-3.5 text-white" /> Launch LMS
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Readiness Checks Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3 border-t border-[var(--brand-border)]/70 relative z-10">
          {checks.map((check) => (
            <div
              key={check.key}
              className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-2 transition-all ${
                check.completed
                  ? 'bg-emerald-500/5 border-emerald-500/25 text-emerald-600 dark:text-emerald-400'
                  : check.status === 'OPTIONAL'
                  ? 'bg-[var(--bg-surface-elevated)]/70 border-[var(--brand-border)] text-[var(--text-muted)]'
                  : 'bg-amber-500/5 border-amber-500/25 text-amber-600 dark:text-amber-400'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                {check.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                ) : check.status === 'OPTIONAL' ? (
                  <Circle className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                )}
                <span className="font-bold truncate text-[11px]">{check.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions Grid */}
      {(() => {
        const canViewCourses = hasPermission('course.view');
        const canBuildCurriculum = hasPermission('course.module.view') || hasPermission('course.view');
        const canViewMedia = hasPermission('media.view');
        const canViewCms = hasPermission('organization.website.view') || hasPermission('website.settings.view');

        const quickActions = [
          ...(canCreateCourse
            ? [
                {
                  title: 'Create Course',
                  description: 'Add masterclass',
                  href: '/admin/courses/create',
                  icon: PlusCircle,
                  color: 'bg-[#BE1E2E]/10 text-[#BE1E2E]',
                  hoverBorder: 'hover:border-[#BE1E2E]/50'
                }
              ]
            : []),
          ...(canViewCourses
            ? [
                {
                  title: 'Manage Courses',
                  description: 'Catalog & batches',
                  href: '/admin/courses',
                  icon: BookOpen,
                  color: 'bg-blue-500/10 text-blue-500',
                  hoverBorder: 'hover:border-blue-500/50'
                }
              ]
            : []),
          ...(canBuildCurriculum
            ? [
                {
                  title: 'Curriculum Builder',
                  description: 'Modules & lessons',
                  href: '/admin/courses',
                  icon: FolderKanban,
                  color: 'bg-purple-500/10 text-purple-400',
                  hoverBorder: 'hover:border-purple-500/50'
                }
              ]
            : []),
          ...(canViewMedia
            ? [
                {
                  title: 'Media Vault',
                  description: 'Videos, PDFs & docs',
                  href: '/admin/media',
                  icon: ImageIcon,
                  color: 'bg-amber-500/10 text-amber-400',
                  hoverBorder: 'hover:border-amber-500/50'
                }
              ]
            : []),
          ...(canViewCms
            ? [
                {
                  title: 'Website CMS',
                  description: 'Landing & pages',
                  href: '/admin/cms',
                  icon: Palette,
                  color: 'bg-emerald-500/10 text-emerald-400',
                  hoverBorder: 'hover:border-emerald-500/50'
                }
              ]
            : []),
          {
            title: 'Storefront',
            description: 'Public student portal',
            href: publicSiteUrl,
            icon: Globe,
            color: 'bg-indigo-500/10 text-indigo-400',
            hoverBorder: 'hover:border-indigo-500/50',
            external: true
          }
        ];

        return (
          <div className="space-y-3">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Admin Quick Actions
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {quickActions.map((action, idx) => {
                const Icon = action.icon;
                const Content = (
                  <div className={`glass-card p-4 rounded-2xl border border-[var(--brand-border)] ${action.hoverBorder} hover:-translate-y-1 hover:shadow-xl transition-all text-center space-y-2 group cursor-pointer h-full flex flex-col items-center justify-center`}>
                    <div
                      className={`w-11 h-11 rounded-2xl ${action.color} flex items-center justify-center mx-auto group-hover:scale-110 transition-transform shadow-inner`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-[var(--brand-text)] block group-hover:text-[#BE1E2E] transition-colors">
                        {action.title}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono block">
                        {action.description}
                      </span>
                    </div>
                  </div>
                );

                if (action.external) {
                  return (
                    <a key={idx} href={action.href} target="_blank" rel="noreferrer" className="block">
                      {Content}
                    </a>
                  );
                }
                return (
                  <Link key={idx} href={action.href} className="block">
                    {Content}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Summary Metrics Cards */}
      <div className="space-y-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Workspace Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 rounded-2xl border border-[var(--brand-border)] hover:border-[#BE1E2E]/40 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider">Courses</span>
              <div className="p-2 rounded-xl bg-[#BE1E2E]/10 text-[#BE1E2E]">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-[var(--brand-text)] tracking-tight font-heading">
              {isCoursesLoading ? '...' : totalCoursesCount}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] font-mono">Active workspace catalog</p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-[var(--brand-border)] hover:border-amber-500/40 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider">Curriculum</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-[var(--brand-text)] tracking-tight font-heading">Active</p>
            <p className="text-[11px] text-[var(--text-muted)] font-mono">Modules, Lessons & Quizzes</p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-[var(--brand-border)] hover:border-purple-500/40 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider">Media Vault</span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <ImageIcon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-[var(--brand-text)] tracking-tight font-heading">Cloud Vault</p>
            <p className="text-[11px] text-[var(--text-muted)] font-mono">Videos, PDFs & Audio Docs</p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-[var(--brand-border)] hover:border-blue-500/40 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider">Tenant Scope</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-lg font-black text-[var(--brand-text)] truncate font-heading">
              {user?.tenantId ? `Tenant (${user.tenantId.slice(0, 8)})` : 'DIDM Main Workspace'}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] font-mono">Multi-tenant isolation active</p>
          </div>
        </div>
      </div>

      {/* Recent Courses Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--brand-text)] font-heading">Recent Workspace Courses</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Direct access to course curriculum builder, lesson management, and publishing readiness
            </p>
          </div>
          <Link href="/admin/courses" className="text-xs font-bold text-[#BE1E2E] hover:underline flex items-center gap-1 font-mono">
            View All Courses <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isCoursesLoading ? (
          <div className="glass-card p-10 text-center text-xs text-[var(--text-muted)] font-mono space-y-3">
            <div className="w-6 h-6 border-2 border-[#BE1E2E] border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Loading course catalog...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="glass-card p-12 text-center space-y-4 rounded-3xl border border-[var(--brand-border)]">
            <div className="w-12 h-12 rounded-2xl bg-[#BE1E2E]/10 text-[#BE1E2E] flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-bold text-[var(--brand-text)]">No courses created yet</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Create your first masterclass to populate your educational catalog.
              </p>
            </div>
            {canCreateCourse && (
              <Link href="/admin/courses/create">
                <Button variant="primary" className="btn-primary text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-[#BE1E2E]/20">
                  + Create First Course
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map((course) => {
              const cId = course.id || (course as any)._id;
              return (
                <div
                  key={cId}
                  className="glass-card p-5 rounded-2xl border border-[var(--brand-border)] flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#BE1E2E]/40 hover:shadow-lg transition-all"
                >
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-extrabold truncate text-[var(--brand-text)]">{course.title}</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] border border-[var(--brand-border)]">
                        {course.level}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                        course.status === 'PUBLISHED'
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}>
                        {course.status}
                      </span>
                    </div>
                    {course.description && (
                      <p className="text-xs text-[var(--text-muted)] line-clamp-1 max-w-3xl">{course.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <Link href={`/admin/courses/${cId}/curriculum`}>
                      <button className="px-4 py-2 text-xs font-extrabold bg-[#BE1E2E] text-white rounded-xl hover:bg-[#a01826] transition-all shadow-md shadow-[#BE1E2E]/20 flex items-center gap-1.5">
                        <FolderKanban className="w-3.5 h-3.5" />
                        <span>Curriculum Builder</span>
                      </button>
                    </Link>
                    <Link href={`/admin/courses/${cId}`}>
                      <button className="px-3.5 py-2 text-xs font-semibold border border-[var(--brand-border)] rounded-xl hover:bg-[var(--bg-surface-elevated)] text-[var(--brand-text)] transition-colors">
                        Details
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
