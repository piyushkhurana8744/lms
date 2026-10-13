'use client';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
export function NotificationBell() {
  const { data } = useQuery({ queryKey: ['notification-unread-count'], queryFn: async () => { const response = await fetch('/api/v1/notifications/unread-count'); if (!response.ok) throw new Error('Unable to load notifications'); return response.json(); }, refetchInterval: 30_000 });
  const count = Number(data?.data?.count || 0);
  return <Link href="/notifications" aria-label={count ? `Notifications, ${count} unread` : 'Notifications'} className="relative p-2 rounded-lg border border-[var(--brand-border)] hover:bg-[var(--bg-surface-elevated)]"><Bell className="w-5 h-5" />{count > 0 && <span aria-label={`${count} unread`} className="absolute -right-1 -top-1 min-w-4 h-4 px-1 rounded-full bg-[#BE1E2E] text-white text-[10px] flex items-center justify-center">{count > 99 ? '99+' : count}</span>}</Link>;
}
