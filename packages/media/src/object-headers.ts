import type { BlobPutOptions } from './ports/index.js';

/** Originals and variants are served `immutable`; a catalog replace triggers a CDN invalidation instead. */
export const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/** Object headers for every media write: the mime, immutable caching and `inline; filename="<name>.<ext>"`. */
export function objectHeaders(contentType: string, key: string): BlobPutOptions {
  return {
    contentType,
    cacheControl: IMMUTABLE_CACHE_CONTROL,
    contentDisposition: `inline; filename="${key.slice(key.lastIndexOf('/') + 1)}"`,
  };
}
