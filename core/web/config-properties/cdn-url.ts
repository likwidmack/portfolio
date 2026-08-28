/**
 * Normalize `NUXT_APP_CDN_URL` for Nuxt `app.cdnURL`.
 *
 * Accepts only absolute http(s) origins. Relative values like `./` or path-only
 * strings must not become `vite.base` / router base — that produces broken
 * absolute routes such as `//admin/blog`.
 */
export const resolveNuxtCdnUrl = (raw: string | undefined | null): string => {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) {
    return '';
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return '';
    }
    // Origin only (scheme + host [+ port]); strip path/query/hash noise.
    return url.origin;
  } catch {
    return '';
  }
};

/** Join a public asset path to an optional CDN origin (no `@tgmc/utilities` — safe in `nuxt prepare`). */
export const resolvePublicAssetUrl = (assetPath: string, cdnOrigin = ''): string => {
  const path = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  if (!cdnOrigin) {
    return path;
  }
  return `${cdnOrigin.replace(/\/$/, '')}${path}`;
};
