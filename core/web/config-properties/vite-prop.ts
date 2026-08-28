/// <reference types='vitest' />
/**
 * Vite options forwarded from Nuxt: dependency pre-bundle hints, JSX support, NX tsconfig paths,
 * SCSS auto-`@use` for theme tokens, and narrowed `server.fs.allow` for the `core/web` package root.
 */
import type { ViteOptions } from '@nuxt/schema';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { fileURLToPath, URL } from 'node:url';

import { shouldInjectScssAutoUse } from './scss-auto-use';
import { viteFsAllowRoots } from './vite-fs-allow';

const resolvePath = (strUrl: string | URL) => fileURLToPath(new URL(strUrl, import.meta.url));
const themeRoot = resolvePath('../../../theme/core');
const themeScssRoot = `${themeRoot}/scss`;
const themePrimeVueRoot = resolvePath('../../../theme/primevue');
const themeFoundationRoot = resolvePath('../../../theme/foundation');

/**
 * Common Sass modules prepended to every SCSS compilation (Vue SFC styles + `.scss` files).
 * Paths are relative to `loadPaths` (`theme/core/scss`).
 *
 * Source of truth for members: `theme/core/scss/_nuxt-auto.scss`.
 */
export const scssAutoUseEntry = 'nuxt-auto';

/** Sass load paths for `@tgmc/theme` SCSS (tokens, globals, PrimeVue, Foundation). */
export const scssLoadPaths = [themeRoot, themeScssRoot, themePrimeVueRoot, themeFoundationRoot];

export { shouldInjectScssAutoUse } from './scss-auto-use';

function stripBrokenPrimeVueProxySourcemap() {
  return {
    name: 'strip-broken-primevue-proxy-sourcemap',
    transform(code: string, id: string) {
      const normalizedId = id.replace(/\\/g, '/');
      if (!normalizedId.includes('/node_modules/primevue/config/index.mjs')) {
        return null;
      }

      // Firefox warns when this proxy module advertises an empty inlined sourcemap.
      const cleaned = code.replace(/\n\/\/# sourceMappingURL=data:application\/json;base64,[A-Za-z0-9+/=]+\s*$/m, '');
      if (cleaned === code) {
        return null;
      }
      return { code: cleaned, map: null };
    },
  };
}

export const vite: () => ViteOptions = () => ({
  build: {
    // PrimeVue, SQLite WASM, and i18n bundles legitimately exceed 500 kB.
    // Raise the threshold to eliminate noisy per-chunk warnings without
    // masking genuine regressions (anything over this limit is still flagged).
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('primevue') || id.includes('@primevue') || id.includes('@primeuix')) {
            return 'primevue';
          }

          if (id.includes('vue-router') || id.includes('/vue/') || id.includes('\\vue\\') || id.includes('pinia')) {
            return 'vue-vendor';
          }

          if (id.includes('@nuxt/content') || id.includes('sqlite') || id.includes('better-sqlite')) {
            return 'content';
          }

          // Split large i18n resource bundles into their own chunk.
          if (id.includes('@nuxtjs/i18n') || id.includes('vue-i18n')) {
            return 'i18n';
          }

          return undefined;
        },
      },
      onwarn(warning, warn) {
        // Nuxt's module-preload polyfill transform does not emit sourcemaps (Nuxt #34530).
        if (warning.code === 'SOURCEMAP_BROKEN') {
          return;
        }

        warn(warning);
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Foundation Sites + sassy-lists still use `@import`, legacy `if()`, and
        // global builtins (`map-values`, …). Silencing until that stack is migrated;
        // theme-owned SCSS already uses `@use` / module builtins.
        quietDeps: true,
        silenceDeprecations: ['import', 'global-builtin', 'if-function'],
        additionalData(content: string, filename: string): string {
          if (!shouldInjectScssAutoUse(content, filename)) {
            return content;
          }

          // Absolute path: Vue SFC virtual modules often ignore Sass `loadPaths`.
          const autoUsePath = `${themeScssRoot.replace(/\\/g, '/')}/nuxt-auto`;
          return `@use "${autoUsePath}" as *;\n${content}`;
        },
        loadPaths: scssLoadPaths,
      },
    },
  },
  resolve: {
    alias: [
      // Runtime may use dist or package exports; keep SCSS aliases on source tree.
      // Point bare `theme/scss` at index.scss — directory aliases make embedded
      // Sass report a pathless "Can't find stylesheet to import".
      { find: '#theme/scss', replacement: `${themeScssRoot}/index.scss` },
      { find: /^#theme\/scss\/(.*)$/, replacement: `${themeScssRoot}/$1` },
      { find: /^theme\/scss$/, replacement: `${themeScssRoot}/index.scss` },
      { find: /^theme\/scss\/(.*)$/, replacement: `${themeScssRoot}/$1` },
      { find: /^theme$/, replacement: themeRoot },
    ],
  },
  optimizeDeps: {
    include: ['@vue/devtools-core', '@vue/devtools-kit', 'pinia'],
    exclude: [],
  },
  plugins: [stripBrokenPrimeVueProxySourcemap(), vueJsx({}), nxViteTsPaths() as any],
  server: {
    fs: { allow: viteFsAllowRoots },
  },
  vueJsx: {
    mergeProps: true,
  },
});

export default vite;
