'use client';

import React, { useState, ReactNode, Suspense } from 'react';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { BrandingProvider } from './branding-provider';
import { ThemeProvider } from './theme-provider';
import { AuthProvider } from './auth-provider';
import { ErrorProvider } from './error/ErrorProvider';
import { notifyGlobalError } from '@/lib/global-error-bus';

import { ConfirmationProvider } from './confirmation/ConfirmationProvider';
import { OperationProvider } from './providers/OperationProvider';
import { RouteNavigationProgress } from './loading/RouteNavigationProgress';

import { ImpersonationBanner } from './auth/ImpersonationBanner';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => {
            if ((query.meta as any)?.skipGlobalError) return;
            notifyGlobalError(error, () => query.fetch());
          }
        }),
        mutationCache: new MutationCache({
          onError: (error, _variables, _context, mutation) => {
            if ((mutation.meta as any)?.skipGlobalError) return;
            notifyGlobalError(error);
          }
        }),
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error: any) => {
              const status = error?.status || error?.statusCode || error?.response?.status;
              if (status === 401 || status === 403 || status === 404) return false;
              return failureCount < 1;
            }
          }
        }
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrandingProvider>
          <AuthProvider>
            <ImpersonationBanner />
            <ErrorProvider>
              <ConfirmationProvider>
                <OperationProvider>
                  <React.Suspense fallback={null}>
                    <RouteNavigationProgress />
                  </React.Suspense>
                  {children}
                </OperationProvider>
              </ConfirmationProvider>
            </ErrorProvider>
          </AuthProvider>
        </BrandingProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

