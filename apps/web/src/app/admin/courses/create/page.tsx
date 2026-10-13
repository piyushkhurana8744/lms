'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@edtech/ui';
import { Upload, ArrowRight, ArrowLeft, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { BackButton } from '@/components/navigation/BackButton';
import { uploadMediaFile } from '@/lib/uploadMedia';

export default function CreateCoursePage() {

  const router = useRouter();

  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  const [formData, setFormData] = useState({
    title: '',
    shortDescription: '',
    description: '',
    thumbnailUrl: '',
    categoryId: '',
    level: 'BEGINNER',
    language: 'English',
    durationMinutes: 0,
    visibility: 'PUBLIC'
  });

  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isFormDirty = formData.title.trim().length > 0 || formData.description.trim().length > 0;

  // Handle Thumbnail File Upload via Media Library API
  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingThumbnail(true);
    setFormError(null);

    try {
      const data = await uploadMediaFile(file);
      setFormData((prev) => ({ ...prev, thumbnailUrl: data.url }));
    } catch (err: any) {

      setFormError(err.message);
    } finally {
      setIsUploadingThumbnail(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const res = await fetch('/api/v1/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to create course');
      }
      return json.data;
    },
    onSuccess: (course: any) => {
      const newId = course.id || course._id;
      // Immediately redirect to Curriculum Builder after creation!
      router.push(`/admin/courses/${newId}/curriculum`);
    },
    onError: (err: any) => {
      setFormError(err.message);
    }
  });

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.title.trim()) {
      setFormError('Course title is required');
      setActiveStep(1);
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)] p-6 md:p-10 max-w-4xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--brand-border)] pb-6">
        <div>
          <BackButton fallback="/admin/courses" hasUnsavedChanges={isFormDirty} className="mb-2" />
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--brand-text)]">
            Create New Course
          </h1>
          <p className="text-[var(--text-muted)] text-xs font-mono mt-1">
            Guided 3-step course initialization in DIDM LMS workspace catalog.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
            Status: DRAFT
          </span>
        </div>
      </div>

      {/* Multi-Step Progress Indicator Header */}
      <div className="glass-card p-4 rounded-2xl border border-[var(--brand-border)] flex items-center justify-between gap-2 overflow-x-auto text-xs font-mono">
        <button
          onClick={() => setActiveStep(1)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors font-bold ${
            activeStep === 1
              ? 'bg-[#BE1E2E] text-white shadow-md'
              : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--brand-text)]'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
          Basic Information
        </button>

        <span className="text-[var(--brand-border)] font-bold">→</span>

        <button
          onClick={() => {
            if (!formData.title.trim()) {
              setFormError('Course title is required before proceeding to Step 2');
              return;
            }
            setFormError(null);
            setActiveStep(2);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors font-bold ${
            activeStep === 2
              ? 'bg-[#BE1E2E] text-white shadow-md'
              : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--brand-text)]'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
          Details & Settings
        </button>

        <span className="text-[var(--brand-border)] font-bold">→</span>

        <button
          onClick={() => {
            if (!formData.title.trim()) {
              setFormError('Course title is required before proceeding to Step 3');
              return;
            }
            setFormError(null);
            setActiveStep(3);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors font-bold ${
            activeStep === 3
              ? 'bg-[#BE1E2E] text-white shadow-md'
              : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--brand-text)]'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">3</span>
          Thumbnail & Save
        </button>
      </div>

      {formError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold">
          {formError}
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleFinalSubmit} className="glass-card p-8 rounded-2xl border border-[var(--brand-border)] space-y-6 shadow-xl">
        {/* STEP 1: Basic Information */}
        {activeStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[var(--brand-text)] border-b border-[var(--brand-border)] pb-3">
              Step 1 — Basic Information
            </h2>

            <div>
              <label className="block text-xs font-semibold mb-1.5 text-[var(--brand-text)]">
                Course Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Master Digital Marketing & SEO Strategy 2026"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] text-sm text-[var(--brand-text)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 text-[var(--brand-text)]">
                Short Description
              </label>
              <input
                type="text"
                placeholder="Brief 1-2 sentence overview for course catalog cards"
                value={formData.shortDescription}
                onChange={(e) => setFormData((prev) => ({ ...prev, shortDescription: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] text-sm text-[var(--brand-text)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 text-[var(--brand-text)]">
                Full Description
              </label>
              <textarea
                rows={5}
                placeholder="Comprehensive course syllabus description and primary learning outcomes..."
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] text-sm text-[var(--brand-text)]"
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-[var(--brand-border)]">
              <Button
                type="button"
                variant="primary"
                className="btn-primary text-xs px-6"
                onClick={() => {
                  if (!formData.title.trim()) {
                    setFormError('Course title is required before proceeding');
                    return;
                  }
                  setFormError(null);
                  setActiveStep(2);
                }}
              >
                Continue to Step 2 →
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Details & Settings */}
        {activeStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[var(--brand-text)] border-b border-[var(--brand-border)] pb-3">
              Step 2 — Course Details & Settings
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-[var(--brand-text)]">
                  Category ID / Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. SEO, PPC, Analytics"
                  value={formData.categoryId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, categoryId: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] text-sm text-[var(--brand-text)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 text-[var(--brand-text)]">
                  Target Level
                </label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData((prev) => ({ ...prev, level: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] text-sm text-[var(--brand-text)] font-semibold"
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="ALL_LEVELS">All Levels</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 text-[var(--brand-text)]">
                  Language
                </label>
                <input
                  type="text"
                  value={formData.language}
                  onChange={(e) => setFormData((prev) => ({ ...prev, language: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] text-sm text-[var(--brand-text)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-[var(--brand-text)]">
                  Estimated Duration (Minutes)
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, durationMinutes: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] text-sm text-[var(--brand-text)] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 text-[var(--brand-text)]">
                  Visibility Scope
                </label>
                <select
                  value={formData.visibility}
                  onChange={(e) => setFormData((prev) => ({ ...prev, visibility: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] text-sm text-[var(--brand-text)] font-semibold"
                >
                  <option value="PUBLIC">Public</option>
                  <option value="PRIVATE">Private</option>
                  <option value="UNLISTED">Unlisted</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-[var(--brand-border)]">
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className="px-4 py-2 text-xs font-semibold border border-[var(--brand-border)] rounded-xl"
              >
                ← Back to Step 1
              </button>
              <Button
                type="button"
                variant="primary"
                className="btn-primary text-xs px-6"
                onClick={() => setActiveStep(3)}
              >
                Continue to Step 3 →
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Thumbnail & Appearance */}
        {activeStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[var(--brand-text)] border-b border-[var(--brand-border)] pb-3">
              Step 3 — Course Thumbnail & Creation
            </h2>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-[var(--brand-text)]">
                Course Thumbnail Image (Recommended: 16:9 ratio)
              </label>

              <div className="border-2 border-dashed border-[var(--brand-border)] rounded-2xl p-6 text-center space-y-3 hover:border-[#BE1E2E]/50 transition-colors">
                {formData.thumbnailUrl ? (
                  <div className="space-y-3">
                    <img
                      src={formData.thumbnailUrl}
                      alt="Course Thumbnail Preview"
                      className="max-h-48 rounded-xl mx-auto border border-[var(--brand-border)] object-cover shadow-md"
                    />
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono font-bold flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Thumbnail Uploaded Successfully
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <ImageIcon className="w-10 h-10 mx-auto text-[#BE1E2E] opacity-70" />
                    <p className="text-xs font-semibold text-[var(--brand-text)]">
                      Drag & Drop course cover image or click Browse
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] font-mono">
                      JPG, PNG, WebP up to 10 MB. Uploaded directly to workspace media vault.
                    </p>
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                  className="mt-2 block w-full text-xs text-[var(--text-muted)] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#BE1E2E] file:text-white hover:file:bg-[#a01826] cursor-pointer"
                />

                {isUploadingThumbnail && (
                  <p className="text-xs text-[var(--text-muted)] font-mono animate-pulse">Uploading thumbnail to media vault...</p>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-[var(--brand-border)]">
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className="px-4 py-2 text-xs font-semibold border border-[var(--brand-border)] rounded-xl"
              >
                ← Back to Step 2
              </button>
              <Button
                type="submit"
                variant="primary"
                className="btn-primary text-xs px-8 shadow-lg shadow-[#BE1E2E]/20"
                disabled={createMutation.isPending || isUploadingThumbnail}
              >
                {createMutation.isPending ? 'Creating Course & Opening Builder...' : 'Save & Open Curriculum Builder →'}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
