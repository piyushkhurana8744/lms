'use client';

import React from 'react';
import { PublicSiteProvider } from '@/components/public-site-provider';
import { PublicBrandProvider } from '@/components/public/PublicBrandProvider';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <PublicSiteProvider>
      <PublicBrandProvider>
        <div className="min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)] flex flex-col selection:bg-[#BE1E2E] selection:text-white transition-colors duration-200">
          <PublicHeader />
          <main className="flex-1">
            {children}
          </main>
          <PublicFooter />
        </div>
      </PublicBrandProvider>
    </PublicSiteProvider>
  );
}
