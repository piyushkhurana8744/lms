'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import {
  Award,
  Clock,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Search,
  CheckCircle2,
  Globe,
  BookOpen,
  Zap,
  TrendingUp,
  ShieldCheck,
  Play
} from 'lucide-react';

interface PublicAssessment {
  _id: string;
  title: string;
  slug: string;
  description: string;
  type: string;
  durationMinutes: number;
  passingScorePercent: number;
  questions?: { length: number };
  createdAt: string;
}

export default function PublicQuizzesPage() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<PublicAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchPublicAssessments = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/v1/public/assessments');
        if (res.ok) {
          const json = await res.json();
          setAssessments(json.data || []);
        }
      } catch (err) {
        console.error('Error fetching public assessments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicAssessments();
  }, []);

  const filteredAssessments = assessments.filter((a) =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)] py-12 px-6 sm:px-10">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#BE1E2E]/10 border border-[#BE1E2E]/20 text-[#BE1E2E] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Skill Assessments & Quizzes</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[var(--brand-text)] leading-tight">
            Benchmark Your Skills with Industry Tests
          </h1>

          <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed">
            Take standalone certification quizzes, test your SEO, Google Ads, and Performance Marketing prowess, or complete your enrolled cohort checkpoints.
          </p>

          {/* Search Bar */}
          <div className="pt-4 max-w-lg mx-auto">
            <div className="relative">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tests by keyword (e.g. SEO, Meta, Analytics)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] text-xs sm:text-sm text-[var(--brand-text)] shadow-sm focus:outline-none focus:border-[#BE1E2E]"
              />
            </div>
          </div>
        </div>

        {/* Features Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] text-center space-y-2">
            <Zap className="w-6 h-6 text-amber-500 mx-auto" />
            <h3 className="font-extrabold text-xs text-[var(--brand-text)]">Instant Auto-Grading</h3>
            <p className="text-[11px] text-[var(--text-muted)]">Get detailed question-by-question analysis right after test completion.</p>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] text-center space-y-2">
            <Award className="w-6 h-6 text-[#BE1E2E] mx-auto" />
            <h3 className="font-extrabold text-xs text-[var(--brand-text)]">Skill Certification</h3>
            <p className="text-[11px] text-[var(--text-muted)]">Prove your subject mastery to trainers, hiring partners, and recruiters.</p>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] text-center space-y-2">
            <ShieldCheck className="w-6 h-6 text-emerald-500 mx-auto" />
            <h3 className="font-extrabold text-xs text-[var(--brand-text)]">Faculty Verified</h3>
            <p className="text-[11px] text-[var(--text-muted)]">Authored and curated by DIDM master trainers and industry practitioners.</p>
          </div>
        </div>

        {/* Quizzes List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--brand-border)] pb-4">
            <div>
              <h2 className="text-xl font-extrabold text-[var(--brand-text)]">Available Quizzes & Assessments</h2>
              <span className="text-xs text-[var(--text-muted)]">
                Showing {filteredAssessments.length} published tests
              </span>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 text-xs text-[var(--text-muted)] animate-pulse">
              Loading available quizzes...
            </div>
          ) : filteredAssessments.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[var(--bg-surface)] border border-dashed border-[var(--brand-border)] space-y-2">
              <BookOpen className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
              <h3 className="font-bold text-sm text-[var(--brand-text)]">No public quizzes found</h3>
              <p className="text-xs text-[var(--text-muted)]">Try adjusting your search criteria or check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssessments.map((quiz) => (
                <div
                  key={quiz._id}
                  className="rounded-3xl bg-[var(--bg-surface)] border border-[var(--brand-border)] p-6 flex flex-col justify-between hover:border-[#BE1E2E]/40 transition-all hover:shadow-xl hover:shadow-red-500/5 group"
                >
                  <div className="space-y-4">
                    {/* Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {quiz.type}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        Live Test
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-base font-extrabold text-[var(--brand-text)] line-clamp-2 group-hover:text-[#BE1E2E] transition-colors">
                        {quiz.title}
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] mt-1.5 line-clamp-2 leading-relaxed">
                        {quiz.description}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--brand-border)] text-xs text-[var(--text-muted)]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{quiz.durationMinutes || 15} Mins</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Pass Mark: {quiz.passingScorePercent || 60}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Start Button */}
                  <div className="pt-5 mt-4 border-t border-[var(--brand-border)]">
                    <Link
                      href={user ? '/student/assessments' : `/login?redirect=/student/assessments`}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#BE1E2E] to-red-600 hover:from-red-600 hover:to-[#BE1E2E] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{user ? 'Launch Test Now' : 'Sign In & Take Test'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
