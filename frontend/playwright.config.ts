import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 90000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'test-report' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    channel: 'chrome',
    headless: false,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 15000,
    trace: process.env.CI ? 'on-first-retry' : 'on',
    video: 'on',
  },
  projects: [
    {
      name: 'exam-proctoring',
      testMatch: 'exam-proctoring.spec.ts',
    },
  ],
});
