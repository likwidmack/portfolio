import { mediaErrorToHttp, parseMediaKey } from '@tgmc/media';
import { createError, defineEventHandler, getHeader, getQuery, getRouterParam, setResponseHeader } from 'h3';

import { getLocalBlobStore, isLocalMediaBackend } from '../../../utils/media-library';
import { localUploadMaxBytes, verifyLocalPut } from '../../../utils/media-local-s3';

/**
 * PUT /api/media/_local-s3/<key>?expires=&sig=
 *
 * The filesystem stand-in for a presigned S3 PUT (see `createLocalPresignedIngest`). No Bearer token:
 * the signature is the credential, as on S3. Checks, in order: the key is a media original (400), the
 * signature over key, expiry, byte cap and the four presign headers (403), the expiry (403), the
 * declared size (413); then streams the body into `FsBlobStore` with the byte cap (413) as a
 * create-only write (412 when the original exists). Returns 200 with the object's `ETag`.
 *
 * Does not exist (404) when the data backend is `dynamodb` (uploads go to S3/MinIO there) or on Lambda.
 */
export default defineEventHandler(async (event) => {
  if (!isLocalMediaBackend()) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' });
  }
  const key = getRouterParam(event, 'key', { decode: true }) ?? '';
  const parsed = parseMediaKey(key);
  if (!parsed || parsed.variant !== null) {
    throw createError({ statusCode: 400, statusMessage: 'InvalidKey: expected a media original key' });
  }

  const header = (name: string) => getHeader(event, name);
  const { expires, sig } = getQuery(event);
  const check = verifyLocalPut({ key, expires, sig, header });
  if (!check.ok) {
    throw createError({ statusCode: 403, statusMessage: check.reason });
  }

  const maxBytes = localUploadMaxBytes();
  const declared = Number(header('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw createError({ statusCode: 413, statusMessage: `EntityTooLarge: the maximum upload is ${maxBytes} bytes` });
  }

  try {
    const meta = await getLocalBlobStore().putStream(key, event.node.req, {
      contentType: header('content-type'),
      cacheControl: header('cache-control'),
      contentDisposition: header('content-disposition'),
      maxBytes,
    });
    setResponseHeader(event, 'ETag', meta.etag);
    return '';
  } catch (err) {
    const mapped = mediaErrorToHttp(err);
    if (mapped) {
      throw createError(mapped);
    }
    throw err;
  }
});
