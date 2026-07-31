import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results',
  // Extensions need a real Chromium with a persistent profile, and each worker
  // launches its own. Two workers keeps CI honest without thrashing the box;
  // locally, Playwright's own default is better tuned to the machine.
  ...(process.env.CI ? { workers: 2 } : {}),
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    headless: true,
    screenshot: 'only-on-failure',
    trace: process.env.CI ? 'retain-on-failure' : 'off',
  },
});
