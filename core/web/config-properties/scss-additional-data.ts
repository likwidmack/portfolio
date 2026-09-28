/**
 * Sass load paths + Vue-only `additionalData` prepend for theme `nuxt-auto` and app mixins.
 * Kept separate from `vite-prop.ts` so unit tests do not load Vite/esbuild plugins.
 *
 * Load paths include `@tgmc/theme` SCSS, PrimeVue theme Sass (`theme/primevue`), Foundation
 * vendor Sass (`theme/foundation`), and app `assets/css`. Vue SFCs get `theme-*` color helpers
 * via `_nuxt-auto` (`@forward 'tokens/color-fns'`). Standalone sheets `@use` explicitly.
 */
import { fileURLToPath, URL } from 'node:url';

import { shouldInjectAppMixins, shouldInjectScssAutoUse } from './scss-auto-use';

const resolvePath = (strUrl: string | URL) => fileURLToPath(new URL(strUrl, import.meta.url));

export const themeRoot = resolvePath('../../../theme/core');
export const themeScssRoot = `${themeRoot}/scss`;
export const themePrimeVueRoot = resolvePath('../../../theme/primevue');
export const themeFoundationRoot = resolvePath('../../../theme/foundation');
export const appCssRoot = resolvePath('../assets/css');

/**
 * Theme Sass module name for Vue-only `additionalData` inject (`shouldInjectScssAutoUse`).
 * Standalone `.scss` sheets are not injected — they rely on `scssLoadPaths` + explicit `@use`.
 * Never inject `_globals.scss` (selectors emit once via `portfolio-launch.scss`).
 *
 * Source of truth for theme members: `theme/core/scss/_nuxt-auto.scss`
 * (variables, colors, color-fns `theme-*`, button-mixins).
 * App mixins inject uses the absolute `assets/css/mixins` path beside this entry.
 */
export const scssAutoUseEntry = 'nuxt-auto';

/**
 * Sass load paths for `@tgmc/theme` SCSS, PrimeVue/Foundation theme packages, and app `assets/css`.
 * Standalone sheets resolve `@use 'mixins'` (and must not `@use 'globals'` — see app-scss SoT).
 */
export const scssLoadPaths = [themeRoot, themeScssRoot, themePrimeVueRoot, themeFoundationRoot, appCssRoot];

/**
 * Vite SCSS `additionalData` body: prepend absolute `@use` for theme tokens and/or app mixins.
 * Vue SFC styles only (see `shouldInjectScssAutoUse` / `shouldInjectAppMixins`).
 */
export function scssAdditionalData(content: string, filename: string): string {
  const injectTheme = shouldInjectScssAutoUse(content, filename);
  const injectMixins = shouldInjectAppMixins(content, filename);
  if (!injectTheme && !injectMixins) {
    return content;
  }

  // Absolute paths: Vue SFC virtual modules often ignore Sass `loadPaths`.
  const parts: string[] = [];
  if (injectTheme) {
    const autoUsePath = `${themeScssRoot.replace(/\\/g, '/')}/nuxt-auto`;
    parts.push(`@use "${autoUsePath}" as *;`);
  }
  if (injectMixins) {
    const mixinsPath = `${appCssRoot.replace(/\\/g, '/')}/mixins`;
    parts.push(`@use "${mixinsPath}" as *;`);
  }
  return `${parts.join('\n')}\n${content}`;
}
