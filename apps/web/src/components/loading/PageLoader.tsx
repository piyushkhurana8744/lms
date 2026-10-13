'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface PageLoaderProps {
  label?: string;
  sublabel?: string;
}

export function PageLoader({
  label = 'Loading DIDM LMS...',
  sublabel = 'Preparing your learning environment'
}: PageLoaderProps) {
  return (
    <div className="fixed inset-0 z-[9980] bg-[var(--brand-background)]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
      <div className="space-y-4 max-w-sm w-full flex flex-col items-center">
        {/* Brand Logo Pulse container */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#BE1E2E] to-[#E52D3D] flex items-center justify-center shadow-lg shadow-[#BE1E2E]/20 animate-pulse">
          <span className="text-white font-extrabold text-2xl tracking-tighter">DIDM</span>
        </div>

        <div className="flex items-center gap-2 text-[#BE1E2E] font-semibold text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{label}</span>
        </div>

        {sublabel && (
          <p className="text-xs text-[var(--brand-text-secondary)] max-w-xs leading-relaxed">
            {sublabel}
          </p>
        )}
      </div>
    </div>
  );
}
