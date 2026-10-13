import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', timeout: 120_000, expect: { timeout: 15_000 }, fullyParallel: false, workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]], outputDir: 'test-results',
  use: { baseURL: process.env.E2E_WEB_BASE_URL || 'http://127.0.0.1:3000', screenshot: 'only-on-failure', trace: 'retain-on-failure', video: 'off', channel: 'chrome' },
  projects: [
    { name: 'desktop-chrome-1440', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile-chrome-375', use: { ...devices['iPhone 13'], browserName: 'chromium', viewport: { width: 375, height: 812 }, channel: 'chrome' } },
    { name: 'mobile-chrome-430', use: { ...devices['iPhone 14 Pro Max'], browserName: 'chromium', viewport: { width: 430, height: 932 }, channel: 'chrome' } }
  ]
});
