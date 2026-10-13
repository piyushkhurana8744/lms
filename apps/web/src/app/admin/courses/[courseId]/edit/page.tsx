'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@edtech/ui';
import { Upload, CheckCircle2, Image as ImageIcon, ArrowLeft, ExternalLink } from 'lucide-react';

import { BackButton } from '@/components/navigation/BackButton';
import { uploadMediaFile } from '@/lib/uploadMedia';

export default function EditCoursePage() {

  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const courseId = params.courseId as string;

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchCourse = async () => {
    const res = await fetch(`/api/v1/courses/${courseId}`);
    if (!res.ok) {
      throw new Error('Course not found or access denied');
    }
    const json = await res.json();
    return json.data;
  };

  const { data: course, isLoading, isError, error } = useQuery({
    queryKey: ['admin-course-detail', courseId],
    queryFn: fetchCourse
  });

  useEffect(() => {
    if (course) {
      setFormData({
        title: course.title || '',
        shortDescription: course.shortDescription || '',
        description: course.description || '',
        thumbnailUrl: course.thumbnailUrl || '',
        categoryId: course.categoryId || '',
        level: course.level || 'BEGINNER',
        language: course.language || 'English',
        durationMinutes: course.durationMinutes || 0,
        visibility: course.visibility || 'PUBLIC'
      });
    }
  }, [course]);

  // Handle Thumbnail File Upload
  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingThumbnail(true);
    setFormError(null);

    try {
      const data = await uploadMediaFile(file);
      setFormData((prev) => ({ ...prev, thumbnailUrl: data.url }));
      setSuccessMessage('Thumbnail uploaded successfully! Remember to click Save Changes.');
    } catch (err: any) {

      setFormError(err.message);
    } finally {
      setIsUploadingThumbnail(false);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const res = await fetch(`/api/v1/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to update course');
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      queryClient.invalidateQueries({ queryKey: ['admin-course-detail', courseId] });
      queryClient.invalidateQueries({ queryKey: ['public-courses'] });
      queryClient.invalidateQueries({ queryKey: ['public-featured-courses'] });
      setSuccessMessage('Course metadata updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => {
      setFormError(err.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    if (!formData.title.trim()) {
      setFormError('Course title is required');
      return;
    }
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)] p-10 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="inline-block animate-spin w-8 h-8 border-4 border-[#BE1E2E] border-t-transparent rounded-full" />
          <p className="text-sm font-medium">Loading course metadata...</p>
        </div>
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)] p-10 max-w-2xl mx-auto space-y-6">
        <div className="glass-card p-8 text-center text-red-500 border border-red-500/30 rounded-2xl">
          <p className="font-semibold text-lg">Failed to Load Course</p>
          <p className="text-xs mt-1 text-[var(--text-muted)] font-mono">{(error as any)?.message || 'Course does not exist or access denied.'}</p>
          <Link href="/admin/courses">
            <Button variant="primary" className="btn-primary mt-4 text-xs">
              Return to Catalog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)] p-6 md:p-10 max-w-4xl mx-auto space-y-6">
      <BackButton fallback={`/admin/courses/${courseId}`} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--brand-border)] pb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--brand-text)]">{formData.title || course.title}</h1>
            <span className="px-3 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              {course.status}
            </span>
          </div>
          <p className="text-[var(--text-muted)] text-xs font-mono mt-1">Slug: /{course.slug} | Last Updated: {new Date(course.updatedAt).toLocaleString()}</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link href={`/admin/courses/${courseId}/curriculum`}>
            <button className="px-4 py-2 text-xs font-bold bg-[#BE1E2E] text-white rounded-xl hover:bg-[#a01826] transition-colors shadow-lg shadow-[#BE1E2E]/20">
              Open Curriculum →
            </button>
          </Link>
          <Link href={`/admin/courses/${courseId}`}>
            <button className="px-4 py-2 text-xs font-semibold border border-[var(--brand-border)] rounded-xl hover:bg-[var(--bg-surface-elevated)] transition-colors">
              Check Readiness
            </button>
          </Link>
          <Link href="/admin/courses">
            <button className="px-4 py-2 text-xs font-semibold border border-[var(--brand-border)] rounded-xl hover:bg-[var(--bg-surface-elevated)] transition-colors">
              ← Catalog
            </button>
          </Link>
        </div>
      </div>

      {formError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold">
          {formError}
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {successMessage}
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="glass-card p-8 rounded-2xl border border-[var(--brand-border)] space-y-6 shadow-xl">
        {/* Basic Information */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-[var(--brand-text)] border-b border-[var(--brand-border)] pb-2">
            1. Basic Information
          </h2>

          <div>
            <label className="block text-xs font-semibold mb-1 text-[var(--brand-text)]">Course Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] text-sm text-[var(--brand-text)] font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-[var(--brand-text)]">Short Description</label>
            <input
              type="text"
              value={formData.shortDescription}
              onChange={(e) => setFormData((prev) => ({ ...prev, shortDescription: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] text-sm text-[var(--brand-text)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-[var(--brand-text)]">Full Description</label>
            <textarea
              rows={5}
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] text-sm text-[var(--brand-text)]"
            />
          </div>
        </div>

        {/* Thumbnail Section */}
        <div className="space-y-4 pt-4 border-t border-[var(--brand-border)]">
          <h2 className="text-base font-bold text-[var(--brand-text)] border-b border-[var(--brand-border)] pb-2">
            2. Course Thumbnail & Appearance
          </h2>

          <div className="border-2 border-dashed border-[var(--brand-border)] rounded-2xl p-6 text-center space-y-3 hover:border-[#BE1E2E]/50 transition-colors">
            {formData.thumbnailUrl ? (
              <div className="space-y-3">
                <img
                  src={formData.thumbnailUrl}
                  alt="Course Thumbnail Preview"
                  className="max-h-48 rounded-xl mx-auto border border-[var(--brand-border)] object-cover shadow-md"
                />
                <p className="text-xs text-[var(--text-muted)] font-mono truncate max-w-md mx-auto">
                  URL: {formData.thumbnailUrl}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <ImageIcon className="w-10 h-10 mx-auto text-[#BE1E2E] opacity-70" />
                <p className="text-xs font-semibold text-[var(--brand-text)]">No thumbnail uploaded</p>
                <p className="text-[10px] text-[var(--text-muted)] font-mono">Recommended 16:9 ratio (JPG, PNG, WebP up to 10MB)</p>
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              onChange={handleThumbnailUpload}
              className="mt-2 block w-full text-xs text-[var(--text-muted)] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#BE1E2E] file:text-white hover:file:bg-[#a01826] cursor-pointer"
            />

            {isUploadingThumbnail && (
              <p className="text-xs text-[var(--text-muted)] font-mono animate-pulse">Uploading file to media library...</p>
            )}
          </div>
        </div>

        {/* Settings & Metadata */}
        <div className="space-y-4 pt-4 border-t border-[var(--brand-border)]">
          <h2 className="text-base font-bold text-[var(--brand-text)] border-b border-[var(--brand-border)] pb-2">
            3. Course Settings & Scope
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold mb-1 text-[var(--brand-text)]">Category ID</label>
              <input
                type="text"
                value={formData.categoryId}
                onChange={(e) => setFormData((prev) => ({ ...prev, categoryId: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] text-sm text-[var(--brand-text)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-[var(--brand-text)]">Target Level</label>
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
              <label className="block text-xs font-semibold mb-1 text-[var(--brand-text)]">Language</label>
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
              <label className="block text-xs font-semibold mb-1 text-[var(--brand-text)]">Estimated Duration (Minutes)</label>
              <input
                type="number"
                min={0}
                value={formData.durationMinutes}
                onChange={(e) => setFormData((prev) => ({ ...prev, durationMinutes: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] text-sm text-[var(--brand-text)] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-[var(--brand-text)]">Visibility Scope</label>
              <select
                value={formData.visibility}
                onChange={(e) => setFormData((prev) => ({ ...prev, visibility: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--brand-background)] border border-[var(--brand-border)] focus:outline-none focus:ring-2 focus:ring-[#BE1E2E] text-sm text-[var(--brand-text)] font-semibold"
              >
                <option value="PUBLIC">Public</option>
                <option value="UNLISTED">Unlisted</option>
                <option value="PRIVATE">Private</option>
              </select>
              <p className="text-[11px] text-[var(--text-muted)] mt-1.5 font-mono">
                {formData.visibility === 'PUBLIC' && 'PUBLIC: Visible in public course catalog after publishing.'}
                {formData.visibility === 'UNLISTED' && 'UNLISTED: Not shown in catalog, but available through direct link after publishing.'}
                {formData.visibility === 'PRIVATE' && 'PRIVATE: Not publicly accessible.'}
              </p>
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="pt-4 flex items-center justify-end gap-4 border-t border-[var(--brand-border)]">
          <Link href="/admin/courses">
            <button type="button" className="px-4 py-2.5 text-xs font-semibold border border-[var(--brand-border)] rounded-xl">
              Cancel
            </button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            className="btn-primary px-8 text-xs shadow-lg shadow-[#BE1E2E]/20"
            disabled={updateMutation.isPending || isUploadingThumbnail}
          >
            {updateMutation.isPending ? 'Saving Changes...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
