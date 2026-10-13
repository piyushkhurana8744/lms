'use client';

import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  HelpCircle,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export type StatusType =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'DRAFT'
  | 'PUBLISHED'
  | 'COMPLETED'
  | 'PENDING'
  | 'FAILED'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'DUE'
  | 'REFUNDED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'GRADED'
  | 'PASSED'
  | 'REVOKED'
  | 'ISSUED'
  | string;

export interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  showIcon?: boolean;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function StatusBadge({
  status,
  label,
  showIcon = true,
  size = 'sm',
  className = '',
}: StatusBadgeProps) {
  const normalized = (status || '').toUpperCase().trim();

  let colorClasses = 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
  let IconComponent = HelpCircle;

  switch (normalized) {
    case 'ACTIVE':
    case 'PUBLISHED':
    case 'COMPLETED':
    case 'PAID':
    case 'GRADED':
    case 'PASSED':
    case 'ISSUED':
    case 'READY':
      colorClasses = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25';
      IconComponent = CheckCircle2;
      break;

    case 'PENDING':
    case 'DUE':
    case 'PARTIALLY_PAID':
    case 'SUBMITTED':
    case 'IN_PROGRESS':
    case 'PROCESSING':
    case 'SCHEDULED':
      colorClasses = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25';
      IconComponent = Clock;
      break;

    case 'FAILED':
    case 'OVERDUE':
    case 'CANCELLED':
    case 'REVOKED':
    case 'LOST':
      colorClasses = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25';
      IconComponent = XCircle;
      break;

    case 'DRAFT':
    case 'INACTIVE':
    case 'ARCHIVED':
    case 'PAUSED':
      colorClasses = 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
      IconComponent = AlertTriangle;
      break;

    case 'REFUNDED':
    case 'EXCUSED':
      colorClasses = 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25';
      IconComponent = RefreshCw;
      break;

    default:
      colorClasses = 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
      IconComponent = ShieldCheck;
      break;
  }

  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.2 gap-1',
    sm: 'text-[10px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  };

  const displayText = label || normalized.replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center font-mono font-bold uppercase tracking-wider rounded-full border leading-tight ${sizeClasses[size]} ${colorClasses} ${className}`}
    >
      {showIcon && <IconComponent className={`${iconSizes[size]} flex-shrink-0`} />}
      <span>{displayText}</span>
    </span>
  );
}
