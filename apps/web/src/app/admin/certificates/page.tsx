'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useConfirmation } from '@/components/confirmation/useConfirmation';
import {
  Award,
  PlusCircle,
  Search,
  Filter,
  Download,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Building2,
  User,
  BookOpen,
  Calendar,
  X
} from 'lucide-react';

interface CertificateRow {
  id: string;
  certificateNumber: string;
  verificationCode: string;
  verificationUrl: string;
  student: { name: string };
  course: { title: string };
  organization: { name: string };
  completionDate: string;
  issuedAt: string;
  status: 'ISSUED' | 'REVOKED';
  artifact: {
    status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
    generatedAt?: string;
    retryCount: number;
  };
  revokedAt?: string;
  revocationReason?: string;
}

interface EligibilityResult {
  eligible: boolean;
  enrollmentId: string;
  student: { id: string; name: string };
  course: { id: string; title: string };
  checks: {
    enrollment: { passed: boolean; status: string };
    courseCompletion: { passed: boolean; progressPercent: number; completedAt: string | null };
    assessments: { passed: boolean; policy: string };
    attendance: { passed: boolean; policy: string };
    finance: { passed: boolean; policy: string };
  };
  reasons: string[];
}

export default function AdminCertificatesPage() {
  const { user, hasPermission } = useAuth();
  const { confirm } = useConfirmation();

  const [certificates, setCertificates] = useState<CertificateRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ISSUED' | 'REVOKED'>('ALL');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Eligibility & Issue Modal State
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [enrollmentInput, setEnrollmentInput] = useState('');
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(null);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);

  // Revoke Modal State
  const [revokeTarget, setRevokeTarget] = useState<CertificateRow | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);

  const fetchCertificates = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit)
      });
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (search.trim()) params.append('search', search.trim());

      const res = await fetch(`/api/v1/certificates?${params.toString()}`);
      const json = await res.json();
      if (res.ok) {
        const certList = Array.isArray(json.data)
          ? json.data
          : Array.isArray(json.data?.data)
          ? json.data.data
          : [];
        const totalCount =
          json.data?.pagination?.total ??
          json.pagination?.total ??
          certList.length ??
          0;
        setCertificates(certList);
        setTotal(totalCount);
      } else {
        setCertificates([]);
        setTotal(0);
      }
    } catch (err) {
      console.error('Failed to load certificates', err);
      setCertificates([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, search]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchCertificates();
  }

  async function handleCheckEligibility() {
    if (!enrollmentInput.trim()) return;
    try {
      setEligibilityLoading(true);
      setEligibilityError(null);
      setEligibilityResult(null);

      const res = await fetch(`/api/v1/certificates/eligibility?enrollmentId=${encodeURIComponent(enrollmentInput.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to inspect eligibility');
      }
      setEligibilityResult(data.data);
    } catch (err: any) {
      setEligibilityError(err.message || 'Error checking eligibility');
    } finally {
      setEligibilityLoading(false);
    }
  }

  async function handleIssueCertificate() {
    if (!eligibilityResult || !eligibilityResult.eligible) return;
    try {
      setIssuing(true);
      const res = await fetch('/api/v1/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId: eligibilityResult.enrollmentId })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to issue certificate');
      }
      setIsIssueModalOpen(false);
      setEnrollmentInput('');
      setEligibilityResult(null);
      fetchCertificates();
    } catch (err: any) {
      alert(err.message || 'Issuance failed');
    } finally {
      setIssuing(false);
    }
  }

  async function handleRevokeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!revokeTarget || !revokeReason.trim()) return;
    try {
      setRevoking(true);
      const res = await fetch(`/api/v1/certificates/${revokeTarget.id}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: revokeReason.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to revoke certificate');
      }
      setRevokeTarget(null);
      setRevokeReason('');
      fetchCertificates();
    } catch (err: any) {
      alert(err.message || 'Revocation failed');
    } finally {
      setRevoking(false);
    }
  }

  async function handleRetryArtifact(id: string) {
    try {
      setActionLoading(id);
      const res = await fetch(`/api/v1/certificates/${id}/artifact/retry`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to trigger artifact retry');
      }
      fetchCertificates();
    } catch (err: any) {
      alert(err.message || 'Retry failed');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDownload(id: string, certificateNumber: string) {
    try {
      setActionLoading(id);
      const res = await fetch(`/api/v1/certificates/${id}/download`);
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message || 'Download failed');
      }

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const json = await res.json();
        if (json.data?.url) {
          window.open(json.data.url, '_blank');
          return;
        }
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${certificateNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Download failed');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--brand-border)] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#BE1E2E]/10 text-[#BE1E2E] flex items-center justify-center shadow-sm">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--brand-text)]">Certificates & Credentials</h1>
              <p className="text-xs text-[var(--text-muted)] font-mono">
                Manage course completion credentials, verify eligibility, and oversee artifact generation
              </p>
            </div>
          </div>
        </div>

        {hasPermission('certificate.issue') && (
          <button
            onClick={() => {
              setIsIssueModalOpen(true);
              setEligibilityResult(null);
              setEligibilityError(null);
            }}
            className="py-2.5 px-4 rounded-xl text-xs font-bold bg-[#BE1E2E] text-white hover:bg-[#a01826] transition-colors flex items-center gap-2 shadow-md shadow-[#BE1E2E]/20"
          >
            <PlusCircle className="w-4 h-4" /> Issue Certificate
          </button>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl border border-[var(--brand-border)] bg-[var(--bg-surface)]">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search by student, course, or certificate #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-[var(--brand-background)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:border-[#BE1E2E]"
            />
          </div>
          <button
            type="submit"
            className="py-2 px-4 rounded-xl text-xs font-semibold bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] hover:bg-[var(--brand-border)] transition-colors text-[var(--brand-text)]"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-[var(--text-muted)]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl text-xs bg-[var(--brand-background)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ISSUED">Issued (Active)</option>
            <option value="REVOKED">Revoked</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[var(--brand-border)] bg-[var(--bg-surface)] overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#BE1E2E]" />
            <span className="text-xs font-mono text-[var(--text-muted)]">Loading credentials...</span>
          </div>
        ) : certificates.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Award className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
            <h3 className="text-sm font-bold text-[var(--brand-text)]">No certificates found</h3>
            <p className="text-xs text-[var(--text-muted)]">Try adjusting your filters or issue a new certificate</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--brand-border)] bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] font-mono uppercase text-[10px]">
                  <th className="py-3.5 px-4 font-semibold">Certificate #</th>
                  <th className="py-3.5 px-4 font-semibold">Student</th>
                  <th className="py-3.5 px-4 font-semibold">Course</th>
                  <th className="py-3.5 px-4 font-semibold">Issued Date</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Artifact</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--brand-border)]">
                {certificates.map((cert) => {
                  const isRevoked = cert.status === 'REVOKED';
                  const artifactStatus = cert.artifact?.status || 'PENDING';
                  return (
                    <tr key={cert.id} className="hover:bg-[var(--bg-surface-elevated)]/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[var(--brand-text)]">
                        {cert.certificateNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-[var(--brand-text)]">{cert.student.name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-[var(--text-muted)] max-w-xs truncate">
                        {cert.course.title}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[var(--text-muted)]">
                        {new Date(cert.issuedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">
                        {isRevoked ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20">
                            <ShieldAlert className="w-3 h-3" /> REVOKED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <ShieldCheck className="w-3 h-3" /> ISSUED
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                            artifactStatus === 'READY'
                              ? 'bg-emerald-500/10 text-emerald-500 font-bold'
                              : artifactStatus === 'FAILED'
                              ? 'bg-red-500/10 text-red-500 font-bold'
                              : 'bg-amber-500/10 text-amber-500 font-medium'
                          }`}
                        >
                          {artifactStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                        {/* Download button */}
                        {artifactStatus === 'READY' && (
                          <button
                            onClick={() => handleDownload(cert.id, cert.certificateNumber)}
                            disabled={actionLoading === cert.id}
                            className="p-1.5 rounded-lg border border-[var(--brand-border)] hover:bg-[var(--brand-border)] transition-colors text-[var(--brand-text)] inline-flex items-center"
                            title="Download PDF"
                          >
                            {actionLoading === cert.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}

                        {/* Retry button */}
                        {artifactStatus === 'FAILED' && hasPermission('certificate.artifact.retry') && (
                          <button
                            onClick={() => handleRetryArtifact(cert.id)}
                            disabled={actionLoading === cert.id}
                            className="p-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors inline-flex items-center"
                            title="Retry PDF Generation"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Public verify link */}
                        <a
                          href={`/verify/certificate/${cert.verificationCode}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg border border-[var(--brand-border)] hover:bg-[var(--brand-border)] transition-colors text-[var(--text-muted)] inline-flex items-center"
                          title="Verify Publicly"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        {/* Revoke button */}
                        {!isRevoked && hasPermission('certificate.revoke') && (
                          <button
                            onClick={() => {
                              setRevokeTarget(cert);
                              setRevokeReason('');
                            }}
                            className="py-1 px-2 rounded-lg text-[10px] font-bold border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-colors"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="p-4 border-t border-[var(--brand-border)] flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-lg border border-[var(--brand-border)] disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page * limit >= total}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-lg border border-[var(--brand-border)] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Issue Modal & Eligibility Inspector */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--brand-border)] pb-4">
              <h3 className="text-base font-bold text-[var(--brand-text)] flex items-center gap-2">
                <Award className="w-5 h-5 text-[#BE1E2E]" /> Issue New Certificate
              </h3>
              <button
                onClick={() => setIsIssueModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-surface-elevated)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Input Form */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-[var(--brand-text)] block">
                Enrollment ID (Canonical Target)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter 24-char MongoDB Enrollment ID..."
                  value={enrollmentInput}
                  onChange={(e) => setEnrollmentInput(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl text-xs bg-[var(--brand-background)] border border-[var(--brand-border)] text-[var(--brand-text)] font-mono focus:outline-none focus:border-[#BE1E2E]"
                />
                <button
                  type="button"
                  onClick={handleCheckEligibility}
                  disabled={eligibilityLoading || !enrollmentInput.trim()}
                  className="py-2 px-4 rounded-xl text-xs font-bold bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] hover:bg-[var(--brand-border)] disabled:opacity-50 text-[var(--brand-text)]"
                >
                  {eligibilityLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Inspect'}
                </button>
              </div>
            </div>

            {/* Error */}
            {eligibilityError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{eligibilityError}</span>
              </div>
            )}

            {/* Eligibility Inspection Result */}
            {eligibilityResult && (
              <div className="p-4 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface-elevated)] space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--brand-border)]">
                  <div>
                    <span className="font-bold text-[var(--brand-text)] block">{eligibilityResult.student.name}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{eligibilityResult.course.title}</span>
                  </div>
                  {eligibilityResult.eligible ? (
                    <span className="flex items-center gap-1 font-bold text-emerald-500 text-[11px]">
                      <CheckCircle2 className="w-4 h-4" /> ELIGIBLE
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 font-bold text-red-500 text-[11px]">
                      <XCircle className="w-4 h-4" /> NOT ELIGIBLE
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span>Course Progress:</span>
                    <span className="font-mono font-bold text-[var(--brand-text)]">
                      {eligibilityResult.checks.courseCompletion.progressPercent}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Enrollment Status:</span>
                    <span className="font-mono text-[var(--brand-text)]">
                      {eligibilityResult.checks.enrollment.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Assessment Policy:</span>
                    <span className="text-[var(--text-muted)]">
                      {eligibilityResult.checks.assessments.policy}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Attendance Policy:</span>
                    <span className="text-[var(--text-muted)]">
                      {eligibilityResult.checks.attendance.policy}
                    </span>
                  </div>
                </div>

                {!eligibilityResult.eligible && eligibilityResult.reasons.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[11px]">
                    <span className="font-bold">Reasons:</span> {eligibilityResult.reasons.join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--brand-border)]">
              <button
                type="button"
                onClick={() => setIsIssueModalOpen(false)}
                className="py-2 px-4 rounded-xl text-xs font-semibold border border-[var(--brand-border)] text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleIssueCertificate}
                disabled={issuing || !eligibilityResult?.eligible}
                className="py-2 px-5 rounded-xl text-xs font-bold bg-[#BE1E2E] text-white hover:bg-[#a01826] disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-md shadow-[#BE1E2E]/20"
              >
                {issuing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Issue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Modal */}
      {revokeTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleRevokeSubmit}
            className="w-full max-w-md rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--brand-border)] pb-3">
              <h3 className="text-sm font-bold text-red-500 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" /> Revoke Certificate
              </h3>
              <button
                type="button"
                onClick={() => setRevokeTarget(null)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-surface-elevated)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              You are about to revoke certificate <strong className="text-[var(--brand-text)] font-mono">{revokeTarget.certificateNumber}</strong> for student <strong className="text-[var(--brand-text)]">{revokeTarget.student.name}</strong>. This will permanently mark the public credential as REVOKED.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--brand-text)] block">
                Revocation Reason (Mandatory)
              </label>
              <textarea
                required
                rows={3}
                placeholder="Explain why this credential is being revoked..."
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className="w-full p-2.5 rounded-xl text-xs bg-[var(--brand-background)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--brand-border)]">
              <button
                type="button"
                onClick={() => setRevokeTarget(null)}
                className="py-2 px-4 rounded-xl text-xs font-semibold border border-[var(--brand-border)] text-[var(--brand-text)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={revoking || !revokeReason.trim()}
                className="py-2 px-4 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-md shadow-red-600/20"
              >
                {revoking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Revocation'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
