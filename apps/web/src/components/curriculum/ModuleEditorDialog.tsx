'use client';

import React, { useState, useEffect } from 'react';
import { ICourseModule } from '@edtech/types';
import { Button } from '@edtech/ui';
import { X } from 'lucide-react';

interface ModuleEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  module: ICourseModule | null;
  onSave: (data: { title: string; description?: string }) => Promise<void>;
  isPending: boolean;
}

export function ModuleEditorDialog({
  isOpen,
  onClose,
  module,
  onSave,
  isPending
}: ModuleEditorDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (module) {
      setTitle(module.title);
      setDescription(module.description || '');
    } else {
      setTitle('');
      setDescription('');
    }
    setError(null);
  }, [module, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onSave({ title, description });
    } catch (err: any) {
      setError(err.message || 'Failed to save module');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl p-6 w-full max-w-lg space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--brand-border)] pb-4">
          <h3 className="text-lg font-bold text-[var(--brand-text)]">
            {module ? 'Edit Module' : 'Create New Module'}
          </h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--brand-text)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1 text-[var(--brand-text)]">Module Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Module 1: Foundations of Digital Marketing"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] text-sm text-[var(--brand-text)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-[var(--brand-text)]">Module Description</label>
            <textarea
              rows={3}
              placeholder="Optional overview of module topics"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] text-sm text-[var(--brand-text)]"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[var(--brand-border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium border border-[var(--brand-border)] rounded-lg text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)]"
            >
              Cancel
            </button>
            <Button
              type="submit"
              variant="primary"
              className="btn-primary px-5 text-xs"
              disabled={isPending}
            >
              {isPending ? 'Saving...' : module ? 'Update Module' : 'Create Module'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
