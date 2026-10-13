'use client';

import React, { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Workflow, Plus, ArrowLeft, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/ui';
import { Button } from '@edtech/ui';

export default function NewAutomationPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('');
  const [action, setAction] = useState('');
  const [inputs, setInputs] = useState('{}');
  const [field, setField] = useState('');
  const [operator, setOperator] = useState('EQUALS');
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ['automation-registry'],
    queryFn: async () => {
      const r = await fetch('/api/v1/automations/registry');
      if (!r.ok) throw new Error();
      return r.json();
    },
  });

  const triggers = data?.data?.triggers || [];

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    let parsed: any;
    try {
      parsed = JSON.parse(inputs);
    } catch {
      return setError('Action inputs must be valid JSON object format');
    }

    setSaving(true);
    const items = field
      ? [{ field, operator, value: ['EXISTS', 'NOT_EXISTS'].includes(operator) ? undefined : value }]
      : [];

    const body = {
      name,
      triggerType: trigger,
      conditions: { mode: 'ALL', items },
      steps: [{ stepId: 'action-1', type: 'ACTION', actionType: action, inputs: parsed }],
      branchMode: 'ALL',
      branchIds: [],
    };

    try {
      const r = await fetch('/api/v1/automations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!r.ok) {
        const j = await r.json();
        setError(j.error?.message || 'Could not create automation workflow');
        setSaving(false);
        return;
      }
      router.push('/admin/automations');
    } catch (err: any) {
      setError(err.message || 'Network error occurred');
      setSaving(false);
    }
  }

  const selectedTrigger = triggers.find((t: any) => t.type === trigger);
  const actions = (data?.data?.actions || []).filter(
    (a: any) => !selectedTrigger || a.supportedSources.includes(selectedTrigger.source)
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-4xl mx-auto min-h-screen animate-fade-in">
      <PageHeader
        title="Create Automation Workflow"
        description="Configure event triggers, rule conditions, and deterministic operational actions."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Automations', href: '/admin/automations' },
          { label: 'New Workflow' },
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
        className="p-6 sm:p-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-xs space-y-6"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
              Workflow Name
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. On Enrollment Send Welcome Email & Sync Drive"
              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:border-[#BE1E2E] focus:ring-2 focus:ring-[#BE1E2E]/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
              Trigger Event
            </label>
            <select
              required
              value={trigger}
              onChange={(e) => {
                setTrigger(e.target.value);
                setField('');
              }}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:border-[#BE1E2E]"
            >
              <option value="">Select registered trigger event</option>
              {triggers.map((t: any) => (
                <option key={t.type} value={t.type}>
                  {t.type} — Source: {t.source}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
              Conditions (Optional)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <select
                value={field}
                onChange={(e) => setField(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:border-[#BE1E2E]"
              >
                <option value="">No Condition (Always Run)</option>
                {Object.keys(selectedTrigger?.fields || {}).map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>

              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:border-[#BE1E2E]"
              >
                {(data?.data?.operators || []).map((o: string) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>

              <input
                disabled={['EXISTS', 'NOT_EXISTS'].includes(operator)}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:border-[#BE1E2E] disabled:opacity-40"
                placeholder="Condition Value"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
              Action Execution
            </label>
            <select
              required
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                const a = actions.find((x: any) => x.type === e.target.value);
                setInputs(JSON.stringify(a?.inputExample || {}, null, 2));
              }}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:border-[#BE1E2E]"
            >
              <option value="">Select permitted automated action</option>
              {actions.map((a: any) => (
                <option key={a.type} value={a.type}>
                  {a.type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
              Typed Action Payload (JSON)
            </label>
            <textarea
              rows={6}
              value={inputs}
              onChange={(e) => setInputs(e.target.value)}
              className="font-mono text-xs w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-[var(--brand-text)] focus:outline-none focus:border-[#BE1E2E] focus:ring-2 focus:ring-[#BE1E2E]/20"
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-xs text-[var(--text-muted)] space-y-1">
          <div className="font-bold text-[var(--brand-text)] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#BE1E2E]" />
            <span>Workflow Summary</span>
          </div>
          <p>
            When <strong>{trigger || '(select trigger)'}</strong> fires, execute action{' '}
            <strong>{action || '(select action)'}</strong> across all active tenant scopes.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Link
            href="/admin/automations"
            className="px-4 py-2.5 rounded-xl border border-[var(--brand-border)] text-xs font-semibold text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
          >
            Cancel
          </Link>
          <Button
            type="submit"
            disabled={saving}
            className="btn-primary text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-[#BE1E2E]/20"
          >
            {saving ? 'Saving...' : 'Save Automation Draft'}
          </Button>
        </div>
      </form>
    </div>
  );
}
