import { MediaNotFoundError } from '@tgmc/media';
import { createError, defineEventHandler, getRouterParam } from 'h3';

import { withMediaAssetUrls } from '../../../utils/media-asset-urls';
import { getMediaLibrary, requireMediaAdmin } from '../../../utils/media-library';

/**
 * GET /api/media/assets/:id — `asset` carries `publicUrl` / `previewUrl` (`media-asset-urls.ts`).
 */
export default defineEventHandler(async (event) => {
  requireMediaAdmin(event);
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id required' });
  }
  const library = getMediaLibrary();
  try {
    const asset = await library.getAsset(id);
    const children = await library.listChildren(id);
    return { asset: withMediaAssetUrls(asset, children), children };
  } catch (err) {
    if (err instanceof MediaNotFoundError) {
      throw createError({ statusCode: 404, statusMessage: err.message });
    }
    throw err;
  }
});
