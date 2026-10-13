'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import {
  Award,
  Download,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Calendar,
  Building2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface StudentCertificate {
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

export default function StudentCertificatesPage() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<StudentCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCertificates();
  }, []);

  async function fetchCertificates() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/v1/student/certificates');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to fetch certificates');
      }
      const certList = Array.isArray(data.data)
        ? data.data
        : Array.isArray(data.data?.data)
        ? data.data.data
        : [];
      setCertificates(certList);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(id: string, certificateNumber: string) {
    try {
      setDownloadingId(id);
      const res = await fetch(`/api/v1/student/certificates/${id}/download`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error?.message || 'Download failed or certificate not ready');
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
      alert(err.message || 'Failed to download certificate artifact');
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--brand-border)] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#BE1E2E]/10 text-[#BE1E2E] flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--brand-text)]">My Certificates</h1>
              <p className="text-xs text-[var(--text-muted)] font-mono">
                Official course completion credentials and public verification records
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#BE1E2E]" />
          <p className="text-xs font-mono text-[var(--text-muted)]">Loading credentials...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : certificates.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-[var(--brand-border)] bg-[var(--bg-surface)] space-y-3">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] flex items-center justify-center mx-auto">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[var(--brand-text)]">No Certificates Issued Yet</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
            Complete your enrolled courses and fulfill all graduation requirements to earn verified digital credentials.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map((cert) => {
            const isRevoked = cert.status === 'REVOKED';
            const isReady = cert.artifact?.status === 'READY';
            const isProcessing = cert.artifact?.status === 'PENDING' || cert.artifact?.status === 'PROCESSING';

            return (
              <div
                key={cert.id}
                className="relative rounded-2xl border border-[var(--brand-border)] bg-[var(--bg-surface)] p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="space-y-4">
                  {/* Status Badges */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] border border-[var(--brand-border)]">
                      {cert.certificateNumber}
                    </span>
                    {isRevoked ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20">
                        <ShieldAlert className="w-3 h-3" /> REVOKED
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <ShieldCheck className="w-3 h-3" /> VERIFIED
                      </span>
                    )}
                  </div>

                  {/* Course & Org info */}
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-[var(--brand-text)] line-clamp-2">
                      {cert.course.title}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{cert.organization.name}</span>
                    </p>
                  </div>

                  {/* Dates */}
                  <div className="space-y-1 pt-2 border-t border-[var(--brand-border)] text-[11px] text-[var(--text-muted)]">
                    <div className="flex items-center justify-between">
                      <span>Completed:</span>
                      <span className="font-mono font-medium text-[var(--brand-text)]">
                        {new Date(cert.completionDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Issued Date:</span>
                      <span className="font-mono font-medium text-[var(--brand-text)]">
                        {new Date(cert.issuedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {isRevoked && cert.revocationReason && (
                    <div className="p-2.5 rounded-lg bg-red-500/5 border border-red-500/15 text-[11px] text-red-500">
                      <span className="font-bold">Revocation Notice:</span> {cert.revocationReason}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-4 mt-4 border-t border-[var(--brand-border)] flex items-center gap-2">
                  {!isRevoked && (
                    <button
                      onClick={() => handleDownload(cert.id, cert.certificateNumber)}
                      disabled={downloadingId === cert.id || !isReady}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-[#BE1E2E] text-white hover:bg-[#a01826] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-[#BE1E2E]/20"
                    >
                      {downloadingId === cert.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isProcessing ? (
                        <span className="text-[10px]">Generating PDF...</span>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Download PDF</span>
                        </>
                      )}
                    </button>
                  )}

                  <a
                    href={`/verify/certificate/${cert.verificationCode}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border border-[var(--brand-border)] hover:bg-[var(--bg-surface-elevated)] transition-colors flex items-center justify-center gap-1.5 text-[var(--brand-text)] ${
                      isRevoked ? 'w-full' : ''
                    }`}
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span>Verify</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
