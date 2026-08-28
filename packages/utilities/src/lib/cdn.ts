/**
 * CDN URL helpers (SSR / Node / browser safe).
 *
 * Resolve, build, detect, and strip CDN prefixes without touching the DOM.
 */

/** Snapshot of CDN enablement and base URL. */
export interface CdnConfig {
  enabled: boolean;
  url: string;
}

/**
 * Resolve a single asset path to a CDN URL.
 * @param assetPath - Relative path to the asset
 * @param cdnUrl - CDN base URL (optional)
 * @returns Full CDN URL when `cdnUrl` is set, otherwise the original path
 */
export const resolveCdnPath = (assetPath: string, cdnUrl?: string): string => {
  if (!cdnUrl) return assetPath;
  const cleanPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;
  return `${cdnUrl}/${cleanPath}`;
};

/**
 * Resolve multiple asset paths to CDN URLs.
 */
export const resolveCdnPaths = (assetPaths: string[], cdnUrl?: string): string[] => {
  return assetPaths.map((path) => resolveCdnPath(path, cdnUrl));
};

/**
 * Create a CDN-aware helper object with `resolve` / `resolvePaths` / `config`.
 */
export const createCdnHelper = (cdnUrl?: string) => {
  const isEnabled = !!cdnUrl;

  return {
    isEnabled,
    url: cdnUrl || '',
    resolve: (path: string): string => resolveCdnPath(path, cdnUrl),
    resolvePaths: (paths: string[]): string[] => resolveCdnPaths(paths, cdnUrl),
    config: {
      enabled: isEnabled,
      url: cdnUrl || '',
    } as CdnConfig,
  };
};

/**
 * Join a CDN base URL with path segments.
 */
export const buildCdnUrl = (baseUrl: string, ...segments: string[]): string => {
  if (!baseUrl) return segments.join('/');
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanSegments = segments.map((seg) => (seg.startsWith('/') ? seg.slice(1) : seg));
  return `${cleanBase}/${cleanSegments.join('/')}`;
};

/**
 * `true` when `url` starts with the configured CDN base.
 */
export const isCdnUrl = (url: string, cdnUrl?: string): boolean => {
  if (!cdnUrl) return false;
  return url.startsWith(cdnUrl);
};

/**
 * Strip the CDN base from `url`, returning a path that starts with `/` when possible.
 */
export const stripCdnPrefix = (url: string, cdnUrl?: string): string => {
  if (!cdnUrl || !url.startsWith(cdnUrl)) return url;
  return url.slice(cdnUrl.length).replace(/^\/+/, '/');
};
