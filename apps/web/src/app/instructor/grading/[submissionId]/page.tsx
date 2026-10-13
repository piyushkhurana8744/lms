'use client';

import React, { FormEvent, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck,
  User,
  Award,
  ArrowLeft,
  ExternalLink,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { PageHeader, StatusBadge } from '@/components/ui';
import { Button } from '@edtech/ui';

export default function SubmissionGradingPage({ params }: { params: { submissionId: string } }) {
  const [data, setData] = useState<any>();
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/v1/instructor/grading/${params.submissionId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error('Submission unavailable or access denied');
        return r.json();
      })
      .then((r) => {
        setData(r.data);
        setScore(String(r.data?.score ?? ''));
        setFeedback(r.data?.feedback || '');
      })
      .catch((e) => setMessage(e.message));
  }, [params.submissionId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setIsSuccess(false);

    try {
      const r = await fetch(`/api/v1/instructor/grading/${params.submissionId}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          score: Number(score),
          feedback,
          expectedRevision: data?.revision,
        }),
      });

      setSaving(false);
      if (r.status === 409) {
        return setMessage('This submission changed concurrently. Reload before grading again.');
      }
      if (!r.ok) {
        return setMessage('Grade could not be saved. Please verify inputs.');
      }

      setIsSuccess(true);
      setMessage('Grade evaluated successfully! Student notification dispatched.');
      await load();
    } catch (err: any) {
      setSaving(false);
      setMessage(err.message || 'Network error saving grade');
    }
  };

  if (!data) {
    return (
      <div className="p-8 max-w-4xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="text-xs font-mono text-[var(--text-muted)] animate-pulse">
          {message || 'Loading student submission evaluation workspace...'}
        </div>
      </div>
    );
  }

  const studentName = data.userId?.name || 'Enrolled Student';
  const assessmentTitle = data.assessmentId?.title || 'Course Assessment';
  const maxScore = data.maxScore || 100;
  const isGraded = data.status === 'GRADED';

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-4xl mx-auto min-h-screen animate-fade-in">
      <PageHeader
        title={assessmentTitle}
        description={`Student: ${studentName} · Evaluation Matrix: Maximum ${maxScore} points`}
        breadcrumbs={[
          { label: 'Trainer OS', href: '/instructor' },
          { label: 'Grading Queue', href: '/instructor/grading' },
          { label: studentName },
        ]}
        badge={<StatusBadge status={data.status} />}
      />

      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${
            isSuccess
              ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/25 text-rose-500'
          }`}
        >
          {isSuccess ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{message}</span>
        </div>
      )}

      {/* Submission Payload Inspection */}
      <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--brand-border)]">
          <span className="text-xs font-bold font-mono uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#BE1E2E]" /> Student Submission Content
          </span>
          <span className="text-[10px] font-mono text-[var(--text-muted)]">
            Submitted: {new Date(data.submittedAt || Date.now()).toLocaleString()}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-xs text-[var(--brand-text)] whitespace-pre-wrap font-sans leading-relaxed min-h-[100px]">
          {data.assignmentSubmission?.submissionText ||
            data.assignmentSubmission?.linkUrl ||
            data.assignmentSubmission?.fileName || (
              <span className="text-[var(--text-muted)] italic">No textual submission content provided.</span>
            )}
        </div>

        {data.assignmentSubmission?.linkUrl && (
          <div className="pt-2">
            <a
              href={data.assignmentSubmission.linkUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#BE1E2E] hover:underline"
            >
              <span>Inspect External Project Link</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* Grading Form */}
      <form
        onSubmit={submit}
        className="p-6 sm:p-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-xs space-y-6"
      >
        <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase tracking-wider text-[var(--text-muted)]">
          <Award className="w-4 h-4 text-[#BE1E2E]" /> Academic Assessment Evaluation
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
              Numerical Score (Out of {maxScore})
            </label>
            <input
              type="number"
              required
              min="0"
              max={maxScore}
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder={`Score between 0 and ${maxScore}`}
              className="w-full sm:w-48 px-3.5 py-2.5 rounded-xl text-xs bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:border-[#BE1E2E] font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
              Faculty Feedback & Constructive Remarks
            </label>
            <textarea
              rows={5}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide constructive feedback for student development and rubric alignment..."
              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:border-[#BE1E2E] leading-relaxed"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-3 border-t border-[var(--brand-border)]">
          <Link
            href="/instructor/grading"
            className="px-4 py-2.5 rounded-xl border border-[var(--brand-border)] text-xs font-semibold text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
          >
            Back to Queue
          </Link>
          <Button
            type="submit"
            disabled={saving}
            className="btn-primary text-xs font-bold px-6 py-2.5 rounded-xl shadow-md shadow-[#BE1E2E]/20"
          >
            {saving ? 'Recording Grade...' : isGraded ? 'Update Evaluation' : 'Finalize Grade'}
          </Button>
        </div>
      </form>
    </div>
  );
}
