import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  timeout: 30000,
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    browserName: 'chromium',
    channel: 'chrome',
    headless: true,
    launchOptions: {
      args: ['--use-gl=angle', '--use-angle=metal'],
    },
  },
});
