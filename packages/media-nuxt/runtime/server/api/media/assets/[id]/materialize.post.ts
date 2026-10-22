import { mediaErrorToHttp } from '@tgmc/media';

import {
  getMediaLibrary,
  materializeOrEnqueue,
  requireMediaAdmin,
  resolveMaterializeRequest,
  type MaterializeRequestBody,
} from '../../../../utils/media-library';

/**
 * POST /api/media/assets/:id/materialize
 * Body: { role?, variant?, format?, recipe?, useDefaultThumb? }
 * - `variant` (`t`|`640`|`1280`|`1920`, optional `format`): a catalog variant at a stable key
 *   `m/{tenant}/{kind}/{name}@{variant}.{ext}`; re-materializing replaces it in place.
 * - `recipe`: a custom child at `@c-{8 hex}`, fresh each time.
 * - Neither: the `t` thumbnail unless `useDefaultThumb` is false.
 * `role` is a free label (defaults to the variant code). `variant: "p"` (poster) is reserved (400).
 * Enqueues SQS only when AWS media mode is active (DATA_BACKEND=dynamodb with table+bucket) and
 * MEDIA_QUEUE_URL is set; otherwise runs sync against the active library.
 */
export default defineEventHandler(async (event) => {
  requireMediaAdmin(event);
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id required' });
  }
  const body = await readBody<MaterializeRequestBody>(event);
  const role = body?.role?.trim() || undefined;
  const request = resolveMaterializeRequest(body);
  if (request == null) {
    throw createError({ statusCode: 400, statusMessage: 'variant or recipe is required' });
  }
  const { recipe, options } = request;

  try {
    return await materializeOrEnqueue(getMediaLibrary(), id, role, recipe, options);
  } catch (err) {
    const mapped = mediaErrorToHttp(err);
    if (mapped) {
      throw createError(mapped);
    }
    throw err;
  }
});
