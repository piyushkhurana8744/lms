'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Award,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Building2,
  Calendar,
  User,
  CheckCircle2,
  Loader2,
  Lock
} from 'lucide-react';

interface VerificationData {
  valid: boolean;
  status: 'ISSUED' | 'REVOKED';
  certificateNumber: string;
  studentName: string;
  courseTitle: string;
  organizationName: string;
  issuedAt: string;
  completionDate: string;
}

export default function PublicCertificateVerificationPage() {
  const params = useParams();
  const code = params.code as string;

  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (code) {
      verifyCredential(code);
    }
  }, [code]);

  async function verifyCredential(verificationCode: string) {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/public/certificates/verify/${encodeURIComponent(verificationCode)}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Certificate verification failed');
      }
      setData(json.data);
    } catch (err: any) {
      setError(err.message || 'Credential not found or invalid');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)] flex flex-col justify-center items-center p-4 md:p-8">
      <div className="w-full max-w-xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#BE1E2E] text-white font-black text-2xl flex items-center justify-center mx-auto shadow-lg shadow-[#BE1E2E]/20">
            D
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--brand-text)]">
            DIDM Credential Verification Registry
          </h1>
          <p className="text-xs text-[var(--text-muted)] font-mono">
            Public trust & credential authenticity service
          </p>
        </div>

        {/* Verification Card */}
        <div className="rounded-3xl border border-[var(--brand-border)] bg-[var(--bg-surface)] p-6 md:p-8 shadow-xl space-y-6">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#BE1E2E]" />
              <span className="text-xs font-mono text-[var(--text-muted)]">Verifying digital signature...</span>
            </div>
          ) : error || !data ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
                <HelpCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--brand-text)]">Unverified / Invalid Credential</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm mx-auto">
                  The provided verification code could not be verified in our public registry. Please check the URL or QR code.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Authenticity Banner */}
              {data.valid ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-500">Official Authenticated Credential</h3>
                    <p className="text-[11px] text-emerald-600/90 dark:text-emerald-400">
                      This certificate has been issued and verified in the official registry.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-red-500">Revoked Credential</h3>
                    <p className="text-[11px] text-red-600/90 dark:text-red-400">
                      This certificate is no longer valid. The issuing organization has revoked this credential.
                    </p>
                  </div>
                </div>
              )}

              {/* Credential Details */}
              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase font-semibold text-[var(--text-muted)] tracking-wider">
                    Student Name
                  </span>
                  <div className="text-lg font-extrabold text-[var(--brand-text)] flex items-center gap-2">
                    <User className="w-4 h-4 text-[#BE1E2E]" />
                    <span>{data.studentName}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase font-semibold text-[var(--text-muted)] tracking-wider">
                    Course / Qualification
                  </span>
                  <div className="text-base font-bold text-[var(--brand-text)] flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#BE1E2E]" />
                    <span>{data.courseTitle}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[var(--brand-border)]">
                  <div>
                    <span className="text-[10px] font-mono uppercase font-semibold text-[var(--text-muted)] tracking-wider block">
                      Issuing Academy
                    </span>
                    <span className="text-xs font-semibold text-[var(--brand-text)] flex items-center gap-1.5 mt-1">
                      <Building2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span>{data.organizationName}</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono uppercase font-semibold text-[var(--text-muted)] tracking-wider block">
                      Certificate ID
                    </span>
                    <span className="text-xs font-mono font-bold text-[var(--brand-text)] block mt-1">
                      {data.certificateNumber}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono uppercase font-semibold text-[var(--text-muted)] tracking-wider block">
                      Completion Date
                    </span>
                    <span className="text-xs font-mono text-[var(--brand-text)] block mt-1">
                      {new Date(data.completionDate).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono uppercase font-semibold text-[var(--text-muted)] tracking-wider block">
                      Issued Date
                    </span>
                    <span className="text-xs font-mono text-[var(--brand-text)] block mt-1">
                      {new Date(data.issuedAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Security notice */}
              <div className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                <Lock className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span>
                  Tamper-proof digital record verified against immutable DIDM LMS platform ledger.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
