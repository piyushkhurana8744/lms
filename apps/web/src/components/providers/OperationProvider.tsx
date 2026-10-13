'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { TopProgressBar } from '../loading/TopProgressBar';
import { OperationToast, ActiveOperationItem } from '../loading/OperationToast';
import { GlobalOperationOverlay } from '../ui/GlobalOperationOverlay';

export interface StartOperationOptions {
  id?: string;
  title?: string;
  label?: string;
  description?: string;
  message?: string;
  type?: 'GLOBAL' | 'PAGE' | 'SECTION' | 'UPLOAD' | 'ACTION' | 'MUTATION';
  progress?: number;
}

export interface UpdateOperationOptions {
  progress?: number;
  title?: string;
  label?: string;
  description?: string;
  message?: string;
}

export interface CompleteOperationOptions {
  title?: string;
  successMessage?: string;
  autoDismissMs?: number;
}

export interface OperationContextType {
  startOperation: (options: StartOperationOptions) => string;
  updateOperation: (id: string, options: UpdateOperationOptions) => void;
  completeOperation: (id: string, options?: CompleteOperationOptions | string) => void;
  failOperation: (id: string, message?: string) => void;
  dismissOperation: (id: string) => void;
  activeOperations: ActiveOperationItem[];
  isGlobalLoading: boolean;
}

export const OperationContext = createContext<OperationContextType | null>(null);

export function OperationProvider({ children }: { children: ReactNode }) {
  const [operations, setOperations] = useState<ActiveOperationItem[]>([]);

  const startOperation = useCallback((options: StartOperationOptions): string => {
    const id = options.id || `op-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const displayLabel = options.title || options.label || 'Operation in Progress';
    const displayMessage = options.description || options.message;

    const newItem: ActiveOperationItem = {
      id,
      label: displayLabel,
      title: options.title,
      description: options.description,
      type: options.type || 'ACTION',
      progress: options.progress,
      status: 'IN_PROGRESS',
      message: displayMessage
    };

    setOperations((prev) => {
      const existsIndex = prev.findIndex((op) => op.id === id);
      if (existsIndex >= 0) {
        const copy = [...prev];
        copy[existsIndex] = newItem;
        return copy;
      }
      return [...prev, newItem];
    });

    return id;
  }, []);

  const updateOperation = useCallback((id: string, options: UpdateOperationOptions) => {
    setOperations((prev) =>
      prev.map((op) => {
        if (op.id !== id) return op;
        const newLabel = options.title || options.label;
        const newMessage = options.description || options.message;
        return {
          ...op,
          ...(newLabel ? { label: newLabel, title: options.title } : {}),
          ...(newMessage ? { message: newMessage, description: options.description } : {}),
          ...(options.progress !== undefined ? { progress: options.progress } : {})
        };
      })
    );
  }, []);

  const dismissOperation = useCallback((id: string) => {
    setOperations((prev) => prev.filter((op) => op.id !== id));
  }, []);

  const completeOperation = useCallback(
    (id: string, options?: CompleteOperationOptions | string) => {
      const messageStr = typeof options === 'string' ? options : options?.successMessage || options?.title || 'Operation completed successfully';
      const autoDismiss = typeof options === 'object' && options?.autoDismissMs !== undefined ? options.autoDismissMs : 3000;

      setOperations((prev) =>
        prev.map((op) => {
          if (op.id !== id) return op;
          return {
            ...op,
            status: 'SUCCESS',
            progress: 100,
            successMessage: messageStr
          };
        })
      );

      if (autoDismiss > 0) {
        setTimeout(() => {
          dismissOperation(id);
        }, autoDismiss);
      }
    },
    [dismissOperation]
  );

  const failOperation = useCallback(
    (id: string, message?: string) => {
      setOperations((prev) =>
        prev.map((op) => {
          if (op.id !== id) return op;
          return {
            ...op,
            status: 'FAILED',
            message: message || 'Operation failed'
          };
        })
      );

      setTimeout(() => {
        dismissOperation(id);
      }, 5000);
    },
    [dismissOperation]
  );

  const isGlobalLoading = operations.some(
    (op) => op.status === 'IN_PROGRESS' && (op.type === 'GLOBAL' || op.type === 'PAGE')
  );

  const hasAnyInProgress = operations.some((op) => op.status === 'IN_PROGRESS');

  return (
    <OperationContext.Provider
      value={{
        startOperation,
        updateOperation,
        completeOperation,
        failOperation,
        dismissOperation,
        activeOperations: operations,
        isGlobalLoading
      }}
    >
      <TopProgressBar isLoading={hasAnyInProgress} />
      <GlobalOperationOverlay operations={operations} />
      {children}
      <OperationToast operations={operations} onDismiss={dismissOperation} />
    </OperationContext.Provider>
  );
}

export function useOperation(): OperationContextType {
  const context = useContext(OperationContext);
  if (!context) {
    throw new Error('useOperation must be used within an OperationProvider');
  }
  return context;
}
