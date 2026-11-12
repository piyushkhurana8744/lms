import { expect, test, type Page } from '@playwright/test';

const password = process.env.E2E_DEMO_PASSWORD || 'DemoPass123!';

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /Sign In to Console/i }).click();
  await page.waitForURL((url) => url.pathname !== '/login');
}

test.describe('Secret Login browser contract', () => {
  test('SuperAdmin launches an audited instructor session and exits safely', async ({ page }) => {
    await login(page, 'superadmin@didm.edu');
    await page.goto('/admin');

    const entry = page.getByRole('link', { name: 'Login as Trainer', exact: true });
    await expect(entry).toBeVisible();
    await entry.click();
    await expect(page).toHaveURL(/\/platform\?tab=users/);

    const search = page.getByPlaceholder('Search user by name or email...');
    await search.fill('aarav.sharma@didm.edu');
    const row = page.getByRole('row').filter({ hasText: 'aarav.sharma@didm.edu' });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Secret Login', exact: true }).click();
    await page.getByPlaceholder(/Investigating instructor grading issue/i).fill('Secret Login focused browser verification');
    await page.getByRole('button', { name: 'Launch Impersonation' }).click();

    await page.waitForURL(/\/instructor(?:\/|$)/);
    await expect(page.getByText('Secret Impersonation Mode')).toBeVisible();
    await expect(page.getByRole('button', { name: /Exit Impersonation/i })).toBeVisible();

    const me = await page.request.get('/api/v1/auth/me');
    expect(me.ok()).toBeTruthy();
    const effectiveUser = (await me.json()).data.user;
    expect(effectiveUser.email).toBe('aarav.sharma@didm.edu');
    expect(effectiveUser.isImpersonated).toBe(true);
    expect(effectiveUser.isSuperAdmin).toBe(false);

    const impersonationCookies = await page.context().cookies();
    const accessCookie = impersonationCookies.find((cookie) => cookie.name === 'accessToken');
    const refreshCookie = impersonationCookies.find((cookie) => cookie.name === 'refreshToken');
    expect(accessCookie).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/' });
    expect(refreshCookie).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/' });

    await page.reload();
    await expect(page.getByText('Secret Impersonation Mode')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Instructor Command Center' })).toBeVisible();

    await page.goto('/instructor/classes');
    await expect(page.getByText('Secret Impersonation Mode')).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('heading', { name: 'Instructor Command Center' })).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(/\/instructor\/classes/);

    const secondTab = await page.context().newPage();
    await secondTab.goto('/instructor');
    await expect(secondTab.getByText('Secret Impersonation Mode')).toBeVisible();
    const secondTabMe = await secondTab.request.get('/api/v1/auth/me');
    expect((await secondTabMe.json()).data.user.email).toBe('aarav.sharma@didm.edu');
    await secondTab.close();

    // Simulate an expired access cookie while retaining the HttpOnly refresh
    // cookie. Middleware must allow hydration and AuthProvider must rotate.
    await page.context().clearCookies({ name: 'accessToken' });
    await page.reload();
    await expect(page.getByText('Secret Impersonation Mode')).toBeVisible();
    const refreshedMe = await page.request.get('/api/v1/auth/me');
    expect(refreshedMe.ok()).toBeTruthy();
    expect((await refreshedMe.json()).data.user.email).toBe('aarav.sharma@didm.edu');

    const platformAttempt = await page.request.get('/api/v1/platform/command-center/summary');
    expect(platformAttempt.status()).toBe(403);

    // Click Exit Impersonation in UI to return to the original initiating location (/admin)
    const exitButton = page.getByRole('button', { name: /Exit Impersonation/i });
    await expect(exitButton).toBeVisible();
    await exitButton.click();

    // Verify exact return to /admin (Example A)
    await page.waitForURL(/\/admin(?:\/|$)/);
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
    await expect(page.getByText('Secret Impersonation Mode')).toHaveCount(0);

    const restoredMe = await page.request.get('/api/v1/auth/me');
    expect(restoredMe.ok()).toBeTruthy();
    expect((await restoredMe.json()).data.user.isSuperAdmin).toBe(true);

    // Refresh /admin to prove restored session persists
    await page.reload();
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
    await expect(page.getByText('Secret Impersonation Mode')).toHaveCount(0);
  });

  test('SuperAdmin launches student impersonation from /platform?tab=users, verifies persistence across refresh, and exits to exact initiating URL', async ({ page }) => {
    await login(page, 'superadmin@didm.edu');
    await page.goto('/platform?tab=users');

    const search = page.getByPlaceholder('Search user by name or email...');
    await search.fill('aman.verma@student.didm.edu');
    const row = page.getByRole('row').filter({ hasText: 'aman.verma@student.didm.edu' });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Secret Login', exact: true }).click();
    await page.getByPlaceholder(/Investigating instructor grading issue/i).fill('Student portal support audit');
    await page.getByRole('button', { name: 'Launch Impersonation' }).click();

    await page.waitForURL(/\/student(?:\/|$)/);
    await expect(page.getByText('Secret Impersonation Mode')).toBeVisible();
    await expect(page.locator('.sticky').getByText('aman.verma@student.didm.edu')).toBeVisible();

    const me = await page.request.get('/api/v1/auth/me');
    expect(me.ok()).toBeTruthy();
    const effectiveUser = (await me.json()).data.user;
    expect(effectiveUser.email).toBe('aman.verma@student.didm.edu');
    expect(effectiveUser.isImpersonated).toBe(true);

    // Refresh student page: verify identity persists
    await page.reload();
    await expect(page.getByText('Secret Impersonation Mode')).toBeVisible();
    await expect(page.locator('.sticky').getByText('aman.verma@student.didm.edu')).toBeVisible();

    // Click Exit Impersonation in UI
    await page.getByRole('button', { name: /Exit Impersonation/i }).click();

    // Verify exact return to /platform?tab=users (Example B)
    await page.waitForURL((url) => url.pathname === '/platform' && url.searchParams.get('tab') === 'users');
    await expect(page.getByRole('heading', { name: 'Platform Command Center' })).toBeVisible();
    await expect(page.getByText('Secret Impersonation Mode')).toHaveCount(0);

    const saMe = await page.request.get('/api/v1/auth/me');
    expect(saMe.ok()).toBeTruthy();
    expect((await saMe.json()).data.user.isSuperAdmin).toBe(true);
  });

  test('Preserves search query parameters on exit (Example C: /platform?tab=users&search=aarav)', async ({ page }) => {
    await login(page, 'superadmin@didm.edu');
    await page.goto('/platform?tab=users&search=aarav');

    const row = page.getByRole('row').filter({ hasText: 'aarav.sharma@didm.edu' });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Secret Login', exact: true }).click();
    await page.getByPlaceholder(/Investigating instructor grading issue/i).fill('Query parameter return audit');
    await page.getByRole('button', { name: 'Launch Impersonation' }).click();

    await page.waitForURL(/\/instructor(?:\/|$)/);
    await expect(page.getByText('Secret Impersonation Mode')).toBeVisible();

    // Verify session carries exact initiating returnTo
    const me = await page.request.get('/api/v1/auth/me');
    const user = (await me.json()).data.user;
    expect(user.impersonationReturnTo).toBe('/platform?tab=users&search=aarav');

    // Refresh while impersonated
    await page.reload();
    await expect(page.getByText('Secret Impersonation Mode')).toBeVisible();

    // Click Exit Impersonation
    await page.getByRole('button', { name: /Exit Impersonation/i }).click();

    // Verify exact return to original query parameters (Example C)
    await page.waitForURL((url) => url.pathname === '/platform' && url.searchParams.get('tab') === 'users' && url.searchParams.get('search') === 'aarav');
    await expect(page).toHaveURL(/\/platform\?tab=users&search=aarav/);
    await expect(page.getByRole('heading', { name: 'Platform Command Center' })).toBeVisible();
    await expect(page.getByText('Secret Impersonation Mode')).toHaveCount(0);
  });

  test('Rejects malicious external or protocol-relative redirect injection and falls back safely', async ({ page }) => {
    await login(page, 'superadmin@didm.edu');

    // Attempt starting impersonation with malicious returnTo via direct API call from authenticated browser context
    const startRes = await page.request.post('/api/v1/platform/impersonation/start', {
      data: {
        targetUserId: '6ae1f909950ad7c6997b84cf', // demo instructor ID
        reason: 'Malicious redirect injection test',
        returnTo: 'https://evil.com/phish'
      }
    });

    if (startRes.ok()) {
      const data = await startRes.json();
      // Server sanitizer must reject external URL and sanitize returnTo to safe fallback
      expect(data.data.returnTo).toBe('/platform');

      // Exit impersonation
      const exitRes = await page.request.post('/api/v1/platform/impersonation/exit');
      expect(exitRes.ok()).toBeTruthy();
      const exitData = await exitRes.json();
      expect(exitData.data.returnTo).toBe('/platform');
    }
  });
});
