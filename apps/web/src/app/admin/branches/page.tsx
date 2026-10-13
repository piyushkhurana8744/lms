'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, Plus, MapPin, Clock, Globe, ArrowRight, ShieldCheck } from 'lucide-react';
import { PageHeader, FilterBar, DataTable, StatusBadge, Column } from '@/components/ui';
import { Button } from '@edtech/ui';

interface Branch {
  _id: string;
  name: string;
  code: string;
  status: string;
  timezone: string;
  isPrimary: boolean;
  revision: number;
}

export default function BranchesPage() {
  const [items, setItems] = useState<Branch[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams({ limit: '100' });
    if (search) params.set('search', search);
    if (status) params.set('status', status);

    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/v1/branches?${params}`)
        .then(async (response) => {
          if (!response.ok) throw new Error('Unable to load branches');
          return response.json();
        })
        .then((payload) => {
          setItems(payload.data?.items || []);
          setError('');
        })
        .catch((reason) => setError(reason.message))
        .finally(() => setLoading(false));
    }, 200);

    return () => clearTimeout(timer);
  }, [search, status]);

  const columns: Column<Branch>[] = [
    {
      header: 'Branch Name',
      cell: (row) => (
        <div className="space-y-0.5 min-w-[200px]">
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/branches/${row._id}`}
              className="font-bold text-xs text-[var(--brand-text)] hover:text-[#BE1E2E] hover:underline transition-colors block truncate"
            >
              {row.name}
            </Link>
            {row.isPrimary && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Primary
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-[var(--text-muted)] block">
            Code: {row.code}
          </span>
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} size="xs" />,
    },
    {
      header: 'Timezone',
      cell: (row) => (
        <span className="font-mono text-[11px] text-[var(--brand-text)] flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span>{row.timezone}</span>
        </span>
      ),
    },
    {
      header: 'Revision',
      cell: (row) => (
        <span className="font-mono text-[10px] text-[var(--text-muted)]">
          rev.{row.revision}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/admin/branches/${row._id}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--bg-surface-elevated)] hover:bg-[var(--brand-border)] text-[var(--brand-text)] transition-colors"
          >
            <span>Manage</span>
            <ArrowRight className="w-3 h-3 text-[var(--text-muted)]" />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto min-h-screen animate-fade-in">
      <PageHeader
        title="Branch Locations & Campuses"
        description="Manage organizational branches, physical centers, and academic operational timezone scopes."
        badge={
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#BE1E2E] bg-[#BE1E2E]/10 px-2.5 py-1 rounded-full border border-[#BE1E2E]/20 flex items-center gap-1.5">
            <Building2 className="w-3 h-3" /> Multi-Campus
          </span>
        }
        actions={
          <Link href="/admin/branches/new">
            <Button
              variant="primary"
              size="sm"
              className="btn-primary text-xs font-bold px-4 py-2 rounded-xl shadow-md shadow-[#BE1E2E]/20 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Branch</span>
            </Button>
          </Link>
        }
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search branch by name or code..."
        filters={
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-xs rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-[var(--brand-text)] py-2 px-3 focus:outline-none focus:border-[#BE1E2E]"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        }
        activeFilterCount={status || search ? 1 : 0}
        onResetFilters={() => {
          setSearch('');
          setStatus('');
        }}
      />

      {error ? (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold text-center">
          {error}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={items}
          keyExtractor={(row) => row._id}
          isLoading={loading}
          emptyTitle="No branches match this view"
          emptyDescription="Configure your organization's physical and virtual campuses to localize classes, attendance, and admissions."
          emptyActionLabel="Create Campus Branch"
          onEmptyAction={() => {
            window.location.href = '/admin/branches/new';
          }}
        />
      )}
    </div>
  );
}
