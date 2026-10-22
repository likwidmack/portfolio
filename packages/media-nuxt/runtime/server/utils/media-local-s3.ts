import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import {
  PRESIGN_CACHE_CONTROL,
  PRESIGN_REQUIRED_HEADERS,
  presignContentDisposition,
  type PresignIngestResult,
} from '@tgmc/media-aws';

/**
 * Local presign mode: the filesystem stand-in for an S3 presigned PUT, used when the data backend
 * is not `dynamodb`. The URL carries `expires` and an HMAC-SHA256 `sig` over the method, key,
 * expiry, the upload byte cap and every `PRESIGN_REQUIRED_HEADERS` value, so the uploader must send
 * exactly the headers AWS would require (a different Content-Type or a missing `If-None-Match`
 * fails the signature, as on S3).
 */
export const LOCAL_S3_ROUTE = '/api/media/_local-s3';

/** Same lifetime as `createPresignedIngest`. */
export const LOCAL_PRESIGN_TTL_SECONDS = 900;

const DEFAULT_LOCAL_UPLOAD_MAX_BYTES = 100 * 1024 * 1024;

let processSecret: Buffer | null = null;

/** `MEDIA_LOCAL_SIGNING_SECRET`, else a random secret for this process (URLs die on restart). */
function signingSecret(): Buffer {
  const configured = process.env.MEDIA_LOCAL_SIGNING_SECRET?.trim();
  if (configured) {
    return Buffer.from(configured, 'utf8');
  }
  processSecret ??= randomBytes(32);
  return processSecret;
}

/** Upload cap for local presigned PUTs: `MEDIA_LOCAL_UPLOAD_MAX_BYTES`, default 100 MiB. */
export function localUploadMaxBytes(): number {
  const configured = Number(process.env.MEDIA_LOCAL_UPLOAD_MAX_BYTES?.trim());
  return Number.isSafeInteger(configured) && configured > 0 ? configured : DEFAULT_LOCAL_UPLOAD_MAX_BYTES;
}

function sign(input: {
  key: string;
  expires: number;
  maxBytes: number;
  header: (name: string) => string | undefined;
}): Buffer {
  const canonical = [
    'PUT',
    input.key,
    String(input.expires),
    String(input.maxBytes),
    ...PRESIGN_REQUIRED_HEADERS.map((name) => input.header(name) ?? ''),
  ].join('\n');
  return createHmac('sha256', signingSecret()).update(canonical).digest();
}

export type LocalPresignResult = Omit<PresignIngestResult, 's3Key'>;

/** Local equivalent of `createPresignedIngest`: an absolute PUT URL on `origin` plus the headers to send. */
export function createLocalPresignedIngest(input: {
  path: string;
  assetId: string;
  mime: string;
  /** Request origin (`http://localhost:3000`); the URL must be absolute for non-browser uploaders. */
  origin: string;
  /** Clock override for tests (epoch ms). */
  now?: number;
}): LocalPresignResult {
  const headers: LocalPresignResult['headers'] = {
    'Content-Type': input.mime,
    'If-None-Match': '*',
    'Cache-Control': PRESIGN_CACHE_CONTROL,
    'Content-Disposition': presignContentDisposition(input.path),
  };
  const byName = new Map(Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]));
  const expires = Math.floor((input.now ?? Date.now()) / 1000) + LOCAL_PRESIGN_TTL_SECONDS;
  const sig = sign({
    key: input.path,
    expires,
    maxBytes: localUploadMaxBytes(),
    header: (name) => byName.get(name.toLowerCase()),
  }).toString('hex');
  const uploadUrl = `${input.origin.replace(/\/+$/, '')}${LOCAL_S3_ROUTE}/${input.path}?expires=${expires}&sig=${sig}`;
  return { assetId: input.assetId, path: input.path, uploadUrl, headers };
}

export type LocalPutCheck = { ok: true } | { ok: false; reason: string };

/** Check a local presigned PUT (signature first, timing-safe; then expiry). Never throws. */
export function verifyLocalPut(input: {
  key: string;
  expires: unknown;
  sig: unknown;
  header: (name: string) => string | undefined;
  /** Clock override for tests (epoch ms). */
  now?: number;
}): LocalPutCheck {
  const expires = typeof input.expires === 'string' && /^\d+$/.test(input.expires) ? Number(input.expires) : NaN;
  if (!Number.isSafeInteger(expires)) {
    return { ok: false, reason: 'AccessDenied: missing or invalid expires' };
  }
  if (typeof input.sig !== 'string' || !/^[0-9a-f]{64}$/.test(input.sig)) {
    return { ok: false, reason: 'AccessDenied: missing or invalid sig' };
  }
  const expected = sign({ key: input.key, expires, maxBytes: localUploadMaxBytes(), header: input.header });
  if (!timingSafeEqual(expected, Buffer.from(input.sig, 'hex'))) {
    return {
      ok: false,
      reason: `SignatureDoesNotMatch: the signature does not match the key, expiry and headers (${PRESIGN_REQUIRED_HEADERS.join(', ')})`,
    };
  }
  if (expires * 1000 < (input.now ?? Date.now())) {
    return { ok: false, reason: 'AccessDenied: Request has expired' };
  }
  return { ok: true };
}
