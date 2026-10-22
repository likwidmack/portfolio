/**
 * CDN middleware
 *
 * SAM Lambda does not ship `.output/public`. When `runtimeConfig.public.cdnUrl`
 * is set, GET/HEAD for static extensions (including `/favicon.ico`) 302 to
 * CloudFront so API Gateway origins do not 404 well-known assets.
 * Media objects (`/m/…`) are left to the `/m/**` stand-in when local media is on,
 * and otherwise go to `mediaPublicBaseUrl()` (the stack's own distribution, or
 * MinIO), also when no `cdnUrl` is set.
 */

import { isLocalMediaBackend } from '@tgmc/media-nuxt/runtime/server/utils/media-library';
import { mediaPublicBaseUrl } from '@tgmc/media-nuxt/runtime/server/utils/media-public-url';

import { cdnStaticAssetRedirectUrl, isMediaObjectPath } from '../utils/cdn-static-asset';

export default defineEventHandler((event) => {
  const config = useRuntimeConfig();
  const cdnUrl = config.public.cdnUrl as string | undefined;
  const path = getHeader(event, 'x-forwarded-path') || event.node.req.url || '';
  const media = isMediaObjectPath(path);
  if (!cdnUrl && !media) return;

  const method = getMethod(event).toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') return;

  const location = cdnStaticAssetRedirectUrl(path, cdnUrl, {
    localMedia: media && isLocalMediaBackend(),
    mediaBaseUrl: media ? mediaPublicBaseUrl() : undefined,
  });
  if (!location) return;

  return sendRedirect(event, location, 302);
});
