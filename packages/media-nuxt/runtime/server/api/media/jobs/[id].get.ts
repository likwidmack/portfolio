import { MediaNotFoundError } from '@tgmc/media';

import { getMediaLibrary, requireMediaAdmin } from '../../../utils/media-library';

/**
 * GET /api/media/jobs/:id
 */
export default defineEventHandler(async (event) => {
  requireMediaAdmin(event);
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id required' });
  }
  const library = getMediaLibrary();
  try {
    return await library.getJob(id);
  } catch (err) {
    if (err instanceof MediaNotFoundError) {
      throw createError({ statusCode: 404, statusMessage: err.message });
    }
    throw err;
  }
});
