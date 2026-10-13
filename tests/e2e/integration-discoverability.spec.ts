import { expect, test, type Page } from '@playwright/test';

const password = process.env.E2E_DEMO_PASSWORD || 'DemoPass123!';
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

async function openMobileNav(page: Page, projectName: string) {
  if (projectName.startsWith('mobile')) await page.getByRole('button', { name: 'Toggle navigation menu' }).click();
}

test('real persona navigation exposes truthful integration UX', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  await login(page, 'admin@didm.edu');
  await openMobileNav(page, testInfo.project.name);
  const navLink = page.getByRole('link', { name: 'Integrations', exact: true }).first();
  await expect(navLink).toBeVisible();
  await testInfo.attach('admin-sidebar-integrations.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  await navLink.click();
  await expect(page).toHaveURL(/\/admin\/settings\/integrations/);
  for (const provider of ['GOOGLE_CLASSROOM', 'GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS']) {
    const card = page.getByTestId(`provider-card-${provider}`);
    await expect(card).toBeVisible();
    await expect(card.getByText(/Connected|Disconnected|Reconnect Required|Missing Scope|Reauth Required|Error/).first()).toBeVisible();
    await expect(card.getByRole('button', { name: /Connect|Reconnect|Setup required|Disconnect/ }).first()).toBeVisible();
    const setupButton = card.getByRole('button', { name: /Setup required/ });
    if (await setupButton.count()) await expect(setupButton).toBeDisabled();
  }
  await testInfo.attach('four-provider-cards.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  await page.reload();
  await expect(page.getByTestId('provider-card-GOOGLE_CLASSROOM')).toBeVisible();

  await page.goto('/admin/organization');
  await expect(page.getByTestId('settings-integrations-link')).toBeVisible();

  await login(page, 'branch.main@didm.edu');
  await openMobileNav(page, testInfo.project.name);
  await page.getByRole('link', { name: 'Integrations', exact: true }).first().click();
  await expect(page.getByTestId('provider-readonly-GOOGLE_CLASSROOM')).toBeVisible();

  await login(page, 'aarav.sharma@didm.edu');
  await page.goto('/instructor/classes');
  const classHref = await page.locator('a[href^="/instructor/classes/"]').first().getAttribute('href');
  expect(classHref).toBeTruthy();
  await page.goto(classHref!);
  await expect(page.getByTestId('meeting-provider-selector')).toBeVisible();
  await expect(page.getByTestId('meeting-provider-availability')).toContainText('GOOGLE MEET');
  await testInfo.attach('instructor-provider-availability.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });

  await login(page, 'aman.verma@student.didm.edu');
  await page.goto('/student');
  await expect(page.getByRole('button', { name: /Connect Google|Connect Zoom|Connect Microsoft/i })).toHaveCount(0);
  const join = page.getByRole('button', { name: 'Join Live Class' });
  if (await join.count()) await expect(join).toBeVisible();
  await testInfo.attach('student-live-class-provider.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });

  await login(page, 'superadmin@didm.edu');
  await openMobileNav(page, testInfo.project.name);
  await page.getByRole('link', { name: 'Integrations', exact: true }).first().click();
  await expect(page.getByTestId('provider-card-MICROSOFT_TEAMS')).toBeVisible();
});
