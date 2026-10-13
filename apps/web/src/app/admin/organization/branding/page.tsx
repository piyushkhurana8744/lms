'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Badge } from '@edtech/ui';
import { BackButton } from '@/components/navigation/BackButton';
import { useGlobalError } from '@/components/error/useGlobalError';
import { useConfirmation } from '@/components/confirmation/useConfirmation';
import { uploadMediaFile } from '@/lib/uploadMedia';

import {
  Palette,
  Upload,
  RotateCcw,
  Save,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  ExternalLink,
  Type,
  Layout,
  Globe,
  Trash2,
  Lock,
  Eye,
  Smartphone,
  Monitor
} from 'lucide-react';
import { IOrganizationBranding } from '@edtech/types';

export default function AdminOrganizationBrandingPage() {
  const queryClient = useQueryClient();
  const { showError } = useGlobalError();
  const { confirm } = useConfirmation();

  const [form, setForm] = useState<Partial<IOrganizationBranding>>({
    organizationName: '',
    primaryColor: '#BE1E2E',
    secondaryColor: '#1F2937',
    accentColor: '#F59E0B',
    fontFamily: 'Inter',
    loginPage: {
      showLogo: true,
      headline: '',
      description: ''
    },
    browser: {
      title: ''
    },
    social: {}
  });

  const [previewTab, setPreviewTab] = useState<'portal' | 'login'>('portal');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  // Query Current Branding Configuration
  const {
    data: brandingData,
    isLoading,
    error
  } = useQuery<IOrganizationBranding>({
    queryKey: ['organization-branding'],
    queryFn: async () => {
      const res = await fetch('/api/v1/organization/settings/branding');
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message || 'Failed to fetch organization branding');
      }
      const json = await res.json();
      return json.data;
    }
  });

  useEffect(() => {
    if (brandingData) {
      setForm(brandingData);
    }
  }, [brandingData]);

  // Handle Media File Upload via STEP 4B Media API
  const handleMediaUpload = async (file: File, field: string) => {
    setUploadingField(field);
    try {
      const uploadedMedia = await uploadMediaFile(file);


      if (field === 'logo') {
        setForm((prev) => ({
          ...prev,
          logoMediaId: uploadedMedia._id || uploadedMedia.id,
          logoUrl: uploadedMedia.url
        }));
      } else if (field === 'favicon') {
        setForm((prev) => ({
          ...prev,
          faviconMediaId: uploadedMedia._id || uploadedMedia.id,
          faviconUrl: uploadedMedia.url,
          browser: { ...prev.browser, faviconMediaId: uploadedMedia._id || uploadedMedia.id, faviconUrl: uploadedMedia.url }
        }));
      } else if (field === 'loginBg') {
        setForm((prev) => ({
          ...prev,
          loginPage: {
            ...prev.loginPage,
            showLogo: prev.loginPage?.showLogo !== false,
            backgroundImageMediaId: uploadedMedia._id || uploadedMedia.id,
            backgroundImageUrl: uploadedMedia.url
          }
        }));
      }
    } catch (err: any) {
      showError({
        title: 'Media Upload Failed',
        message: err.message || 'Unable to upload media asset. Ensure object storage is configured.'
      });
    } finally {
      setUploadingField(null);
    }
  };

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/organization/settings/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to save organization branding');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-branding'] });
      queryClient.invalidateQueries({ queryKey: ['public-tenant-branding'] });
      queryClient.invalidateQueries({ queryKey: ['organization-setup-progress'] });
    },
    onError: (err: Error) => {
      showError({
        title: 'Branding Save Failed',
        message: err.message
      });
    }
  });

  // Reset Mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/organization/settings/branding/reset', {
        method: 'POST'
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to reset organization branding');
      return json.data;
    },
    onSuccess: (data) => {
      setForm(data);
      queryClient.invalidateQueries({ queryKey: ['organization-branding'] });
      queryClient.invalidateQueries({ queryKey: ['public-tenant-branding'] });
      queryClient.invalidateQueries({ queryKey: ['organization-setup-progress'] });
    },
    onError: (err: Error) => {
      showError({
        title: 'Reset Branding Failed',
        message: err.message
      });
    }
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#BE1E2E]" />
        <p className="text-sm text-[var(--text-muted)] font-medium">Loading Organization Branding...</p>
      </div>
    );
  }

  const primaryColor = form.primaryColor || '#BE1E2E';
  const secondaryColor = form.secondaryColor || '#1F2937';
  const accentColor = form.accentColor || '#F59E0B';
  const fontFamily = form.fontFamily || 'Inter';

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8 text-[var(--brand-text)]">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--brand-border)]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <BackButton fallback="/admin/organization" label="Back to Settings" />
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Organization Branding & Theme</h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">
            Personalize your LMS appearance, brand logo, favicon, color palette, and white-label login page.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const confirmed = await confirm({
                title: 'Reset Branding to Platform Defaults?',
                description: 'This will restore the organization branding to DIDM default colors, typography, and logos.',
                type: 'warning',
                confirmText: 'Reset Branding',
                cancelText: 'Cancel'
              });
              if (confirmed) resetMutation.mutate();
            }}
            disabled={resetMutation.isPending || saveMutation.isPending}
            className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400"
          >
            {resetMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            <span>Reset Defaults</span>
          </Button>

          <a href="/" target="_blank" rel="noopener noreferrer">
            <Button variant="secondary" size="sm" className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              <span>Public Portal</span>
              <ExternalLink className="w-3 h-3 text-[var(--text-muted)]" />
            </Button>
          </a>

          <Button
            variant="primary"
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || resetMutation.isPending}
            className="flex items-center gap-2"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Branding
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Grid Layout: Controls vs Live Preview Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Brand Identity */}
          <Card className="space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--brand-border)]">
              <div className="p-2 rounded-xl bg-[#BE1E2E]/10 text-[#BE1E2E]">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base">Brand Identity</h3>
                <p className="text-xs text-[var(--text-muted)]">Configure Legal Name, Logo, and Favicon assets.</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-[var(--brand-text)]">Organization Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Academy"
                  value={form.organizationName || ''}
                  onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>

              {/* Logo Asset Upload */}
              <div className="space-y-2">
                <label className="font-bold text-[var(--brand-text)]">Brand Logo Asset</label>
                <div className="flex items-center gap-4 p-3 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface-elevated)]">
                  {form.logoUrl ? (
                    <div className="w-16 h-16 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--brand-border)] flex items-center justify-center p-2 relative overflow-hidden">
                      <img src={form.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-[var(--brand-background)] border border-dashed border-[var(--brand-border)] flex items-center justify-center text-[var(--text-muted)]">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex-1 space-y-1">
                    <p className="font-bold text-xs">
                      {form.logoUrl ? 'Logo Configured' : 'Upload Organization Logo'}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">PNG, SVG, or WebP. Max 5MB.</p>
                    <div className="flex items-center gap-2 pt-1">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--brand-background)] border border-[var(--brand-border)] text-[11px] font-semibold hover:border-[#BE1E2E]">
                        {uploadingField === 'logo' ? (
                          <Loader2 className="w-3 h-3 animate-spin text-[#BE1E2E]" />
                        ) : (
                          <Upload className="w-3 h-3 text-[#BE1E2E]" />
                        )}
                        <span>{form.logoUrl ? 'Replace Logo' : 'Browse File'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleMediaUpload(e.target.files[0], 'logo');
                          }}
                        />
                      </label>

                      {form.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, logoMediaId: undefined, logoUrl: undefined })}
                          className="text-[11px] text-red-500 hover:underline flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Favicon Upload */}
              <div className="space-y-2">
                <label className="font-bold text-[var(--brand-text)]">Favicon Asset</label>
                <div className="flex items-center gap-4 p-3 rounded-xl border border-[var(--brand-border)] bg-[var(--bg-surface-elevated)]">
                  {form.faviconUrl ? (
                    <div className="w-10 h-10 rounded-lg bg-black/5 dark:bg-white/5 border border-[var(--brand-border)] flex items-center justify-center p-1.5">
                      <img src={form.faviconUrl} alt="Favicon" className="w-6 h-6 object-contain" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[var(--brand-background)] border border-dashed border-[var(--brand-border)] flex items-center justify-center text-[var(--text-muted)]">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                  )}

                  <div className="flex-1 space-y-1">
                    <p className="font-bold text-xs">
                      {form.faviconUrl ? 'Favicon Configured' : 'Upload Website Favicon'}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--brand-background)] border border-[var(--brand-border)] text-[11px] font-semibold hover:border-[#BE1E2E]">
                        {uploadingField === 'favicon' ? (
                          <Loader2 className="w-3 h-3 animate-spin text-[#BE1E2E]" />
                        ) : (
                          <Upload className="w-3 h-3 text-[#BE1E2E]" />
                        )}
                        <span>{form.faviconUrl ? 'Replace' : 'Upload Favicon'}</span>
                        <input
                          type="file"
                          accept="image/x-icon,image/png,image/svg+xml"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleMediaUpload(e.target.files[0], 'favicon');
                          }}
                        />
                      </label>

                      {form.faviconUrl && (
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, faviconMediaId: undefined, faviconUrl: undefined })}
                          className="text-[11px] text-red-500 hover:underline flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Section 2: Brand Colors */}
          <Card className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--brand-border)]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Brand Colors</h3>
                  <p className="text-xs text-[var(--text-muted)]">HEX color palette for headers, buttons, and badges.</p>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5">
                {[
                  { name: 'DIDM Red', primary: '#BE1E2E', secondary: '#1F2937', accent: '#F59E0B' },
                  { name: 'Emerald', primary: '#059669', secondary: '#111827', accent: '#3B82F6' },
                  { name: 'Royal Blue', primary: '#2563EB', secondary: '#0F172A', accent: '#10B981' },
                  { name: 'Violet', primary: '#7C3AED', secondary: '#18181B', accent: '#F43F5E' }
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    title={preset.name}
                    onClick={() =>
                      setForm({
                        ...form,
                        primaryColor: preset.primary,
                        secondaryColor: preset.secondary,
                        accentColor: preset.accent
                      })
                    }
                    className="w-5 h-5 rounded-full border border-white/40 shadow-sm transition-transform hover:scale-110"
                    style={{ backgroundColor: preset.primary }}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-[var(--brand-text)]">Primary Color *</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                    className="w-9 h-9 rounded-xl border border-[var(--brand-border)] p-0.5 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] font-mono text-xs uppercase focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[var(--brand-text)]">Secondary Color *</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                    className="w-9 h-9 rounded-xl border border-[var(--brand-border)] p-0.5 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] font-mono text-xs uppercase focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[var(--brand-text)]">Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                    className="w-9 h-9 rounded-xl border border-[var(--brand-border)] p-0.5 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] font-mono text-xs uppercase focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Section 3: Typography */}
          <Card className="space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--brand-border)]">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Type className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base">Typography Family</h3>
                <p className="text-xs text-[var(--text-muted)]">Select clean typography family for your portal.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {['Inter', 'Poppins', 'Roboto', 'System'].map((font) => (
                <button
                  key={font}
                  type="button"
                  onClick={() => setForm({ ...form, fontFamily: font })}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    fontFamily === font
                      ? 'bg-[#BE1E2E]/10 border-[#BE1E2E] font-bold text-[#BE1E2E]'
                      : 'bg-[var(--bg-surface-elevated)] border-[var(--brand-border)] text-[var(--brand-text)] hover:border-[#BE1E2E]/40'
                  }`}
                >
                  <span className="text-sm font-semibold">{font}</span>
                  <span className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">Aa Bb Cc 123</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Section 4: Login Page Branding */}
          <Card className="space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--brand-border)]">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base">Login Page Branding</h3>
                <p className="text-xs text-[var(--text-muted)]">Customize headline, subtext, and login background image.</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)]">
                <div>
                  <span className="font-bold text-[var(--brand-text)] block">Display Logo on Login Page</span>
                  <span className="text-[10px] text-[var(--text-muted)]">Show logo asset above login form.</span>
                </div>
                <input
                  type="checkbox"
                  checked={form.loginPage?.showLogo !== false}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      loginPage: { ...form.loginPage, showLogo: e.target.checked }
                    })
                  }
                  className="w-4 h-4 accent-[#BE1E2E] cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[var(--brand-text)]">Login Headline</label>
                <input
                  type="text"
                  placeholder="e.g. Welcome back to your Learning Portal"
                  value={form.loginPage?.headline || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      loginPage: { ...form.loginPage, showLogo: form.loginPage?.showLogo !== false, headline: e.target.value }
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[var(--brand-text)]">Login Description</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Access your courses, video masterclasses, and learning progress."
                  value={form.loginPage?.description || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      loginPage: { ...form.loginPage, showLogo: form.loginPage?.showLogo !== false, description: e.target.value }
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] text-xs focus:outline-none focus:border-[#BE1E2E]"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Live Website & Login Preview Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--brand-border)]">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#BE1E2E]" />
                <span className="text-xs font-extrabold uppercase tracking-wider">Live Preview</span>
              </div>

              <div className="flex items-center gap-1 bg-[var(--bg-surface-elevated)] p-1 rounded-xl border border-[var(--brand-border)]">
                <button
                  type="button"
                  onClick={() => setPreviewTab('portal')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    previewTab === 'portal'
                      ? 'bg-[#BE1E2E] text-white shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--brand-text)]'
                  }`}
                >
                  Portal Header
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('login')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    previewTab === 'login'
                      ? 'bg-[#BE1E2E] text-white shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--brand-text)]'
                  }`}
                >
                  Login Screen
                </button>
              </div>
            </div>

            {/* Preview Canvas Container */}
            <div className="rounded-2xl border border-[var(--brand-border)] bg-black/90 p-4 shadow-2xl overflow-hidden transition-all text-white">
              {previewTab === 'portal' ? (
                /* Portal Header Preview */
                <div className="space-y-4">
                  <div className="p-3 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {form.logoUrl ? (
                        <img src={form.logoUrl} alt="Logo" className="h-6 object-contain" />
                      ) : (
                        <span className="font-extrabold text-sm tracking-tight" style={{ color: primaryColor }}>
                          {form.organizationName || 'Acme Academy'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] opacity-80">
                      <span>Courses</span>
                      <span>About</span>
                      <button
                        type="button"
                        className="px-3 py-1 rounded-lg font-bold text-white shadow-sm"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Sign In
                      </button>
                    </div>
                  </div>

                  {/* Hero Section Mockup */}
                  <div className="p-6 rounded-xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 text-center space-y-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                      ● White-Label Portal
                    </span>


                    <h4 className="text-lg font-black tracking-tight" style={{ fontFamily }}>
                      Welcome to {form.organizationName || 'Acme Academy'}
                    </h4>
                    <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                      Explore industry-aligned courses, video masterclasses, and certified programs.
                    </p>

                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Explore Courses
                    </button>
                  </div>
                </div>
              ) : (
                /* Login Page Preview */
                <div className="p-6 rounded-xl border border-white/10 bg-zinc-950 text-center space-y-4 max-w-sm mx-auto">
                  {form.loginPage?.showLogo !== false && (
                    <div className="flex justify-center">
                      {form.logoUrl ? (
                        <img src={form.logoUrl} alt="Logo" className="h-8 object-contain" />
                      ) : (
                        <span className="font-extrabold text-lg" style={{ color: primaryColor }}>
                          {form.organizationName || 'Acme Academy'}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="space-y-1">
                    <h4 className="text-sm font-bold">{form.loginPage?.headline || 'Sign in to your account'}</h4>
                    <p className="text-[11px] text-zinc-400">
                      {form.loginPage?.description || 'Access your enrolled courses and learning progress.'}
                    </p>
                  </div>

                  <div className="space-y-2 text-left text-xs opacity-70">
                    <div className="h-8 rounded-lg bg-white/10 border border-white/10 px-3 flex items-center text-[10px]">
                      Email address
                    </div>
                    <div className="h-8 rounded-lg bg-white/10 border border-white/10 px-3 flex items-center text-[10px]">
                      Password
                    </div>
                    <button
                      type="button"
                      className="w-full py-2 rounded-lg text-xs font-bold text-white shadow-md text-center"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Sign In
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
