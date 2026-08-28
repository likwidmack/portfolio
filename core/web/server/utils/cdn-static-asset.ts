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
  '.mp4',
  '.webm',
] as const;

/** Pathname only — ignore query/hash so `?x=.js` cannot fake a static asset. */
export function isStaticAsset(urlOrPath: string): boolean {
  const pathOnly = urlOrPath.split(/[?#]/, 1)[0] ?? '';
  const lower = pathOnly.toLowerCase();
  return STATIC_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Absolute CDN URL for a static path when Lambda/API Gateway cannot serve
 * `.output/public` (SAM ships those files to CloudFront only).
 */
export function cdnStaticAssetRedirectUrl(urlOrPath: string, cdnUrl: string | undefined): string | undefined {
  if (!cdnUrl || !isStaticAsset(urlOrPath)) {
    return undefined;
  }
  const pathOnly = urlOrPath.split(/[?#]/, 1)[0] ?? '';
  if (!pathOnly.startsWith('/')) {
    return undefined;
  }
  return resolveCdnPath(pathOnly, cdnUrl);
}
