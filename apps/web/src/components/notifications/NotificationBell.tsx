'use client';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/auth-provider';

const EMPTY_NOTIFICATION_COUNT = { success: true, data: { count: 0 }, error: null };

export function NotificationBell() {
  const { user, isLoading } = useAuth();
  const hasWorkspace = Boolean(
    user?.activeTenantId || user?.tenantId || user?.allowedTenantIds?.length
  );
  const { data } = useQuery({
    queryKey: ['notification-unread-count', user?.id, user?.activeTenantId || user?.tenantId],
    enabled: !isLoading && Boolean(user) && hasWorkspace,
    queryFn: async () => {
      try {
        const response = await fetch('/api/v1/notifications/unread-count', {
          headers: { Accept: 'application/json' },
          cache: 'no-store'
        });

        // The bell is a background enhancement. Session transitions, a global
        // Superadmin context, or a temporarily unavailable API must not produce
        // a recurring React Query error overlay every polling interval.
        if (!response.ok) return EMPTY_NOTIFICATION_COUNT;

        const payload = await response.json().catch(() => null);
        return payload?.data ? payload : EMPTY_NOTIFICATION_COUNT;
      } catch {
        return EMPTY_NOTIFICATION_COUNT;
      }
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: false
  });

  if (!isLoading && (!user || !hasWorkspace)) return null;

  const count = Number(data?.data?.count || 0);
  return <Link href="/notifications" aria-label={count ? `Notifications, ${count} unread` : 'Notifications'} className="relative p-2 rounded-lg border border-[var(--brand-border)] hover:bg-[var(--bg-surface-elevated)]"><Bell className="w-5 h-5" />{count > 0 && <span aria-label={`${count} unread`} className="absolute -right-1 -top-1 min-w-4 h-4 px-1 rounded-full bg-[#BE1E2E] text-white text-[10px] flex items-center justify-center">{count > 99 ? '99+' : count}</span>}</Link>;
}
