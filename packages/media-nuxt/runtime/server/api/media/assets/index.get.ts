/**
 * GET /api/media/assets?kind=&tenant=&tag=&limit=&offset=
 * Rows carry `publicUrl` / `previewUrl` (`media-asset-urls.ts`).
 */
import { isMediaKind, isMediaTenant, type ListAssetsFilter, type MediaKind } from '@tgmc/media';
import { createError, defineEventHandler, getQuery } from 'h3';

import { withMediaAssetUrlsList } from '../../../utils/media-asset-urls';
import { getMediaLibrary, requireMediaAdmin } from '../../../utils/media-library';

const MAX_LIMIT = 100;
const KIND_HINT = 'image|svg|audio|video|model|document';

function parseLimit(value: unknown): number | undefined {
  if (value == null) {
    return undefined;
  }
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1) {
    throw createError({ statusCode: 400, statusMessage: 'limit must be a positive integer' });
  }
  return Math.min(limit, MAX_LIMIT);
}

function parseOffset(value: unknown): number | undefined {
  if (value == null) {
    return undefined;
  }
  const offset = Number(value);
  if (!Number.isInteger(offset) || offset < 0) {
    throw createError({ statusCode: 400, statusMessage: 'offset must be a non-negative integer' });
  }
  return offset;
}

export default defineEventHandler(async (event) => {
  requireMediaAdmin(event);
  const query = getQuery(event);
  const kind = typeof query.kind === 'string' ? query.kind : undefined;
  if (kind && !isMediaKind(kind)) {
    throw createError({ statusCode: 400, statusMessage: `kind must be ${KIND_HINT}` });
  }
  const tenant = typeof query.tenant === 'string' ? query.tenant : undefined;
  if (tenant && !isMediaTenant(tenant)) {
    throw createError({ statusCode: 400, statusMessage: 'tenant must be portfolio|hyperactivity' });
  }
  const tag = typeof query.tag === 'string' ? query.tag.trim() : undefined;
  const library = getMediaLibrary();
  const assets = await library.listAssets({
    kind: kind as MediaKind | undefined,
    tenant: tenant as ListAssetsFilter['tenant'],
    tag: tag || undefined,
    limit: parseLimit(query.limit),
    offset: parseOffset(query.offset),
  });
  return withMediaAssetUrlsList(library, assets);
});
