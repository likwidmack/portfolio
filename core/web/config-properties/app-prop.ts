/**
 * Builds Nuxt `app` options: `<head>` metadata, Normalize.css, OG tags, transitions.
 *
 * @param siteDescription - Default `meta[name=description]` and related SEO copy
 * @param siteTitle - Document title and Open Graph title
 * @param cdnUrl - Optional `NUXT_APP_CDN_URL` origin so `/favicon.ico` is not requested from Lambda
 */
import { buildPersonalizationFoucScript } from '../shared/personalization';
import { resolvePublicAssetUrl } from './cdn-url';

export const app = (siteDescription: string, siteTitle: string, cdnUrl = '') => ({
  head: {
    charset: 'utf-8',
    htmlAttrs: { lang: 'en' },
    link: [
      /*       {
        rel: 'stylesheet',
        href: 'https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.min.css',
        integrity: 'sha512-NhSC1YmyruXifcj/KFRWoC561YpHpc5Jtzgvbuzx5VozKpWvQ+4nXhPdFgmx8xqexRcpAglTj9sIBWINXa8x5w==',
        crossorigin: 'anonymous',
        referrerpolicy: 'no-referrer',
      },
 */ // { href: 'https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.min.css.map' },
      {
        rel: 'icon',
        type: 'image/x-icon',
        href: resolvePublicAssetUrl('/favicon.ico', cdnUrl),
      },
    ],
    meta: [
      { name: 'description', content: siteDescription },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: siteTitle },
    ],
    noscript: [{ innerHTML: 'JavaScript is required' }],
    // FOUC guard: set data-theme / p-dark before paint from storage + OS preference.
    script: [
      {
        key: 'tgmc-theme-mode-fouc',
        innerHTML: buildPersonalizationFoucScript(),
        tagPosition: 'head',
      },
    ],
    title: siteTitle,
    viewport: 'width=device-width, initial-scale=1',
  },
  // Do not use Transition mode "out-in" with NuxtPage: every portfolio page
  // awaits useAsyncData in <script setup>, so Nuxt wraps it in Suspense.
  // Vue 3 Transition(out-in) + Suspense can skip mounting the entering page
  // on client navigations until a full reload (nuxt/nuxt#32371).
  layoutTransition: false,
  pageTransition: false,
});

export default app;
