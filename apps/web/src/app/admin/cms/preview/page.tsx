'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IOrganizationWebsite } from '@edtech/types';
import { Button } from '@edtech/ui';
import { BackButton } from '@/components/navigation/BackButton';
import { PublishWebsiteDialog } from '@/components/cms/PublishWebsiteDialog';
import { useGlobalError } from '@/components/error/useGlobalError';
import {
  Monitor,
  Tablet,
  Smartphone,
  Globe,
  Loader2,
  BookOpen,
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  Twitter,
  ExternalLink
} from 'lucide-react';

export default function AdminCmsPreviewPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showError } = useGlobalError();

  const [deviceFrame, setDeviceFrame] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  // Fetch draft preview settings
  const { data: draftConfig, isLoading } = useQuery<IOrganizationWebsite>({
    queryKey: ['admin-website-preview'],
    queryFn: async () => {
      const res = await fetch('/api/v1/organization/website/preview');
      if (!res.ok) throw new Error('Failed to load website draft preview');
      const json = await res.json();
      return json.data;
    }
  });

  // Publish Mutation
  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/organization/website/publish', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to publish website');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-website-cms'] });
      queryClient.invalidateQueries({ queryKey: ['public-tenant-website'] });
      setIsPublishModalOpen(false);
      router.push('/admin/cms');
    },
    onError: (err: Error) => showError({ title: 'Publish Failed', message: err.message })
  });

  if (isLoading || !draftConfig) {
    return (
      <div className="p-8 max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#BE1E2E]" />
        <p className="text-sm font-medium text-[var(--text-muted)]">Loading Website Draft Preview...</p>
      </div>
    );
  }

  const { branding, hero, homepage, about, contact, socialLinks, footer, navigation } = draftConfig;

  const frameWidthClass =
    deviceFrame === 'mobile'
      ? 'max-w-[375px]'
      : deviceFrame === 'tablet'
      ? 'max-w-[768px]'
      : 'max-w-full';

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Top Preview Control Header */}
      <div className="p-4 bg-gray-950 border-b border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/cms')} className="text-gray-300 hover:text-white">
            ← Back to Editor
          </Button>
          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
            DRAFT PREVIEW MODE
          </span>
        </div>

        {/* Viewport Frame Toggles */}
        <div className="flex items-center gap-1 bg-gray-800/80 p-1 rounded-xl border border-gray-700">
          <button
            type="button"
            onClick={() => setDeviceFrame('desktop')}
            className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              deviceFrame === 'desktop' ? 'bg-[#BE1E2E] text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Monitor className="w-4 h-4" /> <span className="hidden sm:inline">Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setDeviceFrame('tablet')}
            className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              deviceFrame === 'tablet' ? 'bg-[#BE1E2E] text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Tablet className="w-4 h-4" /> <span className="hidden sm:inline">Tablet</span>
          </button>
          <button
            type="button"
            onClick={() => setDeviceFrame('mobile')}
            className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              deviceFrame === 'mobile' ? 'bg-[#BE1E2E] text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" /> <span className="hidden sm:inline">Mobile</span>
          </button>
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => setIsPublishModalOpen(true)}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Globe className="w-4 h-4" /> Publish Website
        </Button>
      </div>

      {/* Frame Container */}
      <div className="flex-1 p-4 sm:p-8 flex justify-center bg-gray-900 overflow-y-auto">
        <div
          className={`w-full ${frameWidthClass} transition-all duration-300 bg-white text-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-700 flex flex-col`}
          style={{
            ['--brand-primary' as any]: branding.primaryColor || '#BE1E2E',
            ['--brand-secondary' as any]: branding.secondaryColor || '#1F2937'
          }}
        >
          {/* Mock Header */}
          <header className="p-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-20">
            <div className="flex items-center gap-3">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="Logo" className="h-8 object-contain" />
              ) : (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-white" style={{ backgroundColor: branding.primaryColor || '#BE1E2E' }}>
                  {(branding.organizationName || 'D')[0]}
                </div>
              )}
              <span className="font-extrabold text-base tracking-tight" style={{ fontFamily: branding.headingFont }}>
                {branding.organizationName || 'DIDM Academy'}
              </span>
            </div>

            <nav className="hidden sm:flex items-center gap-5 text-xs font-semibold text-gray-600">
              {(navigation.links || []).map((link, idx) => (
                <span key={idx} className="hover:text-black cursor-pointer">{link.label}</span>
              ))}
            </nav>

            <button type="button" className="px-4 py-2 rounded-xl text-white text-xs font-bold shadow" style={{ backgroundColor: branding.primaryColor || '#BE1E2E' }}>
              Explore Courses
            </button>
          </header>

          {/* Hero Section */}
          {hero.enabled !== false && (
            <section className="p-8 sm:p-14 bg-gradient-to-r from-gray-900 via-gray-800 to-black text-white relative overflow-hidden">
              {hero.backgroundUrl && (
                <img src={hero.backgroundUrl} alt="Hero" className="absolute inset-0 w-full h-full object-cover opacity-20" />
              )}
              <div className="relative z-10 max-w-2xl space-y-4">
                {hero.eyebrow && (
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#BE1E2E] bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                    {hero.eyebrow}
                  </span>
                )}
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                  {hero.title || 'Master New Digital Skills'}
                </h1>
                <p className="text-xs sm:text-sm text-gray-300">
                  {hero.subtitle || 'Industry-aligned certified courses taught by domain experts.'}
                </p>
                <div className="pt-2 flex flex-wrap gap-3">
                  {hero.primaryButton?.enabled !== false && (
                    <button type="button" className="px-6 py-3 rounded-xl text-white text-xs font-bold shadow-lg" style={{ backgroundColor: branding.primaryColor || '#BE1E2E' }}>
                      {hero.primaryButton?.label || 'Explore Courses'}
                    </button>
                  )}
                  {hero.secondaryButton?.enabled && (
                    <button type="button" className="px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold backdrop-blur-sm">
                      {hero.secondaryButton?.label || 'Contact Us'}
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Featured Courses Mock */}
          {homepage.showFeaturedCourses !== false && (
            <section className="p-8 sm:p-12 space-y-6 bg-gray-50">
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold text-gray-900">Featured Courses</h2>
                <p className="text-xs text-gray-500">Accelerate your career with our top-rated certified programs.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-3">
                    <div className="w-full h-36 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                      <BookOpen className="w-8 h-8 opacity-40" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-extrabold text-sm text-gray-900">Course Program #{i}</div>
                      <div className="text-xs text-gray-500 line-clamp-2">Comprehensive curriculum covering real-world industry case studies.</div>
                    </div>
                    <div className="pt-2 flex items-center justify-between text-xs border-t border-gray-100">
                      <span className="font-bold text-gray-900">$199</span>
                      <span className="font-semibold text-blue-600 flex items-center gap-1">View <ArrowRight className="w-3 h-3" /></span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* About Section */}
          {homepage.showAbout !== false && (
            <section className="p-8 sm:p-12 space-y-4 bg-white border-t border-gray-100">
              <h2 className="text-xl font-extrabold text-gray-900">{about.title || 'About Our Academy'}</h2>
              <p className="text-xs text-gray-600 leading-relaxed max-w-3xl">
                {about.description || 'We are dedicated to providing world-class online education that transforms careers.'}
              </p>
            </section>
          )}

          {/* Contact Section */}
          {homepage.showContact !== false && (
            <section className="p-8 sm:p-12 space-y-4 bg-gray-900 text-white">
              <h2 className="text-xl font-extrabold">Get In Touch</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                {contact.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-[#BE1E2E]" /> {contact.email}</div>}
                {contact.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-[#BE1E2E]" /> {contact.phone}</div>}
                {contact.address && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#BE1E2E]" /> {contact.address}</div>}
              </div>
            </section>
          )}

          {/* Footer */}
          <footer className="p-6 bg-black text-gray-400 text-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>{footer.copyrightText || `© ${new Date().getFullYear()} ${branding.organizationName}. All rights reserved.`}</div>
            <div className="flex items-center gap-3">
              {socialLinks.facebook && <Facebook className="w-4 h-4 cursor-pointer hover:text-white" />}
              {socialLinks.instagram && <Instagram className="w-4 h-4 cursor-pointer hover:text-white" />}
              {socialLinks.youtube && <Youtube className="w-4 h-4 cursor-pointer hover:text-white" />}
              {socialLinks.linkedin && <Linkedin className="w-4 h-4 cursor-pointer hover:text-white" />}
              {socialLinks.twitter && <Twitter className="w-4 h-4 cursor-pointer hover:text-white" />}
            </div>
          </footer>
        </div>
      </div>

      <PublishWebsiteDialog
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        onConfirm={() => publishMutation.mutate()}
        isPending={publishMutation.isPending}
      />
    </div>
  );
}
