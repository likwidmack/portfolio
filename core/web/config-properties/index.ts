/**
 * Barrel re-exports for Nuxt module option factories used by `nuxt.config.ts`.
 * Keeps the main config small and grouped by concern (app shell, toolchain, UI, accessibility).
 */
export { a11y } from './a11y-prop';
export { app } from './app-prop';
export { resolveNuxtCdnUrl, resolvePublicAssetUrl } from './cdn-url';
export { i18n } from './i18n-prop';
export { primevue } from './primevue-prop';
export { scssAutoUseEntry, scssLoadPaths, vite } from './vite-prop';
