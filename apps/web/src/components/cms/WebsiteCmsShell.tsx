'use client';

import React from 'react';
import { WebsiteStatus } from '@edtech/types';
import { Button, Badge } from '@edtech/ui';
import {
  Palette,
  Sparkles,
  Layout,
  Compass,
  Info,
  Mail,
  Share2,
  AlignLeft,
  Globe,
  Eye,
  Save,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export interface WebsiteCmsShellProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  status: WebsiteStatus;
  publishedAt?: Date | string;
  isSavePending?: boolean;
  isPublishPending?: boolean;
  isDraftDirty?: boolean;
  onSaveDraft: () => void;
  onOpenPublishModal: () => void;
  onOpenPreview: () => void;
  children: React.ReactNode;
}

export function WebsiteCmsShell({
  activeTab,
  onTabChange,
  status,
  publishedAt,
  isSavePending,
  isPublishPending,
  isDraftDirty,
  onSaveDraft,
  onOpenPublishModal,
  onOpenPreview,
  children
}: WebsiteCmsShellProps) {
  const tabs = [
    { key: 'branding', label: 'Branding', icon: <Palette className="w-4 h-4" /> },
    { key: 'hero', label: 'Hero Banner', icon: <Sparkles className="w-4 h-4" /> },
    { key: 'homepage', label: 'Homepage Builder', icon: <Layout className="w-4 h-4" /> },
    { key: 'navigation', label: 'Navigation', icon: <Compass className="w-4 h-4" /> },
    { key: 'about', label: 'About Section', icon: <Info className="w-4 h-4" /> },
    { key: 'contact', label: 'Contact Details', icon: <Mail className="w-4 h-4" /> },
    { key: 'social', label: 'Social Channels', icon: <Share2 className="w-4 h-4" /> },
    { key: 'footer', label: 'Footer & Copyright', icon: <AlignLeft className="w-4 h-4" /> },
    { key: 'seo', label: 'SEO & Social Cards', icon: <Globe className="w-4 h-4" /> }
  ];

  return (
    <div className="space-y-6 text-[var(--brand-text)] max-w-7xl mx-auto">
      {/* Top CMS Bar */}
      <div className="p-6 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight">Website CMS Dashboard</h1>
            {status === 'PUBLISHED' ? (
              <Badge variant="success" className="flex items-center gap-1">
                ● Published
              </Badge>
            ) : (
              <Badge variant="brand" className="flex items-center gap-1">
                ○ Draft Mode
              </Badge>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] flex items-center gap-2">
            <span>Manage organization public website content, theme branding, and section layout.</span>
            {publishedAt && (
              <span className="font-mono text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                <Clock className="w-3 h-3" /> Published: {new Date(publishedAt).toLocaleString()}
              </span>
            )}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenPreview}
            className="flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5 text-blue-500" /> Preview
          </Button>

          {status === 'PUBLISHED' && (
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs font-semibold text-[var(--brand-text)] hover:underline"
            >
              <span>Live Website</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onSaveDraft}
            disabled={isSavePending}
            className="flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5 text-amber-500" />
            <span>{isSavePending ? 'Saving...' : 'Save Draft'}</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onOpenPublishModal}
            disabled={isPublishPending}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Publish Website</span>
          </Button>
        </div>
      </div>

      {/* Sidebar + Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Sidebar Navigation */}
        <div className="p-3 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-1 lg:sticky lg:top-6">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange(tab.key)}
                className={`w-full p-3 rounded-xl text-left flex items-center justify-between text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#BE1E2E] text-white shadow-lg shadow-[#BE1E2E]/20'
                    : 'text-[var(--brand-text)] hover:bg-[var(--brand-background)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {tab.icon}
                  <span>{tab.label}</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 opacity-60 ${isActive ? 'text-white' : 'text-[var(--text-muted)]'}`} />
              </button>
            );
          })}
        </div>

        {/* Editor Main Content Area */}
        <div className="lg:col-span-3">{children}</div>
      </div>
    </div>
  );
}
