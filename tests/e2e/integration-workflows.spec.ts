import { expect, test, type Page } from '@playwright/test';

const password = process.env.E2E_DEMO_PASSWORD || 'DemoPass123!';
const workerSecret = process.env.INTERNAL_WORKER_SECRET || 'e2e-worker-secret-123456';

async function login(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /Sign In to Console/i }).click();
  await page.waitForURL((url) => url.pathname !== '/login');
}

async function setConnection(page: Page, tenantId: string, provider: string, status: string, isDemo = true) {
  const response = await page.request.post('/api/v1/internal/integrations/test-connections', {
    headers: { 'x-internal-worker-secret': workerSecret },
    data: { tenantId, provider, status, scopes: status === 'MISSING_SCOPE' ? [] : ['meeting:read', 'meeting:write'], metadata: { isDemo } }
  });
  expect(response.ok(), `${provider} -> ${status}`).toBeTruthy();
}

test.describe.serial('Phase 22 integration workflows', () => {
  test('admin provider states, instructor lifecycle, student security, and impersonation', async ({ page }, testInfo) => {
    test.setTimeout(300_000);
    await login(page, 'admin@didm.edu');
    const me = (await (await page.request.get('/api/v1/auth/me')).json()).data.user;
    const tenantId = me.tenantId || me.activeTenantId || me.memberships?.[0]?.tenantId;
    expect(tenantId).toBeTruthy();

    await setConnection(page, tenantId, 'GOOGLE_CLASSROOM', 'DISCONNECTED');
    await setConnection(page, tenantId, 'GOOGLE_MEET', 'MISSING_SCOPE');
    await setConnection(page, tenantId, 'ZOOM', 'RECONNECT_REQUIRED');
    await setConnection(page, tenantId, 'MICROSOFT_TEAMS', 'CONNECTED');
    if (testInfo.project.name.startsWith('mobile')) await page.getByRole('button', { name: 'Toggle navigation menu' }).click();
    const integrationsLink = page.getByRole('link', { name: 'Integrations', exact: true }).first();
    await expect(integrationsLink).toBeVisible();
    await integrationsLink.click();
    await expect(page).toHaveURL(/\/admin\/settings\/integrations/);
    const expected = [
      ['GOOGLE_CLASSROOM', 'Disconnected'], ['GOOGLE_MEET', 'Missing Scope'],
      ['ZOOM', 'Reconnect Required'], ['MICROSOFT_TEAMS', 'Connected']
    ] as const;
    for (const [provider, label] of expected) {
      const card = page.getByTestId(`provider-card-${provider}`);
      await expect(card).toBeVisible();
      await expect(card.getByText(label, { exact: true })).toBeVisible();
      await expect(card.getByText('TEST MODE', { exact: true })).toBeVisible();
    }
    await testInfo.attach('admin-integrations.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });

    for (const provider of ['GOOGLE_CLASSROOM', 'GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS']) await setConnection(page, tenantId, provider, 'CONNECTED');

    await login(page, 'aarav.sharma@didm.edu');
    await page.goto('/instructor/classes');
    const classHref = await page.locator('a[href^="/instructor/classes/"]').first().getAttribute('href');
    expect(classHref).toBeTruthy();
    await page.goto(classHref!);
    const console = page.getByTestId('live-meeting-console');
    await expect(console).toBeVisible();
    await expect(page.getByTestId('meeting-provider-availability')).toContainText('GOOGLE MEET');
    await testInfo.attach('instructor-provider-selector.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    for (const provider of ['GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS']) {
      await console.getByLabel('Meeting provider').selectOption(provider);
      await console.getByRole('button', { name: 'Create / Switch Meeting' }).click();
      await expect(page.getByText(/Meeting create completed in TEST MODE/)).toBeVisible();
      await expect(page.getByTestId('meeting-status')).toContainText(provider);
    }
    await console.getByRole('button', { name: 'Reschedule Meeting' }).click();
    await expect(page.getByText(/Meeting reschedule completed/)).toBeVisible();
    await expect(page.getByTestId('meeting-history')).toContainText('RETIRED');

    const instructorClassId = classHref!.split('/').pop()!;
    const hostJoin = await page.request.get(`/api/v1/integrations/classes/${instructorClassId}/join`);
    expect(hostJoin.ok()).toBeTruthy();
    expect((await hostJoin.json()).data.startUrl).toBeTruthy();

    await login(page, 'aman.verma@student.didm.edu');
    const dashboard = await page.request.get('/api/v1/student/dashboard');
    expect(dashboard.ok()).toBeTruthy();
    const upcoming = (await dashboard.json()).data.upcomingClasses;
    expect(upcoming.length).toBeGreaterThan(0);
    const studentJoin = await page.request.get(`/api/v1/integrations/classes/${upcoming[0].id}/join`);
    if (studentJoin.ok()) {
      const payload = (await studentJoin.json()).data;
      expect(payload.isHost).toBe(false);
      expect(payload.startUrl).toBeUndefined();
      expect(JSON.stringify(payload)).not.toContain('hostUrl');
    } else {
      expect([403, 404, 409]).toContain(studentJoin.status());
    }
    await page.goto('/student');
    await expect(page.getByRole('button', { name: 'Join Live Class' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Connect Google|Connect Zoom|Connect Microsoft/i })).toHaveCount(0);
    await testInfo.attach('student-live-class.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });

    await login(page, 'branch.main@didm.edu');
    if (testInfo.project.name.startsWith('mobile')) await page.getByRole('button', { name: 'Toggle navigation menu' }).click();
    await page.getByRole('link', { name: 'Integrations', exact: true }).first().click();
    await expect(page.getByTestId('provider-card-GOOGLE_CLASSROOM')).toBeVisible();
    await expect(page.getByTestId('provider-readonly-GOOGLE_CLASSROOM')).toBeVisible();

    await login(page, 'superadmin@didm.edu');
    await page.goto('/platform');
    await page.getByRole('button', { name: /User Directory/i }).click();
    const secretLogin = page.getByRole('button', { name: 'Secret Login', exact: true }).first();
    await expect(secretLogin).toBeVisible();
    await secretLogin.click();
    await page.getByPlaceholder(/Investigating instructor grading issue/i).fill(`Phase 22 browser gate ${testInfo.project.name}`);
    await page.getByRole('button', { name: 'Launch Impersonation' }).click();
    await expect(page.getByRole('button', { name: /Exit Impersonation/i })).toBeVisible();
    await page.getByRole('button', { name: /Exit Impersonation/i }).click();
    await page.waitForURL(/\/platform/);
    await expect(page.getByRole('heading', { name: 'Platform Command Center' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Exit Impersonation/i })).toHaveCount(0);
  });
});
