'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirmation } from '@/components/confirmation/useConfirmation';

export interface UseGoBackOptions {
  fallback?: string;
  hasUnsavedChanges?: boolean;
  unsavedMessage?: string;
}

/**
 * Custom Hook: useGoBack
 * Handles safe internal back navigation with query parameter preservation,
 * external referrer protection, nested fallback routing, and custom unsaved changes confirmation modal.
 */
export function useGoBack(options: UseGoBackOptions = {}) {
  const router = useRouter();
  const { confirm } = useConfirmation();
  const {
    fallback = '/',
    hasUnsavedChanges = false,
    unsavedMessage = 'You have unsaved changes. If you leave now, your changes will be lost.'
  } = options;

  // Track internal page visits in sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentCount = parseInt(sessionStorage.getItem('didm_internal_nav_count') || '0', 10);
      sessionStorage.setItem('didm_internal_nav_count', (currentCount + 1).toString());
    }
  }, []);

  const goBack = useCallback(async () => {
    // 1. Check unsaved changes confirmation modal
    if (hasUnsavedChanges) {
      const confirmed = await confirm({
        title: 'Discard unsaved changes?',
        description: unsavedMessage,
        type: 'warning',
        confirmText: 'Discard Changes',
        cancelText: 'Keep Editing'
      });

      if (!confirmed) {
        return false;
      }
    }

    if (typeof window === 'undefined') {
      router.push(fallback);
      return true;
    }

    // 2. Check if referrer belongs to current application origin
    const referrer = document.referrer;
    const currentOrigin = window.location.origin;
    const isInternalReferrer = referrer && referrer.startsWith(currentOrigin);
    const navCount = parseInt(sessionStorage.getItem('didm_internal_nav_count') || '0', 10);

    // 3. Navigate back via browser history if internal, otherwise use fallback
    if (isInternalReferrer && (window.history.length > 1 || navCount > 1)) {
      router.back();
    } else {
      router.push(fallback);
    }

    return true;
  }, [confirm, router, fallback, hasUnsavedChanges, unsavedMessage]);

  return { goBack };
}
