'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card, Badge } from '@edtech/ui';
import { BackButton } from '@/components/navigation/BackButton';
import { getPublicSiteUrl } from '@/lib/public-site-url';
import { useGlobalError } from '@/components/error/useGlobalError';
import { StorageConfigurationCard } from '@/components/organization/StorageConfigurationCard';
import { IOrganizationStorageResponse, IOrganizationLaunchReadinessResponse } from '@edtech/types';
import {
  Building2,
  Palette,
  HardDrive,
  Mail,
  Globe,
  Users,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Circle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  X,
  Loader2,
  Save,
  Info,
  Rocket,
  ArrowRight,
  Plug
} from 'lucide-react';
import { OrganizationSettingsSkeleton } from '@/components/loading/SkeletonLoaders';

interface OrganizationProfile {
  organizationName: string;
  supportEmail: string;
  supportPhone?: string;
  address?: string;
  timezone: string;
  defaultLanguage: string;
  currency: string;
}

interface LmsPreferences {
  allowStudentSelfRegistration: boolean;
  requireEmailVerification: boolean;
  allowInstructorRegistration: boolean;
  maintenanceMode: boolean;
}

interface OrganizationSettingsData {
  _id: string;
  tenantId: string;
  profile: OrganizationProfile;
  lmsPreferences: LmsPreferences;
}

interface SetupChecklistItem {
  key: string;
  title: string;
  description: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_CONFIGURED' | 'OPTIONAL';
  completed: boolean;
  actionLabel: string;
  actionUrl: string;
}

interface SetupProgressData {
  completedSteps: number;
  totalSteps: number;
  completionPercentage: number;
  launchReadiness: 'NOT_STARTED' | 'IN_PROGRESS' | 'READY';
  checklist: SetupChecklistItem[];
}

export default function AdminOrganizationSettingsHub() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showError } = useGlobalError();

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<{ title: string; content: string; badge: string } | null>(null);

  // STEP 4J Modals State
  const [isBlockersModalOpen, setIsBlockersModalOpen] = useState(false);
  const [isConfirmLaunchModalOpen, setIsConfirmLaunchModalOpen] = useState(false);
  const [isLaunchSuccessModalOpen, setIsLaunchSuccessModalOpen] = useState(false);

  // Profile Form State
  const [profileForm, setProfileForm] = useState<OrganizationProfile>({
    organizationName: '',
    supportEmail: '',
    supportPhone: '',
    address: '',
    timezone: 'UTC',
    defaultLanguage: 'English',
    currency: 'USD'
  });

  // Fetch Settings Query
  const {
    data: settingsData,
    isLoading: isSettingsLoading
  } = useQuery<OrganizationSettingsData>({
    queryKey: ['organization-settings'],
    queryFn: async () => {
      const res = await fetch('/api/v1/organization/settings');
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || 'Failed to fetch organization settings');
      }
      const json = await res.json();
      return json.data;
    }
  });

  // Fetch Setup Progress Query
  const {
    data: progressData,
    isLoading: isProgressLoading
  } = useQuery<SetupProgressData>({
    queryKey: ['organization-setup-progress'],
    queryFn: async () => {
      const res = await fetch('/api/v1/organization/settings/setup-progress');
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || 'Failed to fetch setup progress');
      }
      const json = await res.json();
      return json.data;
    }
  });

  // STEP 4J Fetch Launch Readiness Query
  const {
    data: readinessData,
    isLoading: isReadinessLoading
  } = useQuery<IOrganizationLaunchReadinessResponse>({
    queryKey: ['organization-launch-readiness'],
    queryFn: async () => {
      const res = await fetch('/api/v1/organization/launch/readiness');
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || 'Failed to fetch launch readiness');
      }
      const json = await res.json();
      return json.data;
    }
  });

  // Fetch Storage Config Query
  const { data: storageConfig } = useQuery<IOrganizationStorageResponse>({
    queryKey: ['organization-storage'],
    queryFn: async () => {
      const res = await fetch('/api/v1/organization/settings/storage');
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    }
  });

  // Sync profile form when settings load
  useEffect(() => {
    if (settingsData?.profile) {
      setProfileForm({
        organizationName: settingsData.profile.organizationName || '',
        supportEmail: settingsData.profile.supportEmail || '',
        supportPhone: settingsData.profile.supportPhone || '',
        address: settingsData.profile.address || '',
        timezone: settingsData.profile.timezone || 'UTC',
        defaultLanguage: settingsData.profile.defaultLanguage || 'English',
        currency: settingsData.profile.currency || 'USD'
      });
    }
  }, [settingsData]);

  // Profile Update Mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (payload: Partial<OrganizationProfile>) => {
      const res = await fetch('/api/v1/organization/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to update organization profile');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
      queryClient.invalidateQueries({ queryKey: ['organization-setup-progress'] });
      queryClient.invalidateQueries({ queryKey: ['organization-launch-readiness'] });
      setIsProfileModalOpen(false);
    },
    onError: (err: Error) => {
      showError({ title: 'Profile Update Failed', message: err.message });
    }
  });

  // Preferences Update Mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (payload: Partial<LmsPreferences>) => {
      const res = await fetch('/api/v1/organization/settings/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to update LMS preferences');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
      queryClient.invalidateQueries({ queryKey: ['organization-setup-progress'] });
      queryClient.invalidateQueries({ queryKey: ['organization-launch-readiness'] });
    },
    onError: (err: Error) => {
      showError({ title: 'Preferences Update Failed', message: err.message });
    }
  });

  // STEP 4J Launch LMS Mutation
  const launchMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/organization/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const json = await res.json();
      if (!res.ok) {
        const err: any = new Error(json.error?.message || 'Failed to launch LMS');
        err.code = json.error?.code;
        err.blockers = json.error?.blockers;
        throw err;
      }
      return json.data;
    },
    onSuccess: () => {
      // Invalidate all relevant React Query caches
      queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
      queryClient.invalidateQueries({ queryKey: ['organization-setup-progress'] });
      queryClient.invalidateQueries({ queryKey: ['organization-launch-readiness'] });
      queryClient.invalidateQueries({ queryKey: ['public-branding'] });
      queryClient.invalidateQueries({ queryKey: ['public-website'] });
      queryClient.invalidateQueries({ queryKey: ['public-courses'] });

      setIsConfirmLaunchModalOpen(false);
      setIsLaunchSuccessModalOpen(true);
    },
    onError: (err: any) => {
      setIsConfirmLaunchModalOpen(false);
      if (err.code === 'ORGANIZATION_NOT_READY' || (err.blockers && err.blockers.length > 0)) {
        setIsBlockersModalOpen(true);
      } else {
        showError({
          title: 'Organization Launch Failed',
          message: err.message || 'We could not check your launch readiness. Please try again.'
        });
      }
    }
  });

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileForm);
  };

  const handleTogglePreference = (key: keyof LmsPreferences, currentValue: boolean) => {
    updatePreferencesMutation.mutate({
      [key]: !currentValue
    });
  };

  const handleLaunchClick = () => {
    if (!readinessData) return;
    if (readinessData.organizationStatus === 'LIVE') return;

    if (!readinessData.canLaunch || (readinessData.blockers && readinessData.blockers.length > 0)) {
      setIsBlockersModalOpen(true);
    } else {
      setIsConfirmLaunchModalOpen(true);
    }
  };

  const publicWebsiteUrl = getPublicSiteUrl();

  if (isSettingsLoading || isProgressLoading || isReadinessLoading) {
    return <OrganizationSettingsSkeleton />;
  }

  const profile = settingsData?.profile || {
    organizationName: 'DIDM LMS Organization',
    supportEmail: '',
    supportPhone: '',
    address: '',
    timezone: 'UTC',
    defaultLanguage: 'English',
    currency: 'USD'
  };

  const preferences = settingsData?.lmsPreferences || {
    allowStudentSelfRegistration: false,
    requireEmailVerification: true,
    allowInstructorRegistration: false,
    maintenanceMode: false
  };

  const readiness = readinessData || {
    organizationStatus: 'SETUP' as const,
    readinessStatus: 'NOT_READY' as const,
    completionPercentage: 0,
    requiredCompleted: 0,
    requiredTotal: 6,
    canLaunch: false,
    checks: [],
    blockers: [],
    warnings: [],
    lastEvaluatedAt: new Date().toISOString()
  };

  const isLive = readiness.organizationStatus === 'LIVE';

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8 text-[var(--brand-text)]">
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[var(--brand-border)]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <BackButton fallback="/admin" label="Go Back" />
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Organization Settings</h1>
            <Badge variant="brand" className="hidden sm:inline-flex">
              Multi-Tenant SaaS
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">
            Configure your organization foundation, LMS preferences, and launch readiness.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={publicWebsiteUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] hover:border-[#BE1E2E]/40 text-[var(--brand-text)] transition-colors flex items-center gap-2 shadow-sm"
          >
            <span>View Website</span>
            <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </a>
        </div>
      </div>

      {/* STEP 4J Launch Readiness Hero Section */}
      <Card className="relative overflow-hidden border-[#BE1E2E]/30 bg-gradient-to-br from-[var(--bg-surface)] via-[var(--bg-surface)] to-[#BE1E2E]/10 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-2 rounded-xl bg-[#BE1E2E]/10 text-[#BE1E2E]">
                <Rocket className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-extrabold tracking-tight">Organization Launch Readiness</h2>
              {isLive ? (
                <Badge variant="success">🚀 LMS is Live</Badge>
              ) : readiness.canLaunch ? (
                <Badge variant="brand">Ready to Launch</Badge>
              ) : (
                <Badge variant="outline">Setup In Progress</Badge>
              )}
            </div>

            <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
              {isLive
                ? 'Your organization is live. Your public LMS website is operating according to your current website and course visibility rules.'
                : 'Evaluate profile, branding, storage, email, domain, and course readiness before launching your LMS platform.'}
            </p>

            {/* Progress Counter & Bar */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="font-mono text-[#BE1E2E]">
                  {readiness.requiredCompleted} of {readiness.requiredTotal} required checks passed
                </span>
                <span className="font-mono text-[var(--brand-text)]">{readiness.completionPercentage}% Ready</span>
              </div>

              <div className="w-full h-3 rounded-full bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#BE1E2E] via-red-500 to-emerald-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${readiness.completionPercentage}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[200px] justify-center">
            {isLive ? (
              <a
                href={publicWebsiteUrl}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                <Globe className="w-4 h-4" />
                <span>View Website</span>
              </a>
            ) : (
              <Button
                variant="primary"
                onClick={handleLaunchClick}
                className="btn-primary px-5 py-3 text-xs font-bold shadow-lg shadow-[#BE1E2E]/20 flex items-center justify-center gap-2"
              >
                <Rocket className="w-4 h-4 text-white" />
                <span>{readiness.canLaunch ? 'Launch LMS' : 'Check Readiness & Launch'}</span>
              </Button>
            )}

            <Link href="/admin/onboarding">
              <Button variant="secondary" size="sm" className="w-full flex items-center justify-center gap-1 text-xs">
                <span>Continue Wizard</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Readiness Check Items Grid */}
        <div className="mt-6 pt-6 border-t border-[var(--brand-border)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {readiness.checks.map((item) => (
            <div
              key={item.key}
              className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                item.completed
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  : item.status === 'OPTIONAL'
                  ? 'bg-[var(--bg-surface-elevated)] border-[var(--brand-border)] text-[var(--text-muted)]'
                  : 'bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-400'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                {item.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                ) : item.status === 'OPTIONAL' ? (
                  <Circle className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                )}
                <span className="font-semibold truncate">{item.label}</span>
              </div>

              <Link
                href={item.actionUrl}
                className="px-2 py-1 rounded bg-[var(--bg-surface)] hover:bg-[var(--brand-border)] border border-[var(--brand-border)] text-[10px] font-bold text-[var(--brand-text)] flex-shrink-0 transition-colors"
              >
                {item.completed ? 'View' : 'Fix Now'}
              </Link>
            </div>
          ))}
        </div>
      </Card>

      {/* Settings Category Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
          <Sliders className="w-5 h-5 text-[#BE1E2E]" />
          <span>Organization Control Center</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/admin/settings/integrations" data-testid="settings-integrations-link" className="block">
            <Card interactive className="space-y-4 h-full flex flex-col justify-between border-[#BE1E2E]/30">
              <div className="space-y-3">
                <div className="flex items-center justify-between"><div className="p-2.5 rounded-xl bg-[#BE1E2E]/10 text-[#BE1E2E]"><Plug className="w-5 h-5" /></div><Badge variant="brand">External services</Badge></div>
                <div><h3 className="font-extrabold text-base text-[var(--brand-text)]">Integrations</h3><p className="text-xs text-[var(--text-muted)] mt-1">Connect Google Classroom, Google Meet, Zoom, and Microsoft Teams.</p></div>
              </div>
              <div className="text-xs font-bold text-[#BE1E2E] flex items-center gap-1">Open Integrations <ChevronRight className="w-4 h-4" /></div>
            </Card>
          </Link>
          {/* 1. Organization Profile Card */}
          <Card interactive className="space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-[#BE1E2E]/10 text-[#BE1E2E]">
                  <Building2 className="w-5 h-5" />
                </div>
                <Badge variant="success">Configured</Badge>
              </div>

              <div>
                <h3 className="font-extrabold text-base text-[var(--brand-text)]">Organization Profile</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Manage organization legal name, support contacts, address, and default locale.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Name:</span>
                  <span className="font-bold text-[var(--brand-text)] truncate max-w-[140px]">
                    {profile.organizationName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Support:</span>
                  <span className="font-bold text-[var(--brand-text)] truncate max-w-[140px]">
                    {profile.supportEmail || 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Timezone:</span>
                  <span className="font-bold text-[var(--brand-text)]">{profile.timezone}</span>
                </div>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsProfileModalOpen(true)}
              className="w-full flex items-center justify-center gap-2"
            >
              <span>Manage Profile</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </Card>

          {/* 2. Website & Branding Card */}
          <Card interactive className="space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
                  <Palette className="w-5 h-5" />
                </div>
                {readiness.checks.find(i => i.key === 'website_branding')?.completed ? (
                  <Badge variant="success">● Branded</Badge>
                ) : (
                  <Badge variant="outline">Default Branding</Badge>
                )}
              </div>

              <div>
                <h3 className="font-extrabold text-base text-[var(--brand-text)]">Website & Branding</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Customize company logo, primary colors, typography, hero copy, and white-label homepage.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">White-Label:</span>
                  <span className="font-bold text-[var(--brand-text)]">Active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Public Portal:</span>
                  <span className="font-bold text-emerald-500">Enabled</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Link href="/admin/cms" className="w-full">
                <Button variant="primary" size="sm" className="w-full flex items-center justify-center gap-1.5 text-xs btn-primary">
                  <span>CMS Studio</span>
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
              <Link href="/admin/cms/preview" className="w-full">
                <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-1.5 text-xs">
                  <span>Preview</span>
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </Card>

          {/* 3. Storage Configuration Card */}
          <StorageConfigurationCard storageConfig={storageConfig} />

          {/* 4. Email Configuration Card */}
          <Card interactive className="space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                  <Mail className="w-5 h-5" />
                </div>
                {readiness.checks.find((i) => i.key === 'email')?.completed ? (
                  <Badge variant="success">● Verified</Badge>
                ) : (
                  <Badge variant="outline">Needs Configuration</Badge>
                )}
              </div>

              <div>
                <h3 className="font-extrabold text-base text-[var(--brand-text)]">Email Configuration</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Configure Resend, Brevo, or custom SMTP servers for transactional LMS emails.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-xs space-y-1">
                <div className="flex justify-between text-[var(--text-muted)]">
                  <span>Supported:</span>
                  <span className="font-bold text-[var(--brand-text)]">Resend / Brevo / SMTP</span>
                </div>
              </div>
            </div>

            <Link href="/admin/organization/email" className="w-full">
              <Button variant="secondary" size="sm" className="w-full flex items-center justify-center gap-2">
                <span>Configure Email</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </Card>

          {/* 5. Domain Configuration Card */}
          <Card interactive className="space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <Globe className="w-5 h-5" />
                </div>
                {readiness.checks.find((i) => i.key === 'domain')?.completed ? (
                  <Badge variant="success">● Active</Badge>
                ) : (
                  <Badge variant="outline">Configurable</Badge>
                )}
              </div>

              <div>
                <h3 className="font-extrabold text-base text-[var(--brand-text)]">Domain & White-label</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Connect custom domains (e.g. learn.yourdomain.com) and customize public LMS website branding.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-xs space-y-1">
                <div className="flex justify-between text-[var(--text-muted)]">
                  <span>Routing:</span>
                  <span className="font-bold text-[var(--brand-text)]">Platform & Custom CNAME</span>
                </div>
              </div>
            </div>

            <Link href="/admin/organization/domain" className="w-full">
              <Button variant="secondary" size="sm" className="w-full flex items-center justify-center gap-2">
                <span>Configure Domain</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </Card>

          {/* 6. Team & Roles Card */}
          <Card interactive className="space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <Users className="w-5 h-5" />
                </div>
                <Badge variant="success">Configured</Badge>
              </div>

              <div>
                <h3 className="font-extrabold text-base text-[var(--brand-text)]">Team & Roles</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Manage workspace users, assign instructor roles, and configure granular permissions.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Access Control:</span>
                  <span className="font-bold text-emerald-500">Active RBAC</span>
                </div>
              </div>
            </div>

            <Link href="/admin/team" className="w-full">
              <Button variant="secondary" size="sm" className="w-full flex items-center justify-center gap-2">
                <span>Manage Team</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </Card>
        </div>
      </div>

      {/* 7. LMS Preferences Section */}
      <Card className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--brand-border)]">
          <div className="space-y-1">
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#BE1E2E]" />
              <span>LMS Preferences</span>
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Control workspace access policies, self-registration options, and system state.
            </p>
          </div>

          {updatePreferencesMutation.isPending && (
            <div className="flex items-center gap-2 text-xs font-semibold text-[#BE1E2E]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Preferences...</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Preference Toggle 1 */}
          <div className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[var(--brand-text)]">Student Self Registration</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Allow new students to create their own accounts without invitation.
              </p>
            </div>

            <button
              onClick={() =>
                handleTogglePreference('allowStudentSelfRegistration', preferences.allowStudentSelfRegistration)
              }
              disabled={updatePreferencesMutation.isPending}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                preferences.allowStudentSelfRegistration ? 'bg-[#BE1E2E]' : 'bg-gray-300 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.allowStudentSelfRegistration ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Preference Toggle 2 */}
          <div className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[var(--brand-text)]">Require Email Verification</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Mandate email confirmation before access is granted to courses.
              </p>
            </div>

            <button
              onClick={() =>
                handleTogglePreference('requireEmailVerification', preferences.requireEmailVerification)
              }
              disabled={updatePreferencesMutation.isPending}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                preferences.requireEmailVerification ? 'bg-[#BE1E2E]' : 'bg-gray-300 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.requireEmailVerification ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Preference Toggle 3 */}
          <div className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[var(--brand-text)]">Instructor Registration</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Allow instructor self-registration (subject to admin approval).
              </p>
            </div>

            <button
              onClick={() =>
                handleTogglePreference('allowInstructorRegistration', preferences.allowInstructorRegistration)
              }
              disabled={updatePreferencesMutation.isPending}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                preferences.allowInstructorRegistration ? 'bg-[#BE1E2E]' : 'bg-gray-300 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.allowInstructorRegistration ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Preference Toggle 4 */}
          <div className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[var(--brand-text)]">Maintenance Mode</h3>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  Config Flag
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Temporarily toggle platform maintenance mode status.
              </p>
            </div>

            <button
              onClick={() => handleTogglePreference('maintenanceMode', preferences.maintenanceMode)}
              disabled={updatePreferencesMutation.isPending}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                preferences.maintenanceMode ? 'bg-[#BE1E2E]' : 'bg-gray-300 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      {/* STEP 4J Modal 1: Launch Blockers Modal */}
      {isBlockersModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--brand-border)]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-extrabold text-[var(--brand-text)]">Your LMS isn&apos;t ready yet</h3>
              </div>

              <button
                onClick={() => setIsBlockersModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-surface-elevated)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Before your organization can go live, please complete the required setup items listed below:
            </p>

            <div className="space-y-3">
              {readiness.blockers.map((blocker) => (
                <div
                  key={blocker.key}
                  className="p-3.5 rounded-xl bg-red-500/5 border border-red-500/20 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-[var(--brand-text)] flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      <span>{blocker.label}</span>
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)]">{blocker.reason}</p>
                  </div>

                  <Link href={blocker.actionUrl}>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsBlockersModalOpen(false)}
                      className="px-3 py-1.5 text-xs flex-shrink-0 btn-primary"
                    >
                      Fix Now
                    </Button>
                  </Link>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[var(--brand-border)] flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setIsBlockersModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4J Modal 2: Launch Confirmation Modal */}
      {isConfirmLaunchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--brand-border)]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#BE1E2E]/10 text-[#BE1E2E]">
                  <Rocket className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-extrabold text-[var(--brand-text)]">Launch your LMS?</h3>
              </div>

              <button
                onClick={() => setIsConfirmLaunchModalOpen(false)}
                disabled={launchMutation.isPending}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-surface-elevated)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Your organization is ready to go live. Your public LMS website will become available according to your current website and course visibility settings.
            </p>

            <div className="pt-4 border-t border-[var(--brand-border)] flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                size="sm"
                disabled={launchMutation.isPending}
                onClick={() => setIsConfirmLaunchModalOpen(false)}
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                size="sm"
                disabled={launchMutation.isPending}
                onClick={() => launchMutation.mutate()}
                className="btn-primary px-4 flex items-center gap-2"
              >
                {launchMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Launching LMS...</span>
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 text-white" />
                    <span>Launch LMS</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4J Modal 3: Launch Success Modal */}
      {isLaunchSuccessModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <Rocket className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                STATUS: LIVE
              </span>

              <h3 className="text-2xl font-black text-[var(--brand-text)]">Your LMS is live 🚀</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Congratulations! <span className="font-bold text-[var(--brand-text)]">{profile.organizationName}</span> is now live.
              </p>
            </div>

            <div className="pt-4 border-t border-[var(--brand-border)] flex items-center justify-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsLaunchSuccessModalOpen(false);
                  router.push('/admin');
                }}
                className="text-xs"
              >
                Open Admin Dashboard
              </Button>

              <a href={publicWebsiteUrl} target="_blank" rel="noreferrer">
                <Button variant="primary" size="sm" className="btn-primary text-xs flex items-center gap-1.5">
                  <span>View Website</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Organization Profile Edit Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--brand-border)]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#BE1E2E]/10 text-[#BE1E2E]">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-extrabold text-[var(--brand-text)]">Edit Organization Profile</h3>
              </div>

              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-surface-elevated)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--brand-text)]">Organization Name *</label>
                <input
                  type="text"
                  required
                  value={profileForm.organizationName}
                  onChange={(e) => setProfileForm({ ...profileForm, organizationName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs font-medium text-[var(--brand-text)] focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--brand-text)]">Support Email *</label>
                  <input
                    type="email"
                    required
                    value={profileForm.supportEmail}
                    onChange={(e) => setProfileForm({ ...profileForm, supportEmail: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs font-medium text-[var(--brand-text)] focus:outline-none focus:border-[#BE1E2E]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--brand-text)]">Support Phone</label>
                  <input
                    type="text"
                    value={profileForm.supportPhone || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, supportPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs font-medium text-[var(--brand-text)] focus:outline-none focus:border-[#BE1E2E]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--brand-text)]">Office / Campus Address</label>
                <input
                  type="text"
                  value={profileForm.address || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs font-medium text-[var(--brand-text)] focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--brand-text)]">Timezone</label>
                  <select
                    value={profileForm.timezone}
                    onChange={(e) => setProfileForm({ ...profileForm, timezone: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs font-medium text-[var(--brand-text)] focus:outline-none focus:border-[#BE1E2E]"
                  >
                    <option value="UTC">UTC</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (+05:30)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                    <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--brand-text)]">Default Language</label>
                  <input
                    type="text"
                    value={profileForm.defaultLanguage}
                    onChange={(e) => setProfileForm({ ...profileForm, defaultLanguage: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs font-medium text-[var(--brand-text)] focus:outline-none focus:border-[#BE1E2E]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--brand-text)]">Currency</label>
                  <input
                    type="text"
                    value={profileForm.currency}
                    onChange={(e) => setProfileForm({ ...profileForm, currency: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs font-medium text-[var(--brand-text)] focus:outline-none focus:border-[#BE1E2E]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--brand-border)] flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsProfileModalOpen(false)}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={updateProfileMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save Profile
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Information Modal for Setup Foundation Items */}
      {infoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--bg-surface)] border border-[var(--brand-border)] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--brand-border)]">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-[#BE1E2E]" />
                <h3 className="text-base font-extrabold text-[var(--brand-text)]">{infoModal.title}</h3>
              </div>
              <button
                onClick={() => setInfoModal(null)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-surface-elevated)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <Badge variant="brand">{infoModal.badge}</Badge>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed">{infoModal.content}</p>

            <div className="pt-3 border-t border-[var(--brand-border)] flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setInfoModal(null)}>
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
