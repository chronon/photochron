import { defineConfig } from '@playwright/test';

export default defineConfig({
  webServer: {
    command: 'pnpm build && wrangler dev --local --port 4173',
    port: 4173
  },

  testDir: 'e2e',

  use: {
    baseURL: 'http://localhost:4173'
  }
});
