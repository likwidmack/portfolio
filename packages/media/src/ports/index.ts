import type { MediaKind, TransformRecipe } from '../types.js';

/** Optional object metadata, set by stores that have it (S3); the filesystem store may ignore it. */
export type BlobPutOptions = {
  contentType?: string;
  cacheControl?: string;
  contentDisposition?: string;
  /**
   * Never replace an existing object: throw `MediaBlobExistsError` instead (S3 `If-None-Match: *`).
   * The filesystem store is always create-only for originals; this extends it to variants.
   */
  createOnly?: boolean;
};

export type BlobStore = {
  put(key: string, data: Buffer | Uint8Array, options?: BlobPutOptions): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  /** Optional cheap size probe (avoid loading full bytes for oversized objects). */
  stat?(key: string): Promise<{ byteSize: number } | null>;
  /** Optional streamed SHA-256 of the stored bytes (re-read from storage); throws `MediaNotFoundError` when absent. */
  digestSha256?(key: string): Promise<string>;
};

export type CatalogStore = {
  /**
   * Insert an asset and claim its name (tenant, kind, name; any extension) in one atomic step.
   * Throws `MediaNameConflictError` when another asset (or someone else's live reservation) holds
   * the name, and `MediaConflictError` when the id already exists. The asset's own pending
   * reservation is consumed.
   */
  insertAsset(asset: import('../types.js').MediaAsset): Promise<void>;
  /** Current holder of a name (registered asset or live reservation); expired reservations read as free. */
  getNameHolder(ref: import('../paths.js').MediaNameRef): Promise<import('../types.js').NameHolder | null>;
  /**
   * Reserve a name for an asset id until `expiresAt` (presigned upload window); `path` is the
   * original key it will be stored at. Returns false when another asset or live reservation holds
   * the name. Re-reserving for the same asset id extends the hold.
   */
  holdName(
    ref: import('../paths.js').MediaNameRef,
    input: { assetId: string; path: string; expiresAt: string }
  ): Promise<boolean>;
  /** Drop a pending reservation held by `assetId` (no-op otherwise). */
  releaseName(ref: import('../paths.js').MediaNameRef, assetId: string): Promise<void>;
  updateAssetMeta(id: string, meta: Record<string, unknown>, updatedAt: string): Promise<void>;
  getAsset(id: string): Promise<import('../types.js').MediaAsset | null>;
  listAssets(filter?: import('../types.js').ListAssetsFilter): Promise<import('../types.js').MediaAsset[]>;
  /** Delete an asset row and free its name. */
  deleteAsset(id: string): Promise<void>;
  /**
   * Atomically remove an asset (freeing its name) and all of its children so concurrent
   * `insertChild*IfAssetExists` cannot attach new rows to a live parent.
   * Implementations that share a DB with jobs should delete those jobs here too.
   */
  deleteAssetCascade(assetId: string): Promise<void>;
  insertChild(child: import('../types.js').MediaChild): Promise<void>;
  /**
   * Insert a child only if its parent asset still exists. Returns false when the
   * asset is gone so callers can map the race to not-found.
   */
  insertChildIfAssetExists(child: import('../types.js').MediaChild): Promise<boolean>;
  /**
   * Atomically insert a pending child and its queued job only if the parent
   * asset still exists. Returns false when the asset is gone.
   */
  insertChildAndJobIfAssetExists?(
    child: import('../types.js').MediaChild,
    job: import('../types.js').JobRecord
  ): Promise<boolean>;
  updateChild(child: import('../types.js').MediaChild): Promise<void>;
  getChild(id: string): Promise<import('../types.js').MediaChild | null>;
  listChildren(assetId: string): Promise<import('../types.js').MediaChild[]>;
  deleteChild(assetId: string, childId: string): Promise<void>;
  deleteChildrenForAsset(assetId: string): Promise<void>;
  /**
   * Update a child only if its parent asset still exists. Returns false when the
   * asset is gone (avoids resurrecting catalog rows after delete).
   */
  updateChildIfAssetExists(child: import('../types.js').MediaChild): Promise<boolean>;
  /**
   * Atomically finalize a running job and update its child only if the worker
   * still owns the lease and the parent asset still exists.
   */
  finalizeRunningJobAndUpdateChildIfAssetExists?(
    jobId: string,
    expectedStartedAt: string,
    nextJob: import('../types.js').JobRecord,
    child: import('../types.js').MediaChild
  ): Promise<'updated' | 'lost-lease' | 'asset-missing'>;
};

export type JobStore = {
  insertJob(job: import('../types.js').JobRecord): Promise<void>;
  updateJob(job: import('../types.js').JobRecord): Promise<void>;
  /**
   * Atomically claim a queued job (queued → running). Returns false if the row
   * was not still `queued` (concurrent worker, terminal, or missing).
   */
  claimQueuedJob(jobId: string, claimed: import('../types.js').JobRecord): Promise<boolean>;
  /**
   * Atomically reclaim a stale running job (running → running with new lease).
   * Conditioned on previous `startedAt` so two workers cannot both reclaim.
   */
  claimStaleRunningJob(
    jobId: string,
    previousStartedAt: string,
    claimed: import('../types.js').JobRecord
  ): Promise<boolean>;
  /**
   * Atomically finalize a running job only if `startedAt` still matches this worker's claim.
   * Returns false when another worker reclaimed or the job left `running`.
   */
  finalizeRunningJob(jobId: string, expectedStartedAt: string, next: import('../types.js').JobRecord): Promise<boolean>;
  /**
   * Atomically mark a queued job failed. Returns false if the row was not still `queued`.
   */
  failQueuedJob(jobId: string, failed: import('../types.js').JobRecord): Promise<boolean>;
  deleteJob(jobId: string): Promise<void>;
  getJob(id: string): Promise<import('../types.js').JobRecord | null>;
  listJobs(filter?: {
    assetId?: string;
    status?: import('../types.js').JobStatus;
  }): Promise<import('../types.js').JobRecord[]>;
  deleteJobsForAsset(assetId: string): Promise<void>;
};

export type AuditStore = {
  append(event: import('../types.js').AuditEvent): Promise<void>;
  listByEntity(entityId: string): Promise<import('../types.js').AuditEvent[]>;
};

export type MediaTransformer = {
  supports(kind: MediaKind): boolean;
  materialize(input: {
    kind: MediaKind;
    source: Buffer;
    recipe: TransformRecipe;
  }): Promise<import('../types.js').TransformerOutput>;
};
