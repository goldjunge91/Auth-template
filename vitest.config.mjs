import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [{   // Projekt für E2E-Tests mit Playwright
      name: 'e2e-playwright', // Top-level name for this project
      test: {
        include: ['./all-tests/e2e/**/*.{ spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        browser: {
          enabled: true,
          name: 'playwright',
          provider: 'playwright',
        }, // setupFiles: ['./tests/e2e/setup.ts'], // Uncomment if needed for E2E tests
      }
    },
    // Projekt für Next.js/Next-Auth Unit-/Integrationstests
    {
      name: 'nextjs-react-unit-tests', // Top-level name for this project
      // Options specific to this project's test execution go into a 'test' object
      test: {
        include: ['./all-tests/vitest-unit-tests/**/*.{test, spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        environment: 'jsdom', // Common for React/Next.js component tests
           setupFiles: ['./vitest-setup.ts']
      },
    }
    ],
    // Globale Testkonfigurationen können hier platziert werden, if not overridden by projects
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})