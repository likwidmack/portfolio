import { createLocalMediaCdnHandler } from '../../utils/media-cdn';
import { getLocalBlobStore, isLocalMediaBackend } from '../../utils/media-library';

/**
 * GET|HEAD /m/<tenant>/<kind>/<name>.<ext> — the CDN stand-in for the filesystem backends
 * ({@link createLocalMediaCdnHandler}). Local media URLs are same-origin (`mediaPublicBaseUrl()` is
 * `''` on `sqlite` / `postgres`). 404 when local media is off (`dynamodb`, or on Lambda).
 */
export default createLocalMediaCdnHandler({
  enabled: () => isLocalMediaBackend(),
  store: getLocalBlobStore,
});
