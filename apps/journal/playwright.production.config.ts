import { defineConfig, devices } from '@playwright/test';

/** Static production files under a Pages-style subpath, with real workers. */
export default defineConfig({
  testDir: './tests/production',
  outputDir: './test-results/production',
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: './playwright-report/production', open: 'never' }]],
  use: {
    headless: true,
    contextOptions: { reducedMotion: 'reduce' },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'pwa', testMatch: /(?:pwa|storage)\.spec\.ts/, use: { browserName: 'chromium' } },
    {
      name: 'storage-webkit',
      testMatch: /(?:pwa|storage)\.spec\.ts/,
      use: { browserName: 'webkit' },
    },
    ...[
      { name: 'small-phone', width: 320, height: 568 },
      { name: 'phone', width: 393, height: 852 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1280, height: 900 },
      { name: 'landscape', width: 852, height: 393 },
    ].map(({ name, width, height }) => ({
      name,
      testMatch: 'responsive.spec.ts',
      use: { browserName: 'chromium' as const, viewport: { width, height } },
    })),
    {
      name: 'webkit-phone',
      testMatch: 'responsive.spec.ts',
      use: { ...devices['iPhone 13'] },
    },
  ],
});
