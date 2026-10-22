/**
 * Shared domain types for `@tgmc/media`.
 */

import type { ImageFormat, TransformOp } from '@tgmc/image';

import type { MediaKind } from './kinds.js';
import type { MediaChildVariant, MediaTenant } from './paths.js';

export { defaultMimeForKind, guessMediaKind, isMediaKind, MEDIA_KINDS } from './kinds.js';
export type { MediaKind } from './kinds.js';

export type ChildStatus = 'pending' | 'ready' | 'failed';

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export type JobType = 'materialize';

export type ImageTransformRecipe = {
  kind: 'image';
  ops: TransformOp[];
  format?: ImageFormat;
  quality?: number;
};

export type SvgTransformRecipe = {
  kind: 'svg';
  /** Reserved for a future vector pipeline (optimize / rasterize). */
  ops?: Record<string, unknown>;
};

export type AudioTransformRecipe = {
  kind: 'audio';
  /** Reserved for a future audio pipeline. */
  ops?: Record<string, unknown>;
};

export type VideoTransformRecipe = {
  kind: 'video';
  /** Reserved for a future video pipeline. */
  ops?: Record<string, unknown>;
};

export type ModelTransformRecipe = {
  kind: 'model';
  /** Reserved for 3D / XR poster / LOD pipelines. */
  ops?: Record<string, unknown>;
};

export type DocumentTransformRecipe = {
  kind: 'document';
  /** Reserved for thumbnail / text-extract pipelines. */
  ops?: Record<string, unknown>;
};

export type TransformRecipe =
  | ImageTransformRecipe
  | SvgTransformRecipe
  | AudioTransformRecipe
  | VideoTransformRecipe
  | ModelTransformRecipe
  | DocumentTransformRecipe;

export type MediaAsset = {
  id: string;
  /** Tenant owning the key namespace (`m/{tenantCode}/...`). */
  tenant: MediaTenant;
  kind: MediaKind;
  mime: string;
  sha256: string;
  byteSize: number;
  /** Normalized filename without extension; unique per tenant and kind, whatever the extension. */
  name: string;
  /** Storage key of the original (`m/pf/i/manhattan-keyframe.png`; no leading slash). */
  path: string;
  meta: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type MediaChild = {
  id: string;
  assetId: string;
  /** Human label. Catalog children default it to the variant code. */
  role: string;
  /** Catalog variant code, or `custom` (keyed `@c-{8 hex of id}`). */
  variant: MediaChildVariant;
  recipe: TransformRecipe;
  status: ChildStatus;
  /** Storage key of the processed object once ready. */
  path: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type JobRecord = {
  id: string;
  type: JobType;
  assetId: string;
  childId: string;
  status: JobStatus;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export type AuditEvent = {
  id: string;
  occurredAt: string;
  action: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  correlationId: string | null;
};

export type IngestInput = {
  kind: MediaKind;
  /** Absolute path or in-memory bytes. */
  data: string | Buffer | Uint8Array;
  mime?: string;
  meta?: Record<string, unknown>;
  /**
   * Original filename (normalized into the key). Defaults to the basename of `data` when it is a
   * path, else `{kind}-{sha8}` plus the extension for `mime`.
   */
  filename?: string;
  /** Defaults to `portfolio`. */
  tenant?: MediaTenant;
};

export type MaterializeResult = {
  child: MediaChild;
  job: JobRecord;
};

export type ListAssetsFilter = {
  /** Defaults to `portfolio`. */
  tenant?: MediaTenant;
  kind?: MediaKind;
  /** Match assets whose `meta.tags` contains this tag (normalized). */
  tag?: string;
  limit?: number;
  offset?: number;
};

/**
 * Who currently holds a media name (tenant, kind, name; any extension): a registered asset, or a
 * pending (expiring) reservation. `path` is the original key the holder claimed.
 */
export type NameHolder = {
  assetId: string;
  pending: boolean;
  path: string;
  /** ISO time a pending reservation lapses; absent for registered assets. */
  expiresAt?: string;
};

export type TransformerOutput = {
  buffer: Buffer;
  contentType: string;
  meta: Record<string, unknown>;
};
