import { defineConfig, devices } from '@playwright/test';

const webBaseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const apiBaseUrl = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: webBaseUrl,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm dev',
    url: webBaseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NODE_ENV: 'test',
      ENGINEO_ENV: 'test',
      ENGINEO_E2E: '1',
      NEXT_PUBLIC_API_URL: apiBaseUrl,
      PLAYWRIGHT_API_URL: apiBaseUrl,
      SHOPIFY_MODE: 'mock',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
