'use client';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type Branch = {
  _id: string;
  name: string;
  code: string;
  slug: string;
  status: string;
  timezone: string;
  isPrimary: boolean;
  revision: number;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  contactPhone?: string;
  contactEmail?: string;
};

export default function BranchDetailPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const router = useRouter();
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflictError, setConflictError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');

  const loadBranch = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setConflictError('');
      const res = await fetch(`/api/v1/branches/${branchId}`);
      if (!res.ok) {
        throw new Error(res.status === 404 ? 'Branch not found' : 'Unable to load branch');
      }
      const payload = await res.json();
      const b: Branch = payload.data;
      setBranch(b);
      setName(b.name || '');
      setTimezone(b.timezone || 'Asia/Kolkata');
      setPhone(b.contactPhone || '');
      setEmail(b.contactEmail || '');
      setLine1(b.address?.line1 || '');
      setCity(b.address?.city || '');
      setState(b.address?.state || '');
      setPostalCode(b.address?.postalCode || '');
      setCountry(b.address?.country || 'India');
    } catch (e: any) {
      setError(e.message || 'Failed to load branch');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    if (branchId) loadBranch();
  }, [branchId, loadBranch]);

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!branch) return;
    setSaving(true);
    setConflictError('');
    setSuccessMessage('');

    try {
      const res = await fetch(`/api/v1/branches/${branch._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          timezone,
          contactPhone: phone,
          contactEmail: email,
          address: {
            line1,
            city,
            state,
            postalCode,
            country
          },
          revision: branch.revision
        })
      });

      const payload = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setConflictError('Another user modified this branch. Please reload to see the latest version before submitting.');
        } else {
          setConflictError(payload.error?.message || payload.message || 'Failed to update branch');
        }
        return;
      }

      setBranch(payload.data);
      setIsEditing(false);
      setSuccessMessage('Branch updated successfully');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setConflictError(err.message || 'Network error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!branch) return;
    if (branch.isPrimary) {
      alert('Primary branch cannot be archived.');
      return;
    }
    if (!confirm(`Are you sure you want to archive branch "${branch.name}"?`)) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/v1/branches/${branch._id}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision: branch.revision })
      });
      const payload = await res.json();
      if (!res.ok) {
        alert(payload.error?.message || payload.message || 'Failed to archive branch');
        return;
      }
      setBranch(payload.data);
      setSuccessMessage('Branch archived successfully');
    } catch (err: any) {
      alert(err.message || 'Network error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="p-8">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#BE1E2E] border-t-transparent" />
          <p className="text-sm font-medium text-[var(--text-muted)]">Loading branch details…</p>
        </div>
      </main>
    );
  }

  if (error || !branch) {
    return (
      <main className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/30 dark:bg-red-950/20">
          <h2 className="font-bold text-red-700 dark:text-red-400">Error</h2>
          <p className="mt-1 text-sm text-red-600 dark:text-red-300">{error || 'Branch not found'}</p>
          <Link href="/admin/branches" className="mt-4 inline-block text-xs font-semibold text-red-700 underline">
            ← Back to branches
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <Link href="/admin/branches" className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--brand-text)] flex items-center gap-1">
          ← Back to Branches
        </Link>
        {successMessage && (
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 rounded-lg border border-emerald-200">
            {successMessage}
          </span>
        )}
      </div>

      <header className="rounded-2xl border border-[var(--brand-border)] bg-[var(--bg-surface)] p-6 md:p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#BE1E2E] bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                {branch.code}
              </span>
              <span className="text-xs text-[var(--text-muted)]">/{branch.slug}</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--brand-text)] mt-2">
              {branch.name}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${
              branch.status === 'ACTIVE'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
            }`}>
              {branch.status}
            </span>
            {branch.isPrimary && (
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                Primary Branch
              </span>
            )}
            {!isEditing && branch.status !== 'ARCHIVED' && (
              <button
                onClick={() => setIsEditing(true)}
                className="ml-2 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] px-4 py-1.5 text-xs font-semibold hover:bg-[var(--brand-border)]"
              >
                Edit Branch
              </button>
            )}
            {!branch.isPrimary && branch.status !== 'ARCHIVED' && (
              <button
                onClick={handleArchive}
                disabled={saving}
                className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:bg-rose-950/20 dark:border-rose-900"
              >
                Archive
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleUpdate} className="mt-6 border-t border-[var(--brand-border)] pt-6 space-y-4">
            <h2 className="text-sm font-bold">Edit Branch (Revision {branch.revision})</h2>

            {conflictError && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-xs text-red-700 dark:bg-red-950/30 dark:border-red-800">
                <p className="font-bold">Update Conflict / Error</p>
                <p className="mt-1">{conflictError}</p>
                <button
                  type="button"
                  onClick={loadBranch}
                  className="mt-2 rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white"
                >
                  Reload Latest Version
                </button>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-semibold">
                Branch Name
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--brand-border)] bg-transparent p-2 text-sm"
                />
              </label>

              <label className="block text-xs font-semibold">
                Timezone (IANA)
                <input
                  required
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--brand-border)] bg-transparent p-2 text-sm"
                />
              </label>

              <label className="block text-xs font-semibold">
                Contact Phone
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--brand-border)] bg-transparent p-2 text-sm"
                />
              </label>

              <label className="block text-xs font-semibold">
                Contact Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--brand-border)] bg-transparent p-2 text-sm"
                />
              </label>

              <label className="block text-xs font-semibold sm:col-span-2">
                Street Address
                <input
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--brand-border)] bg-transparent p-2 text-sm"
                />
              </label>

              <label className="block text-xs font-semibold">
                City
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--brand-border)] bg-transparent p-2 text-sm"
                />
              </label>

              <label className="block text-xs font-semibold">
                State / Province
                <input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--brand-border)] bg-transparent p-2 text-sm"
                />
              </label>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#BE1E2E] px-4 py-2 text-xs font-bold text-white hover:bg-[#a01826] disabled:opacity-50"
              >
                {saving ? 'Saving changes…' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setConflictError('');
                }}
                className="rounded-xl border border-[var(--brand-border)] px-4 py-2 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-surface-elevated)]"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border-t border-[var(--brand-border)] pt-6">
            <div>
              <dt className="text-xs text-[var(--text-muted)] font-medium">Timezone</dt>
              <dd className="text-sm font-semibold mt-0.5">{branch.timezone}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)] font-medium">Revision</dt>
              <dd className="text-sm font-semibold mt-0.5 font-mono">{branch.revision}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)] font-medium">Contact</dt>
              <dd className="text-sm font-semibold mt-0.5">{branch.contactPhone || branch.contactEmail || 'None'}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--text-muted)] font-medium">Location</dt>
              <dd className="text-sm font-semibold mt-0.5">
                {[branch.address?.line1, branch.address?.city, branch.address?.state].filter(Boolean).join(', ') || 'Not configured'}
              </dd>
            </div>
          </dl>
        )}
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">Branch Operations</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href={`/admin/team?branchId=${branch._id}`}
            className="rounded-2xl border border-[var(--brand-border)] bg-[var(--bg-surface)] p-5 hover:border-[#BE1E2E] transition-colors"
          >
            <h3 className="font-bold text-sm">Staff & Faculty</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">View faculty and staff assigned to this branch.</p>
          </Link>
          <Link
            href={`/admin/students?branchId=${branch._id}`}
            className="rounded-2xl border border-[var(--brand-border)] bg-[var(--bg-surface)] p-5 hover:border-[#BE1E2E] transition-colors"
          >
            <h3 className="font-bold text-sm">Student Directory</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Active students and transfer history for this location.</p>
          </Link>
          <Link
            href={`/admin/batches?branchId=${branch._id}`}
            className="rounded-2xl border border-[var(--brand-border)] bg-[var(--bg-surface)] p-5 hover:border-[#BE1E2E] transition-colors"
          >
            <h3 className="font-bold text-sm">Academic Batches</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Class cohorts, schedules, and room allocations.</p>
          </Link>
          <Link
            href={`/admin/finance?branchId=${branch._id}`}
            className="rounded-2xl border border-[var(--brand-border)] bg-[var(--bg-surface)] p-5 hover:border-[#BE1E2E] transition-colors"
          >
            <h3 className="font-bold text-sm">Finance & Collections</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Branch revenue, fee collections, and receipts.</p>
          </Link>
        </div>
      </section>
    </main>
  );
}
