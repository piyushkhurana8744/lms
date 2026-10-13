'use client';

import React from 'react';

interface TopProgressBarProps {
  isLoading: boolean;
  progress?: number; // 0-100 optional
}

export function TopProgressBar({ isLoading, progress }: TopProgressBarProps) {
  if (!isLoading) return null;

  const isIndeterminate = progress === undefined || progress === null;
  const widthStyle = isIndeterminate ? '100%' : `${Math.min(100, Math.max(0, progress))}%`;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-1 bg-transparent overflow-hidden">
      <div
        className={`h-full bg-gradient-to-r from-[#BE1E2E] via-[#E52D3D] to-[#BE1E2E] transition-all duration-300 ease-out shadow-[0_0_10px_rgba(190,30,46,0.6)] ${
          isIndeterminate ? 'animate-pulse w-full' : ''
        }`}
        style={{ width: isIndeterminate ? '100%' : widthStyle }}
      />
    </div>
  );
}
