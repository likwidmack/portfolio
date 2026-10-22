import { MediaConflictError, MediaNotFoundError } from '@tgmc/media';

import { getMediaLibrary, requireMediaAdmin } from '../../../utils/media-library';

/**
 * DELETE /api/media/assets/:id — hard cascade (+ CloudFront when AWS hooks configured)
 */
export default defineEventHandler(async (event) => {
  requireMediaAdmin(event);
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id required' });
  }
  const library = getMediaLibrary();
  try {
    await library.deleteAsset(id);
    return { deleted: id };
  } catch (err) {
    if (err instanceof MediaNotFoundError) {
      throw createError({ statusCode: 404, statusMessage: err.message });
    }
    if (err instanceof MediaConflictError) {
      throw createError({ statusCode: 409, statusMessage: err.message });
    }
    throw err;
  }
});
