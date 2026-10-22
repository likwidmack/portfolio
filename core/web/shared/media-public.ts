/**
 * Public media origin for builds that have no media server to ask, such as the tamaramack.github.io
 * export: catalog media (`m/{tenant}/{kind}/{name}.{ext}`) then loads from the production CDN.
 * Client-safe (no imports). The deployed app's server-side `mediaPublicBaseUrl()`
 * (`@tgmc/media-nuxt`) stays the source of truth wherever it is available.
 * See docs/cicd.md#site-media-in-the-githubio-copy.
 */

/**
 * Production media origin (absolute https, no trailing slash). Empty means same origin until the first
 * production deploy; the follow-up commit sets the prod CloudFront origin here.
 */
export const PRODUCTION_MEDIA_BASE_URL = '';

/** Shape of the `useRuntimeConfig()` slice this module reads. */
export interface MediaPublicRuntimeConfig {
  public?: { mediaBaseUrl?: unknown };
}

/**
 * An absolute http(s) base URL without trailing slashes, or `''` when `value` is anything else
 * (relative, protocol-relative, credentials, query or hash, non-string).
 */
export function normalizeMediaBaseUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!/^https?:\/\/[^/]/i.test(trimmed)) return '';
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return '';
  }
  if (url.username || url.password || url.search || url.hash || trimmed.includes('?') || trimmed.includes('#')) {
    return '';
  }
  return `${url.origin}${url.pathname}`.replace(/\/+$/, '');
}

/**
 * Media base for site media: `runtimeConfig.public.mediaBaseUrl` (env `NUXT_PUBLIC_MEDIA_BASE_URL`)
 * when it is a valid absolute URL, else {@link PRODUCTION_MEDIA_BASE_URL}. Pass `useRuntimeConfig()`.
 */
export function sitePublicMediaBase(runtimeConfig?: MediaPublicRuntimeConfig | null): string {
  return normalizeMediaBaseUrl(runtimeConfig?.public?.mediaBaseUrl) || PRODUCTION_MEDIA_BASE_URL;
}

/** Public URL of a catalog key (`m/pf/i/hero@640.webp`) on {@link sitePublicMediaBase}. */
export function sitePublicMediaUrl(key: string, runtimeConfig?: MediaPublicRuntimeConfig | null): string {
  return `${sitePublicMediaBase(runtimeConfig)}/${key.replace(/^\/+/, '')}`;
}
