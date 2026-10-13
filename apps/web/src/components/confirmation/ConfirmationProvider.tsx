'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ConfirmationModal, ConfirmationOptions } from './ConfirmationModal';

export interface ConfirmationContextType {
  confirm: (options: ConfirmationOptions) => Promise<boolean>;
}

const ConfirmationContext = createContext<ConfirmationContextType | null>(null);

export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmationOptions | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmationOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);
    setIsLoading(false);

    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    setIsLoading(true);
    try {
      if (options?.onConfirm) {
        await options.onConfirm();
      }
      if (resolver) {
        resolver(true);
      }
      setIsOpen(false);
      setOptions(null);
      setResolver(null);
    } catch (err) {
      if (resolver) {
        resolver(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, [options, resolver]);


  const handleCancel = useCallback(() => {
    if (resolver) {
      resolver(false);
    }
    setIsOpen(false);
    setIsLoading(false);
    setOptions(null);
    setResolver(null);
  }, [resolver]);

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      {options && (
        <ConfirmationModal
          isOpen={isOpen}
          isLoading={isLoading}
          title={options.title}
          description={options.description}
          resourceName={options.resourceName}
          type={options.type}
          confirmText={options.confirmText}
          cancelText={options.cancelText}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation(): ConfirmationContextType {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirmation must be used within a ConfirmationProvider');
  }
  return context;
}
