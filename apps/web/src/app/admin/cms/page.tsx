'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IOrganizationWebsite } from '@edtech/types';
import { WebsiteCmsShell } from '@/components/cms/WebsiteCmsShell';
import { BrandingEditor } from '@/components/cms/BrandingEditor';
import { HeroEditor } from '@/components/cms/HeroEditor';
import { HomepageBuilder } from '@/components/cms/HomepageBuilder';
import { NavigationBuilder } from '@/components/cms/NavigationBuilder';
import { AboutEditor } from '@/components/cms/AboutEditor';
import { ContactEditor } from '@/components/cms/ContactEditor';
import { SocialLinksEditor } from '@/components/cms/SocialLinksEditor';
import { FooterEditor } from '@/components/cms/FooterEditor';
import { SeoEditor } from '@/components/cms/SeoEditor';
import { PublishWebsiteDialog } from '@/components/cms/PublishWebsiteDialog';
import { useGlobalError } from '@/components/error/useGlobalError';
import { Loader2 } from 'lucide-react';

export default function AdminCmsDashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showError } = useGlobalError();

  const [activeTab, setActiveTab] = useState<string>('branding');
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [draftState, setDraftState] = useState<IOrganizationWebsite | null>(null);

  // Fetch website draft settings
  const { data, isLoading, isError, error } = useQuery<IOrganizationWebsite>({
    queryKey: ['admin-website-cms'],
    queryFn: async () => {
      const res = await fetch('/api/v1/organization/website');
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message || 'Failed to fetch website settings');
      }
      const json = await res.json();
      return json.data;
    }
  });

  useEffect(() => {
    if (data) {
      setDraftState(data);
    }
  }, [data]);

  // Section Save Mutation
  const saveSectionMutation = useMutation({
    mutationFn: async ({ section, payload }: { section: string; payload: any }) => {
      const res = await fetch(`/api/v1/organization/website/${section}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || `Failed to update ${section} settings`);
      return json.data;
    },
    onSuccess: (updatedData) => {
      queryClient.setQueryData(['admin-website-cms'], updatedData);
      setDraftState(updatedData);
    },
    onError: (err: Error) => {
      showError({ title: 'CMS Save Failed', message: err.message });
    }
  });

  // Publish Mutation
  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/organization/website/publish', {
        method: 'POST'
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to publish website');
      return json.data;
    },
    onSuccess: (updatedData) => {
      queryClient.setQueryData(['admin-website-cms'], updatedData);
      queryClient.invalidateQueries({ queryKey: ['public-tenant-website'] });
      queryClient.invalidateQueries({ queryKey: ['organization-setup-progress'] });
      setDraftState(updatedData);
      setIsPublishModalOpen(false);
    },
    onError: (err: Error) => {
      showError({ title: 'Publish Failed', message: err.message });
    }
  });

  const handleSaveActiveSection = () => {
    if (!draftState) return;

    let payload: any = {};
    switch (activeTab) {
      case 'branding':
        payload = draftState.branding;
        break;
      case 'hero':
        payload = draftState.hero;
        break;
      case 'homepage':
        payload = draftState.homepage;
        break;
      case 'navigation':
        payload = draftState.navigation;
        break;
      case 'about':
        payload = draftState.about;
        break;
      case 'contact':
        payload = draftState.contact;
        break;
      case 'social':
        payload = draftState.socialLinks;
        break;
      case 'footer':
        payload = draftState.footer;
        break;
      case 'seo':
        payload = draftState.seo;
        break;
      default:
        payload = {};
    }

    saveSectionMutation.mutate({ section: activeTab, payload });
  };

  if (isLoading || !draftState) {
    return (
      <div className="p-8 max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#BE1E2E]" />
        <p className="text-sm font-medium text-[var(--text-muted)]">Loading Website CMS Engine...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm font-bold">
          Failed to load Website CMS settings: {(error as Error)?.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen bg-[var(--brand-background)]">
      <WebsiteCmsShell
        activeTab={activeTab}
        onTabChange={setActiveTab}
        status={draftState.status}
        publishedAt={draftState.publishedAt}
        isSavePending={saveSectionMutation.isPending}
        isPublishPending={publishMutation.isPending}
        onSaveDraft={handleSaveActiveSection}
        onOpenPublishModal={() => setIsPublishModalOpen(true)}
        onOpenPreview={() => router.push('/admin/cms/preview')}
      >
        {activeTab === 'branding' && (
          <BrandingEditor
            branding={draftState.branding}
            onChange={(branding) => setDraftState({ ...draftState, branding })}
          />
        )}

        {activeTab === 'hero' && (
          <HeroEditor
            hero={draftState.hero}
            onChange={(hero) => setDraftState({ ...draftState, hero })}
          />
        )}

        {activeTab === 'homepage' && (
          <HomepageBuilder
            homepage={draftState.homepage}
            onChange={(homepage) => setDraftState({ ...draftState, homepage })}
          />
        )}

        {activeTab === 'navigation' && (
          <NavigationBuilder
            navigation={draftState.navigation}
            onChange={(navigation) => setDraftState({ ...draftState, navigation })}
          />
        )}

        {activeTab === 'about' && (
          <AboutEditor
            about={draftState.about}
            onChange={(about) => setDraftState({ ...draftState, about })}
          />
        )}

        {activeTab === 'contact' && (
          <ContactEditor
            contact={draftState.contact}
            onChange={(contact) => setDraftState({ ...draftState, contact })}
          />
        )}

        {activeTab === 'social' && (
          <SocialLinksEditor
            socialLinks={draftState.socialLinks}
            onChange={(socialLinks) => setDraftState({ ...draftState, socialLinks })}
          />
        )}

        {activeTab === 'footer' && (
          <FooterEditor
            footer={draftState.footer}
            onChange={(footer) => setDraftState({ ...draftState, footer })}
          />
        )}

        {activeTab === 'seo' && (
          <SeoEditor
            seo={draftState.seo}
            onChange={(seo) => setDraftState({ ...draftState, seo })}
          />
        )}
      </WebsiteCmsShell>

      <PublishWebsiteDialog
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        onConfirm={() => publishMutation.mutate()}
        isPending={publishMutation.isPending}
      />
    </div>
  );
}
