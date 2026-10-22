import { isMediaKind, mediaErrorToHttp } from '@tgmc/media';
import { S3BlobStore } from '@tgmc/media-aws';

import { withMediaAssetUrls } from '../../../utils/media-asset-urls';
import {
  ensureDefaultThumbnail,
  getLocalBlobStore,
  getMediaLibrary,
  mediaS3Options,
  requireMediaAdmin,
  resolveMediaIngestMode,
} from '../../../utils/media-library';

/** What `complete` reads back from the uploaded object; `S3BlobStore` and `FsBlobStore` both provide it. */
type UploadedObjectProbe = Pick<S3BlobStore, 'head' | 'digestSha256'>;

/**
 * POST /api/media/ingest/complete
 * Body: { assetId, path, kind, mime, sha256?, filename?, meta? }
 *
 * `path` must be the key reserved for `assetId` by `/api/media/ingest/presign`. An unreserved or
 * expired reservation is rejected, so a client cannot register an arbitrary object key.
 * sha256 is always computed from the stored object (streamed from S3, or re-read from the local
 * `FsBlobStore`); a supplied value is rejected on mismatch. A missing object is 404.
 * An image then gets its `t` thumbnail (`ensureDefaultThumbnail`: queued with `MEDIA_QUEUE_URL`,
 * else in this request); a thumbnail failure never fails the upload. The response is the asset
 * with `publicUrl` / `previewUrl`, like the list and detail.
 */
export default defineEventHandler(async (event) => {
  requireMediaAdmin(event);
  const mode = resolveMediaIngestMode();
  const body = await readBody<{
    assetId?: string;
    path?: string;
    kind?: string;
    mime?: string;
    sha256?: string;
    filename?: string;
    meta?: Record<string, unknown>;
  }>(event);

  const { assetId, path, kind, mime } = body ?? {};
  if (!assetId || !path || !mime) {
    throw createError({ statusCode: 400, statusMessage: 'assetId, path, and mime are required' });
  }
  if (!isMediaKind(kind)) {
    throw createError({ statusCode: 400, statusMessage: 'kind must be image|svg|audio|video|model|document' });
  }

  const library = getMediaLibrary();
  const holder = await library.getPathReservation(path);
  if (holder?.assetId !== assetId) {
    throw createError({
      statusCode: 400,
      statusMessage: holder
        ? 'path is reserved for a different asset'
        : 'path has no live reservation for this asset (request a new upload)',
    });
  }

  const meta: Record<string, unknown> = { ...(body.meta ?? {}) };
  if (body.filename && meta.filename == null) {
    meta.filename = body.filename;
  }

  try {
    const blobs: UploadedObjectProbe = mode === 'aws' ? new S3BlobStore(mediaS3Options()) : getLocalBlobStore();
    const head = await blobs.head(path);
    const sha256 = await blobs.digestSha256(path);
    if (body.sha256 && body.sha256 !== sha256) {
      throw createError({
        statusCode: 400,
        statusMessage: 'sha256 does not match uploaded object',
      });
    }
    const asset = await library.registerRemoteAsset({
      id: assetId,
      kind,
      mime: head.contentType ?? mime,
      sha256,
      byteSize: head.contentLength,
      path,
      meta: Object.keys(meta).length ? meta : undefined,
    });
    await ensureDefaultThumbnail(library, asset);
    const children = await library.listChildren(asset.id).catch(() => []);
    return withMediaAssetUrls(asset, children);
  } catch (err) {
    const mapped = mediaErrorToHttp(err);
    if (mapped) {
      throw createError(mapped);
    }
    throw err;
  }
});
