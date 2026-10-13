'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { IPublicWebsiteConfig } from '@edtech/types';

export interface PublicSiteConfig {
  name: string;
  slug: string;
  websiteConfig?: IPublicWebsiteConfig | null;
  branding: {
    companyName: string;
    logoUrl: string;
    faviconUrl: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor?: string;
    headingFont?: string;
    bodyFont?: string;
    borderRadius?: string;
    showPlatformBranding: boolean;
  };
  hero: {
    enabled?: boolean;
    eyebrow?: string;
    title: string;
    subtitle: string;
    image?: string;
    buttonText: string;
    buttonLink: string;
    secondaryButtonText?: string;
    secondaryButtonLink?: string;
  };
  navigation?: {
    links: Array<{ label: string; href: string; external?: boolean }>;
  };
  footer: {
    description?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    copyrightText?: string;
    socialLinks?: Record<string, string>;
  };
  seo: {
    title?: string;
    metaDescription?: string;
    metaKeywords?: string;
    ogImage?: string;
  };
}

const defaultConfig: PublicSiteConfig = {
  name: 'DIDM LMS',
  slug: 'didm',
  branding: {
    companyName: 'DIDM LMS Platform',
    logoUrl: '/didmlogo.png',
    faviconUrl: '/didmfavicon.png',
    primaryColor: '#BE1E2E',
    secondaryColor: '#1F2937',
    accentColor: '#F59E0B',
    headingFont: 'Inter',
    bodyFont: 'Inter',
    showPlatformBranding: true
  },
  hero: {
    enabled: true,
    eyebrow: '#1 Digital Learning Platform',
    title: 'Accelerate Your Career with Industry Masterclasses',
    subtitle: 'Explore structured curriculum modules, video lessons, and interactive learning resources built for real-world mastery.',
    buttonText: 'Browse All Courses',
    buttonLink: '/courses'
  },
  navigation: {
    links: [
      { label: 'Home', href: '/' },
      { label: 'Courses', href: '/courses' },
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' }
    ]
  },
  footer: {
    description: 'Enterprise Digital Learning Management Platform empowering students with industry-grade skills.',
    contactEmail: 'support@didm.edu',
    contactPhone: '+1 (800) 555-DIDM',
    address: 'DIDM Digital Learning Hub, Delhi NCR',
    copyrightText: 'Copyright © 2026 DIDM LMS Platform. All rights reserved.'
  },
  seo: {
    title: 'DIDM LMS — Digital Learning Management Platform',
    metaDescription: 'DIDM Digital Learning Management Platform for enterprise courses, students, instructors, and workspace management.'
  }
};

const PublicBrandContext = createContext<PublicSiteConfig>(defaultConfig);

export function PublicBrandProvider({ children }: { children: React.ReactNode }) {
  // Fetch published CMS website configuration
  const { data: pubWebsiteData } = useQuery({
    queryKey: ['public-tenant-website'],
    queryFn: async () => {
      const res = await fetch('/api/v1/public/website');
      if (!res.ok) return null;
      const json = await res.json();
      return (json.data as IPublicWebsiteConfig) || null;
    },
    staleTime: 1000 * 60 * 5
  });

  // Fetch legacy site config fallback
  const { data: legacyData } = useQuery({
    queryKey: ['public-site-config'],
    queryFn: async () => {
      const res = await fetch('/api/v1/public/site');
      if (!res.ok) return defaultConfig;
      const json = await res.json();
      return (json.data as PublicSiteConfig) || defaultConfig;
    },
    staleTime: 1000 * 60 * 5
  });

  const baseConfig = legacyData || defaultConfig;

  // Merge published CMS configuration when available
  const mergedConfig: PublicSiteConfig = React.useMemo(() => {
    if (!pubWebsiteData || pubWebsiteData.status !== 'PUBLISHED') {
      return baseConfig;
    }

    const { branding, hero, about, contact, socialLinks, footer, seo, navigation } = pubWebsiteData;

    return {
      name: branding.organizationName || baseConfig.name,
      slug: baseConfig.slug,
      websiteConfig: pubWebsiteData,
      branding: {
        companyName: branding.organizationName || baseConfig.branding.companyName,
        logoUrl: branding.logoUrl || baseConfig.branding.logoUrl,
        faviconUrl: branding.faviconUrl || baseConfig.branding.faviconUrl,
        primaryColor: branding.primaryColor || baseConfig.branding.primaryColor,
        secondaryColor: branding.secondaryColor || baseConfig.branding.secondaryColor,
        accentColor: branding.accentColor || baseConfig.branding.accentColor,
        headingFont: branding.headingFont || 'Inter',
        bodyFont: branding.bodyFont || 'Inter',
        borderRadius: branding.borderRadius || 'MEDIUM',
        showPlatformBranding: true
      },
      hero: {
        enabled: hero.enabled !== false,
        eyebrow: hero.eyebrow || baseConfig.hero.eyebrow,
        title: hero.title || baseConfig.hero.title,
        subtitle: hero.subtitle || baseConfig.hero.subtitle,
        image: hero.backgroundUrl || baseConfig.hero.image,
        buttonText: hero.primaryButton?.label || baseConfig.hero.buttonText,
        buttonLink: hero.primaryButton?.href || baseConfig.hero.buttonLink,
        secondaryButtonText: hero.secondaryButton?.enabled ? hero.secondaryButton.label : undefined,
        secondaryButtonLink: hero.secondaryButton?.enabled ? hero.secondaryButton.href : undefined
      },
      navigation: navigation?.links && navigation.links.length > 0 ? navigation : baseConfig.navigation,
      footer: {
        description: footer.description || about.description || baseConfig.footer.description,
        contactEmail: contact.email || baseConfig.footer.contactEmail,
        contactPhone: contact.phone || baseConfig.footer.contactPhone,
        address: contact.address || baseConfig.footer.address,
        copyrightText: footer.copyrightText || baseConfig.footer.copyrightText,
        socialLinks: {
          facebook: socialLinks.facebook || '',
          instagram: socialLinks.instagram || '',
          youtube: socialLinks.youtube || '',
          linkedin: socialLinks.linkedin || '',
          twitter: socialLinks.twitter || ''
        }
      },
      seo: {
        title: seo.title || baseConfig.seo.title,
        metaDescription: seo.description || baseConfig.seo.metaDescription,
        metaKeywords: seo.keywords ? seo.keywords.join(', ') : baseConfig.seo.metaKeywords,
        ogImage: seo.ogImageUrl || baseConfig.seo.ogImage
      }
    };
  }, [pubWebsiteData, baseConfig]);

  // Dynamically set tenant brand colors on document element
  useEffect(() => {
    if (mergedConfig.branding.primaryColor) {
      document.documentElement.style.setProperty('--brand-[#BE1E2E]', mergedConfig.branding.primaryColor);
      document.documentElement.style.setProperty('--tenant-primary', mergedConfig.branding.primaryColor);
      document.documentElement.style.setProperty('--brand-primary', mergedConfig.branding.primaryColor);
    }
    if (mergedConfig.branding.secondaryColor) {
      document.documentElement.style.setProperty('--tenant-secondary', mergedConfig.branding.secondaryColor);
      document.documentElement.style.setProperty('--brand-secondary', mergedConfig.branding.secondaryColor);
    }
    if (mergedConfig.branding.accentColor) {
      document.documentElement.style.setProperty('--brand-accent', mergedConfig.branding.accentColor);
    }
  }, [mergedConfig]);

  return (
    <PublicBrandContext.Provider value={mergedConfig}>
      {children}
    </PublicBrandContext.Provider>
  );
}

export function usePublicBrand() {
  return useContext(PublicBrandContext);
}
