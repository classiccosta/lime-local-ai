import { defineConfig, devices } from '@playwright/test';

const url = 'http://localhost:4173';

export default defineConfig({
  testDir: 'e2e',
  // Not *.spec.ts or *.test.ts: Vitest's default include would pick those up.
  testMatch: '**/*.e2e.ts',
  forbidOnly: true,
  // The UI language follows the browser; the selectors are English.
  use: { ...devices['Desktop Chrome'], baseURL: url, locale: 'en-US' },
  // Serves dist/, so build first. A strict port never tests another server by mistake.
  webServer: { command: 'npm run preview -- --port 4173 --strictPort', url },
});
