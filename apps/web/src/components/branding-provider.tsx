'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { IResolvedBranding } from '@edtech/types';
import { resolveBranding } from '@edtech/utils';

const defaultBranding = resolveBranding(null);

const BrandingContext = createContext<IResolvedBranding>(defaultBranding);

export function BrandingProvider({
  children,
  initialBranding
}: {
  children: React.ReactNode;
  initialBranding?: Partial<IResolvedBranding>;
}) {
  const [branding, setBranding] = useState<IResolvedBranding>({
    ...defaultBranding,
    ...initialBranding
  });

  useEffect(() => {
    // Fetch dynamic tenant branding resolution from API
    const fetchBranding = async () => {
      try {
        const res = await fetch('/api/v1/public/tenant/branding');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const orgBranding = json.data.organizationBranding || json.data.branding;
            if (orgBranding) {
              setBranding((prev) => ({
                ...prev,
                companyName: orgBranding.organizationName || orgBranding.companyName || prev.companyName,
                logoUrl: orgBranding.logoUrl || prev.logoUrl,
                faviconUrl: orgBranding.faviconUrl || prev.faviconUrl,
                primaryColor: orgBranding.primaryColor || prev.primaryColor,
                secondaryColor: orgBranding.secondaryColor || prev.secondaryColor,
                accentColor: orgBranding.accentColor || prev.accentColor,
                fontFamily: orgBranding.fontFamily || prev.fontFamily,
                backgroundColor: orgBranding.backgroundColor || prev.backgroundColor,
                textColor: orgBranding.textColor || prev.textColor,
                surfaceColor: orgBranding.surfaceColor || prev.surfaceColor
              }));
            }
          }
        }
      } catch {
        // Fallback to default platform branding on offline/error
      }
    };

    fetchBranding();
  }, []);

  // Inject CSS variables dynamically into document root
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (branding.primaryColor) root.style.setProperty('--brand-primary', branding.primaryColor);
      if (branding.secondaryColor) root.style.setProperty('--brand-secondary', branding.secondaryColor);
      if (branding.accentColor) root.style.setProperty('--brand-accent', branding.accentColor);
      // Clean up any stale inline overrides for background and text
      root.style.removeProperty('--brand-background');
      root.style.removeProperty('--brand-text');
      root.style.removeProperty('--brand-surface');
      root.style.removeProperty('--bg-surface');

      // Convert hex to rgb for opacity utility variables
      if (branding.primaryColor?.startsWith('#') && branding.primaryColor.length === 7) {
        const r = parseInt(branding.primaryColor.slice(1, 3), 16);
        const g = parseInt(branding.primaryColor.slice(3, 5), 16);
        const b = parseInt(branding.primaryColor.slice(5, 7), 16);
        root.style.setProperty('--brand-[#BE1E2E]-rgb', `${r}, ${g}, ${b}`);
        root.style.setProperty('--brand-primary-rgb', `${r}, ${g}, ${b}`);
      }

      // Update Favicon Link dynamically
      if (branding.faviconUrl) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (!link) {
          link = document.createElement('link');
          link.type = 'image/x-icon';
          link.rel = 'shortcut icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = branding.faviconUrl;
      }
    }
  }, [branding]);

  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding(): IResolvedBranding {
  const context = useContext(BrandingContext);
  if (!context) {
    return defaultBranding;
  }
  return context;
}
