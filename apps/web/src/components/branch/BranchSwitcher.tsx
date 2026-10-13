'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Check, ChevronDown, Layers } from 'lucide-react';

export interface BranchInfo {
  _id: string;
  name: string;
  code: string;
  isPrimary?: boolean;
  status?: string;
}

export interface BranchSwitcherProps {
  selectedBranchId?: string;
  onSelectBranch?: (branchId: string) => void;
  className?: string;
}

export function BranchSwitcher({ selectedBranchId, onSelectBranch, className = '' }: BranchSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeBranchId, setActiveBranchId] = useState<string>(selectedBranchId || 'ALL');

  const { data: branchData, isLoading } = useQuery({
    queryKey: ['accessible-branches-switcher'],
    queryFn: async () => {
      const res = await fetch('/api/v1/branches?limit=100&status=ACTIVE');
      if (!res.ok) return { items: [], total: 0 };
      const json = await res.json();
      return {
        items: (json.data?.items || json.data || []) as BranchInfo[],
        total: json.data?.total || json.pagination?.total || 0
      };
    }
  });

  const branches = branchData?.items || [];
  const activeBranch = branches.find((b) => b._id === activeBranchId);

  const handleSelect = (id: string) => {
    setActiveBranchId(id);
    if (onSelectBranch) onSelectBranch(id);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] hover:border-[var(--brand-border-strong)] text-left transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-[#BE1E2E]/10 text-[#BE1E2E] flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <div className="truncate">
            <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
              Branch Scope
            </div>
            <div className="text-xs font-bold text-[var(--brand-text)] truncate">
              {isLoading ? 'Loading...' : activeBranchId === 'ALL' ? 'All Accessible Branches' : activeBranch?.name || 'Selected Branch'}
            </div>
          </div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl bg-[var(--bg-surface)] border border-[var(--brand-border)] shadow-xl p-1.5 space-y-1">
          <button
            type="button"
            onClick={() => handleSelect('ALL')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeBranchId === 'ALL'
                ? 'bg-[#BE1E2E]/10 text-[#BE1E2E] font-bold'
                : 'text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" />
              <span>All Accessible Branches</span>
            </div>
            {activeBranchId === 'ALL' && <Check className="w-3.5 h-3.5 text-[#BE1E2E]" />}
          </button>

          <div className="h-px bg-[var(--brand-border)] my-1" />

          {branches.map((b) => (
            <button
              key={b._id}
              type="button"
              onClick={() => handleSelect(b._id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeBranchId === b._id
                  ? 'bg-[#BE1E2E]/10 text-[#BE1E2E] font-bold'
                  : 'text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)]'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase">{b.code}</span>
                <span className="truncate">{b.name}</span>
                {b.isPrimary && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    Primary
                  </span>
                )}
              </div>
              {activeBranchId === b._id && <Check className="w-3.5 h-3.5 text-[#BE1E2E]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
