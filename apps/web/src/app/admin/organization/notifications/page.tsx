'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { INotificationPreferences } from '@edtech/types';
import { Button, Card } from '@edtech/ui';
import { useGlobalError } from '@/components/error/useGlobalError';
import {
  Bell,
  ArrowLeft,
  Mail,
  UserPlus,
  Key,
  BookOpen,
  CheckCircle2,
  Award,
  AlertTriangle,
  Loader2,
  CheckCircle
} from 'lucide-react';

export default function AdminNotificationPreferencesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showError } = useGlobalError();
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Fetch Notification Preferences
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['organization-notifications'],
    queryFn: async () => {
      const res = await fetch('/api/v1/organization/notifications');
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message || 'Failed to fetch notification preferences');
      }
      return res.json();
    }
  });

  const preferences: INotificationPreferences = data?.data || {
    welcomeEmail: true,
    studentRegistration: true,
    instructorInvitation: true,
    passwordReset: true,
    courseEnrollment: true,
    courseCompletion: true,
    certificateIssued: true,
    adminAlerts: true
  };

  // Optimistic Mutation
  const updateMutation = useMutation({
    mutationFn: async (payload: Partial<INotificationPreferences>) => {
      const res = await fetch('/api/v1/organization/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to update notifications');
      return json.data;
    },
    onMutate: async (newPayload) => {
      await queryClient.cancelQueries({ queryKey: ['organization-notifications'] });
      const previous = queryClient.getQueryData<{ data: INotificationPreferences }>(['organization-notifications']);

      if (previous) {
        queryClient.setQueryData(['organization-notifications'], {
          ...previous,
          data: { ...previous.data, ...newPayload }
        });
      }
      return { previous };
    },
    onError: (err: Error, _newPayload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['organization-notifications'], context.previous);
      }
      showError({ title: 'Update Failed', message: err.message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-notifications'] });
      showToast('Notification preference updated');
    }
  });

  const handleToggle = (key: keyof INotificationPreferences, currentValue: boolean) => {
    updateMutation.mutate({ [key]: !currentValue });
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/admin/organization/email');
    }
  };

  const notificationItems = [
    {
      key: 'welcomeEmail' as const,
      title: 'Welcome Emails',
      description: 'Send onboarding email to newly registered students upon account creation.',
      icon: Mail,
      color: 'text-blue-500 bg-blue-500/10'
    },
    {
      key: 'studentRegistration' as const,
      title: 'Student Registration Alerts',
      description: 'Notify organization admins when a new student signs up for your academy.',
      icon: UserPlus,
      color: 'text-emerald-500 bg-emerald-500/10'
    },
    {
      key: 'instructorInvitation' as const,
      title: 'Instructor Invitation Emails',
      description: 'Dispatch single-use workspace invitation emails to newly invited instructors.',
      icon: Mail,
      color: 'text-purple-500 bg-purple-500/10'
    },
    {
      key: 'passwordReset' as const,
      title: 'Password Reset Emails',
      description: 'Send secure, time-limited password reset links when requested by users.',
      icon: Key,
      color: 'text-amber-500 bg-amber-500/10'
    },
    {
      key: 'courseEnrollment' as const,
      title: 'Course Enrollment Confirmations',
      description: 'Send enrollment confirmation emails when a student joins a new course.',
      icon: BookOpen,
      color: 'text-indigo-500 bg-indigo-500/10'
    },
    {
      key: 'courseCompletion' as const,
      title: 'Course Completion Congratulatory Emails',
      description: 'Congratulate students automatically upon 100% completion of a course curriculum.',
      icon: CheckCircle2,
      color: 'text-teal-500 bg-teal-500/10'
    },
    {
      key: 'certificateIssued' as const,
      title: 'Certificate Issuance Notifications',
      description: 'Send digital certificate links when a student earns an official course completion certificate.',
      icon: Award,
      color: 'text-yellow-500 bg-yellow-500/10'
    },
    {
      key: 'adminAlerts' as const,
      title: 'Critical Administrative Alerts',
      description: 'Receive system alerts for storage connection failures, security events, and setup issues.',
      icon: AlertTriangle,
      color: 'text-red-500 bg-red-500/10'
    }
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8 min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)]">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-xl bg-emerald-500 text-white shadow-2xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <CheckCircle className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--brand-border)]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-500 uppercase tracking-wider">
            <Bell className="w-4 h-4" /> Automated Communication Rules
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--brand-text)] mt-1">
            Notification Preferences
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Configure which transactional emails and alerts your organization dispatches to learners and admins.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={handleGoBack} className="flex items-center gap-1.5 text-xs">
            <ArrowLeft className="w-4 h-4" /> Back to Email Settings
          </Button>
        </div>
      </div>

      {/* Main List Card */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-[var(--text-muted)] space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#BE1E2E]" />
          <p>Loading Notification Preferences...</p>
        </div>
      ) : isError ? (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold text-center">
          Failed to load notification preferences: {(error as Error)?.message}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notificationItems.map((item) => {
            const Icon = item.icon;
            const isChecked = Boolean(preferences[item.key]);

            return (
              <Card
                key={item.key}
                className="p-5 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--brand-border)] flex items-start justify-between gap-4 transition-all hover:border-[var(--brand-border-strong)]"
              >
                <div className="flex items-start gap-3.5">
                  <div className={`p-2.5 rounded-xl flex-shrink-0 ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-xs text-[var(--brand-text)]">{item.title}</h4>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{item.description}</p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  type="button"
                  onClick={() => handleToggle(item.key, isChecked)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 flex-shrink-0 focus:outline-none ${
                    isChecked ? 'bg-[#BE1E2E]' : 'bg-[var(--brand-border)]'
                  }`}
                  aria-label={`Toggle ${item.title}`}
                >
                  <span
                    className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform block ${
                      isChecked ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
