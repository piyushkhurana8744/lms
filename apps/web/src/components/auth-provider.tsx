'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { IUser, IAuthContext } from '@edtech/types';
import { hasPermission as evaluatePermission } from '@edtech/permissions';

const AuthContext = createContext<IAuthContext | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<IUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch Current Authenticated User Status
  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/auth/me', {
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.user) {
          setUser(json.data.user);
          return;
        }
      }
      setUser(null);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // Multi-tab logout listener
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'auth:logout_event') {
        setUser(null);
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const login = async (credentials: any) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Login failed');
      }

      setUser(json.data.user);
      return json.data.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout, proceed with client cleanup
    } finally {
      setUser(null);
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('auth_token');
          window.localStorage.removeItem('active_branch');
          window.localStorage.setItem('auth:logout_event', Date.now().toString());
          window.sessionStorage.clear();
        }
      } catch {}
      setIsLoading(false);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  const refresh = async () => {
    try {
      const res = await fetch('/api/v1/auth/refresh', { method: 'POST' });
      if (res.ok) {
        await fetchMe();
      }
    } catch {
      setUser(null);
    }
  };

  const impersonate = async (userId: string, reason = 'Platform superadmin support session') => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/platform/impersonation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId, reason })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Impersonation failed');
      }

      await fetchMe();
    } finally {
      setIsLoading(false);
    }
  };

  const exitImpersonation = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/platform/impersonation/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to exit impersonation');
      }

      await fetchMe();
    } finally {
      setIsLoading(false);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    return evaluatePermission((user as any).permissions || [], permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    const userPerms = (user as any).permissions || [];
    if (!permissions || permissions.length === 0) return true;
    return permissions.some((p) => evaluatePermission(userPerms, p));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    const userPerms = (user as any).permissions || [];
    if (!permissions || permissions.length === 0) return true;
    return permissions.every((p) => evaluatePermission(userPerms, p));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        logout,
        refresh,
        impersonate,
        exitImpersonation,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): IAuthContext {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
