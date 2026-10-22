'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { usePublicBrand } from '@/components/public/PublicBrandProvider';
import { CourseGrid } from '@/components/public/CourseGrid';
import { CourseGridSkeleton } from '@/components/public/PublicSkeleton';
import { PublicEmptyState } from '@/components/public/PublicEmptyState';
import { PublicErrorState } from '@/components/public/PublicErrorState';
import { Button } from '@edtech/ui';
import {
  Sparkles,
  BookOpen,
  ArrowRight,
  Layers,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  Award,
  Users,
  Star,
  PlayCircle,
  TrendingUp,
  Search,
  Clock,
  Globe,
  GraduationCap,
  Calendar,
  FileCheck,
  Zap,
  Check,
  ChevronRight,
  Shield,
  BarChart3
} from 'lucide-react';
import { IPublicWebsiteConfig } from '@edtech/types';

export default function PublicHomePage() {
  const router = useRouter();
  const brand = usePublicBrand();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [verifyCodeInput, setVerifyCodeInput] = useState('');

  // Query published CMS website configuration
  const { data: websiteData } = useQuery<IPublicWebsiteConfig>({
    queryKey: ['public-website-cms'],
    queryFn: async () => {
      const res = await fetch('/api/v1/public/website');
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    }
  });

  // Query public courses
  const { data: coursesData, isLoading, isError, error } = useQuery({
    queryKey: ['public-featured-courses'],
    meta: { skipGlobalError: true },
    queryFn: async () => {
      const res = await fetch('/api/v1/public/courses?limit=12');
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    }
  });

  const featuredCoursesFromCms = websiteData?.homepage?.featuredCourses;
  const rawCourses = useMemo(() => {
    return (featuredCoursesFromCms && featuredCoursesFromCms.length > 0)
      ? featuredCoursesFromCms
      : (coursesData || []);
  }, [featuredCoursesFromCms, coursesData]);

  // Filtered courses based on category & search
  const filteredCourses = useMemo(() => {
    return rawCourses.filter((course: any) => {
      const matchesSearch =
        !searchQuery.trim() ||
        course.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.shortDescription?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        selectedCategory === 'ALL' ||
        (course.category && course.category.toLowerCase() === selectedCategory.toLowerCase()) ||
        (selectedCategory === 'MARKETING' && (course.title?.toLowerCase().includes('marketing') || course.title?.toLowerCase().includes('seo') || course.title?.toLowerCase().includes('ads'))) ||
        (selectedCategory === 'TECH' && (course.title?.toLowerCase().includes('web') || course.title?.toLowerCase().includes('dev') || course.title?.toLowerCase().includes('code') || course.title?.toLowerCase().includes('tech'))) ||
        (selectedCategory === 'BUSINESS' && (course.title?.toLowerCase().includes('business') || course.title?.toLowerCase().includes('leadership') || course.title?.toLowerCase().includes('analytics')));

      return matchesSearch && matchesCat;
    });
  }, [rawCourses, searchQuery, selectedCategory]);

  const categories = [
    { id: 'ALL', label: 'All Programs' },
    { id: 'MARKETING', label: 'Digital Marketing & Growth' },
    { id: 'TECH', label: 'Fullstack & Tech' },
    { id: 'BUSINESS', label: 'Business & Analytics' }
  ];

  const hero = websiteData?.hero;
  const about = websiteData?.about;
  const cta = websiteData?.homepage ? (websiteData as any).homepage?.cta : undefined;
  const contact = websiteData?.contact;

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCodeInput.trim()) return;
    router.push(`/verify/certificate/${encodeURIComponent(verifyCodeInput.trim())}`);
  };

  return (
    <div className="relative overflow-hidden space-y-20 sm:space-y-28 pb-24">
      {/* Background Decorative Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="glow-orb-primary absolute -top-48 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-[140px] opacity-35" />
        <div className="glow-orb-secondary absolute top-[800px] -right-48 w-[500px] h-[500px] rounded-full blur-[140px] opacity-25" />
        <div className="glow-orb-primary absolute top-[1800px] -left-48 w-[500px] h-[500px] rounded-full blur-[140px] opacity-25" />
      </div>

      {/* ========================================================
          1. HERO SECTION (High-Impact Modern LMS Hero)
         ======================================================== */}
      {hero?.enabled !== false && (
        <section className="relative z-10 max-w-7xl mx-auto px-6 pt-12 sm:pt-20 lg:pt-24">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 text-center lg:text-left space-y-6">
              {/* Modern Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#BE1E2E]/10 border border-[#BE1E2E]/25 text-[#BE1E2E] text-xs font-bold tracking-wide shadow-sm hover:scale-[1.02] transition-transform">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#BE1E2E] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#BE1E2E]"></span>
                </span>
                <span>{hero?.eyebrow || `${brand.branding?.companyName || brand.name} • 2026 Next-Gen LMS Platform`}</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[var(--brand-text)] leading-[1.08]">
                Master In-Demand Skills.{' '}
                <span className="gradient-text block mt-1">Accelerate Your Career.</span>
              </h1>

              {/* Subtitle */}
              <p className="max-w-2xl mx-auto lg:mx-0 text-sm sm:text-base text-[var(--text-muted)] leading-relaxed font-normal">
                {hero?.subtitle ||
                  'Empowering students, professionals, and teams with structured modular courses, live cohort sessions, interactive quizzes, and cryptographically verified digital credentials.'}
              </p>

              {/* Dual Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                {hero?.primaryButton?.enabled !== false && (
                  <Link href={hero?.primaryButton?.href || '/courses'} className="w-full sm:w-auto">
                    <Button
                      variant="primary"
                      className="btn-primary w-full sm:w-auto text-sm px-7 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-[#BE1E2E]/25 group hover:-translate-y-0.5 transition-all"
                    >
                      <span>{hero?.primaryButton?.label || 'Explore All Courses'}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                )}

                <Link href="/batches" className="w-full sm:w-auto">
                  <button className="w-full sm:w-auto px-6 py-3.5 text-sm font-bold border border-[var(--brand-border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-elevated)] rounded-xl transition-all text-[var(--brand-text)] flex items-center justify-center gap-2 shadow-sm hover:border-[#BE1E2E]/40">
                    <Calendar className="w-4 h-4 text-[#BE1E2E]" />
                    <span>View Upcoming Batches</span>
                  </button>
                </Link>
              </div>

              {/* Trust Badge & Student Avatars */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 text-xs text-[var(--text-muted)]">
                <div className="flex -space-x-2 overflow-hidden">
                  <img
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-[var(--bg-surface)] object-cover"
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                    alt="Student"
                  />
                  <img
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-[var(--bg-surface)] object-cover"
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                    alt="Student"
                  />
                  <img
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-[var(--bg-surface)] object-cover"
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80"
                    alt="Student"
                  />
                  <img
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-[var(--bg-surface)] object-cover"
                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80"
                    alt="Student"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex text-amber-400">
                    {'★★★★★'.split('').map((s, i) => (
                      <span key={i} className="text-xs">★</span>
                    ))}
                  </div>
                  <span className="font-semibold text-[var(--brand-text)]">4.9/5</span>
                  <span>from 45,000+ graduates</span>
                </div>
              </div>
            </div>

            {/* Right Interactive Dashboard Mockup Visual */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Main Interactive Preview Card */}
                <div className="glass-card rounded-3xl p-5 border border-[var(--brand-border)] bg-[var(--bg-surface)] shadow-2xl space-y-4 relative z-10 hover:shadow-3xl transition-shadow">
                  {/* Top Window Bar */}
                  <div className="flex items-center justify-between border-b border-[var(--brand-border)] pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className="text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-1 font-semibold">
                      <GraduationCap className="w-3.5 h-3.5 text-[#BE1E2E]" /> Active Learning Portal
                    </span>
                  </div>

                  {/* Active Lesson Video Card */}
                  <div className="relative rounded-2xl overflow-hidden aspect-video bg-slate-900 flex items-center justify-center group cursor-pointer">
                    <img
                      src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80"
                      alt="LMS Preview"
                      className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="w-12 h-12 rounded-full bg-[#BE1E2E] text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform relative z-10">
                      <PlayCircle className="w-6 h-6 fill-white text-[#BE1E2E]" />
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs z-10">
                      <div>
                        <span className="font-bold block text-sm">Module 4: Performance Marketing</span>
                        <span className="text-[10px] text-white/80">Lesson 3 of 12 • 45m remaining</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 backdrop-blur-md">
                        HD 1080p
                      </span>
                    </div>
                  </div>

                  {/* Progress & Milestone Bar */}
                  <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[var(--brand-text)] flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-[#BE1E2E]" /> Course Milestone Progress
                      </span>
                      <span className="font-mono font-bold text-[#BE1E2E]">82%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[var(--brand-border)] overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#BE1E2E] to-red-400 rounded-full w-[82%]" />
                    </div>
                  </div>

                  {/* Badges strip */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span className="text-[11px] font-bold">Quiz Passed: 96%</span>
                    </div>
                    <div className="p-2.5 rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center gap-2">
                      <Award className="w-4 h-4 flex-shrink-0" />
                      <span className="text-[11px] font-bold">Certificate Ready</span>
                    </div>
                  </div>
                </div>

                {/* Floating Floating Pill: Verified Credential Sticker */}
                <div className="absolute -bottom-6 -left-6 z-20 hidden sm:flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-xl">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-[var(--brand-text)] block">
                      Cryptographically Verified
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                      Instant QR & Public Ledger
                    </span>
                  </div>
                </div>

                {/* Floating Streak Metric */}
                <div className="absolute -top-6 -right-6 z-20 hidden sm:flex items-center gap-2.5 p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-xl">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] text-[var(--text-muted)] block font-mono">Streak</span>
                    <span className="text-xs font-black text-[var(--brand-text)]">🔥 14 Days Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================
          2. METRICS & IMPACT STATS RIBBON
         ======================================================== */}
      <section className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-sm hover:border-[#BE1E2E]/30 transition-all text-center space-y-1">
            <div className="w-10 h-10 rounded-2xl bg-[#BE1E2E]/10 text-[#BE1E2E] flex items-center justify-center mx-auto mb-3">
              <Users className="w-5 h-5" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[var(--brand-text)] tracking-tight">50,000+</div>
            <div className="text-xs font-semibold text-[var(--text-muted)]">Students Enrolled</div>
          </div>

          <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-sm hover:border-[#BE1E2E]/30 transition-all text-center space-y-1">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3">
              <Star className="w-5 h-5" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[var(--brand-text)] tracking-tight">4.9 / 5.0</div>
            <div className="text-xs font-semibold text-[var(--text-muted)]">Average Course Rating</div>
          </div>

          <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-sm hover:border-[#BE1E2E]/30 transition-all text-center space-y-1">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[var(--brand-text)] tracking-tight">98.4%</div>
            <div className="text-xs font-semibold text-[var(--text-muted)]">Module Completion Rate</div>
          </div>

          <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-sm hover:border-[#BE1E2E]/30 transition-all text-center space-y-1">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center mx-auto mb-3">
              <Award className="w-5 h-5" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[var(--brand-text)] tracking-tight">100%</div>
            <div className="text-xs font-semibold text-[var(--text-muted)]">Verified Digital Credentials</div>
          </div>
        </div>
      </section>

      {/* ========================================================
          3. FEATURED COURSES & CATEGORY DISCOVERY
         ======================================================== */}
      {websiteData?.homepage?.showFeaturedCourses !== false && (
        <section className="relative z-10 max-w-7xl mx-auto px-6 space-y-8">
          {/* Header & Filter Controls */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[var(--brand-border)] pb-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#BE1E2E]">
                <BookOpen className="w-3.5 h-3.5" /> Featured Curriculum
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[var(--brand-text)] tracking-tight">
                Explore Top-Rated Programs
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                Structured career tracks led by industry mentors with real-world case studies.
              </p>
            </div>

            <Link
              href="/courses"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#BE1E2E] hover:underline font-mono"
            >
              <span>View Full Catalog ({rawCourses.length} Courses)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Category Tabs & Quick Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-[#BE1E2E] text-white shadow-md shadow-[#BE1E2E]/20'
                      : 'bg-[var(--bg-surface)] border border-[var(--brand-border)] text-[var(--text-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Instant Filter Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Filter courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-[var(--bg-surface)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:border-[#BE1E2E]"
              />
            </div>
          </div>

          {/* Course Grid */}
          {isLoading ? (
            <CourseGridSkeleton count={4} />
          ) : isError ? (
            <PublicErrorState message={(error as any)?.message} />
          ) : filteredCourses.length === 0 ? (
            <div className="py-16 text-center rounded-3xl border border-dashed border-[var(--brand-border)] bg-[var(--bg-surface)] space-y-3">
              <BookOpen className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
              <h3 className="text-sm font-bold text-[var(--brand-text)]">No matching courses found</h3>
              <p className="text-xs text-[var(--text-muted)]">Try adjusting your search terms or category selection.</p>
              <button
                onClick={() => {
                  setSelectedCategory('ALL');
                  setSearchQuery('');
                }}
                className="text-xs font-bold text-[#BE1E2E] hover:underline"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <CourseGrid courses={filteredCourses} />
          )}
        </section>
      )}

      {/* ========================================================
          4. BENTO GRID: WHY THIS IS THE BEST LMS EXPERIENCE
         ======================================================== */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#BE1E2E]">
            Engineered For Excellence
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[var(--brand-text)] tracking-tight">
            Everything You Need to Succeed in One Unified Platform
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">
            Built from the ground up for deep engagement, zero friction, and verified learning outcomes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Modular Video Lessons (Spans 2 cols on md) */}
          <div className="md:col-span-2 p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-sm hover:shadow-xl transition-shadow flex flex-col justify-between space-y-6 relative overflow-hidden group">
            <div className="space-y-3 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-[#BE1E2E]/10 text-[#BE1E2E] flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[var(--brand-text)]">
                Structured Modular Hierarchy & Interactive Lessons
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed max-w-xl">
                Learn with high-definition video streaming, searchable transcriptions, downloadable lesson artifacts, rich reading materials, and embedded progress checkpoints that save your place automatically.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[var(--brand-border)] relative z-10">
              <div className="p-3 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-center">
                <span className="text-xs font-extrabold text-[var(--brand-text)] block">HD Video</span>
                <span className="text-[10px] text-[var(--text-muted)]">Adaptive Streaming</span>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-center">
                <span className="text-xs font-extrabold text-[var(--brand-text)] block">Rich Notes</span>
                <span className="text-[10px] text-[var(--text-muted)]">PDF & Code Snippets</span>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-center">
                <span className="text-xs font-extrabold text-[var(--brand-text)] block">Checkpoints</span>
                <span className="text-[10px] text-[var(--text-muted)]">Auto-Resume Sync</span>
              </div>
            </div>
          </div>

          {/* Card 2: Cryptographic Credentials */}
          <div className="p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-sm hover:shadow-xl transition-shadow flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[var(--brand-text)]">
                Verifiable Credentials
              </h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Tamper-proof digital certificates backed by instant QR verification and public authentication registries that employers can trust.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3">
              <Award className="w-8 h-8 text-emerald-500 flex-shrink-0" />
              <div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                  1-Click LinkedIn Add
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">Instant credential sharing</span>
              </div>
            </div>
          </div>

          {/* Card 3: Live Cohorts & Batches */}
          <div className="p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-sm hover:shadow-xl transition-shadow flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[var(--brand-text)]">
                Live Batches & Mentorship
              </h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Join live scheduled classes, interactive Q&A sessions with veteran practitioners, and collaborative student cohorts.
              </p>
            </div>

            <Link href="/batches" className="text-xs font-bold text-[#BE1E2E] flex items-center gap-1 hover:underline">
              <span>View Active Timetables</span> <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 4: Quizzes & Assessment Engine (Spans 2 cols on md) */}
          <div className="md:col-span-2 p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-sm hover:shadow-xl transition-shadow flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[var(--brand-text)]">
                Adaptive Assessments & Real-Time Analytics
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed max-w-xl">
                Test your mastery with timed quizzes, interactive knowledge checks, instant score telemetry, and comprehensive answer explanations after each submission.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-xs font-semibold text-[var(--brand-text)]">
                <Check className="w-3.5 h-3.5 text-emerald-500" /> Timed Practice Exams
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-xs font-semibold text-[var(--brand-text)]">
                <Check className="w-3.5 h-3.5 text-emerald-500" /> Instant Performance Breakdown
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-xs font-semibold text-[var(--brand-text)]">
                <Check className="w-3.5 h-3.5 text-emerald-500" /> Retake & Remediation Support
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          5. 3-STEP LEARNING PATHWAY (How It Works)
         ======================================================== */}
      <section className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="p-8 sm:p-12 rounded-3xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-xl space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#BE1E2E]">Simple 3-Step Journey</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--brand-text)]">
              How Your Learning Journey Unfolds
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)]">
              A transparent, streamlined pathway designed to take you from fundamentals to verified mastery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="space-y-4 text-center md:text-left relative">
              <div className="w-12 h-12 rounded-2xl bg-[#BE1E2E] text-white font-black text-lg flex items-center justify-center shadow-lg shadow-[#BE1E2E]/25 mx-auto md:mx-0">
                01
              </div>
              <h3 className="text-base font-bold text-[var(--brand-text)]">Enroll & Choose Your Track</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Browse our curated programs, explore free preview chapters, and join at your own pace or via scheduled live cohorts.
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-4 text-center md:text-left relative">
              <div className="w-12 h-12 rounded-2xl bg-[#BE1E2E] text-white font-black text-lg flex items-center justify-center shadow-lg shadow-[#BE1E2E]/25 mx-auto md:mx-0">
                02
              </div>
              <h3 className="text-base font-bold text-[var(--brand-text)]">Practice & Pass Checkpoints</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Complete structured video modules, download study guides, and test your knowledge through module quizzes and live projects.
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-4 text-center md:text-left relative">
              <div className="w-12 h-12 rounded-2xl bg-[#BE1E2E] text-white font-black text-lg flex items-center justify-center shadow-lg shadow-[#BE1E2E]/25 mx-auto md:mx-0">
                03
              </div>
              <h3 className="text-base font-bold text-[var(--brand-text)]">Earn Verified Digital Credential</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Receive an official, tamper-proof certificate complete with unique ID, public verification code, and instant PDF download.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          6. INSTANT CERTIFICATE VERIFICATION TOOL
         ======================================================== */}
      <section className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="glass-card p-8 sm:p-10 rounded-3xl border border-[var(--brand-border)] bg-[var(--bg-surface)] shadow-lg flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-2 text-center lg:text-left max-w-xl">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              <ShieldCheck className="w-4 h-4" /> Public Credential Registry
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-[var(--brand-text)]">
              Verify Any Issued Certificate Instantly
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Employers, students, and institutions can check the authenticity of any credential in real-time.
            </p>
          </div>

          <form onSubmit={handleVerifySubmit} className="w-full lg:w-auto flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Enter Verification Code or ID..."
              value={verifyCodeInput}
              onChange={(e) => setVerifyCodeInput(e.target.value)}
              className="px-4 py-3 rounded-xl text-xs bg-[var(--brand-background)] border border-[var(--brand-border)] text-[var(--brand-text)] font-mono focus:outline-none focus:border-[#BE1E2E] min-w-[280px]"
            />
            <Button
              type="submit"
              variant="primary"
              disabled={!verifyCodeInput.trim()}
              className="btn-primary text-xs px-6 py-3 font-bold rounded-xl shadow-md shadow-[#BE1E2E]/20 flex items-center justify-center gap-1.5 flex-shrink-0"
            >
              <ShieldCheck className="w-4 h-4" /> Verify Now
            </Button>
          </form>
        </div>
      </section>

      {/* ========================================================
          7. ABOUT ACADEMY SECTION (If configured in CMS)
         ======================================================== */}
      {websiteData?.homepage?.showAbout !== false && about && (about.title || about.description) && (
        <section className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="glass-card p-8 md:p-12 rounded-3xl border border-[var(--brand-border)] space-y-6">
            <div className="max-w-3xl mx-auto text-center space-y-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#BE1E2E]">About Our Academy</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--brand-text)]">
                {about.title || 'About Our Academy'}
              </h2>
              {about.description && (
                <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                  {about.description}
                </p>
              )}
            </div>

            {about.imageUrl && (
              <div className="max-w-2xl mx-auto rounded-2xl overflow-hidden border border-[var(--brand-border)] shadow-xl">
                <img src={about.imageUrl} alt={about.title || 'About'} className="w-full max-h-96 object-cover" />
              </div>
            )}
          </div>
        </section>
      )}

      {/* ========================================================
          8. HIGH-CONVERTING BOTTOM CTA BANNER
         ======================================================== */}
      <section className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="relative rounded-3xl border border-[#BE1E2E]/30 bg-gradient-to-br from-[#BE1E2E]/15 via-[var(--bg-surface)] to-[var(--bg-surface)] p-8 sm:p-14 shadow-2xl overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-[#BE1E2E]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-3 text-center md:text-left relative z-10 max-w-xl">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#BE1E2E]">
              Get Started Today
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[var(--brand-text)] tracking-tight">
              {cta?.title || 'Ready to Transform Your Career?'}
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
              {cta?.description ||
                'Join thousands of motivated professionals gaining real-world expertise and earning recognized certifications.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 relative z-10 w-full md:w-auto">
            <Link href={cta?.buttonUrl || '/courses'} className="w-full sm:w-auto">
              <Button
                variant="primary"
                className="btn-primary w-full sm:w-auto text-xs sm:text-sm px-8 py-3.5 rounded-xl font-bold shadow-xl shadow-[#BE1E2E]/25 flex items-center justify-center gap-2 group"
              >
                <span>{cta?.buttonLabel || 'Browse All Courses'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            <Link href="/contact" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto px-6 py-3.5 text-xs sm:text-sm font-semibold border border-[var(--brand-border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-elevated)] rounded-xl transition-colors text-[var(--brand-text)]">
                Contact Admissions
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================
          9. CONTACT & INSTITUTIONAL FOOTPRINT
         ======================================================== */}
      {websiteData?.homepage?.showContact !== false && contact && (contact.email || contact.phone || contact.address) && (
        <section className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-4">
            <h3 className="text-sm font-bold uppercase font-mono tracking-wider text-[#BE1E2E]">
              Direct Assistance & Support
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
              {contact.email && (
                <div className="flex items-center gap-3 text-[var(--brand-text)]">
                  <div className="w-8 h-8 rounded-xl bg-[#BE1E2E]/10 text-[#BE1E2E] flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block font-mono">Email Us</span>
                    <span className="font-semibold">{contact.email}</span>
                  </div>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-3 text-[var(--brand-text)]">
                  <div className="w-8 h-8 rounded-xl bg-[#BE1E2E]/10 text-[#BE1E2E] flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block font-mono">Call Center</span>
                    <span className="font-semibold">{contact.phone}</span>
                  </div>
                </div>
              )}
              {contact.address && (
                <div className="flex items-center gap-3 text-[var(--brand-text)]">
                  <div className="w-8 h-8 rounded-xl bg-[#BE1E2E]/10 text-[#BE1E2E] flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block font-mono">Campus Location</span>
                    <span className="font-semibold">{contact.address}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
