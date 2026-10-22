/**
 * Public stand-in for `@tgmc/media-aws`.
 *
 * The real package (AWS adapters for `@tgmc/media`) is not published in this mirror. This file
 * keeps the exports `@tgmc/media-nuxt` imports so the site builds and runs on its local backends
 * (SQLite + filesystem). Every AWS entry point throws {@link MediaAwsUnavailableError}.
 *
 * Owned by `sync/stand-ins/media-aws/`; `sync/sync.sh` replaces the source package with it.
 *
 * @packageDocumentation
 */

/** Thrown by every AWS entry point of the stand-in. */
export class MediaAwsUnavailableError extends Error {
  constructor(feature: string) {
    super(`${feature} is not available in the public mirror (@tgmc/media-aws is a stand-in).`);
    this.name = 'MediaAwsUnavailableError';
  }
}

function unavailable(feature: string): never {
  throw new MediaAwsUnavailableError(feature);
}

/** Endpoint overrides; the stand-in never reads AWS settings, so this is always empty. */
export type MediaAwsEndpoints = {
  dynamoEndpoint?: string;
  s3Endpoint?: string;
  s3ForcePathStyle?: boolean;
  s3PublicEndpoint?: string;
};

export function mediaAwsEndpointsFromEnv(_env: NodeJS.ProcessEnv = process.env): MediaAwsEndpoints {
  return {};
}

// Local presign mode (`@tgmc/media-nuxt` media-local-s3) signs these headers, so they stay real.
export const PRESIGN_REQUIRED_HEADERS = [
  'Content-Type',
  'If-None-Match',
  'Cache-Control',
  'Content-Disposition',
] as const;

export const PRESIGN_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/** `inline; filename="<name>.<ext>"` for an object key. */
export function presignContentDisposition(key: string): string {
  return `inline; filename="${key.slice(key.lastIndexOf('/') + 1)}"`;
}

export type PresignIngestInput = {
  path: string;
  assetId: string;
  mime: string;
  expiresInSeconds?: number;
  bucket: string;
  region?: string;
  endpoint?: string;
  publicEndpoint?: string;
  forcePathStyle?: boolean;
};

export type PresignIngestResult = {
  assetId: string;
  path: string;
  s3Key: string;
  uploadUrl: string;
  headers: Record<(typeof PRESIGN_REQUIRED_HEADERS)[number], string>;
  expiresInSeconds: number;
};

export async function createPresignedIngest(_input: PresignIngestInput): Promise<PresignIngestResult> {
  return unavailable('createPresignedIngest');
}

export type S3BlobStoreOptions = {
  bucket: string;
  region?: string;
  endpoint?: string;
  forcePathStyle?: boolean;
};

export class S3BlobStore {
  constructor(_options: S3BlobStoreOptions) {
    unavailable('S3BlobStore');
  }

  async head(_key: string): Promise<{ contentLength: number; contentType?: string; eTag?: string }> {
    return unavailable('S3BlobStore.head');
  }

  async digestSha256(_key: string): Promise<string> {
    return unavailable('S3BlobStore.digestSha256');
  }
}

export type CreateAwsMediaLibraryOptions = Record<string, unknown>;

// Typed loosely: the real return type is `@tgmc/media`'s MediaLibraryHandle, which callers assert.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAwsMediaLibrary(_options: CreateAwsMediaLibraryOptions): any {
  return unavailable('createAwsMediaLibrary');
}

export type EnqueueMaterializeMessage = { jobId: string };

export async function enqueueMaterializeJob(_queueUrl: string, _message: EnqueueMaterializeMessage): Promise<void> {
  return unavailable('enqueueMaterializeJob');
}
