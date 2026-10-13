'use client';

import React, { useState } from 'react';
import { Button } from '@edtech/ui';
import { Mail, UserPlus, Copy, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { OrganizationMemberRole } from '@edtech/types';

export interface InviteMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSendInvite: (email: string, role: OrganizationMemberRole) => Promise<{ invitationToken?: string; expiresAt?: string } | void>;
  isPending: boolean;
}

export function InviteMemberDialog({ isOpen, onClose, onSendInvite, isPending }: InviteMemberDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrganizationMemberRole>('INSTRUCTOR');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [invitedToken, setInvitedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please provide a valid email address.');
      return;
    }

    setErrorMsg(null);
    try {
      const res = await onSendInvite(email.trim(), role);
      if (res && res.invitationToken) {
        setInvitedToken(res.invitationToken);
      } else {
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send invitation.');
    }
  };

  const handleCopyLink = () => {
    if (!invitedToken) return;
    const inviteUrl = `${window.location.origin}/invitations/${invitedToken}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCloseAll = () => {
    setEmail('');
    setRole('INSTRUCTOR');
    setErrorMsg(null);
    setInvitedToken(null);
    setCopied(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl text-[var(--brand-text)]">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--brand-border)]">
          <h3 className="font-extrabold text-base flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#BE1E2E]" /> Invite Team Member
          </h3>
          <button onClick={handleCloseAll} className="text-[var(--text-muted)] hover:text-[var(--brand-text)] text-xs">
            ✕
          </button>
        </div>

        {invitedToken ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs space-y-2">
              <div className="font-bold text-sm">Invitation Generated Successfully!</div>
              <p className="text-[11px]">Share this secure single-use invitation link with {email}:</p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] flex items-center justify-between gap-2 font-mono text-xs">
              <span className="truncate text-[var(--text-muted)]">{`${typeof window !== 'undefined' ? window.location.origin : ''}/invitations/${invitedToken}`}</span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="p-1.5 rounded-lg bg-[#BE1E2E]/10 text-[#BE1E2E] hover:bg-[#BE1E2E]/20 font-sans text-xs font-bold flex items-center gap-1 flex-shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="button" variant="primary" size="sm" onClick={handleCloseAll}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <p className="text-[var(--text-muted)] text-xs">
              You are inviting this person to join your organization workspace. An invitation token will be generated.
            </p>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="font-bold text-[var(--brand-text)] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#BE1E2E]" /> Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="colleague@organization.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs focus:outline-none focus:border-[#BE1E2E]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[var(--brand-text)] block">Assign Organization Role *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as OrganizationMemberRole)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs focus:outline-none focus:border-[#BE1E2E]"
              >
                <option value="INSTRUCTOR">Instructor (Content Creator & Educator)</option>
                <option value="STUDENT">Student (Learner)</option>
                <option value="TENANT_ADMIN">Tenant Admin (Full Workspace Access)</option>
              </select>
            </div>

            <div className="pt-3 border-t border-[var(--brand-border)] flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleCloseAll} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isPending} className="flex items-center gap-1.5">
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Send Invitation</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
