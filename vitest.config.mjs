import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    coverage: {
      enabled: true,
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'coverage/**',
        'dist/**',
        'packages/*/test{,s}/**',
        '**/*.d.ts',
        'cypress/**',
        'test{,s}/**',
        'test{,-*}.{js,cjs,mjs,ts,tsx,jsx}',
        '**/*{.,-}test.{js,cjs,mjs,ts,tsx,jsx}',
        '**/*{.,-}spec.{js,cjs,mjs,ts,tsx,jsx}',
        '**/__tests__/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
        '**/.{eslint,mocha,prettier}rc.{js,cjs,yml}',
        'next.config.*',
        'tailwind.config.*',
        'postcss.config.*',
        '.next/**',
        'node_modules/**'
      ]
    },
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