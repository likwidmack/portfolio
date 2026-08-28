/// <reference types='vitest' />
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { join } from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  root: import.meta.dirname,
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    outDir: join(process.cwd(), 'dist'),
    reportCompressedSize: true,
    sourcemap: true,
  },
  cacheDir: '../../node_modules/.vite/packages/utilities',
  plugins: [nxViteTsPaths()],
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [],
  // },
  test: {
    name: 'utilities',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
      include: ['src/**/*.ts'],
      exclude: ['**/*.{spec,test}.ts', '**/tests/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
}));
