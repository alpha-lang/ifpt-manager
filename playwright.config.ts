import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    viewport: { width: 1280, height: 800 },
    launchOptions: {
      args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
