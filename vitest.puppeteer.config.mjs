import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 60000,
    hookTimeout: 60000,
    teardownTimeout: 30000,
    include: ['all-tests/puppeteer/**/*.test.ts'],
    exclude: [
      'all-tests/vitest-unit-tests/**/*',
      'all-tests/e2e/**/*',
    ],
    environment: 'node',
    globals: true,
    setupFiles: [],
    reporters: ['verbose'],
    outputFile: {
      json: './all-tests/puppeteer/test-results.json',
      html: './all-tests/puppeteer/test-results.html',
    },
  },
  resolve: {
    alias: {
      '@': '/workspaces/Auth-template/src',
    },
  },
});
