'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IOnboardingProgressResponse } from '@edtech/types';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { OnboardingSidebar } from '@/components/onboarding/OnboardingSidebar';
import { OnboardingExitModal } from '@/components/onboarding/OnboardingExitModal';
import { WelcomeStep } from '@/components/onboarding/WelcomeStep';
import { OrganizationProfileStep } from '@/components/onboarding/OrganizationProfileStep';
import { BrandingStep } from '@/components/onboarding/BrandingStep';
import { StorageStep } from '@/components/onboarding/StorageStep';
import { EmailStep } from '@/components/onboarding/EmailStep';
import { DomainStep } from '@/components/onboarding/DomainStep';
import { TeamStep } from '@/components/onboarding/TeamStep';
import { FirstCourseStep } from '@/components/onboarding/FirstCourseStep';
import { LaunchChecklist } from '@/components/onboarding/LaunchChecklist';
import { useGlobalError } from '@/components/error/useGlobalError';
import { Loader2, CheckCircle } from 'lucide-react';

export default function AdminOnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showError } = useGlobalError();

  const [currentStep, setCurrentStep] = useState(0);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Fetch Onboarding Progress
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['organization-onboarding'],
    queryFn: async () => {
      const res = await fetch('/api/v1/organization/onboarding');
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message || 'Failed to fetch onboarding progress');
      }
      return res.json();
    }
  });

  const progress: IOnboardingProgressResponse | null = data?.data || null;

  useEffect(() => {
    if (progress) {
      if (progress.currentStep !== undefined && progress.currentStep >= 0 && progress.currentStep <= 8) {
        setCurrentStep(progress.currentStep);
      }
    }
  }, [progress]);

  // Mutations
  const updateProgressMutation = useMutation({
    mutationFn: async (payload: { currentStep?: number; completedSteps?: string[]; skippedSteps?: string[] }) => {
      const res = await fetch('/api/v1/organization/onboarding/progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to update progress');
      return json.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['organization-onboarding'], { data });
    },
    onError: (err: Error) => {
      showError({ title: 'Progress Error', message: err.message });
    }
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/organization/onboarding/complete', {
        method: 'POST'
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to complete onboarding');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-onboarding'] });
      queryClient.invalidateQueries({ queryKey: ['organization-setup-progress'] });
      showToast('Your LMS is ready to launch! 🚀');
      setTimeout(() => {
        router.push('/admin');
      }, 1200);
    },
    onError: (err: Error) => {
      showError({ title: 'Completion Error', message: err.message });
    }
  });

  const skipMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/organization/onboarding/skip', {
        method: 'POST'
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to skip onboarding');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-onboarding'] });
      router.push('/admin');
    },
    onError: (err: Error) => {
      showError({ title: 'Skip Error', message: err.message });
    }
  });

  const handleNextStep = (completedStepKey?: string) => {
    const nextStep = Math.min(8, currentStep + 1);
    setCurrentStep(nextStep);

    const payload: any = { currentStep: nextStep };
    if (completedStepKey) {
      payload.completedSteps = [completedStepKey];
    }
    updateProgressMutation.mutate(payload);
  };

  const handleSkipCurrentStep = (stepKey: string) => {
    const nextStep = Math.min(8, currentStep + 1);
    setCurrentStep(nextStep);

    updateProgressMutation.mutate({
      currentStep: nextStep,
      skippedSteps: [stepKey]
    });
  };

  const handlePrevStep = () => {
    const prevStep = Math.max(0, currentStep - 1);
    setCurrentStep(prevStep);
    updateProgressMutation.mutate({ currentStep: prevStep });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--brand-background)] flex items-center justify-center p-6 text-xs text-[var(--text-muted)] space-y-3">
        <div className="text-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#BE1E2E]" />
          <p>Loading Organization Onboarding Wizard...</p>
        </div>
      </div>
    );
  }

  const stepsList = progress?.steps || [];
  const completionPercentage = progress?.completionPercentage || 0;
  const canLaunch = Boolean(progress?.canLaunch);

  return (
    <div className="min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)] flex flex-col">
      {/* Toast */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-xl bg-emerald-500 text-white shadow-2xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <CheckCircle className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <OnboardingHeader
        completionPercentage={completionPercentage}
        onExit={() => setIsExitModalOpen(true)}
      />

      {/* Main Body */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Sidebar */}
        <OnboardingSidebar
          steps={stepsList}
          currentStep={currentStep}
          onSelectStep={(idx) => {
            setCurrentStep(idx);
            updateProgressMutation.mutate({ currentStep: idx });
          }}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
          {currentStep === 0 && (
            <WelcomeStep
              onNext={() => handleNextStep('welcome')}
              onSkip={() => skipMutation.mutate()}
            />
          )}

          {currentStep === 1 && (
            <OrganizationProfileStep
              onNext={() => handleNextStep('profile')}
              onBack={handlePrevStep}
              onSkipStep={() => handleSkipCurrentStep('profile')}
            />
          )}

          {currentStep === 2 && (
            <BrandingStep
              onNext={() => handleNextStep('branding')}
              onBack={handlePrevStep}
              onSkipStep={() => handleSkipCurrentStep('branding')}
            />
          )}

          {currentStep === 3 && (
            <StorageStep
              onNext={() => handleNextStep('storage')}
              onBack={handlePrevStep}
              onSkipStep={() => handleSkipCurrentStep('storage')}
            />
          )}

          {currentStep === 4 && (
            <EmailStep
              onNext={() => handleNextStep('email')}
              onBack={handlePrevStep}
              onSkipStep={() => handleSkipCurrentStep('email')}
            />
          )}

          {currentStep === 5 && (
            <DomainStep
              onNext={() => handleNextStep('domain')}
              onBack={handlePrevStep}
              onSkipStep={() => handleSkipCurrentStep('domain')}
            />
          )}

          {currentStep === 6 && (
            <TeamStep
              onNext={() => handleNextStep('team')}
              onBack={handlePrevStep}
              onSkipStep={() => handleSkipCurrentStep('team')}
            />
          )}

          {currentStep === 7 && (
            <FirstCourseStep
              onNext={() => handleNextStep('course')}
              onBack={handlePrevStep}
              onSkipStep={() => handleSkipCurrentStep('course')}
            />
          )}

          {currentStep === 8 && (
            <LaunchChecklist
              steps={stepsList}
              completionPercentage={completionPercentage}
              canLaunch={canLaunch}
              onComplete={() => completeMutation.mutate()}
              onBack={handlePrevStep}
              isPending={completeMutation.isPending}
            />
          )}
        </main>
      </div>

      {/* Exit Modal */}
      <OnboardingExitModal
        isOpen={isExitModalOpen}
        onClose={() => setIsExitModalOpen(false)}
        onConfirmExit={() => skipMutation.mutate()}
      />
    </div>
  );
}
