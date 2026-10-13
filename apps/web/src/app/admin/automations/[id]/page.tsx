'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Workflow,
  Play,
  Pause,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import { PageHeader, StatusBadge } from '@/components/ui';
import { Button } from '@edtech/ui';

export default function AutomationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['automation', id],
    queryFn: async () => {
      const r = await fetch(`/api/v1/automations/${id}`);
      if (!r.ok) throw new Error('Failed to load automation details');
      return (await r.json()).data;
    },
  });

  const ex = useQuery({
    queryKey: ['automation-executions', id],
    queryFn: async () => {
      const r = await fetch(`/api/v1/automations/${id}/executions`);
      return r.json();
    },
  });

  const act = useMutation({
    mutationFn: async (actionName: string) => {
      const r = await fetch(`/api/v1/automations/${id}/${actionName}`, { method: 'POST' });
      if (!r.ok) throw new Error('Operation failed');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automation', id] }),
  });

  const a = q.data;

  if (q.isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="text-xs font-mono text-[var(--text-muted)] animate-pulse">
          Loading automation details...
        </div>
      </div>
    );
  }

  if (q.isError || !a) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs font-bold">
          Could not load automation record.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-5xl mx-auto min-h-screen animate-fade-in">
      <PageHeader
        title={a.name}
        description={`Triggered on: ${a.triggerType} · Version ${a.version} · Scope: ${a.branchMode}`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Automations', href: '/admin/automations' },
          { label: a.name },
        ]}
        badge={<StatusBadge status={a.status} />}
        actions={
          <div className="flex items-center gap-2">
            {['DRAFT', 'PAUSED'].includes(a.status) && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => act.mutate('activate')}
                disabled={act.isPending}
                className="btn-primary text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Activate Workflow</span>
              </Button>
            )}
            {a.status === 'ACTIVE' && (
              <button
                onClick={() => act.mutate('pause')}
                disabled={act.isPending}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors flex items-center gap-1.5"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause New Triggers</span>
              </button>
            )}
          </div>
        }
      />

      {/* Ordered Workflow Steps */}
      <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--brand-border)]">
          <h2 className="text-sm font-bold text-[var(--brand-text)] flex items-center gap-2 font-heading">
            <Layers className="w-4 h-4 text-[#BE1E2E]" />
            <span>Ordered Workflow Execution Steps</span>
          </h2>
          <span className="text-[10px] font-mono text-[var(--text-muted)]">
            {a.steps?.length || 0} Step(s)
          </span>
        </div>

        <div className="space-y-3">
          {(a.steps || []).map((step: any, idx: number) => (
            <div
              key={step.stepId || idx}
              className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-[#BE1E2E]/10 text-[#BE1E2E] font-mono font-bold flex items-center justify-center text-xs">
                  {idx + 1}
                </span>
                <div>
                  <div className="font-bold text-[var(--brand-text)]">
                    {step.type === 'DELAY' ? `Wait for ${step.delaySeconds} seconds` : step.actionType}
                  </div>
                  <div className="text-[10px] font-mono text-[var(--text-muted)]">
                    Type: {step.type}
                  </div>
                </div>
              </div>

              {step.inputs && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--brand-border)] text-[var(--text-muted)] max-w-xs truncate">
                  Configured
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Execution Logs */}
      <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--brand-border)]">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-[var(--brand-text)] flex items-center gap-2 font-heading">
              <Activity className="w-4 h-4 text-[#BE1E2E]" />
              <span>Recent Execution History</span>
            </h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              Cancellation cannot roll back already-committed external transactions.
            </p>
          </div>
        </div>

        <div className="divide-y divide-[var(--brand-border)]">
          {(ex.data?.data || []).length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)] font-mono">
              No executions logged yet for this workflow.
            </div>
          ) : (
            (ex.data?.data || []).map((e: any) => (
              <div key={e._id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <StatusBadge status={e.status} size="xs" />
                  <span className="font-mono text-[11px] text-[var(--brand-text)]">
                    {e.resourceType}: {e.resourceId?.slice(-6) || '—'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                  Step {(e.currentStep || 0) + 1}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
