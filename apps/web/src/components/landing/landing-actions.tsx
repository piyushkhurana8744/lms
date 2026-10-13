'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { getDashboardRoute } from '@/utils/navigation';
import { ArrowRight } from 'lucide-react';

export function LandingActions() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const dashboardRoute = getDashboardRoute(user);

  const scrollToArchitecture = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const element = document.getElementById('architecture');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const targetDashboard = !isLoading && isAuthenticated ? dashboardRoute : '/login';

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
      <Link
        href={targetDashboard}
        className="w-full sm:w-auto px-7 py-3 rounded-xl btn-primary font-bold inline-flex items-center justify-center gap-2 shadow-lg shadow-[#BE1E2E]/25 hover:scale-[1.03] transition-transform text-white"
      >
        Explore Dashboard
        <ArrowRight className="w-4 h-4" />
      </Link>

      <a
        href="#architecture"
        onClick={scrollToArchitecture}
        className="w-full sm:w-auto px-7 py-3 rounded-xl glass-card text-[var(--brand-text)] font-semibold hover:bg-[var(--bg-surface-elevated)] transition-all text-center"
      >
        View Architecture
      </a>
    </div>
  );
}
