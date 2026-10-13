'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Globe, ArrowLeft, Home } from 'lucide-react';

export interface PublicOrganizationInfo {
  name: string;
  supportEmail: string;
  supportPhone?: string;
  address?: string;
  timezone: string;
  defaultLanguage: string;
  currency: string;
  branding: {
    companyName: string;
    logoUrl: string;
    faviconUrl: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor?: string;
    fontFamily?: string;
    showPlatformBranding: boolean;
  };
}

export interface PublicSiteContextValue {
  organization: PublicOrganizationInfo | null;
  siteData: any;
  isLoading: boolean;
  isNotFound: boolean;
  error: Error | null;
}

const PublicSiteContext = createContext<PublicSiteContextValue>({
  organization: null,
  siteData: null,
  isLoading: true,
  isNotFound: false,
  error: null
});

const HEX_COLOR_REGEX = /^#([0-9A-F]{3}){1,2}$/i;
const DEFAULT_ORGANIZATION: PublicOrganizationInfo = {
  name: 'DIDM Academy',
  supportEmail: 'support@didm.edu',
  supportPhone: '+1 (800) 555-DIDM',
  address: 'DIDM Digital Learning Hub, Delhi NCR',
  timezone: 'UTC',
  defaultLanguage: 'English',
  currency: 'USD',
  branding: {
    companyName: 'DIDM Academy',
    logoUrl: '/didmlogo.png',
    faviconUrl: '/didmfavicon.png',
    primaryColor: '#BE1E2E',
    secondaryColor: '#1F2937',
    accentColor: '#F59E0B',
    fontFamily: 'Inter',
    showPlatformBranding: true
  }
};

function isValidHexColor(color: string | undefined): boolean {
  if (!color || typeof color !== 'string') return false;
  return HEX_COLOR_REGEX.test(color);
}

export function PublicSiteProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading, error, isError } = useQuery({
    queryKey: ['public-site-runtime'],
    queryFn: async () => {
      const res = await fetch('/api/v1/public/site');
      if (res.status === 404) {
        throw new Error('WEBSITE_NOT_FOUND');
      }
      if (!res.ok) {
        throw new Error(`Failed to load site context (${res.status})`);
      }
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
    retry: false
  });

  const isNotFound = isError && error instanceof Error && error.message === 'WEBSITE_NOT_FOUND';
  const siteData = data?.data || null;
  const organization: PublicOrganizationInfo = React.useMemo(() => {
    if (!siteData?.organization && !siteData?.branding) return DEFAULT_ORGANIZATION;
    return {
      name: siteData?.branding?.companyName || siteData?.name || DEFAULT_ORGANIZATION.name,
      supportEmail: siteData?.footer?.contactEmail || DEFAULT_ORGANIZATION.supportEmail,
      supportPhone: siteData?.footer?.contactPhone || DEFAULT_ORGANIZATION.supportPhone,
      address: siteData?.footer?.address || DEFAULT_ORGANIZATION.address,
      timezone: 'UTC',
      defaultLanguage: 'English',
      currency: 'USD',
      branding: {
        companyName: siteData?.branding?.companyName || DEFAULT_ORGANIZATION.branding.companyName,
        logoUrl: siteData?.branding?.logoUrl || DEFAULT_ORGANIZATION.branding.logoUrl,
        faviconUrl: siteData?.branding?.faviconUrl || DEFAULT_ORGANIZATION.branding.faviconUrl,
        primaryColor: siteData?.branding?.primaryColor || DEFAULT_ORGANIZATION.branding.primaryColor,
        secondaryColor: siteData?.branding?.secondaryColor || DEFAULT_ORGANIZATION.branding.secondaryColor,
        accentColor: siteData?.branding?.accentColor || DEFAULT_ORGANIZATION.branding.accentColor,
        fontFamily: siteData?.branding?.fontFamily || 'Inter',
        showPlatformBranding: siteData?.branding?.showPlatformBranding ?? true
      }
    };
  }, [siteData]);

  // Apply CSS branding variables safely
  useEffect(() => {
    if (organization?.branding) {
      const { primaryColor, secondaryColor, accentColor } = organization.branding;

      if (isValidHexColor(primaryColor)) {
        document.documentElement.style.setProperty('--brand-primary', primaryColor);
        document.documentElement.style.setProperty('--tenant-primary', primaryColor);
      }

      if (isValidHexColor(secondaryColor)) {
        document.documentElement.style.setProperty('--tenant-secondary', secondaryColor);
      }

      if (isValidHexColor(accentColor)) {
        document.documentElement.style.setProperty('--brand-accent', accentColor!);
      }
    }
  }, [organization]);

  if (isNotFound) {
    return <PublicWebsiteNotFoundScreen />;
  }

  return (
    <PublicSiteContext.Provider
      value={{
        organization,
        siteData,
        isLoading,
        isNotFound,
        error: isError ? (error as Error) : null
      }}
    >
      {children}
    </PublicSiteContext.Provider>
  );
}

export function usePublicSite() {
  return useContext(PublicSiteContext);
}

/**
 * Polished loading skeleton preventing layout shifts
 */
function PublicSiteLoadingSkeleton() {
  return (
    <div
      className="min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)] flex flex-col transition-colors duration-200 animate-pulse"
      aria-busy="true"
      aria-label="Loading website runtime context"
    >
      {/* Header Skeleton */}
      <header className="h-16 border-b border-[var(--brand-border)] bg-[var(--bg-surface)]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[var(--bg-surface-elevated)] rounded-lg" />
          <div className="w-32 h-5 bg-[var(--bg-surface-elevated)] rounded" />
        </div>
        <div className="hidden md:flex items-center gap-6">
          <div className="w-16 h-4 bg-[var(--bg-surface-elevated)] rounded" />
          <div className="w-16 h-4 bg-[var(--bg-surface-elevated)] rounded" />
          <div className="w-16 h-4 bg-[var(--bg-surface-elevated)] rounded" />
        </div>
        <div className="w-24 h-9 bg-[var(--bg-surface-elevated)] rounded-lg" />
      </header>

      {/* Main Content Skeleton */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 space-y-10">
        {/* Hero Skeleton */}
        <div className="space-y-4 max-w-3xl">
          <div className="w-48 h-6 bg-[var(--bg-surface-elevated)] rounded-full" />
          <div className="w-full h-12 bg-[var(--bg-surface-elevated)] rounded-xl" />
          <div className="w-3/4 h-6 bg-[var(--bg-surface-elevated)] rounded-lg" />
          <div className="flex gap-4 pt-4">
            <div className="w-36 h-11 bg-[var(--bg-surface-elevated)] rounded-xl" />
            <div className="w-36 h-11 bg-[var(--bg-surface-elevated)] rounded-xl" />
          </div>
        </div>

        {/* Cards Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl p-6 flex flex-col justify-between">
              <div className="w-12 h-12 bg-[var(--bg-surface-elevated)] rounded-xl" />
              <div className="space-y-2">
                <div className="w-3/4 h-5 bg-[var(--bg-surface-elevated)] rounded" />
                <div className="w-full h-4 bg-[var(--bg-surface-elevated)] rounded" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

/**
 * Tenant-aware 404 Website Not Found screen
 */
export function PublicWebsiteNotFoundScreen() {
  const handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      handleGoHome();
    }
  };

  return (
    <div className="min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)] flex items-center justify-center p-6 select-none">
      <div className="max-w-md w-full bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-3xl p-8 text-center shadow-2xl backdrop-blur-xl space-y-6">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto">
          <Globe className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">Website not found</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            This learning website isn&apos;t configured for this address yet.
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleBack}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={handleGoHome}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium shadow-lg shadow-red-600/20 transition-all"
          >
            <Home className="w-4 h-4" />
            Platform Home
          </button>
        </div>
      </div>
    </div>
  );
}
