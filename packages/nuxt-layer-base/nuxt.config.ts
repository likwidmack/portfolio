/**
 * Standard Nuxt 4 base layer configuration for TGMC apps.
 *
 * Provides:
 * - `@nuxt/a11y` defaults (axe-core WCAG 2.2 AA, reports, fail-on-violation).
 * - `@tgmc/theme` SCSS tokens, mixins, and contract color variables.
 * - No utility auto-imports: apps import `@tgmc/utilities/universal` (SSR-safe) explicitly.
 * - `@nuxt/icon` preconfigured with Lucide inline SVG.
 */
import { fileURLToPath, URL } from 'node:url';
import { defineNuxtConfig } from 'nuxt/config';
import { tgmcA11yConfig } from './src/config/a11y';

const resolvePath = (strUrl: string | URL) => fileURLToPath(new URL(strUrl, import.meta.url));
const themeCoreRoot = resolvePath('../../theme/core');
const themeScssRoot = `${themeCoreRoot}/scss`.replace(/\\/g, '/');

export default defineNuxtConfig({
  modules: ['@nuxt/a11y', '@nuxt/icon'],

  // Default accessibility baseline
  a11y: tgmcA11yConfig(),

  // Icon defaults: Lucide via inline SVG
  icon: {
    mode: 'svg',
    provider: 'server',
    fallbackToApi: false,
    serverBundle: { collections: ['lucide'] },
  },

  // Composables from this layer; utilities are imported explicitly from @tgmc/utilities/universal.
  imports: {
    dirs: ['app/composables'],
  },

  // Vite & SCSS design token injection
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          loadPaths: [themeCoreRoot, `${themeCoreRoot}/scss`],
          additionalData(content: string, filename: string): string {
            // Only inject tokens into Vue SFC styles; avoid double-injection in standalone sheets
            if (!filename.includes('.vue')) {
              return content;
            }
            return `@use "${themeScssRoot}/nuxt-auto" as *;\n${content}`;
          },
        },
      },
    },
  },

  // App shell meta defaults
  app: {
    head: {
      htmlAttrs: {
        lang: 'en',
      },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      ],
    },
  },
});
