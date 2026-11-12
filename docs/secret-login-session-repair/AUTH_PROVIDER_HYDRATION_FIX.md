# AuthProvider Hydration & State Synchronization Fix

## Overview

The client-side authentication provider (`apps/web/src/components/auth-provider.tsx`) serves as the single source of truth for user identity, role capabilities, and impersonation status across the web portal.

Prior to this fix, race conditions during initial mounting and page reload caused transient 401 errors, unexpected redirects to `/login`, and UI tearing during impersonation transitions.

---

## Technical Problem

1. **Hydration Race Condition:** When a user refreshed an authenticated page, the page components rendered before `fetchMe()` resolved. Unprotected queries executed immediately with expired or in-flight tokens, resulting in 401 errors.
2. **Soft Redirect Conflicts:** When exiting impersonation, updating React state while staying on a tenant route caused route guards to fire and redirect before the router could navigate to the platform console.
3. **Stale Query Cache:** TanStack Query cache persisted data from the impersonated user (e.g. instructor classes or student enrollments) into the restored SuperAdmin session.

---

## Implementation Details

### 1. Robust Network Fetching with `credentials: 'same-origin'`
All API calls in `AuthProvider` now explicitly pass `credentials: 'same-origin'` to guarantee that browser cookies are attached even in non-standard execution contexts or Next.js rewrites:

```typescript
const fetchMe = async (): Promise<IUser | null> => {
  try {
    const res = await fetch('/api/v1/auth/me', {
      method: 'GET',
      credentials: 'same-origin'
    });

    if (res.ok) {
      const data = await res.json();
      setUser(data.data.user);
      return data.data.user;
    }

    if (res.status === 401) {
      // Attempt silent refresh before giving up
      const refreshedUser = await refreshSession();
      return refreshedUser;
    }

    setUser(null);
    return null;
  } catch (err) {
    console.error('[AuthProvider] Failed to fetch current user', err);
    setUser(null);
    return null;
  } finally {
    setIsLoading(false);
  }
};
```

---

### 2. Silent Token Refresh Fallback
If `/api/v1/auth/me` returns `401 Unauthorized` (such as when the 15-minute access token has expired), `AuthProvider` does not immediately log the user out. Instead, it attempts a silent token refresh:

```typescript
const refreshSession = async (): Promise<IUser | null> => {
  try {
    const res = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'same-origin'
    });

    if (!res.ok) {
      setUser(null);
      return null;
    }

    const data = await res.json();
    setUser(data.data.user);
    return data.data.user;
  } catch {
    setUser(null);
    return null;
  }
};
```
Only if both the access token verification AND the refresh attempt fail is the user transitioned to `user = null` and redirected to login.

---

### 3. Page-Level Auth Hydration Guards
In all protected pages (e.g. `apps/web/src/app/instructor/page.tsx`, `apps/web/src/app/instructor/classes/page.tsx`, `apps/web/src/app/platform/page.tsx`), data-fetching effects now wait until `isAuthLoading` resolves:

```tsx
const { user, isLoading: isAuthLoading } = useAuth();

useEffect(() => {
  if (isAuthLoading || !user) return;
  
  // Safe to execute protected queries now that session is hydrated
  loadDashboardData();
}, [isAuthLoading, user]);
```

This prevents premature requests from being dispatched while token rotation is in progress.

---

### 4. Cache Clearing on Identity Boundaries
When impersonation starts or exits, `queryClient.clear()` is called to completely evict tenant-specific data from memory, ensuring that SuperAdmins never view cached student or instructor data upon returning to the Platform Console.

