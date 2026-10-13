'use client';

import React, { useState } from 'react';
import { IOrganizationMember, OrganizationMemberRole } from '@edtech/types';
import { Button } from '@edtech/ui';
import { Shield, AlertTriangle, Loader2 } from 'lucide-react';

export interface ChangeMemberRoleDialogProps {
  isOpen: boolean;
  member: IOrganizationMember | null;
  onClose: () => void;
  onConfirm: (newRole: OrganizationMemberRole) => Promise<void>;
  isPending: boolean;
}

export function ChangeMemberRoleDialog({
  isOpen,
  member,
  onClose,
  onConfirm,
  isPending
}: ChangeMemberRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<string>(member?.role || 'INSTRUCTOR');
  const [availableRoles, setAvailableRoles] = useState<{ name: string; slug: string; isSystemRole: boolean }[]>([]);

  React.useEffect(() => {
    if (member?.role) {
      setSelectedRole(member.role);
    }
  }, [member]);

  React.useEffect(() => {
    if (isOpen) {
      fetch('/api/v1/roles')
        .then((res) => res.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            setAvailableRoles(
              json.data.map((r: any) => ({
                name: r.name,
                slug: r.slug.toUpperCase(),
                isSystemRole: Boolean(r.isSystemRole)
              }))
            );
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen || !member) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(selectedRole as any);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl text-[var(--brand-text)]">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--brand-border)]">
          <h3 className="font-extrabold text-base flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-500" /> Change Member Role
          </h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--brand-text)] text-xs">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Changing this role will immediately update <strong>{member.user?.name || member.user?.email}</strong>&apos;s permissions across the organization console.
            </p>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-[var(--brand-text)] block">Current Role</label>
            <div className="px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs font-mono font-bold">
              {member.role}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-[var(--brand-text)] block">Select New Role *</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs focus:outline-none focus:border-[#BE1E2E]"
            >
              {availableRoles.length > 0 ? (
                availableRoles.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.name} {r.isSystemRole ? '(System Role)' : '(Custom Role)'}
                  </option>
                ))
              ) : (
                <>
                  <option value="INSTRUCTOR">Instructor (Content Creator & Educator)</option>
                  <option value="STUDENT">Student (Learner)</option>
                  <option value="TENANT_ADMIN">Tenant Admin (Full Administrative Control)</option>
                </>
              )}
            </select>
          </div>

          <div className="pt-3 border-t border-[var(--brand-border)] flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isPending} className="flex items-center gap-1.5">
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Update Role</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
