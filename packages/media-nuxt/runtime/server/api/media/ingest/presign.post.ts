import { isMediaKind, isMediaTenant, mediaErrorToHttp } from '@tgmc/media';
import { createPresignedIngest } from '@tgmc/media-aws';
import { getRequestHost, getRequestProtocol } from 'h3';

import {
  getMediaLibrary,
  mediaPresignOptions,
  requireMediaAdmin,
  resolveMediaIngestMode,
} from '../../../utils/media-library';
import { createLocalPresignedIngest } from '../../../utils/media-local-s3';

/**
 * POST /api/media/ingest/presign
 * Body: { kind, mime, filename, tenant? }
 *
 * Normalizes `filename` into a short kebab-case name, reserves `m/{tenant}/{kind}/{name}.{ext}` for
 * a new asset id (30 min hold), and returns a presigned PUT for that key. A taken name returns 409
 * with `data: { code: 'name_conflict', suggestedName, suggestedFilename, suggestedPath }`; an extension
 * that contradicts `mime` is a 400.
 *
 * On `dynamodb` the PUT goes to S3/MinIO; on the filesystem backends it is a signed PUT to
 * `/api/media/_local-s3/<key>` on this origin. Same response shape and headers in both modes.
 */
export default defineEventHandler(async (event) => {
  requireMediaAdmin(event);
  const mode = resolveMediaIngestMode();
  const body = await readBody<{ kind?: string; mime?: string; filename?: string; tenant?: string }>(event);
  const kind = body?.kind;
  const mime = body?.mime;
  const filename = body?.filename;
  if (!isMediaKind(kind)) {
    throw createError({ statusCode: 400, statusMessage: 'kind must be image|svg|audio|video|model|document' });
  }
  if (!mime || typeof mime !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'mime is required' });
  }
  if (!filename || typeof filename !== 'string' || !filename.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'filename is required' });
  }
  if (body?.tenant != null && !isMediaTenant(body.tenant)) {
    throw createError({ statusCode: 400, statusMessage: 'tenant must be portfolio|hyperactivity' });
  }

  const library = getMediaLibrary();
  try {
    const reserved = await library.reserveName({ kind, filename, mime, tenant: body.tenant });
    const target = { path: reserved.path, assetId: reserved.assetId, mime };
    const presign =
      mode === 'aws'
        ? await createPresignedIngest({ ...target, ...mediaPresignOptions() })
        : createLocalPresignedIngest({
            ...target,
            origin: `${getRequestProtocol(event, { xForwardedProto: true })}://${getRequestHost(event, { xForwardedHost: true })}`,
          });
    return {
      assetId: presign.assetId,
      path: presign.path,
      name: reserved.name,
      expiresAt: reserved.expiresAt,
      uploadUrl: presign.uploadUrl,
      headers: presign.headers,
    };
  } catch (err) {
    const mapped = mediaErrorToHttp(err);
    if (mapped) {
      throw createError(mapped);
    }
    throw err;
  }
});
