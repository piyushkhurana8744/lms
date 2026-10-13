'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card } from '@edtech/ui';
import { useGlobalError } from '@/components/error/useGlobalError';
import { Users, ArrowRight, ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';

export interface TeamStepProps {
  onNext: () => void;
  onBack: () => void;
  onSkipStep: () => void;
}

interface InviteItem {
  email: string;
  role: 'INSTRUCTOR' | 'TENANT_ADMIN';
}

export function TeamStep({
  onNext,
  onBack,
  onSkipStep
}: TeamStepProps) {
  const queryClient = useQueryClient();
  const { showError } = useGlobalError();

  const [invites, setInvites] = useState<InviteItem[]>([{ email: '', role: 'INSTRUCTOR' }]);

  const addInvite = () => {
    setInvites([...invites, { email: '', role: 'INSTRUCTOR' }]);
  };

  const removeInvite = (index: number) => {
    if (invites.length <= 1) return;
    setInvites(invites.filter((_, i) => i !== index));
  };

  const updateInvite = (index: number, field: keyof InviteItem, value: string) => {
    const copy = [...invites];
    copy[index] = { ...copy[index], [field]: value };
    setInvites(copy);
  };

  const inviteMutation = useMutation({
    mutationFn: async (items: InviteItem[]) => {
      const validItems = items.filter((i) => i.email.trim() && i.email.includes('@'));
      if (validItems.length === 0) return;

      for (const item of validItems) {
        const res = await fetch('/api/v1/organization/members/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: item.email.trim(), role: item.role })
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error?.message || `Failed to invite ${item.email}`);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      onNext();
    },
    onError: (err: Error) => {
      showError({ title: 'Invitation Error', message: err.message });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = invites.filter((i) => i.email.trim() && i.email.includes('@'));
    if (valid.length === 0) {
      onNext();
      return;
    }
    inviteMutation.mutate(valid);
  };

  return (
    <Card className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-6 max-w-2xl mx-auto shadow-xl">
      <div className="flex items-center gap-3 pb-4 border-b border-[var(--brand-border)]">
        <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <span className="text-[10px] font-mono font-bold text-indigo-500 uppercase tracking-wider">
            Step 6 of 8
          </span>
          <h3 className="text-xl font-extrabold text-[var(--brand-text)]">Team & Instructors</h3>
          <p className="text-xs text-[var(--text-muted)]">
            Optionally invite instructors or co-administrators to collaborate on your platform.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="space-y-3">
          {invites.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="email"
                placeholder="colleague@yourcompany.com"
                value={item.email}
                onChange={(e) => updateInvite(index, 'email', e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs"
              />
              <select
                value={item.role}
                onChange={(e) => updateInvite(index, 'role', e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs"
              >
                <option value="INSTRUCTOR">Instructor</option>
                <option value="TENANT_ADMIN">Tenant Admin</option>
              </select>

              {invites.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeInvite(index)}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addInvite}
          className="text-xs text-[#BE1E2E] font-bold flex items-center gap-1 hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> Add another invitation
        </button>

        <div className="pt-6 border-t border-[var(--brand-border)] flex items-center justify-between gap-4">
          <Button type="button" variant="outline" size="sm" onClick={onBack} className="flex items-center gap-1.5 text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSkipStep}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--brand-text)] font-semibold px-3"
            >
              Skip for now
            </button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={inviteMutation.isPending}
              className="flex items-center gap-1.5 btn-primary text-xs"
            >
              {inviteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              <span>Send & Continue</span>
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
