import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const reuseExisting = process.env.E2E_REUSE_SERVER === 'true';

// Keep a video of every run by default. Set `E2E_VIDEO=retain-on-failure`
// (or `off`) to opt out — useful in CI where the artifact size adds up.
const videoMode = (process.env.E2E_VIDEO ?? 'on') as
  | 'on'
  | 'off'
  | 'retain-on-failure'
  | 'on-first-retry';

export default defineConfig({
  testDir: './tests',
  // Tests mutate real Supabase state and share a single Vite dev server
  // that hits a hydration race under concurrent load. Run one test at a
  // time — the suite is small and this trades a few seconds of wall
  // time for deterministic runs. Within a file, serial describe blocks
  // still enforce ordering between their own tests.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  // The codebase uses `data-test` (not the Playwright default `data-testid`)
  // so `page.getByTestId('foo')` resolves against `[data-test="foo"]`.
  use: {
    baseURL,
    testIdAttribute: 'data-test',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: videoMode,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: reuseExisting
    ? undefined
    : {
        command: 'pnpm --filter web dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});
