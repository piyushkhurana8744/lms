'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import {
  BookOpen,
  Plus,
  Globe,
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileText,
  Trash2,
  Eye,
  Layers,
  Sparkles,
  Search,
  Filter,
  Users,
  ChevronRight,
  ExternalLink,
  Edit3,
  Send
} from 'lucide-react';

interface QuestionOption {
  text: string;
  isCorrect: boolean;
}

interface QuizQuestion {
  questionText: string;
  questionType: 'MCQ' | 'TRUE_FALSE' | 'SHORT_TEXT';
  options: QuestionOption[];
  points: number;
}

interface Assessment {
  _id: string;
  type: 'QUIZ' | 'ASSIGNMENT';
  scope: 'INDEPENDENT' | 'COURSE_LINKED' | 'BATCH_LINKED';
  title: string;
  slug: string;
  description: string;
  instructions?: string;
  showOnWebsite: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  durationMinutes?: number;
  passingScorePercent?: number;
  maxAttempts?: number;
  questions?: QuizQuestion[];
  assignmentDetails?: {
    submissionType: string;
    maxScore: number;
    rubric?: string;
    dueDate?: string;
  };
  courseId?: { _id: string; title: string };
  batchId?: { _id: string; name: string };
  createdAt: string;
}

interface Submission {
  _id: string;
  assessmentId: Assessment;
  userId: { _id: string; name: string; email: string };
  type: 'QUIZ' | 'ASSIGNMENT';
  attemptNumber: number;
  score: number;
  maxScore: number;
  scorePercentage: number;
  passed?: boolean;
  status: 'SUBMITTED' | 'GRADED';
  assignmentSubmission?: {
    submissionText?: string;
    fileUrl?: string;
    fileName?: string;
    linkUrl?: string;
  };
  feedback?: string;
  submittedAt: string;
}

export default function InstructorAssessmentsPage() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'QUIZ' | 'ASSIGNMENT'>('ALL');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'INDEPENDENT' | 'COURSE_LINKED'>('ALL');

  // Modals state
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [activeSubmissionDrawer, setActiveSubmissionDrawer] = useState<Assessment | null>(null);
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [gradingScore, setGradingScore] = useState<number>(100);
  const [gradingFeedback, setGradingFeedback] = useState<string>('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Form State for New Quiz
  const [quizForm, setQuizForm] = useState({
    title: '',
    description: '',
    instructions: '',
    scope: 'INDEPENDENT' as 'INDEPENDENT' | 'COURSE_LINKED',
    showOnWebsite: true,
    durationMinutes: 15,
    passingScorePercent: 60,
    maxAttempts: 3,
    questions: [
      {
        questionText: 'What is the primary factor in Google search ranking algorithm?',
        questionType: 'MCQ' as const,
        points: 20,
        options: [
          { text: 'Content Quality & Backlinks Relevance', isCorrect: true },
          { text: 'Domain registration price', isCorrect: false },
          { text: 'Number of animated banners', isCorrect: false },
          { text: 'Social media follower count', isCorrect: false }
        ]
      }
    ]
  });

  // Form State for New Assignment
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    instructions: '',
    scope: 'COURSE_LINKED' as 'INDEPENDENT' | 'COURSE_LINKED',
    showOnWebsite: false,
    maxScore: 100,
    rubric: '1. Research & Strategy (40%)\n2. Execution & Layout (40%)\n3. Presentation & Insights (20%)',
    dueDateDays: 7
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resAssessments, resSubmissions] = await Promise.all([
        fetch('/api/v1/assessments', { credentials: 'include' }),
        fetch('/api/v1/assessments/submissions', { credentials: 'include' })
      ]);

      if (resAssessments.ok) {
        const json = await resAssessments.json();
        setAssessments(json.data || []);
      }
      if (resSubmissions.ok) {
        const json = await resSubmissions.json();
        setSubmissions(json.data || []);
      }
    } catch (err) {
      console.error('Error loading assessments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: 'QUIZ',
          ...quizForm
        })
      });

      if (res.ok) {
        setIsQuizModalOpen(false);
        setActionSuccessMsg('🎉 Quiz created & published successfully!');
        setTimeout(() => setActionSuccessMsg(null), 4000);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to create quiz');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating quiz');
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + Number(assignmentForm.dueDateDays));

      const res = await fetch('/api/v1/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: 'ASSIGNMENT',
          title: assignmentForm.title,
          description: assignmentForm.description,
          instructions: assignmentForm.instructions,
          scope: assignmentForm.scope,
          showOnWebsite: assignmentForm.showOnWebsite,
          assignmentDetails: {
            maxScore: assignmentForm.maxScore,
            rubric: assignmentForm.rubric,
            submissionType: 'FILE_UPLOAD',
            dueDate
          }
        })
      });

      if (res.ok) {
        setIsAssignmentModalOpen(false);
        setActionSuccessMsg('🎉 Assignment created successfully!');
        setTimeout(() => setActionSuccessMsg(null), 4000);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to create assignment');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating assignment');
    }
  };

  const handleToggleWebsite = async (assessment: Assessment) => {
    try {
      const res = await fetch(`/api/v1/assessments/${assessment._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          showOnWebsite: !assessment.showOnWebsite
        })
      });

      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAssessment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assessment?')) return;
    try {
      const res = await fetch(`/api/v1/assessments/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGradeSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubmission) return;

    try {
      const res = await fetch(`/api/v1/assessments/submissions/${gradingSubmission._id}/grade`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          score: gradingScore,
          feedback: gradingFeedback
        })
      });

      if (res.ok) {
        setGradingSubmission(null);
        setActionSuccessMsg('✅ Student submission graded successfully!');
        setTimeout(() => setActionSuccessMsg(null), 4000);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredAssessments = assessments.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'ALL' || a.type === typeFilter;
    const matchesScope = scopeFilter === 'ALL' || a.scope === scopeFilter;
    return matchesSearch && matchesType && matchesScope;
  });

  const pendingGradingCount = submissions.filter((s) => s.status === 'SUBMITTED' && s.type === 'ASSIGNMENT').length;

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-purple-900/30 p-6 sm:p-8 rounded-3xl border border-blue-500/20 backdrop-blur-xl relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-extrabold uppercase tracking-wider border border-blue-500/30 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Faculty Assessment Studio
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--brand-text)]">
            Quizzes & Assignments Engine
          </h1>
          <p className="text-sm text-[var(--text-muted)] max-w-2xl">
            Design independent entrance/skill tests, course checkpoint quizzes, and graded student assignments. Toggle public visibility to showcase tests directly on your institute website.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          <button
            onClick={() => setIsQuizModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Create Quiz</span>
          </button>
          <button
            onClick={() => setIsAssignmentModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <FileText className="w-4 h-4" />
            <span>Create Assignment</span>
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] flex items-center justify-between">
          <div>
            <div className="text-xs text-[var(--text-muted)] font-semibold">Total Assessments</div>
            <div className="text-2xl font-black text-[var(--brand-text)] mt-1">{assessments.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] flex items-center justify-between">
          <div>
            <div className="text-xs text-[var(--text-muted)] font-semibold">Live on Website</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {assessments.filter((a) => a.showOnWebsite).length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            <Globe className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] flex items-center justify-between">
          <div>
            <div className="text-xs text-[var(--text-muted)] font-semibold">Student Submissions</div>
            <div className="text-2xl font-black text-indigo-400 mt-1">{submissions.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] flex items-center justify-between">
          <div>
            <div className="text-xs text-[var(--text-muted)] font-semibold">Pending Grading</div>
            <div className="text-2xl font-black text-amber-400 mt-1">{pendingGradingCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search quizzes, tests, assignments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--brand-border)] text-xs text-[var(--brand-text)] focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {/* Type Filter */}
          <div className="flex bg-[var(--bg-surface)] border border-[var(--brand-border)] p-1 rounded-xl">
            {(['ALL', 'QUIZ', 'ASSIGNMENT'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  typeFilter === t
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-[var(--text-muted)] hover:text-[var(--brand-text)]'
                }`}
              >
                {t === 'ALL' ? 'All Types' : t === 'QUIZ' ? 'Quizzes' : 'Assignments'}
              </button>
            ))}
          </div>

          {/* Scope Filter */}
          <div className="flex bg-[var(--bg-surface)] border border-[var(--brand-border)] p-1 rounded-xl">
            {(['ALL', 'INDEPENDENT', 'COURSE_LINKED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScopeFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  scopeFilter === s
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-[var(--text-muted)] hover:text-[var(--brand-text)]'
                }`}
              >
                {s === 'ALL' ? 'All Scopes' : s === 'INDEPENDENT' ? 'Standalone / Independent' : 'Course Linked'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Assessments Grid */}
      {loading ? (
        <div className="text-center py-20 text-sm text-[var(--text-muted)] animate-pulse">
          Loading assessments repository...
        </div>
      ) : filteredAssessments.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[var(--bg-surface)] border border-dashed border-[var(--brand-border)] space-y-3">
          <BookOpen className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
          <h3 className="font-bold text-base text-[var(--brand-text)]">No assessments match your filter</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            Get started by creating an independent quiz for website visitors or a milestone assignment for your enrolled students.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssessments.map((a) => {
            const submissionCount = submissions.filter((s) => s.assessmentId?._id === a._id).length;

            return (
              <div
                key={a._id}
                className="rounded-3xl bg-[var(--bg-surface)] border border-[var(--brand-border)] p-6 flex flex-col justify-between hover:border-blue-500/40 transition-all hover:shadow-xl hover:shadow-blue-500/5 group"
              >
                <div className="space-y-4">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                          a.type === 'QUIZ'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}
                      >
                        {a.type}
                      </span>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-500/10 text-[var(--text-muted)] border border-slate-500/20">
                        {a.scope === 'INDEPENDENT' ? 'Standalone Skill Test' : 'Course Linked'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleWebsite(a)}
                      title={a.showOnWebsite ? 'Visible on Website (Click to hide)' : 'Hidden from Website (Click to show)'}
                      className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
                        a.showOnWebsite
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-slate-500/10 text-slate-400 border border-slate-500/20 hover:bg-slate-500/20'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span className="text-[10px]">{a.showOnWebsite ? 'Public' : 'Private'}</span>
                    </button>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-extrabold text-[var(--brand-text)] line-clamp-2 group-hover:text-blue-400 transition-colors">
                      {a.title}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1.5 line-clamp-2 leading-relaxed">
                      {a.description}
                    </p>
                  </div>

                  {/* Metadata Chips */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--brand-border)] text-xs text-[var(--text-muted)]">
                    {a.type === 'QUIZ' ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                          <span>{a.questions?.length || 0} Questions</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>{a.durationMinutes || 15} Mins</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Pass: {a.passingScorePercent || 60}%</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{submissionCount} Attempts</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-purple-400" />
                          <span>Max: {a.assignmentDetails?.maxScore || 100} pts</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{submissionCount} Submissions</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-5 mt-4 border-t border-[var(--brand-border)] flex items-center justify-between gap-2">
                  <button
                    onClick={() => setActiveSubmissionDrawer(a)}
                    className="flex-1 py-2 px-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Submissions ({submissionCount})</span>
                  </button>

                  {a.showOnWebsite && (
                    <a
                      href={`/quizzes`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl text-[var(--text-muted)] hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                      title="View on Public Website"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}

                  <button
                    onClick={() => handleDeleteAssessment(a._id)}
                    className="p-2 rounded-xl text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete Assessment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUBMISSIONS & GRADING DRAWER */}
      {activeSubmissionDrawer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-2xl bg-[var(--bg-surface)] border-l border-[var(--brand-border)] h-full overflow-y-auto p-6 sm:p-8 space-y-6 flex flex-col justify-between animate-in slide-in-from-right duration-300">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--brand-border)] pb-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400">
                    Submissions Roster
                  </span>
                  <h2 className="text-xl font-black text-[var(--brand-text)]">
                    {activeSubmissionDrawer.title}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setActiveSubmissionDrawer(null);
                    setGradingSubmission(null);
                  }}
                  className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)]"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Submissions List */}
              {(() => {
                const drawerSubmissions = submissions.filter(
                  (s) => s.assessmentId?._id === activeSubmissionDrawer._id
                );

                if (drawerSubmissions.length === 0) {
                  return (
                    <div className="text-center py-12 text-xs text-[var(--text-muted)]">
                      No student submissions yet for this assessment.
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {drawerSubmissions.map((sub) => (
                      <div
                        key={sub._id}
                        className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-extrabold text-xs text-[var(--brand-text)]">
                              {sub.userId?.name || 'Aman Verma'}
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)]">
                              {sub.userId?.email || 'student@didm.in'} • Attempt #{sub.attemptNumber}
                            </div>
                          </div>

                          <div className="text-right">
                            <span
                              className={`text-xs font-black px-2.5 py-1 rounded-full ${
                                sub.status === 'GRADED'
                                  ? sub.passed
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {sub.status === 'GRADED'
                                ? `${sub.scorePercentage}% (${sub.passed ? 'PASSED' : 'FAILED'})`
                                : 'AWAITING GRADE'}
                            </span>
                            <div className="text-[10px] text-[var(--text-muted)] mt-1">
                              {new Date(sub.submittedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        {/* Assignment Submission Content */}
                        {sub.assignmentSubmission && (
                          <div className="p-3 rounded-xl bg-black/20 text-xs space-y-1.5 border border-white/5">
                            {sub.assignmentSubmission.submissionText && (
                              <p className="text-[var(--brand-text)] font-mono text-[11px]">
                                {sub.assignmentSubmission.submissionText}
                              </p>
                            )}
                            {sub.assignmentSubmission.linkUrl && (
                              <a
                                href={sub.assignmentSubmission.linkUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-400 hover:underline flex items-center gap-1 text-[11px]"
                              >
                                <ExternalLink className="w-3 h-3" />
                                {sub.assignmentSubmission.linkUrl}
                              </a>
                            )}
                          </div>
                        )}

                        {/* Trainer Feedback if graded */}
                        {sub.feedback && (
                          <div className="text-[11px] text-[var(--text-muted)] bg-blue-500/5 p-2 rounded-lg border border-blue-500/10">
                            <strong className="text-blue-400">Trainer Feedback:</strong> {sub.feedback}
                          </div>
                        )}

                        {/* Grade Assignment Action Button */}
                        {sub.type === 'ASSIGNMENT' && (
                          <div className="flex justify-end pt-1">
                            <button
                              onClick={() => {
                                setGradingSubmission(sub);
                                setGradingScore(sub.score || 85);
                                setGradingFeedback(sub.feedback || 'Great structure and campaign funnel logic.');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{sub.status === 'GRADED' ? 'Edit Grade & Feedback' : 'Grade Submission'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* In-Drawer Grading Form */}
              {gradingSubmission && (
                <form
                  onSubmit={handleGradeSubmission}
                  className="p-5 rounded-2xl bg-blue-950/40 border border-blue-500/30 space-y-4 animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-sm text-blue-300">
                      Grading: {gradingSubmission.userId?.name}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setGradingSubmission(null)}
                      className="text-xs text-[var(--text-muted)] hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--brand-text)] mb-1">
                      Awarded Score (out of {gradingSubmission.maxScore || 100})
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={gradingSubmission.maxScore || 100}
                      value={gradingScore}
                      onChange={(e) => setGradingScore(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--brand-border)] text-xs text-[var(--brand-text)] font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--brand-text)] mb-1">
                      Trainer Feedback & Remarks
                    </label>
                    <textarea
                      rows={3}
                      value={gradingFeedback}
                      onChange={(e) => setGradingFeedback(e.target.value)}
                      placeholder="Provide constructive feedback for student growth..."
                      className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--brand-border)] text-xs text-[var(--brand-text)]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/30"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Publish Grade & Feedback</span>
                  </button>
                </form>
              )}
            </div>

            <div className="pt-4 border-t border-[var(--brand-border)]">
              <button
                onClick={() => {
                  setActiveSubmissionDrawer(null);
                  setGradingSubmission(null);
                }}
                className="w-full py-2.5 rounded-xl bg-[var(--bg-surface-elevated)] hover:bg-[var(--brand-border)] text-xs font-bold text-[var(--brand-text)]"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE QUIZ MODAL */}
      {isQuizModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] w-full max-w-3xl rounded-3xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--brand-border)] pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400">
                  New Assessment
                </span>
                <h2 className="text-xl font-black text-[var(--brand-text)]">Create Interactive Quiz</h2>
              </div>
              <button
                onClick={() => setIsQuizModalOpen(false)}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--brand-text)]"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuiz} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[var(--brand-text)] mb-1.5">Quiz Title *</label>
                  <input
                    type="text"
                    required
                    value={quizForm.title}
                    onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                    placeholder="e.g. SEO & Meta Ads Advanced Assessment"
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-xs text-[var(--brand-text)] focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[var(--brand-text)] mb-1.5">Description *</label>
                  <textarea
                    rows={2}
                    required
                    value={quizForm.description}
                    onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                    placeholder="Short summary of what concepts this quiz tests..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-xs text-[var(--brand-text)] focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--brand-text)] mb-1.5">Scope Mode</label>
                  <select
                    value={quizForm.scope}
                    onChange={(e) => setQuizForm({ ...quizForm, scope: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-xs text-[var(--brand-text)]"
                  >
                    <option value="INDEPENDENT">Independent (Standalone Skill Test)</option>
                    <option value="COURSE_LINKED">Course Milestone</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--brand-text)] mb-1.5">Show on Public Website</label>
                  <div className="flex items-center gap-3 pt-2">
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={quizForm.showOnWebsite}
                        onChange={(e) => setQuizForm({ ...quizForm, showOnWebsite: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span>Expose on Website for Lead Gen / Public Testing</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--brand-text)] mb-1.5">Duration (Minutes)</label>
                  <input
                    type="number"
                    min={1}
                    value={quizForm.durationMinutes}
                    onChange={(e) => setQuizForm({ ...quizForm, durationMinutes: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-xs text-[var(--brand-text)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--brand-text)] mb-1.5">Passing Score (%)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={quizForm.passingScorePercent}
                    onChange={(e) => setQuizForm({ ...quizForm, passingScorePercent: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-xs text-[var(--brand-text)]"
                  />
                </div>
              </div>

              {/* Questions Section */}
              <div className="space-y-4 pt-4 border-t border-[var(--brand-border)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-[var(--brand-text)]">
                    Quiz Questions ({quizForm.questions.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      setQuizForm({
                        ...quizForm,
                        questions: [
                          ...quizForm.questions,
                          {
                            questionText: 'New Question',
                            questionType: 'MCQ',
                            points: 20,
                            options: [
                              { text: 'Option A (Correct)', isCorrect: true },
                              { text: 'Option B', isCorrect: false },
                              { text: 'Option C', isCorrect: false },
                              { text: 'Option D', isCorrect: false }
                            ]
                          }
                        ]
                      })
                    }
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Question</span>
                  </button>
                </div>

                {quizForm.questions.map((q, qIdx) => (
                  <div
                    key={qIdx}
                    className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-blue-400">Question #{qIdx + 1}</span>
                      {quizForm.questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = quizForm.questions.filter((_, idx) => idx !== qIdx);
                            setQuizForm({ ...quizForm, questions: updated });
                          }}
                          className="text-[11px] text-red-400 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      required
                      placeholder="Enter question text..."
                      value={q.questionText}
                      onChange={(e) => {
                        const updated = [...quizForm.questions];
                        updated[qIdx].questionText = e.target.value;
                        setQuizForm({ ...quizForm, questions: updated });
                      }}
                      className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--brand-border)] text-xs text-[var(--brand-text)]"
                    />

                    {/* Options */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-[var(--text-muted)] block">
                        Choices (Select the radio of the correct answer):
                      </span>
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`q_${qIdx}_correct`}
                            checked={opt.isCorrect}
                            onChange={() => {
                              const updated = [...quizForm.questions];
                              updated[qIdx].options = updated[qIdx].options.map((o, i) => ({
                                ...o,
                                isCorrect: i === optIdx
                              }));
                              setQuizForm({ ...quizForm, questions: updated });
                            }}
                            className="w-4 h-4 text-emerald-500 focus:ring-emerald-500"
                          />
                          <input
                            type="text"
                            required
                            placeholder={`Choice ${optIdx + 1}`}
                            value={opt.text}
                            onChange={(e) => {
                              const updated = [...quizForm.questions];
                              updated[qIdx].options[optIdx].text = e.target.value;
                              setQuizForm({ ...quizForm, questions: updated });
                            }}
                            className={`flex-1 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border text-xs text-[var(--brand-text)] ${
                              opt.isCorrect ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-[var(--brand-border)]'
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-[var(--brand-border)] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsQuizModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[var(--bg-surface-elevated)] hover:bg-[var(--brand-border)] text-xs font-bold text-[var(--brand-text)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-600/30"
                >
                  Publish Quiz
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE ASSIGNMENT MODAL */}
      {isAssignmentModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] w-full max-w-2xl rounded-3xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--brand-border)] pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-400">
                  New Assignment
                </span>
                <h2 className="text-xl font-black text-[var(--brand-text)]">Create Practical Assignment</h2>
              </div>
              <button
                onClick={() => setIsAssignmentModalOpen(false)}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--brand-text)]"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--brand-text)] mb-1.5">Assignment Title *</label>
                <input
                  type="text"
                  required
                  value={assignmentForm.title}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                  placeholder="e.g. 360° Growth Funnel Strategy Blueprint"
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-xs text-[var(--brand-text)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--brand-text)] mb-1.5">Description *</label>
                <textarea
                  rows={2}
                  required
                  value={assignmentForm.description}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                  placeholder="Briefly describe the task, expectations, and deliverable format..."
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-xs text-[var(--brand-text)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--brand-text)] mb-1.5">
                  Submission Instructions & Guidelines
                </label>
                <textarea
                  rows={2}
                  value={assignmentForm.instructions}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, instructions: e.target.value })}
                  placeholder="e.g. Upload PDF deck or Google Slides link before the deadline."
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-xs text-[var(--brand-text)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--brand-text)] mb-1.5">Max Points</label>
                  <input
                    type="number"
                    min={10}
                    value={assignmentForm.maxScore}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, maxScore: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-xs text-[var(--brand-text)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--brand-text)] mb-1.5">Due in (Days)</label>
                  <input
                    type="number"
                    min={1}
                    value={assignmentForm.dueDateDays}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, dueDateDays: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-xs text-[var(--brand-text)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--brand-text)] mb-1.5">Grading Rubric</label>
                <textarea
                  rows={3}
                  value={assignmentForm.rubric}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, rubric: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-xs text-[var(--brand-text)] font-mono"
                />
              </div>

              <div className="pt-4 border-t border-[var(--brand-border)] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAssignmentModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[var(--bg-surface-elevated)] hover:bg-[var(--brand-border)] text-xs font-bold text-[var(--brand-text)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-lg shadow-purple-600/30"
                >
                  Publish Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
