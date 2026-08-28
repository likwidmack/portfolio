/**
 * CDN middleware
 *
 * SAM Lambda does not ship `.output/public`. When `runtimeConfig.public.cdnUrl`
 * is set, GET/HEAD for static extensions (including `/favicon.ico`) 302 to
 * CloudFront so API Gateway origins do not 404 well-known assets.
 */

import { cdnStaticAssetRedirectUrl } from '../utils/cdn-static-asset';

export default defineEventHandler((event) => {
  const config = useRuntimeConfig();
  const cdnUrl = config.public.cdnUrl as string | undefined;
  if (!cdnUrl) return;

  const method = getMethod(event).toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') return;

  const path = getHeader(event, 'x-forwarded-path') || event.node.req.url || '';
  const location = cdnStaticAssetRedirectUrl(path, cdnUrl);
  if (!location) return;

  return sendRedirect(event, location, 302);
});
