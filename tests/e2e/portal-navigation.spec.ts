import { expect, test, type Page, type TestInfo } from '@playwright/test';
const password = process.env.E2E_DEMO_PASSWORD || 'DemoPass123!';
const personas = [
  { name: 'student-aman', email: 'aman.verma@student.didm.edu', landing: '/student', identity: 'Aman Verma' },
  { name: 'instructor-aarav', email: 'aarav.sharma@didm.edu', landing: '/instructor', identity: 'Aarav Sharma' },
  { name: 'tenant-admin', email: 'admin@didm.edu', landing: '/admin', identity: 'Vikas Sharma' },
  { name: 'branch-admin', email: 'branch.main@didm.edu', landing: '/admin', identity: 'Rajesh Kumar' },
  { name: 'superadmin', email: 'superadmin@didm.edu', landing: '/admin', identity: 'Platform SuperAdmin' }
] as const;
async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /Sign In to Console/i }).click();
  await page.waitForURL(url => url.pathname !== '/login', { timeout: 20_000 });
}
for (const persona of personas) {
  test(`${persona.name} renders and navigates its authorized portal`, async ({ page }, testInfo: TestInfo) => {
    const consoleErrors: string[] = [], failedRequests: string[] = [], serverErrors: string[] = [];
    let navigationCount = 0;
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('requestfailed', r => failedRequests.push(`${r.method()} ${r.url()} ${r.failure()?.errorText}`));
    page.on('response', r => { if (r.status() >= 500) serverErrors.push(`${r.status()} ${r.url()}`); });
    await login(page, persona.email);
    await page.waitForURL(url => url.pathname.startsWith(persona.landing), { timeout: 20_000 });
    const me = await page.request.get('/api/v1/auth/me');
    expect(me.ok()).toBeTruthy();
    expect((await me.json()).data.user.name).toContain(persona.identity);
    if (persona.landing !== '/platform') {
      if (testInfo.project.name.startsWith('mobile')) await page.getByRole('button', { name: 'Toggle navigation menu' }).click();
      const links = await page.locator('aside nav a[href]').evaluateAll(nodes => [...new Set(nodes.map(n => (n as HTMLAnchorElement).getAttribute('href')).filter(Boolean))] as string[]);
      navigationCount = links.length;
      expect(links.length, 'authorized sidebar must not be blank').toBeGreaterThan(0);
      await testInfo.attach('navigation.json', { body: JSON.stringify({ persona: persona.name, links }, null, 2), contentType: 'application/json' });
      for (const href of links) {
        const response = await page.goto(href, { waitUntil: 'domcontentloaded' });
        expect(response?.status(), href).toBeLessThan(500);
        expect(page.url(), href).not.toContain('/404');
      }
      await page.goto(persona.landing); await page.reload({ waitUntil: 'domcontentloaded' });
      if (testInfo.project.name.startsWith('mobile')) await page.getByRole('button', { name: 'Toggle navigation menu' }).click();
      await expect(page.locator('aside nav a[href]').first()).toBeVisible();
    }
    await page.context().clearCookies(); await login(page, persona.email);
    await page.waitForURL(url => url.pathname.startsWith(persona.landing));
    const screenshotPath = testInfo.outputPath(`${persona.name}-${testInfo.project.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await testInfo.attach('portal-screenshot', { path: screenshotPath, contentType: 'image/png' });
    await testInfo.attach('runtime-errors.json', { body: JSON.stringify({ consoleErrors, failedRequests, serverErrors }, null, 2), contentType: 'application/json' });
    console.log(JSON.stringify({ persona: persona.name, project: testInfo.project.name, navigationCount, consoleErrors, failedRequests, serverErrors }));
    expect(serverErrors).toEqual([]);
  });
}
test('instructor students directory and detail render', async ({ page }) => {
  await login(page, 'aarav.sharma@didm.edu'); await page.goto('/instructor/students');
  const detail = page.locator('a[href^="/instructor/students/"]').first(); await expect(detail).toBeVisible();
  await page.goto((await detail.getAttribute('href'))!); await expect(page).toHaveURL(/\/instructor\/students\/[a-f0-9]+/);
});
test('admin integration settings render simulated provider states', async ({ page }) => {
  await login(page, 'admin@didm.edu'); await page.goto('/admin/settings/integrations');
  for (const provider of ['Google Classroom', 'Google Meet', 'Zoom', 'Microsoft Teams']) await expect(page.getByText(provider, { exact: false }).first()).toBeVisible();
});
