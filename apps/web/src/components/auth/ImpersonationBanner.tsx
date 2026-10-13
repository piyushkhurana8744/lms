'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { ShieldAlert, LogOut, Loader2, UserCheck } from 'lucide-react';

export function ImpersonationBanner() {
  const { user, exitImpersonation } = useAuth();
  const [isExiting, setIsExiting] = useState(false);
  const router = useRouter();

  if (!user || !user.isImpersonated) {
    return null;
  }

  const handleExit = async () => {
    setIsExiting(true);
    try {
      await exitImpersonation();
      window.location.href = '/platform';
    } catch {
      setIsExiting(false);
    }
  };

  return (
    <div className="sticky top-0 z-[100] w-full bg-gradient-to-r from-amber-600 via-purple-700 to-indigo-800 text-white shadow-lg border-b border-amber-400/30 px-4 py-2 text-xs transition-all">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-lg bg-amber-400/20 border border-amber-300/40 text-amber-200 animate-pulse flex-shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="leading-tight">
            <span className="font-extrabold tracking-wide uppercase text-[11px] text-amber-300 mr-2">
              Secret Impersonation Mode
            </span>
            <span className="text-slate-100">
              Logged in as <strong className="text-white underline decoration-amber-400 font-bold">{user.name}</strong> ({user.email}) — Role: <span className="font-mono font-bold uppercase bg-black/20 px-1.5 py-0.5 rounded text-[10px]">{user.roles?.[0] || 'Member'}</span>
              {user.impersonationReason && (
                <span className="ml-2 text-amber-200/90 font-mono text-[10px] bg-black/20 px-1.5 py-0.5 rounded">
                  Reason: {user.impersonationReason}
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="hidden md:inline text-[11px] text-amber-200/80 italic">
            All actions logged in Platform Audit
          </span>
          <button
            onClick={handleExit}
            disabled={isExiting}
            className="flex items-center gap-1.5 bg-white text-slate-900 hover:bg-amber-50 font-bold px-3 py-1 rounded-lg shadow transition-transform active:scale-95 disabled:opacity-50 text-[11px]"
          >
            {isExiting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
            ) : (
              <LogOut className="w-3.5 h-3.5 text-purple-600" />
            )}
            <span>Exit Impersonation</span>
          </button>
        </div>
      </div>
    </div>
  );
}
