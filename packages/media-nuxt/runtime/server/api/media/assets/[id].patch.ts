import { MediaConflictError, MediaNotFoundError } from '@tgmc/media';

import { getMediaLibrary, requireMediaAdmin } from '../../../utils/media-library';

/**
 * PATCH /api/media/assets/:id — merge asset meta (tags replace when `tags` is sent).
 */
export default defineEventHandler(async (event) => {
  requireMediaAdmin(event);
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'asset id required' });
  }
  const body = (await readBody(event)) as { meta?: Record<string, unknown>; tags?: string[] } | null;
  const meta: Record<string, unknown> = { ...(body?.meta ?? {}) };
  if (body && 'tags' in body) {
    meta.tags = body.tags;
  }
  if (Object.keys(meta).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'meta or tags required' });
  }
  const library = getMediaLibrary();
  try {
    return await library.updateAssetMeta(id, meta);
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
