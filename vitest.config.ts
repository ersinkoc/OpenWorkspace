import { defineConfig } from 'vitest/config';

/**
 * Shared Vitest configuration for all OpenWorkspace packages.
 * Import and merge in each package's vitest.config.ts.
 */
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/__tests__/**',
        '**/src/**/index.ts',  // barrel re-export files (no logic)
      ],
    },
  },
});
