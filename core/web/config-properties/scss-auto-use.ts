/**
 * Decide whether Vite SCSS `additionalData` should prepend theme auto-`@use`.
 * Theme package / Nuxt entry SCSS already `@use` tokens — injecting there causes member conflicts.
 *
 * Note: with Vite 7 + modern Sass, `filename` is often the bare `.vue` path (no `?vue&type=style` query).
 */

/** Full SFC / Pug / script bodies sometimes mis-routed into the SCSS pipeline. */
function isMisroutedScssContent(content: string): boolean {
  const trimmed = content.trimStart();
  if (trimmed.startsWith('<') || content.includes('<template') || content.includes('<script')) {
    return true;
  }
  return (
    /^(import|export|const|let|var|function|definePageMeta|defineNuxtConfig)\b/.test(trimmed) ||
    content.includes('definePageMeta(')
  );
}

function isExcludedScssPath(normalized: string): boolean {
  return (
    normalized.includes('/node_modules/') ||
    normalized.includes('/theme/core/scss/') ||
    normalized.endsWith('/assets/css/styles.scss') ||
    normalized.endsWith('/assets/css/portfolio-launch.scss') ||
    normalized.endsWith('/assets/css/_globals.scss') ||
    normalized.endsWith('/assets/css/_mixins.scss') ||
    normalized.endsWith('/assets/css/_variables.scss')
  );
}

/** Theme `nuxt-auto` inject — Vue SFC styles only. */
export function shouldInjectScssAutoUse(content: string, filename: string): boolean {
  if (isMisroutedScssContent(content)) {
    return false;
  }
  const normalized = filename.replace(/\\/g, '/').split('?')[0] ?? '';
  if (isExcludedScssPath(normalized)) {
    return false;
  }
  return normalized.endsWith('.vue');
}

/**
 * App portfolio mixins inject — same Vue-only gate as theme auto-use.
 * Never inject `_globals.scss` (selectors must emit once via portfolio-launch).
 */
export function shouldInjectAppMixins(content: string, filename: string): boolean {
  return shouldInjectScssAutoUse(content, filename);
}
