'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';

export default function Page() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [data, setData] = useState<any[]>();

  useEffect(() => {
    if (isAuthLoading || !user) return;
    const from = new Date(Date.now() - 30 * 864e5).toISOString();
    const to = new Date(Date.now() + 120 * 864e5).toISOString();
    fetch(`/api/v1/instructor/classes?from=${from}&to=${to}`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((r) => setData(r.data))
      .catch(() => setData([]));
  }, [isAuthLoading, user]);

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-black">My classes</h1>
      {!data ? (
        <p>Loading…</p>
      ) : (
        data.map((c) => (
          <Link key={c._id} href={`/instructor/classes/${c._id}`} className="block rounded-2xl border p-4">
            <div className="flex justify-between">
              <strong>{c.name}</strong>
              <span className="text-xs">{c.status}{c.isRescheduled ? ' · Rescheduled' : ''}</span>
            </div>
            <p className="text-sm">{new Date(c.scheduledStartAt).toLocaleString()} · {c.mode}</p>
          </Link>
        ))
      )}
    </div>
  );
}
