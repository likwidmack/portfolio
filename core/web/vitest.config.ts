/**
 * Vitest project for `@tgmc/web`: jsdom suite, `#shared` / theme path aliases aligned with runtime imports,
 * and coverage emitted under `./test-output/vitest/coverage`.
 */
import { fileURLToPath } from 'url';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

const themeRoot = fileURLToPath(new URL('../../theme/core', import.meta.url));

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/core/web',
  plugins: [vue()],
  resolve: {
    alias: [
      { find: '#shared', replacement: fileURLToPath(new URL('./shared', import.meta.url)) },
      {
        find: '@tgmc/utilities/universal',
        replacement: fileURLToPath(new URL('../../packages/utilities/src/universal.ts', import.meta.url)),
      },
      { find: '#theme/scss', replacement: `${themeRoot}/scss` },
      { find: /^theme\/scss(\/.*)?$/, replacement: `${themeRoot}/scss$1` },
      { find: /^theme$/, replacement: themeRoot },
    ],
  },
  test: {
    name: 'web',
    watch: false,
    globals: true,
    environment: 'jsdom',
    // Serialize file runs: unrestricted / multi-worker jsdom suites flake on
    // Windows with "Cannot read properties of undefined (reading 'config')".
    pool: 'forks',
    fileParallelism: false,
    maxWorkers: 1,
    include: ['{src,tests,server,layers}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
      include: [
        'server/db/**/*.ts',
        'server/api/messages/**/*.ts',
        'server/api/posts/**/*.ts',
        'shared/personalization.ts',
        'shared/blog-types.ts',
      ],
      exclude: ['**/*.{spec,test}.ts', '**/routes.spec.ts'],
      thresholds: {
        // Focused gate for data stores + public post/message APIs + personalization SoT.
        lines: 70,
        functions: 65,
        branches: 55,
        statements: 70,
      },
    },
  },
}));
