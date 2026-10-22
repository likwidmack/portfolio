import { mediaAwsEndpointsFromEnv } from '@tgmc/media-aws';

import { isLocalMediaBackend } from './media-library';

function firstNonEmpty(env: NodeJS.ProcessEnv, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = env[key]?.trim();
    if (value) {
      return value;
    }
  }
  return undefined;
}

function withoutTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Where media objects are publicly readable; every media URL is this base + `/` + key
 * (`/m/{tenant}/{kind}/{name}.{ext}`). No trailing slash.
 * - `MEDIA_PUBLIC_BASE_URL`, when set, wins on every backend. SAM sets it to the stack's own
 *   CloudFront distribution (the test stack's `NUXT_APP_CDN_URL` is a shared CDN without `m/*`).
 * - Filesystem backends (`sqlite` / `postgres`, host `npm run dev`): `''`, same origin, served by the
 *   `/m/**` route of this module. Never on Lambda ({@link isLocalMediaBackend}).
 * - Otherwise (`dynamodb`, or anything on Lambda): the CDN origin (`NUXT_APP_CDN_URL`, else
 *   `NUXT_PUBLIC_CDN_URL`); without one, the MinIO public endpoint plus bucket
 *   (`MEDIA_S3_PUBLIC_ENDPOINT` + `ASSETS_BUCKET`, path-style, Docker); with neither, `''`.
 */
export function mediaPublicBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const override = firstNonEmpty(env, 'MEDIA_PUBLIC_BASE_URL');
  if (override) {
    return withoutTrailingSlash(override);
  }
  if (isLocalMediaBackend(env)) {
    return '';
  }
  const cdn = firstNonEmpty(env, 'NUXT_APP_CDN_URL', 'NUXT_PUBLIC_CDN_URL');
  if (cdn) {
    return withoutTrailingSlash(cdn);
  }
  const { s3PublicEndpoint } = mediaAwsEndpointsFromEnv(env);
  const bucket = firstNonEmpty(env, 'NUXT_ASSETS_BUCKET', 'ASSETS_BUCKET');
  return s3PublicEndpoint && bucket ? `${withoutTrailingSlash(s3PublicEndpoint)}/${bucket}` : '';
}

/** Public URL of a media key (`m/pf/i/hero@t.webp` → `/m/pf/i/hero@t.webp` on host dev). */
export function mediaPublicUrl(key: string, env: NodeJS.ProcessEnv = process.env): string {
  return `${mediaPublicBaseUrl(env)}/${key}`;
}
