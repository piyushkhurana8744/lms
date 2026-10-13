'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, SlidersHorizontal, RotateCcw, ChevronLeft, ChevronRight, BookOpen, AlertCircle, X } from 'lucide-react';
import { usePublicSite } from '@/components/public-site-provider';
import { CourseCard, PublicCourseItem } from '@/components/public/CourseCard';
import { CourseCatalogSkeleton } from '@/components/public/CourseCatalogSkeleton';

function PublicCourseCatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { organization } = usePublicSite();
  const [, startTransition] = useTransition();

  // URL state synchronization
  const initialSearch = searchParams.get('search') || '';
  const initialLevel = searchParams.get('level') || '';
  const initialLanguage = searchParams.get('language') || '';
  const initialSort = searchParams.get('sort') || 'newest';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [level, setLevel] = useState(initialLevel);
  const [language, setLanguage] = useState(initialLanguage);
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(initialPage);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Sync state to URL search parameters
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (level) params.set('level', level);
    if (language) params.set('language', language);
    if (sort && sort !== 'newest') params.set('sort', sort);
    if (page > 1) params.set('page', page.toString());

    const queryString = params.toString();
    const newPath = queryString ? `/courses?${queryString}` : '/courses';

    startTransition(() => {
      router.replace(newPath, { scroll: false });
    });
  }, [debouncedSearch, level, language, sort, page, router]);

  // Fetch tenant-scoped public courses
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['public-courses', debouncedSearch, level, language, sort, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (level) params.set('level', level);
      if (language) params.set('language', language);
      if (sort) params.set('sort', sort);
      params.set('page', page.toString());
      params.set('limit', '12');

      const res = await fetch(`/api/v1/public/courses?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load courses (${res.status})`);
      }
      return res.json();
    },
    staleTime: 1000 * 60 * 2
  });

  const courses: PublicCourseItem[] = data?.data || [];
  const meta = data?.meta || {
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false
  };

  const activeFilterCount = [
    Boolean(debouncedSearch),
    Boolean(level),
    Boolean(language),
    sort !== 'newest'
  ].filter(Boolean).length;

  const handleClearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setLevel('');
    setLanguage('');
    setSort('newest');
    setPage(1);
  };

  const orgName = organization?.name || 'DIDM Academy';

  return (
    <div className="min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)] transition-colors duration-200">
      {/* Hero Header */}
      <section className="bg-gradient-to-b from-[var(--bg-surface)] via-[var(--bg-surface-elevated)] to-[var(--brand-background)] border-b border-[var(--brand-border)] py-12 px-6">
        <div className="max-w-7xl mx-auto space-y-4 text-center md:text-left">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#BE1E2E]/10 text-[#BE1E2E] border border-[#BE1E2E]/20">
            <BookOpen className="w-3.5 h-3.5" />
            Official Course Catalog
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[var(--brand-text)]">
            Explore Our Courses
          </h1>
          <p className="text-base md:text-lg text-[var(--text-muted)] max-w-2xl leading-relaxed">
            Learn from structured, practical courses designed for your career goals at{' '}
            <span className="font-semibold text-[var(--brand-text)]">{orgName}</span>.
          </p>
        </div>
      </section>

      {/* Main Catalog Section */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Desktop Filter / Search Toolbar */}
        <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center sticky top-20 z-30 backdrop-blur-md">
          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search courses..."
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] rounded-xl text-sm text-[var(--brand-text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] transition-all"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--brand-text)]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Desktop Filter Dropdowns */}
          <div className="hidden md:flex items-center gap-3 w-full md:w-auto">
            {/* Level Filter */}
            <select
              value={level}
              onChange={(e) => {
                setLevel(e.target.value);
                setPage(1);
              }}
              className="px-3.5 py-2.5 bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] rounded-xl text-sm font-semibold text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E]"
            >
              <option value="">All Levels</option>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
              <option value="ALL_LEVELS">All Levels Suitable</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="px-3.5 py-2.5 bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] rounded-xl text-sm font-semibold text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E]"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title_asc">Title A–Z</option>
              <option value="title_desc">Title Z–A</option>
            </select>

            {/* Clear Filters Button */}
            {activeFilterCount > 0 && (
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold text-[#BE1E2E] hover:bg-[#BE1E2E]/10 rounded-xl transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>

          {/* Mobile Filter Toggle Button */}
          <div className="flex md:hidden items-center justify-between w-full">
            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] rounded-xl text-sm font-bold text-[var(--brand-text)]"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#BE1E2E] text-white text-xs flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {activeFilterCount > 0 && (
              <button
                onClick={handleClearFilters}
                className="text-xs font-bold text-[#BE1E2E]"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Catalog Content States */}
        {isLoading ? (
          <CourseCatalogSkeleton />
        ) : isError ? (
          <div className="bg-[var(--bg-surface)] border border-red-500/20 rounded-3xl p-8 text-center space-y-4 max-w-md mx-auto my-12">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-[var(--brand-text)]">Unable to load courses</h3>
              <p className="text-sm text-[var(--text-muted)]">
                {(error as Error)?.message || 'An unexpected error occurred while fetching the course catalog.'}
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 rounded-xl bg-[#BE1E2E] hover:bg-red-700 text-white text-sm font-bold transition-colors"
            >
              Retry
            </button>
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-3xl p-12 text-center space-y-6 max-w-lg mx-auto my-12 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] flex items-center justify-center mx-auto">
              <BookOpen className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-[var(--brand-text)]">No courses available yet</h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Courses from <span className="font-semibold text-[var(--brand-text)]">{orgName}</span> will appear here once they are published.
              </p>
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#BE1E2E] text-white text-sm font-bold transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Results Count Header */}
            <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
              <p>
                Showing <span className="font-bold text-[var(--brand-text)]">{(meta.page - 1) * meta.limit + 1}</span>–
                <span className="font-bold text-[var(--brand-text)]">
                  {Math.min(meta.page * meta.limit, meta.total)}
                </span>{' '}
                of <span className="font-bold text-[var(--brand-text)]">{meta.total}</span> courses
              </p>
            </div>

            {/* Course Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>

            {/* Accessible Pagination Bar */}
            {meta.totalPages > 1 && (
              <nav className="flex items-center justify-center gap-2 pt-6" aria-label="Course catalog pagination">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!meta.hasPreviousPage}
                  className="p-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-[var(--brand-text)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-surface-elevated)] transition-colors"
                  aria-label="Go to previous page"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-1.5 px-3">
                  {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-9 h-9 rounded-xl text-sm font-bold transition-colors ${
                        pageNum === meta.page
                          ? 'bg-[#BE1E2E] text-white shadow-md shadow-[#BE1E2E]/20'
                          : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface-elevated)]'
                      }`}
                      aria-label={`Page ${pageNum}`}
                      aria-current={pageNum === meta.page ? 'page' : undefined}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={!meta.hasNextPage}
                  className="p-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-[var(--brand-text)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-surface-elevated)] transition-colors"
                  aria-label="Go to next page"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </nav>
            )}
          </div>
        )}
      </main>

      {/* Mobile Filter Modal / Drawer */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-[var(--bg-surface)] w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-[var(--brand-border)] p-6 space-y-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--brand-border)] pb-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-[#BE1E2E]" />
                <h3 className="text-lg font-bold text-[var(--brand-text)]">Filter Courses</h3>
              </div>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--brand-text)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Difficulty Level
                </label>
                <select
                  value={level}
                  onChange={(e) => {
                    setLevel(e.target.value);
                    setPage(1);
                  }}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                >
                  <option value="">All Levels</option>
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="ALL_LEVELS">All Levels</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Sort Order
                </label>
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    setPage(1);
                  }}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="title_asc">Title A–Z</option>
                  <option value="title_desc">Title Z–A</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  handleClearFilters();
                  setIsMobileFilterOpen(false);
                }}
                className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Reset
              </button>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PublicCourseCatalogPage() {
  return (
    <React.Suspense fallback={<CourseCatalogSkeleton />}>
      <PublicCourseCatalogContent />
    </React.Suspense>
  );
}

