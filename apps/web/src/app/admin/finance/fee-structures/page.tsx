'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Badge, Button } from '@edtech/ui';

import { IFeeStructure, ICourse } from '@edtech/types';
import { formatCurrency } from '@edtech/utils';
import {
  Layers,
  Plus,
  Search,
  Filter,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Trash2,
  Calendar,
  IndianRupee,
  X
} from 'lucide-react';

export default function FeeStructuresPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [courseId, setCourseId] = useState('');
  const [components, setComponents] = useState<Array<{ name: string; type: any; amountMinor: number }>>([
    { name: 'Tuition Fee', type: 'TUITION', amountMinor: 4500000 },
    { name: 'Admission & Registration', type: 'ADMISSION', amountMinor: 500000 }
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch Courses for selection
  const { data: coursesData } = useQuery<{ success: boolean; data: ICourse[] }>({
    queryKey: ['admin-courses-list'],
    queryFn: async () => {
      const res = await fetch('/api/v1/courses');
      return res.json();
    }
  });

  // Fetch Fee Structures
  const { data, isLoading, isError, error, refetch } = useQuery<{ success: boolean; data: IFeeStructure[] }>({
    queryKey: ['fee-structures-list'],
    queryFn: async () => {
      const res = await fetch('/api/v1/finance/fee-structures');
      if (!res.ok) throw new Error('Failed to load fee structures');
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/v1/finance/fee-structures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to create fee structure');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-structures-list'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.message);
    }
  });

  const resetForm = () => {
    setName('');
    setCode('');
    setCourseId('');
    setComponents([
      { name: 'Tuition Fee', type: 'TUITION', amountMinor: 4500000 },
      { name: 'Admission & Registration', type: 'ADMISSION', amountMinor: 500000 }
    ]);
    setFormError(null);
  };

  const handleAddComponent = () => {
    setComponents([...components, { name: 'Lab & Material Fee', type: 'MATERIAL', amountMinor: 200000 }]);
  };

  const handleRemoveComponent = (idx: number) => {
    if (components.length <= 1) return;
    setComponents(components.filter((_, i) => i !== idx));
  };

  const totalCalculatedMinor = components.reduce((acc, c) => acc + (Number(c.amountMinor) || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Fee structure name is required');
      return;
    }
    if (!courseId) {
      setFormError('Please select a target course');
      return;
    }
    if (totalCalculatedMinor <= 0) {
      setFormError('Total fee amount must be greater than zero');
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      code: code.trim() || undefined,
      courseId,
      currency: 'INR',
      components
    });
  };

  const structures = data?.data || [];
  const filtered = structures.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.course?.title && s.course.title.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#BE1E2E]/10 text-[#BE1E2E] border border-[#BE1E2E]/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-black tracking-tight text-[var(--brand-text)]">
                Fee Structure Templates
              </h1>
              <p className="text-xs text-[var(--text-muted)] font-mono">
                Reusable pricing templates for courses and admissions
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="text-xs font-bold gap-1.5 bg-[#BE1E2E] hover:bg-[#a01826] text-white shadow-md shadow-[#BE1E2E]/20"
        >
          <Plus className="w-4 h-4" /> Create Fee Structure
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search fee structures by name or course..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
          />
        </div>
      </div>


      {/* Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#BE1E2E]" />
          <p className="text-xs text-[var(--text-muted)]">Loading fee structures...</p>
        </div>
      ) : isError ? (
        <Card className="p-6 border-red-500/20 bg-red-500/5 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-xs font-bold text-red-500">{(error as Error)?.message || 'Failed to load structures'}</p>
          <Button onClick={() => refetch()} variant="outline" className="text-xs">
            Retry
          </Button>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center space-y-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)]">
          <Layers className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-[var(--brand-text)]">No Fee Structures Found</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            Create standard fee structures so counsellors and admissions can assign them during student enrollment.
          </p>
          <Button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="text-xs font-bold gap-1.5 bg-[#BE1E2E] text-white"
          >
            <Plus className="w-4 h-4" /> Create First Structure
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((s) => (
            <Card
              key={s.id}
              className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--brand-border)] space-y-4 hover:border-[#BE1E2E]/30 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-black text-[var(--brand-text)]">{s.name}</h3>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Course: <span className="font-semibold text-[var(--brand-text)]">{s.course?.title || 'All Courses'}</span>
                    </p>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px]">
                    {s.status}
                  </Badge>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-1.5">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">
                    Total Structure Fee
                  </div>
                  <div className="text-lg font-black text-[#BE1E2E]">
                    {formatCurrency(s.totalAmountMinor, s.currency || 'INR')}
                  </div>
                </div>

                {/* Components breakdown */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Fee Components</div>
                  <div className="space-y-1 text-xs">
                    {s.components.map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <span className="text-[var(--text-muted)]">{c.name}</span>
                        <span className="font-semibold text-[var(--brand-text)]">
                          {formatCurrency(c.amountMinor, s.currency || 'INR')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--brand-border)] flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                <span>Code: {s.code || 'N/A'}</span>
                <span>Created {new Date(s.createdAt).toLocaleDateString()}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl shadow-2xl overflow-hidden space-y-5 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--brand-text)] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#BE1E2E]" /> Create Fee Structure Template
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[var(--bg-surface-elevated)] text-[var(--text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-500">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--brand-text)]">Fee Structure Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Masters in Digital Marketing (Standard 2026)"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--brand-text)]">Structure Code</label>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. MDM-2026-STD"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--brand-text)]">Target Course *</label>
                  <select
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface)] text-[var(--brand-text)] font-medium"
                    required
                  >
                    <option value="">Select Course...</option>
                    {coursesData?.data?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fee Components */}
              <div className="space-y-2 pt-2 border-t border-[var(--brand-border)]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--brand-text)]">Fee Components (In Paise/Minor Units)</label>
                  <button
                    type="button"
                    onClick={handleAddComponent}
                    className="text-[11px] font-bold text-[#BE1E2E] hover:underline"
                  >
                    + Add Component
                  </button>
                </div>

                <div className="space-y-2">
                  {components.map((comp, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        value={comp.name}
                        onChange={(e) => {
                          const updated = [...components];
                          updated[idx].name = e.target.value;
                          setComponents(updated);
                        }}
                        placeholder="Component name"
                        className="flex-1 px-3 py-2 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                      />
                      <div className="relative w-36">
                        <input
                          type="number"
                          value={comp.amountMinor / 100}
                          onChange={(e) => {
                            const updated = [...components];
                            updated[idx].amountMinor = Math.round(Number(e.target.value) * 100);
                            setComponents(updated);
                          }}
                          placeholder="Amount ₹"
                          className="w-full px-3 py-2 pr-6 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)]">
                          ₹
                        </span>
                      </div>
                      {components.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveComponent(idx)}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>


                <div className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] flex items-center justify-between text-xs font-bold">
                  <span>Calculated Net Total:</span>
                  <span className="text-[#BE1E2E] text-sm">{formatCurrency(totalCalculatedMinor, 'INR')}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--brand-border)]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="text-xs font-bold bg-[#BE1E2E] hover:bg-[#a01826] text-white"
                >
                  {createMutation.isPending ? 'Creating...' : 'Save Fee Structure'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
