# Impersonation Exit & Platform Restoration Architecture

## Context & User Problem

In previous iterations, clicking the "Exit Impersonation" button in `ImpersonationBanner` frequently caused broken states:
- The banner unmounted before the HTTP request completed or before navigation started.
- The browser remained on `/instructor` or `/student` while authenticated as a `SUPERADMIN`, triggering tenant permission errors.
- Rapid duplicate clicks on "Exit Impersonation" sent duplicate POST requests, causing race conditions in session destruction.

---

## Technical Solution

### 1. Atomic Navigation with `window.location.replace`
Instead of performing an in-place React state update followed by a client-side `router.push('/platform')`, `exitImpersonation` now performs an atomic full-page navigation:

```typescript
// apps/web/src/components/auth-provider.tsx
const exitImpersonation = async (redirectTo: string = '/platform'): Promise<void> => {
  try {
    const res = await fetch('/api/v1/platform/impersonation/exit', {
      method: 'POST',
      credentials: 'same-origin'
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to exit impersonation');
    }

    // Clear client-side cache to prevent data leakage
    queryClient.clear();

    // Atomic browser redirect to target destination
    if (typeof window !== 'undefined') {
      window.location.replace(redirectTo);
    }
  } catch (err) {
    console.error('[AuthProvider] Error exiting impersonation:', err);
    throw err;
  }
};
```

#### Why `window.location.replace` is Essential:
1. **Prevents History Stack Pollution:** Replaces the current impersonated page entry in the browser history, ensuring that clicking the browser "Back" button does not return the user to the impersonated view with SuperAdmin credentials.
2. **Fresh Application Bootstrap:** Mounts Next.js and `AuthProvider` cleanly from scratch on `/platform`. The new page load carries the restored SuperAdmin HttpOnly cookies directly in the initial request.
3. **No Layout Race Conditions:** Eliminates the transient state where a tenant dashboard layout attempts to render SuperAdmin permissions.

---

### 2. ImpersonationBanner Hardening
In `apps/web/src/components/auth/ImpersonationBanner.tsx`:
- **Debounced / Guarded Exit State:** Prevents concurrent duplicate clicks with an `isExiting` state lock.
- **Persistent Mounting:** The banner remains visible with a loading spinner (`"Restoring SuperAdmin session..."`) until the browser window transitions to `/platform`.

```tsx
export function ImpersonationBanner() {
  const { user, isImpersonated, exitImpersonation } = useAuth();
  const [isExiting, setIsExiting] = useState(false);

  if (!isImpersonated || !user) return null;

  const handleExit = async () => {
    if (isExiting) return;
    setIsExiting(true);
    try {
      await exitImpersonation('/platform');
    } catch (err) {
      console.error('Failed to exit impersonation:', err);
      setIsExiting(false);
    }
  };

  return (
    <div className="sticky top-0 z-50 bg-amber-500 text-white px-4 py-2 flex items-center justify-between shadow-md">
      <div className="flex items-center space-x-2 text-sm font-medium">
        <ShieldAlert className="w-4 h-4 animate-pulse" />
        <span>Impersonating: <strong>{user.name} ({user.email})</strong></span>
      </div>
      <button
        onClick={handleExit}
        disabled={isExiting}
        className="px-3 py-1 bg-white text-amber-700 rounded text-xs font-semibold hover:bg-amber-50 disabled:opacity-50 transition"
      >
        {isExiting ? 'Restoring Session...' : 'Exit Impersonation'}
      </button>
    </div>
  );
}
```

---

### 3. Platform Console Route Protection & Hydration Guard
In `apps/web/src/app/platform/page.tsx`:
1. **Hydration Spinner:** Displays a clean loading state while `isAuthLoading` is `true`.
2. **Role Verification:** Non-SuperAdmins are redirected to `/admin` or `/login`.
3. **Target Routing:** When starting impersonation from the user directory modal, the user's role is inspected to determine the optimal landing route (`/instructor` for trainers, `/student` for learners, `/admin` for branch managers), passed directly to `impersonate(targetUserId, reason, destination)`.

