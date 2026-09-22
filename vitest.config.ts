import { defineConfig } from 'vitest/config';

/**
 * Unit tests only.
 *
 * `tests/e2e` is Playwright's, and it lives in the same repository now that
 * the site is its own — without this, vitest collects those specs, fails on
 * `test.describe` and takes the whole gate down with it.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
