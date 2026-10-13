'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { TableSkeleton } from '@/components/loading/SkeletonLoaders';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  page?: number;
  totalPages?: number;
  totalRecords?: number;
  onPageChange?: (page: number) => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items to display matching the current criteria.',
  emptyActionLabel,
  onEmptyAction,
  page,
  totalPages,
  totalRecords,
  onPageChange,
  className = '',
}: DataTableProps<T>) {
  if (isLoading) {
    return <TableSkeleton rows={6} columns={columns.length} />;
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
        className={className}
      />
    );
  }

  return (
    <div className={`rounded-2xl border border-[var(--brand-border)] bg-[var(--bg-surface)] overflow-hidden shadow-xs ${className}`}>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[var(--brand-border)] bg-[var(--bg-surface-elevated)]/70 text-[var(--text-muted)] font-mono uppercase tracking-wider text-[10px]">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`py-3 px-4 font-bold ${col.headerClassName || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--brand-border)]">
            {data.map((row, rowIdx) => (
              <tr
                key={keyExtractor(row, rowIdx)}
                className="hover:bg-[var(--bg-surface-elevated)]/60 transition-colors"
              >
                {columns.map((col, colIdx) => {
                  let content: React.ReactNode;
                  if (col.cell) {
                    content = col.cell(row);
                  } else if (col.accessorKey) {
                    content = (row[col.accessorKey] as any)?.toString() || '—';
                  } else {
                    content = '—';
                  }

                  return (
                    <td
                      key={colIdx}
                      className={`py-3.5 px-4 text-[var(--brand-text)] align-middle ${col.className || ''}`}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {page !== undefined && totalPages !== undefined && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--brand-border)] bg-[var(--bg-surface-elevated)]/40 text-xs text-[var(--text-muted)]">
          <div className="font-mono text-[11px]">
            {totalRecords !== undefined ? (
              <span>
                Total <strong>{totalRecords}</strong> records · Page <strong>{page}</strong> of <strong>{totalPages}</strong>
              </span>
            ) : (
              <span>
                Page <strong>{page}</strong> of <strong>{totalPages}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange && onPageChange(page - 1)}
              className="p-1.5 rounded-lg border border-[var(--brand-border)] bg-[var(--bg-surface)] text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange && onPageChange(page + 1)}
              className="p-1.5 rounded-lg border border-[var(--brand-border)] bg-[var(--bg-surface)] text-[var(--brand-text)] hover:bg-[var(--bg-surface-elevated)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
