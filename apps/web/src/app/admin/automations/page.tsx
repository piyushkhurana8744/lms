'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Workflow, Plus, ArrowRight, Activity, Clock, ShieldCheck, CheckCircle2, Play } from 'lucide-react';
import { PageHeader, FilterBar, DataTable, StatusBadge, Column } from '@/components/ui';
import { Button } from '@edtech/ui';

interface AutomationRow {
  _id: string;
  name: string;
  triggerType: string;
  status: string;
  version: number;
  branchMode: string;
  updatedAt: string;
  executionCount?: number;
}

export default function AutomationsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['automations'],
    queryFn: async () => {
      const r = await fetch('/api/v1/automations?limit=50');
      if (!r.ok) throw new Error('Failed to load automations');
      return r.json();
    },
  });

  const rawAutomations: AutomationRow[] = data?.data || [];

  const filteredAutomations = rawAutomations.filter((a) => {
    const matchesSearch =
      !search.trim() ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.triggerType.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns: Column<AutomationRow>[] = [
    {
      header: 'Workflow Name',
      cell: (row) => (
        <div className="space-y-0.5 min-w-[200px]">
          <Link
            href={`/admin/automations/${row._id}`}
            className="font-bold text-xs text-[var(--brand-text)] hover:text-[#BE1E2E] hover:underline transition-colors block truncate"
          >
            {row.name}
          </Link>
          <span className="text-[10px] font-mono text-[var(--text-muted)] block">
            ID: {row._id.slice(-6).toUpperCase()}
          </span>
        </div>
      ),
    },
    {
      header: 'Trigger Event',
      cell: (row) => (
        <span className="font-mono text-[11px] px-2 py-0.5 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-[var(--brand-text)]">
          {row.triggerType}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} size="xs" />,
    },
    {
      header: 'Scope Mode',
      cell: (row) => (
        <span className="text-xs font-semibold text-[var(--text-muted)]">
          {row.branchMode === 'ALL' ? 'Tenant-Wide' : 'Specific Branches'}
        </span>
      ),
    },
    {
      header: 'Version',
      cell: (row) => (
        <span className="font-mono text-[10px] font-bold text-[var(--text-muted)]">
          v{row.version}
        </span>
      ),
    },
    {
      header: 'Last Modified',
      cell: (row) => (
        <span className="font-mono text-[10px] text-[var(--text-muted)]">
          {new Date(row.updatedAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/admin/automations/${row._id}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--bg-surface-elevated)] hover:bg-[var(--brand-border)] text-[var(--brand-text)] transition-colors"
          >
            <span>Inspect</span>
            <ArrowRight className="w-3 h-3 text-[var(--text-muted)]" />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto min-h-screen animate-fade-in">
      <PageHeader
        title="Event Automations & Triggers"
        description="Deterministic event-driven workflows. Pausing stops new triggers; running execution snapshots continue to completion safely."
        badge={
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#BE1E2E] bg-[#BE1E2E]/10 px-2.5 py-1 rounded-full border border-[#BE1E2E]/20 flex items-center gap-1.5">
            <Activity className="w-3 h-3" /> Event Engine
          </span>
        }
        actions={
          <Link href="/admin/automations/new">
            <Button
              variant="primary"
              size="sm"
              className="btn-primary text-xs font-bold px-4 py-2 rounded-xl shadow-md shadow-[#BE1E2E]/20 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Automation</span>
            </Button>
          </Link>
        }
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter workflows by name or trigger..."
        filters={
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-[var(--brand-text)] py-2 px-3 focus:outline-none focus:border-[#BE1E2E]"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Workflows</option>
            <option value="DRAFT">Drafts</option>
            <option value="PAUSED">Paused</option>
          </select>
        }
        activeFilterCount={statusFilter !== 'ALL' || search ? 1 : 0}
        onResetFilters={() => {
          setSearch('');
          setStatusFilter('ALL');
        }}
      />

      {isError ? (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold text-center">
          Failed to load automations: {(error as Error)?.message || 'Service unavailable'}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredAutomations}
          keyExtractor={(row) => row._id}
          isLoading={isLoading}
          emptyTitle="No automations configured"
          emptyDescription="Create deterministic workflows triggered by student enrollments, attendance locks, lead captures, or grade submissions."
          emptyActionLabel="Create First Automation"
          onEmptyAction={() => {
            window.location.href = '/admin/automations/new';
          }}
        />
      )}
    </div>
  );
}
