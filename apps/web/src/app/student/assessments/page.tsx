'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/auth-provider';
import {
  BookOpen,
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileText,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Send,
  UploadCloud,
  Check,
  AlertCircle
} from 'lucide-react';

interface QuestionOption {
  text: string;
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
}

interface Submission {
  _id: string;
  assessmentId: Assessment;
  type: 'QUIZ' | 'ASSIGNMENT';
  attemptNumber: number;
  score: number;
  maxScore: number;
  scorePercentage: number;
  passed?: boolean;
  status: 'SUBMITTED' | 'GRADED';
  quizAnswers?: Array<{
    questionIndex: number;
    selectedOptionIndex: number;
    isCorrect: boolean;
    earnedPoints: number;
  }>;
  assignmentSubmission?: {
    submissionText?: string;
    linkUrl?: string;
  };
  feedback?: string;
  submittedAt: string;
}

interface QuizResult {
  submissionId: string;
  score: number;
  maxScore: number;
  scorePercentage: number;
  passed: boolean;
  passingScorePercent: number;
  answers: Array<{
    questionIndex: number;
    selectedOptionIndex: number;
    isCorrect: boolean;
    earnedPoints: number;
  }>;
  feedback: string;
}

export default function StudentAssessmentsPage() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [mySubmissions, setMySubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'QUIZZES' | 'ASSIGNMENTS' | 'COMPLETED'>('ALL');

  // Quiz Taking Mode State
  const [activeQuiz, setActiveQuiz] = useState<Assessment | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isSubmittingTest, setIsSubmittingTest] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  // Assignment Submission Modal State
  const [activeAssignment, setActiveAssignment] = useState<Assessment | null>(null);
  const [assignmentLink, setAssignmentLink] = useState('');
  const [assignmentText, setAssignmentText] = useState('');
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);
  const [assignmentSuccessMsg, setAssignmentSuccessMsg] = useState<string | null>(null);
  const autoSubmitQuizRef = useRef<() => void>(() => undefined);

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
        setMySubmissions(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Timer countdown for active quiz
  useEffect(() => {
    if (!activeQuiz || secondsRemaining <= 0 || quizResult) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          autoSubmitQuizRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeQuiz, secondsRemaining, quizResult]);

  const handleStartQuiz = async (assessment: Assessment) => {
    try {
      // Fetch fresh assessment with sanitized questions
      const res = await fetch(`/api/v1/assessments/${assessment._id}?studentView=true`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to load quiz');
      const json = await res.json();

      setActiveQuiz(json.data);
      setCurrentQuestionIdx(0);
      setSelectedAnswers({});
      setQuizResult(null);
      setSecondsRemaining((json.data.durationMinutes || 15) * 60);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAutoSubmitQuiz = () => {
    handleSubmitQuiz();
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz || isSubmittingTest) return;

    try {
      setIsSubmittingTest(true);
      const formattedAnswers = Object.entries(selectedAnswers).map(([qIdx, optIdx]) => ({
        questionIndex: Number(qIdx),
        selectedOptionIndex: Number(optIdx)
      }));

      const res = await fetch(`/api/v1/assessments/${activeQuiz._id}/submit-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          answers: formattedAnswers,
          timeSpentSeconds: (activeQuiz.durationMinutes || 15) * 60 - secondsRemaining
        })
      });

      if (res.ok) {
        const json = await res.json();
        setQuizResult(json.data);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to submit quiz');
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting quiz');
    } finally {
      setIsSubmittingTest(false);
    }
  };

  autoSubmitQuizRef.current = handleAutoSubmitQuiz;

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssignment || isSubmittingAssignment) return;

    try {
      setIsSubmittingAssignment(true);
      const res = await fetch(`/api/v1/assessments/${activeAssignment._id}/submit-assignment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          linkUrl: assignmentLink,
          submissionText: assignmentText
        })
      });

      if (res.ok) {
        setAssignmentSuccessMsg('🎉 Assignment submitted successfully! Your trainer will grade it shortly.');
        setAssignmentLink('');
        setAssignmentText('');
        fetchData();
        setTimeout(() => {
          setAssignmentSuccessMsg(null);
          setActiveAssignment(null);
        }, 3000);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to submit assignment');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const filteredAssessments = assessments.filter((a) => {
    const isCompleted = mySubmissions.some((s) => s.assessmentId?._id === a._id && s.status === 'GRADED');
    if (activeTab === 'QUIZZES') return a.type === 'QUIZ';
    if (activeTab === 'ASSIGNMENTS') return a.type === 'ASSIGNMENT';
    if (activeTab === 'COMPLETED') return isCompleted;
    return true;
  });

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-red-950/40 via-purple-950/20 to-slate-900/40 p-6 sm:p-8 rounded-3xl border border-[#BE1E2E]/20 backdrop-blur-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#BE1E2E]/10 text-[#BE1E2E] text-xs font-bold uppercase tracking-wider border border-[#BE1E2E]/20 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Skill Assessments & Quizzes
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--brand-text)]">
            Student Assessment Center
          </h1>
          <p className="text-xs text-[var(--text-muted)] max-w-xl">
            Test your skills with interactive auto-graded quizzes, standalone industry assessments, and submit practical capstone projects for instructor grading.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--brand-border)]">
          <div className="text-center">
            <div className="text-xs text-[var(--text-muted)] font-semibold">Completed</div>
            <div className="text-xl font-black text-emerald-400">
              {mySubmissions.filter((s) => s.status === 'GRADED' && s.passed).length}
            </div>
          </div>
          <div className="h-8 w-px bg-[var(--brand-border)]" />
          <div className="text-center">
            <div className="text-xs text-[var(--text-muted)] font-semibold">Pending</div>
            <div className="text-xl font-black text-amber-400">
              {mySubmissions.filter((s) => s.status === 'SUBMITTED').length}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="flex items-center gap-2 border-b border-[var(--brand-border)] pb-3 overflow-x-auto">
        {(
          [
            { id: 'ALL', label: 'All Assessments' },
            { id: 'QUIZZES', label: 'Quizzes & Skill Tests' },
            { id: 'ASSIGNMENTS', label: 'Practical Assignments' },
            { id: 'COMPLETED', label: 'My Scores & History' }
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-[#BE1E2E] text-white shadow-md shadow-[#BE1E2E]/20'
                : 'text-[var(--text-muted)] hover:text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Assessments Grid */}
      {loading ? (
        <div className="text-center py-20 text-xs text-[var(--text-muted)] animate-pulse">
          Loading assessments and test submissions...
        </div>
      ) : filteredAssessments.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[var(--bg-surface)] border border-dashed border-[var(--brand-border)] space-y-2">
          <Award className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
          <h3 className="font-bold text-sm text-[var(--brand-text)]">No assessments available in this section</h3>
          <p className="text-xs text-[var(--text-muted)]">Check back as your instructor publishes new quizzes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssessments.map((a) => {
            const userSubmissions = mySubmissions.filter((s) => s.assessmentId?._id === a._id);
            const latestSub = userSubmissions[0];
            const hasPassed = userSubmissions.some((s) => s.passed);

            return (
              <div
                key={a._id}
                className="rounded-3xl bg-[var(--bg-surface)] border border-[var(--brand-border)] p-6 flex flex-col justify-between hover:border-[#BE1E2E]/40 transition-all hover:shadow-xl hover:shadow-red-500/5 group"
              >
                <div className="space-y-4">
                  {/* Status & Scope Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        a.type === 'QUIZ'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      }`}
                    >
                      {a.type}
                    </span>

                    {hasPassed ? (
                      <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        PASSED ({latestSub?.scorePercentage}%)
                      </span>
                    ) : latestSub ? (
                      <span className="text-[10px] font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                        {latestSub.status === 'SUBMITTED' ? 'Awaiting Grade' : `Score: ${latestSub.scorePercentage}%`}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-[var(--text-muted)] bg-slate-500/10 px-2 py-0.5 rounded-md">
                        {a.scope === 'INDEPENDENT' ? 'Standalone Test' : 'Course Milestone'}
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-extrabold text-[var(--brand-text)] line-clamp-2 group-hover:text-[#BE1E2E] transition-colors">
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
                          <span>{a.questions?.length || 5} Questions</span>
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
                          <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                          <span>Attempts: {userSubmissions.length}/{a.maxAttempts || 3}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-purple-400" />
                          <span>Max: {a.assignmentDetails?.maxScore || 100} pts</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-blue-400" />
                          <span>File / Link Submission</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Bottom Action Button */}
                <div className="pt-5 mt-4 border-t border-[var(--brand-border)]">
                  {a.type === 'QUIZ' ? (
                    <button
                      onClick={() => handleStartQuiz(a)}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#BE1E2E] to-red-600 hover:from-red-600 hover:to-[#BE1E2E] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{latestSub ? 'Retake Quiz' : 'Start Assessment'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveAssignment(a)}
                      className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{latestSub ? 'Update / Re-submit' : 'Submit Assignment'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULL-SCREEN INTERACTIVE QUIZ PLAYER MODAL */}
      {activeQuiz && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] w-full max-w-3xl rounded-3xl p-6 sm:p-8 space-y-6 max-h-[95vh] overflow-y-auto shadow-2xl relative">
            {/* Top Bar: Title & Live Countdown Timer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--brand-border)] pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400">
                  Interactive Quiz Session
                </span>
                <h2 className="text-xl font-black text-[var(--brand-text)]">{activeQuiz.title}</h2>
              </div>

              {!quizResult && (
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-mono font-black ${
                      secondsRemaining < 120
                        ? 'bg-red-500/10 border-red-500/40 text-red-400 animate-pulse'
                        : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>{formatTimer(secondsRemaining)}</span>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to exit the quiz? Unsubmitted answers will be lost.')) {
                        setActiveQuiz(null);
                        setQuizResult(null);
                      }
                    }}
                    className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface-elevated)]"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* If Quiz Completed - Show Scorecard */}
            {quizResult ? (
              <div className="space-y-6 py-4 animate-in zoom-in-95 duration-300">
                <div className="text-center space-y-3">
                  <div
                    className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl font-black shadow-2xl ${
                      quizResult.passed
                        ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500'
                        : 'bg-red-500/20 text-red-400 border-2 border-red-500'
                    }`}
                  >
                    {quizResult.scorePercentage}%
                  </div>

                  <h3 className="text-2xl font-black text-[var(--brand-text)]">
                    {quizResult.passed ? '🎉 Assessment Passed!' : 'Needs Improvement'}
                  </h3>

                  <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
                    {quizResult.feedback}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[var(--bg-surface-elevated)] p-4 rounded-2xl border border-[var(--brand-border)] text-center text-xs">
                  <div>
                    <div className="text-[var(--text-muted)]">Your Score</div>
                    <div className="text-base font-black text-[var(--brand-text)] mt-0.5">
                      {quizResult.score} / {quizResult.maxScore} pts
                    </div>
                  </div>
                  <div>
                    <div className="text-[var(--text-muted)]">Percentage</div>
                    <div className="text-base font-black text-blue-400 mt-0.5">
                      {quizResult.scorePercentage}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[var(--text-muted)]">Passing Mark</div>
                    <div className="text-base font-black text-amber-400 mt-0.5">
                      {quizResult.passingScorePercent}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[var(--text-muted)]">Status</div>
                    <div
                      className={`text-base font-black mt-0.5 ${
                        quizResult.passed ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {quizResult.passed ? 'PASSED' : 'FAILED'}
                    </div>
                  </div>
                </div>

                {/* Question by question answer breakdown */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                    Question Answer Breakdown
                  </h4>
                  {quizResult.answers.map((ans, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
                        ans.isCorrect
                          ? 'bg-emerald-500/5 border-emerald-500/20'
                          : 'bg-red-500/5 border-red-500/20'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {ans.isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        )}
                        <span className="font-bold text-[var(--brand-text)]">
                          Question #{idx + 1}
                        </span>
                      </div>
                      <div className="font-mono font-bold">
                        {ans.isCorrect ? `+${ans.earnedPoints} pts` : '0 pts'}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-[var(--brand-border)] flex items-center justify-end gap-3">
                  <button
                    onClick={() => {
                      setActiveQuiz(null);
                      setQuizResult(null);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-600/20"
                  >
                    Back to Assessments
                  </button>
                </div>
              </div>
            ) : (
              /* Active Test Taking Form */
              <div className="space-y-6">
                {/* Questions Stepper */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {activeQuiz.questions?.map((_, qIdx) => (
                    <button
                      key={qIdx}
                      onClick={() => setCurrentQuestionIdx(qIdx)}
                      className={`w-8 h-8 rounded-xl text-xs font-bold transition-all flex items-center justify-center flex-shrink-0 ${
                        currentQuestionIdx === qIdx
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                          : selectedAnswers[qIdx] !== undefined
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] border border-[var(--brand-border)]'
                      }`}
                    >
                      {qIdx + 1}
                    </button>
                  ))}
                </div>

                {/* Current Question Display */}
                {activeQuiz.questions && activeQuiz.questions[currentQuestionIdx] && (
                  <div className="p-6 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-blue-400">
                        Question {currentQuestionIdx + 1} of {activeQuiz.questions.length}
                      </span>
                      <span className="text-xs font-bold text-[var(--text-muted)]">
                        {activeQuiz.questions[currentQuestionIdx].points} Points
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-extrabold text-[var(--brand-text)] leading-relaxed">
                      {activeQuiz.questions[currentQuestionIdx].questionText}
                    </h3>

                    {/* Options list */}
                    <div className="space-y-3">
                      {activeQuiz.questions[currentQuestionIdx].options.map((opt, optIdx) => {
                        const isSelected = selectedAnswers[currentQuestionIdx] === optIdx;

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => {
                              setSelectedAnswers({
                                ...selectedAnswers,
                                [currentQuestionIdx]: optIdx
                              });
                            }}
                            className={`w-full text-left p-4 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-blue-600/10 border-blue-500 text-blue-400 shadow-md shadow-blue-500/10'
                                : 'bg-[var(--bg-surface)] border-[var(--brand-border)] text-[var(--brand-text)] hover:border-blue-500/30'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold ${
                                  isSelected
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-[var(--bg-surface-elevated)] text-[var(--text-muted)]'
                                }`}
                              >
                                {String.fromCharCode(65 + optIdx)}
                              </div>
                              <span>{opt.text}</span>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Bottom Navigator Controls */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    disabled={currentQuestionIdx === 0}
                    onClick={() => setCurrentQuestionIdx((p) => p - 1)}
                    className="px-4 py-2.5 rounded-xl bg-[var(--bg-surface-elevated)] hover:bg-[var(--brand-border)] disabled:opacity-40 text-xs font-bold text-[var(--brand-text)] flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  {activeQuiz.questions && currentQuestionIdx < activeQuiz.questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentQuestionIdx((p) => p + 1)}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30"
                    >
                      <span>Next Question</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isSubmittingTest}
                      onClick={handleSubmitQuiz}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-600/30"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isSubmittingTest ? 'Submitting...' : 'Submit Final Test'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBMIT ASSIGNMENT MODAL */}
      {activeAssignment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] w-full max-w-xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--brand-border)] pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-400">
                  Practical Submission
                </span>
                <h2 className="text-xl font-black text-[var(--brand-text)]">
                  {activeAssignment.title}
                </h2>
              </div>
              <button
                onClick={() => setActiveAssignment(null)}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {assignmentSuccessMsg ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto" />
                <p>{assignmentSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitAssignment} className="space-y-4">
                <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 text-xs text-[var(--brand-text)] space-y-1">
                  <div className="font-bold text-purple-400">Assignment Rubric & Guidelines:</div>
                  <p className="text-[var(--text-muted)] text-[11px] leading-relaxed">
                    {activeAssignment.assignmentDetails?.rubric ||
                      'Submit your project link or upload your report deck.'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--brand-text)] mb-1.5">
                    Project Deliverable Link (Google Drive / GitHub / Figma / Doc) *
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://drive.google.com/... or https://github.com/..."
                    value={assignmentLink}
                    onChange={(e) => setAssignmentLink(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-xs text-[var(--brand-text)] focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--brand-text)] mb-1.5">
                    Notes or Strategy Summary for Trainer
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Highlight your key achievements, target audience breakdown, or assumptions made in your project..."
                    value={assignmentText}
                    onChange={(e) => setAssignmentText(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-xs text-[var(--brand-text)] focus:border-purple-500"
                  />
                </div>

                <div className="pt-4 border-t border-[var(--brand-border)] flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveAssignment(null)}
                    className="px-4 py-2.5 rounded-xl bg-[var(--bg-surface-elevated)] hover:bg-[var(--brand-border)] text-xs font-bold text-[var(--brand-text)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAssignment}
                    className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-lg shadow-purple-600/30"
                  >
                    {isSubmittingAssignment ? 'Submitting...' : 'Upload & Submit Assignment'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
