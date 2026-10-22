import { resolveCdnPath } from '../../shared/utils/cdn';

/** Static asset extensions that may receive CDN CORS / long-cache headers. */
const STATIC_EXTENSIONS = [
  '.js',
  '.css',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.avif',
  '.mp4',
  '.webm',
  '.mp3',
  '.m4a',
  '.wav',
  '.ogg',
  '.glb',
  '.gltf',
  '.usdz',
  '.pdf',
  '.htm',
  '.html',
] as const;

/** Pathname only — ignore query/hash so `?x=.js` cannot fake a static asset. */
export function isStaticAsset(urlOrPath: string): boolean {
  const pathOnly = urlOrPath.split(/[?#]/, 1)[0] ?? '';
  const lower = pathOnly.toLowerCase();
  return STATIC_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export type CdnRedirectOptions = {
  /** Local media is on (`isLocalMediaBackend()`): the `/m/**` stand-in serves media objects itself. */
  localMedia?: boolean;
  /** `mediaPublicBaseUrl()`: where `/m/` objects live when that is not the static-asset CDN. */
  mediaBaseUrl?: string;
};

/** Media object path (`/m/<tenant>/<kind>/<file>`), query and hash ignored. */
export function isMediaObjectPath(urlOrPath: string): boolean {
  return (urlOrPath.split(/[?#]/, 1)[0] ?? '').startsWith('/m/');
}

/**
 * Absolute CDN URL for a static path when Lambda/API Gateway cannot serve
 * `.output/public` (SAM ships those files to CloudFront only). Media objects (`/m/…`, any
 * extension: documents such as `.md` too) are not redirected when local media is on, and go to
 * `mediaBaseUrl` when one is given (with or without a static-asset CDN), else to the CDN.
 */
export function cdnStaticAssetRedirectUrl(
  urlOrPath: string,
  cdnUrl: string | undefined,
  options: CdnRedirectOptions = {}
): string | undefined {
  const pathOnly = urlOrPath.split(/[?#]/, 1)[0] ?? '';
  if (!pathOnly.startsWith('/')) {
    return undefined;
  }
  if (isMediaObjectPath(pathOnly)) {
    const base = options.localMedia ? undefined : options.mediaBaseUrl || cdnUrl;
    return base ? resolveCdnPath(pathOnly, base) : undefined;
  }
  if (!cdnUrl || !isStaticAsset(pathOnly)) {
    return undefined;
  }
  return resolveCdnPath(pathOnly, cdnUrl);
}
