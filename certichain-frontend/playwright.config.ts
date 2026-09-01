import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: { baseURL: 'http://192.168.8.155:3000', trace: 'on-first-retry' },
  webServer: undefined,
});
