'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { NormalizedAppError, ShowErrorInput, normalizeError } from '@/lib/error-handler';
import { GlobalErrorModal } from './GlobalErrorModal';

import { registerGlobalErrorHandler } from '@/lib/global-error-bus';

export interface ErrorContextType {
  currentError: NormalizedAppError | null;
  isOpen: boolean;
  showError: (input: ShowErrorInput | unknown) => void;
  clearError: () => void;
}

const ErrorContext = createContext<ErrorContextType | null>(null);

let lastErrorTimestamp = 0;
let lastErrorMessage = '';
let isAuthRedirecting = false;

export function ErrorProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [currentError, setCurrentError] = useState<NormalizedAppError | null>(null);
  const [retryFn, setRetryFn] = useState<(() => void | Promise<any>) | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);

  const clearError = useCallback(() => {
    setIsOpen(false);
    setCurrentError(null);
    setRetryFn(undefined);
  }, []);

  const showError = useCallback(
    (input: ShowErrorInput | unknown) => {
      let normalized: NormalizedAppError;
      let retry: (() => void | Promise<void>) | undefined = undefined;

      if (typeof input === 'object' && input !== null && 'error' in input) {
        const errorInput = input as ShowErrorInput;
        normalized = normalizeError(errorInput.error || errorInput, errorInput.title);
        if (errorInput.title) normalized.title = errorInput.title;
        if (errorInput.message) normalized.message = errorInput.message;
        if (errorInput.code) normalized.code = errorInput.code;
        if (errorInput.statusCode) normalized.statusCode = errorInput.statusCode;
        if (errorInput.fieldErrors) normalized.fieldErrors = errorInput.fieldErrors;
        if (errorInput.technicalDetails) normalized.technicalDetails = errorInput.technicalDetails;
        retry = errorInput.retry;
      } else {
        normalized = normalizeError(input);
      }

      // Handle 401 Session Expiration Special Case
      if (normalized.statusCode === 401 || normalized.code === 'UNAUTHORIZED' || normalized.message.toLowerCase().includes('session has expired')) {
        if (!isAuthRedirecting && pathname !== '/login' && pathname !== '/register') {
          isAuthRedirecting = true;
          normalized.title = 'Session Expired';
          normalized.message = 'Your session has expired. Please log in again to continue.';
          setCurrentError(normalized);
          setRetryFn(() => () => {
            router.push('/login');
          });
          setIsOpen(true);
          setTimeout(() => {
            isAuthRedirecting = false;
          }, 5000);
        }
        return;
      }

      // Deduplicate rapid identical error spam (within 3 seconds)
      const now = Date.now();
      if (normalized.message === lastErrorMessage && now - lastErrorTimestamp < 3000) {
        return;
      }

      lastErrorMessage = normalized.message;
      lastErrorTimestamp = now;

      setCurrentError(normalized);
      setRetryFn(() => retry);
      setIsOpen(true);
    },
    [pathname, router]
  );

  // Global Window Unhandled Exception, Promise Rejection, and Bus Handler
  useEffect(() => {
    registerGlobalErrorHandler((err: unknown, retry?: () => void | Promise<void>) => {
      showError({ error: err, retry });
    });

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (reason && typeof reason === 'object' && (reason.name === 'AbortError' || reason.message?.includes('ResizeObserver'))) {
        return;
      }
      showError({
        title: 'Unexpected Application Error',
        error: reason
      });
    };

    const handleWindowError = (event: ErrorEvent) => {
      if (event.message?.includes('ResizeObserver')) return;
      showError({
        title: 'Application Error',
        error: event.error || event.message
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleWindowError);

    return () => {
      registerGlobalErrorHandler(null);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleWindowError);
    };
  }, [showError]);

  return (
    <ErrorContext.Provider
      value={{
        currentError,
        isOpen,
        showError,
        clearError
      }}
    >
      {children}
      <GlobalErrorModal
        error={currentError}
        isOpen={isOpen}
        onClose={clearError}
        onRetry={retryFn}
      />
    </ErrorContext.Provider>
  );
}

export function useGlobalError(): ErrorContextType {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useGlobalError must be used within an ErrorProvider');
  }
  return context;
}
