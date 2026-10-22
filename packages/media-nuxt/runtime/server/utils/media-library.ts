import { createError, getHeader, type H3Event } from 'h3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  createMediaLibrary,
  FsBlobStore,
  type MaterializeOptions,
  type MediaAsset,
  type MediaLibrary,
  type MediaLibraryHandle,
  type MediaVariantCode,
} from '@tgmc/media';
import {
  createAwsMediaLibrary,
  enqueueMaterializeJob,
  mediaAwsEndpointsFromEnv,
  type PresignIngestInput,
  type S3BlobStoreOptions,
} from '@tgmc/media-aws';
import { resolveDataBackend, type DataBackend } from '@tgmc/utilities';
import { requireAdminToken } from '@tgmc/web-layer-admin/server/utils/admin-auth';

let cached: MediaLibraryHandle | null = null;
let warnedPostgresMedia = false;

/**
 * Fail-closed admin gate for media APIs.
 * Prefer host `runtimeConfig.adminToken` (same as web-layer-admin handlers);
 * `resolveAdminToken` still falls back to NUXT_ADMIN_TOKEN / ADMIN_TOKEN.
 */
export function requireMediaAdmin(event: H3Event): void {
  // Nuxt auto-imports `useRuntimeConfig` in app/server context; vitest may omit it.
  const runtimeConfig =
    typeof useRuntimeConfig === 'function' ? (useRuntimeConfig(event) as { adminToken?: string }) : undefined;
  requireAdminToken(event, runtimeToken(runtimeConfig));
}

function runtimeToken(config: { adminToken?: string } | undefined): string | undefined {
  return config?.adminToken;
}

function firstNonEmptyEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }
  return undefined;
}

function awsConfigured(): boolean {
  return Boolean(
    firstNonEmptyEnv('NUXT_MEDIA_TABLE', 'MEDIA_TABLE') && firstNonEmptyEnv('NUXT_ASSETS_BUCKET', 'ASSETS_BUCKET')
  );
}

function mediaAwsRegion(): string | undefined {
  return firstNonEmptyEnv('NUXT_AWS_REGION', 'AWS_REGION');
}

/**
 * Options for `new S3BlobStore` in route handlers: the bucket plus the S3 endpoint overrides
 * (`MEDIA_S3_ENDPOINT` / `AWS_ENDPOINT_URL_S3`, `MEDIA_S3_FORCE_PATH_STYLE`).
 */
export function mediaS3Options(): S3BlobStoreOptions {
  const { s3Endpoint, s3ForcePathStyle } = mediaAwsEndpointsFromEnv();
  return {
    bucket: mediaAssetsBucket(),
    region: mediaAwsRegion(),
    endpoint: s3Endpoint,
    forcePathStyle: s3ForcePathStyle,
  };
}

/**
 * Options for `createPresignedIngest`: as {@link mediaS3Options}, plus `MEDIA_S3_PUBLIC_ENDPOINT`, the
 * host the browser or smoke test reaches (URLs are signed against it, not the internal endpoint).
 */
export function mediaPresignOptions(): Pick<
  PresignIngestInput,
  'bucket' | 'region' | 'endpoint' | 'forcePathStyle' | 'publicEndpoint'
> {
  return { ...mediaS3Options(), publicEndpoint: mediaAwsEndpointsFromEnv().s3PublicEndpoint };
}

/** `MEDIA_LOCAL_ROOT`, default `<cwd>/.data/media`: holds `media.sqlite` and the `blobs/` tree. */
function mediaLocalRoot(): string {
  return firstNonEmptyEnv('MEDIA_LOCAL_ROOT') ?? join(process.cwd(), '.data', 'media');
}

/** Root of the local blob tree; `<dir>/m/pf/i/hero.png` is served at `/m/pf/i/hero.png`. */
export function mediaLocalBlobDir(): string {
  return join(mediaLocalRoot(), 'blobs');
}

/** The filesystem blob store behind the local library, the `_local-s3` PUT route and `/m/**`. */
export function getLocalBlobStore(): FsBlobStore {
  return new FsBlobStore(mediaLocalBlobDir());
}

function createLocalMediaLibrary(): MediaLibraryHandle {
  const blobDir = mediaLocalBlobDir();
  mkdirSync(blobDir, { recursive: true });
  return createMediaLibrary({ dbPath: join(mediaLocalRoot(), 'media.sqlite'), blobDir });
}

function createDynamoMediaLibrary(backend: DataBackend): MediaLibraryHandle {
  const tableName = firstNonEmptyEnv('NUXT_MEDIA_TABLE', 'MEDIA_TABLE');
  const bucket = firstNonEmptyEnv('NUXT_ASSETS_BUCKET', 'ASSETS_BUCKET');
  if (!tableName || !bucket) {
    const scope =
      backend === 'dynamodb'
        ? 'DATA_BACKEND=dynamodb requires'
        : `On Lambda the media library is DynamoDB + S3 (resolved DATA_BACKEND=${backend}); it requires`;
    throw new Error(`${scope} MEDIA_TABLE and ASSETS_BUCKET (or NUXT_MEDIA_TABLE and NUXT_ASSETS_BUCKET)`);
  }
  const endpoints = mediaAwsEndpointsFromEnv();
  return createAwsMediaLibrary({
    tableName,
    bucket,
    region: mediaAwsRegion(),
    dynamoEndpoint: endpoints.dynamoEndpoint,
    s3Endpoint: endpoints.s3Endpoint,
    s3ForcePathStyle: endpoints.s3ForcePathStyle,
    cloudFrontDistributionId: firstNonEmptyEnv('NUXT_ASSETS_DISTRIBUTION_ID', 'ASSETS_DISTRIBUTION_ID'),
  });
}

/**
 * Resolve the MediaLibrary from the data backend (`DATA_BACKEND`, else the `SYS_ENV` default):
 * - `dynamodb`: DynamoDB + S3 (MinIO in Docker). Needs `MEDIA_TABLE` and `ASSETS_BUCKET`.
 * - `sqlite`: local SQLite + filesystem blobs.
 * - `postgres`: no Postgres media adapter yet, so it falls back to `sqlite` with a one-time warning.
 * On Lambda it is always DynamoDB + S3 ({@link isLocalMediaBackend} is false there), whatever resolves.
 */
export function getMediaLibrary(): MediaLibrary {
  if (cached) {
    return cached.library;
  }
  const backend = resolveDataBackend();
  if (!isLocalMediaBackend()) {
    cached = createDynamoMediaLibrary(backend);
    return cached.library;
  }
  if (backend === 'postgres' && !warnedPostgresMedia) {
    warnedPostgresMedia = true;
    console.warn(
      'DATA_BACKEND=postgres has no media adapter yet; the media library falls back to local SQLite + filesystem.'
    );
  }
  cached = createLocalMediaLibrary();
  return cached.library;
}

/** Test helper to clear singleton. */
export function resetMediaLibraryCache(): void {
  if (cached) {
    cached.close();
    cached = null;
  }
}

export function mediaQueueUrl(): string {
  return firstNonEmptyEnv('NUXT_MEDIA_QUEUE_URL', 'MEDIA_QUEUE_URL') ?? '';
}

export function mediaAssetsBucket(): string {
  return firstNonEmptyEnv('NUXT_ASSETS_BUCKET', 'ASSETS_BUCKET') ?? '';
}

/**
 * True when media lives on the local filesystem (`sqlite`, and `postgres` until it has a media adapter).
 * Local presign, the `_local-s3` PUT route and the `/m/**` CDN stand-in exist only then; on `dynamodb`
 * they are 404 (presign / complete 503). Always false on Lambda (`AWS_LAMBDA_FUNCTION_NAME` set),
 * whatever backend resolves, so a misconfigured `DATA_BACKEND` can never open them there.
 */
export function isLocalMediaBackend(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.AWS_LAMBDA_FUNCTION_NAME?.trim()) {
    return false;
  }
  const backend = resolveDataBackend(env);
  switch (backend) {
    case 'dynamodb':
      return false;
    case 'sqlite':
    case 'postgres':
      return true;
    default: {
      const unreachable: never = backend;
      throw new Error(`Unsupported data backend: ${String(unreachable)}`);
    }
  }
}

/** `aws`: presigned S3/MinIO PUT. `local`: signed PUT to `/api/media/_local-s3/<key>` into `FsBlobStore`. */
export type MediaIngestMode = 'aws' | 'local';

/**
 * Upload mode of the presign / complete routes, from the resolved data backend (the same one
 * `getMediaLibrary` uses, so catalog and blobs always sit together). `dynamodb` without
 * `MEDIA_TABLE` + `ASSETS_BUCKET` is a 503.
 */
export function resolveMediaIngestMode(): MediaIngestMode {
  if (isLocalMediaBackend()) {
    return 'local';
  }
  assertMediaAwsMode('Presigned ingest');
  return 'aws';
}

/**
 * Guard for AWS-only work (presigned S3 ingest, async materialize through SQS): 503 unless media is
 * on AWS — the same rule as {@link getMediaLibrary}: `dynamodb`, or any backend on Lambda — with
 * `MEDIA_TABLE` + `ASSETS_BUCKET`. Docker sets the table and bucket on every stack, so the backend
 * is checked too; the message names the resolved backend.
 */
export function assertMediaAwsMode(feature: string): void {
  if (!isLocalMediaBackend() && awsConfigured()) {
    return;
  }
  const backend = resolveDataBackend();
  const requirement = process.env.AWS_LAMBDA_FUNCTION_NAME?.trim()
    ? 'on Lambda requires MEDIA_TABLE and ASSETS_BUCKET'
    : 'requires DATA_BACKEND=dynamodb with MEDIA_TABLE and ASSETS_BUCKET';
  throw createError({
    statusCode: 503,
    statusMessage: `${feature} ${requirement} (resolved: ${backend})`,
  });
}

export function getAuthorizationHeader(event: H3Event): string | undefined {
  return getHeader(event, 'authorization');
}

/** Catalog variant materialized when a request names neither a variant nor a recipe. */
export const DEFAULT_THUMB_VARIANT: MediaVariantCode = 't';

export type MaterializeRequestBody = {
  role?: string;
  recipe?: unknown;
  variant?: string;
  format?: string;
  useDefaultThumb?: boolean;
};

/**
 * Resolve what to materialize from a request body.
 * - `variant` (+ optional `format`): a catalog variant (`t`, `640`, `1280`, `1920`).
 * - `recipe`: a custom recipe (the library maps an exact catalog recipe back to its variant).
 * - neither: the `t` thumbnail, unless `useDefaultThumb` is explicitly `false` (then `null`).
 * `variant` and `recipe` together are rejected by the library.
 */
export function resolveMaterializeRequest(
  body: MaterializeRequestBody | null | undefined
): { recipe: unknown; options: MaterializeOptions } | null {
  if (body?.variant != null || body?.format != null) {
    return {
      recipe: body.recipe ?? null,
      options: { variant: body.variant as MediaVariantCode, format: body.format as MaterializeOptions['format'] },
    };
  }
  if (body?.recipe != null) {
    return { recipe: body.recipe, options: {} };
  }
  if (body?.useDefaultThumb === false) {
    return null;
  }
  return { recipe: null, options: { variant: DEFAULT_THUMB_VARIANT } };
}

export type MaterializeDispatch = Awaited<ReturnType<MediaLibrary['materializeChild']>> & {
  mode: 'sync' | 'async';
};

/**
 * Materialize in the request, or queue the job for the worker when `MEDIA_QUEUE_URL` is set. Queuing
 * requires the AWS catalog the worker reads (a local SQLite job id never reaches SQS); a rejected
 * dispatch marks the job failed and rethrows.
 */
export async function materializeOrEnqueue(
  library: MediaLibrary,
  assetId: string,
  role: string | undefined,
  recipe: unknown,
  options: MaterializeOptions
): Promise<MaterializeDispatch> {
  const queueUrl = mediaQueueUrl();
  if (!queueUrl) {
    return { ...(await library.materializeChild(assetId, role, recipe, options)), mode: 'sync' };
  }
  assertMediaAwsMode('Async materialize (MEDIA_QUEUE_URL is set)');
  const result = await library.enqueueMaterializeChild(assetId, role, recipe, options);
  try {
    await enqueueMaterializeJob(queueUrl, { jobId: result.job.id });
  } catch (dispatchErr) {
    const reason = dispatchErr instanceof Error ? dispatchErr.message : String(dispatchErr);
    await library.failMaterializeDispatch(result.job.id, `SQS dispatch failed: ${reason}`);
    throw dispatchErr;
  }
  return { ...result, mode: 'async' };
}

/**
 * The `t` thumbnail (catalog 320w webp) every uploaded image gets, so tiles preview a small file.
 * Images only (catalog variants are raster; SVG previews as itself). Skipped when a `t` child is
 * pending or ready; a failed one is retried. Never throws: the upload already succeeded, so a
 * transform or dispatch error is logged and the tile previews the original.
 */
export async function ensureDefaultThumbnail(
  library: MediaLibrary,
  asset: Pick<MediaAsset, 'id' | 'kind' | 'path'>
): Promise<void> {
  if (asset.kind !== 'image') {
    return;
  }
  try {
    const children = await library.listChildren(asset.id);
    if (children.some((child) => child.variant === DEFAULT_THUMB_VARIANT && child.status !== 'failed')) {
      return;
    }
    const { job } = await materializeOrEnqueue(library, asset.id, DEFAULT_THUMB_VARIANT, null, {
      variant: DEFAULT_THUMB_VARIANT,
    });
    // A terminal transform failure resolves with a failed job instead of rejecting.
    if (job.status === 'failed') {
      throw new Error(job.lastError ?? 'materialize failed');
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(`[media] default thumbnail for ${asset.path} failed: ${reason}`);
  }
}
