'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';

export default function SessionsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/v1/users/sessions');
      const json = await res.json();
      if (json.success) {
        setSessions(json.data);
      }
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevoke = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/v1/users/sessions/${sessionId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setSessions((prev) => prev.filter((s) => s._id !== sessionId));
      }
    } catch {
      // Handle error
    }
  };

  return (
    <div className="min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)] p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Active Device Sessions</h1>
          <p className="text-sm text-slate-500">Manage and revoke active login sessions for {user?.email}</p>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">Loading active sessions...</p>
        ) : (
          <div className="space-y-4">
            {sessions.map((s) => (
              <div key={s._id} className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--brand-border)] flex justify-between items-center">
                <div>
                  <p className="font-semibold text-sm">{s.userAgent || 'Unknown Browser'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">IP: {s.ipAddress || '127.0.0.1'} • Last active: {new Date(s.lastUsedAt).toLocaleString()}</p>
                </div>
                <button
                  onClick={() => handleRevoke(s._id)}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 text-xs font-medium"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
