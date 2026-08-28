import { defineConfig } from 'vitest/config';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/media-player',
  test: {
    name: 'media-player',
    watch: false,
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [
      ['**/*.dom.spec.ts', 'jsdom'],
      ['**/ad-cue.spec.ts', 'jsdom'],
      ['**/text-tracks.spec.ts', 'jsdom'],
      ['**/progressive-loader.spec.ts', 'jsdom'],
      ['**/tgmc-player.spec.ts', 'jsdom'],
    ],
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
    },
  },
}));
