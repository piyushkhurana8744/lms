'use client';

import React, { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Plus, ArrowLeft, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui';
import { Button } from '@edtech/ui';

export default function NewBranchPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));

    try {
      const response = await fetch('/api/v1/branches', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(values),
      });
      const payload = await response.json();
      setSaving(false);
      if (!response.ok) {
        setError(payload.error?.message || 'Unable to create branch');
        return;
      }
      router.push(`/admin/branches/${payload.data._id}`);
    } catch (err: any) {
      setError(err.message || 'Network error occurred');
      setSaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-3xl mx-auto min-h-screen animate-fade-in">
      <PageHeader
        title="Add Campus Branch"
        description="Configure a new operational branch, campus center, or virtual division for this tenant."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Branches', href: '/admin/branches' },
          { label: 'New Branch' },
        ]}
      />

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form
        onSubmit={submit}
        className="p-6 sm:p-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-xs space-y-5"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
              Branch Name
            </label>
            <input
              required
              name="name"
              placeholder="e.g. South Extension Center"
              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:border-[#BE1E2E] focus:ring-2 focus:ring-[#BE1E2E]/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                Branch Code
              </label>
              <input
                required
                name="code"
                pattern="[A-Za-z0-9][A-Za-z0-9_-]+"
                placeholder="e.g. SOUTH_EXT"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono uppercase bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:border-[#BE1E2E]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                URL Slug (Optional)
              </label>
              <input
                name="slug"
                placeholder="e.g. south-extension"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:border-[#BE1E2E]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
              IANA Timezone
            </label>
            <input
              required
              name="timezone"
              defaultValue="Asia/Kolkata"
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:border-[#BE1E2E]"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-3 border-t border-[var(--brand-border)]">
          <Link
            href="/admin/branches"
            className="px-4 py-2.5 rounded-xl border border-[var(--brand-border)] text-xs font-semibold text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
          >
            Cancel
          </Link>
          <Button
            type="submit"
            disabled={saving}
            className="btn-primary text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-[#BE1E2E]/20"
          >
            {saving ? 'Creating Branch...' : 'Create Branch'}
          </Button>
        </div>
      </form>
    </div>
  );
}
