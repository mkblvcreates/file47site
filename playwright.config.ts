import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests, against a real build of this site.
 *
 * One project and one server: this repository is the site. The suite drives
 * both ways in — the room on the CRT's glass, and the flat page for anyone who
 * cannot have it — and asserts the things a client site must never get wrong:
 * that it is reachable, that the booking path works without a GPU, and that
 * nothing on the page claims something the code did not do.
 */
const PORT = 3211;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    // After the spread, not before: Desktop Chrome carries its own viewport,
    // and a deterministic one is what keeps the layout assertions meaningful.
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: `pnpm exec next dev --port ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
