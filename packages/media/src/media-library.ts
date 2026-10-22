import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

import { MAX_BYTES, type ImageFormat } from '@tgmc/image';
import { sha256Hex } from '@tgmc/utilities';

import {
  MediaConflictError,
  MediaNameConflictError,
  MediaNotFoundError,
  RecipeValidationError,
  TransformerNotImplementedError,
} from './errors.js';
import { splitMediaFilename } from './filename.js';
import { defaultMimeForKind, extensionForMime, mimeForExtension } from './kinds.js';
import { assertMediaMeta, normalizeMediaFilename } from './meta-policy.js';
import { ASSET_META_KEYS, normalizeAssetMeta, normalizeTag, readTags, removeTags, withTags } from './meta.js';
import { assertExtensionMatchesMime, nameConflictWithSuggestion } from './name-rules.js';
import { objectHeaders } from './object-headers.js';
import {
  CUSTOM_VARIANT,
  DEFAULT_TENANT,
  customVariantSuffix,
  originalKey,
  parseMediaKey,
  variantKey,
  type MediaChildVariant,
  type MediaNameRef,
  type MediaTenant,
  type MediaVariantCode,
} from './paths.js';
import type { AuditStore, BlobStore, CatalogStore, JobStore } from './ports/index.js';
import { parseRecipe } from './recipe.js';
import type { TransformerRegistry } from './transformers/registry.js';
import type {
  AuditEvent,
  IngestInput,
  JobRecord,
  ListAssetsFilter,
  MaterializeResult,
  MediaAsset,
  MediaChild,
  NameHolder,
  TransformRecipe,
} from './types.js';
import {
  DEFAULT_VARIANT_FORMAT,
  assertMaterializableVariant,
  catalogRecipe,
  detectCatalogVariant,
  extensionForFormat,
  isImageFormat,
} from './variants.js';

function nowIso(): string {
  return new Date().toISOString();
}

/** Recipe / missing-transformer failures are terminal; adapter/network errors should retry via SQS. */
function isTerminalMaterializeFailure(err: unknown): boolean {
  return err instanceof RecipeValidationError || err instanceof TransformerNotImplementedError;
}

/** SQS visibility is 360s; reclaim running jobs whose lease is older than this. */
const RUNNING_LEASE_MS = 5 * 60 * 1000;

function isRunningLeaseFresh(job: JobRecord): boolean {
  if (!job.startedAt) {
    return false;
  }
  const started = Date.parse(job.startedAt);
  if (!Number.isFinite(started)) {
    return false;
  }
  return Date.now() - started < RUNNING_LEASE_MS;
}

function guessMime(kind: IngestInput['kind'], explicit?: string): string {
  return explicit || defaultMimeForKind(kind);
}

/** How long a presign-time name reservation holds a path before it can be taken. */
const DEFAULT_RESERVATION_TTL_MS = 30 * 60 * 1000;

function ingestFilename(input: IngestInput, sha256: string, mime: string): string {
  if (input.filename?.trim()) {
    return input.filename;
  }
  if (typeof input.data === 'string') {
    return basename(input.data);
  }
  return `${input.kind}-${sha256.slice(0, 8)}.${extensionForMime(mime)}`;
}

/** A ready child with an object at its key: replacing it must never blank or fail it. */
function isLiveChild(child: MediaChild): boolean {
  return child.status === 'ready' && child.path !== null;
}

/**
 * Child state after a terminal materialize failure. A live (ready) child keeps serving its old
 * object and meta (the failure is recorded on the job and in the audit trail); any other child
 * becomes `failed` with the error in its meta.
 */
function childAfterFailure(child: MediaChild, message: string, finishedAt: string): MediaChild {
  return isLiveChild(child)
    ? child
    : { ...child, status: 'failed', updatedAt: finishedAt, meta: { ...child.meta, error: message } };
}

/** Object extension of an image recipe's output format; other kinds have no catalog format. */
function catalogExtension(recipe: TransformRecipe): string | null {
  return recipe.kind === 'image' ? extensionForFormat(recipe.format ?? DEFAULT_VARIANT_FORMAT) : null;
}

export type MaterializeOptions = {
  /** Catalog variant (`t`, `640`, `1280`, `1920`); `p` is reserved and rejected. Exclusive with a recipe. */
  variant?: MediaVariantCode;
  /** Output format for a catalog variant (default webp); each (variant, format) is its own child/key. */
  format?: ImageFormat;
};

export type ReserveNameInput = {
  tenant?: MediaTenant;
  kind: MediaAsset['kind'];
  /** Raw filename; normalized into the key. */
  filename: string;
  /** Used for the extension when `filename` has none. */
  mime?: string;
  /** Asset id the reservation is held for (generated when omitted). */
  assetId?: string;
  ttlMs?: number;
};

export type ReservedName = {
  assetId: string;
  tenant: MediaTenant;
  kind: MediaAsset['kind'];
  name: string;
  ext: string;
  /** Reserved storage key of the original. */
  path: string;
  expiresAt: string;
};

export type MediaLibraryDeps = {
  catalog: CatalogStore;
  blobs: BlobStore;
  jobs: JobStore;
  audit: AuditStore;
  transformers: TransformerRegistry;
  /** Optional side effects (e.g. CloudFront invalidation). */
  hooks?: {
    afterDelete?: (info: { assetId: string; paths: string[] }) => Promise<void>;
    /**
     * A catalog (variant, format) object was replaced at its existing key. Served `immutable`,
     * so wire this to a CDN invalidation of `paths`.
     */
    afterReplace?: (info: { assetId: string; paths: string[] }) => Promise<void>;
  };
  /**
   * Check `meta` with `validateMediaMeta` on `ingest` and `registerRemoteAsset` (title, alt, ...).
   * Off by default until the admin upload UI collects title and alt.
   */
  enforceMetaPolicy?: boolean;
};

/**
 * Media catalog facade: ingest, children, materialize, cascade delete, audit/jobs.
 */
export class MediaLibrary {
  constructor(private readonly deps: MediaLibraryDeps) {}

  private assetMeta(kind: MediaAsset['kind'], meta: Record<string, unknown> | undefined): Record<string, unknown> {
    const normalized = meta ? normalizeAssetMeta(meta) : {};
    return this.deps.enforceMetaPolicy ? assertMediaMeta(kind, normalized) : normalized;
  }

  /**
   * Reserve the name (tenant, kind, name; any extension) for an asset id and return the original key
   * `m/{tenant}/{kind}/{name}.{ext}`. Throws `MediaNameConflictError` (HTTP 409) with a suggested free
   * name when the name is taken under any extension, and `RecipeValidationError` (HTTP 400) when the
   * extension contradicts `mime`. An object already sitting at the key belongs to no catalog row
   * (the name was free), e.g. an abandoned presigned upload: it is removed and audited.
   */
  async reserveName(input: ReserveNameInput): Promise<ReservedName> {
    const tenant = input.tenant ?? DEFAULT_TENANT;
    const split = splitMediaFilename(normalizeMediaFilename(input.filename));
    assertExtensionMatchesMime(split.name, split.ext, input.mime);
    const ext = split.ext || extensionForMime(input.mime);
    const assetId = input.assetId ?? randomUUID();
    const ref: MediaNameRef = { tenant, kind: input.kind, name: split.name };
    const path = originalKey({ ...ref, ext });
    const expiresAt = new Date(Date.now() + (input.ttlMs ?? DEFAULT_RESERVATION_TTL_MS)).toISOString();
    if (!(await this.deps.catalog.holdName(ref, { assetId, path, expiresAt }))) {
      throw await nameConflictWithSuggestion(this.deps.catalog, ref, ext);
    }
    try {
      if (await this.deps.blobs.exists(path)) {
        await this.deps.blobs.delete(path);
        await this.appendAudit('blob.stray_removed', 'blob', path, { assetId, path });
      }
    } catch (err) {
      await this.deps.catalog.releaseName(ref, assetId);
      throw err;
    }
    return { assetId, tenant, kind: input.kind, name: split.name, ext, path, expiresAt };
  }

  /** Who holds exactly this original key right now (registered asset or live reservation), if anyone. */
  async getPathReservation(path: string): Promise<NameHolder | null> {
    const parsed = parseMediaKey(path);
    if (!parsed || parsed.variant !== null) {
      return null;
    }
    const holder = await this.deps.catalog.getNameHolder({
      tenant: parsed.tenant,
      kind: parsed.kind,
      name: parsed.name,
    });
    return holder?.path === path ? holder : null;
  }

  /** Attach a suggested free name to a store-level name conflict (stores only know the path). */
  private async withSuggestion(
    err: unknown,
    asset: Pick<MediaAsset, 'tenant' | 'kind' | 'name' | 'path'>
  ): Promise<unknown> {
    if (err instanceof MediaNameConflictError && err.suggestedName === null) {
      const ext = parseMediaKey(asset.path)?.ext ?? 'bin';
      return nameConflictWithSuggestion(
        this.deps.catalog,
        { tenant: asset.tenant, kind: asset.kind, name: asset.name },
        ext
      );
    }
    return err;
  }

  async ingest(input: IngestInput): Promise<MediaAsset> {
    const meta = this.assetMeta(input.kind, input.meta);
    const buffer = typeof input.data === 'string' ? await readFile(input.data) : Buffer.from(input.data);
    const id = randomUUID();
    const sha = sha256Hex(buffer);
    const named = ingestFilename(input, sha, guessMime(input.kind, input.mime));
    const filenameExt = splitMediaFilename(normalizeMediaFilename(named)).ext;
    // An explicit mime is checked against the extension; otherwise the filename decides the mime.
    const mime = input.mime || (filenameExt && mimeForExtension(filenameExt)) || defaultMimeForKind(input.kind);
    // An extensionless name takes its extension from the resolved mime (reserveName only sees an explicit one).
    const filename = filenameExt ? named : `${named}.${extensionForMime(mime)}`;
    // Reserve before writing: a taken name must never overwrite the winner's object.
    const reserved = await this.reserveName({
      tenant: input.tenant,
      kind: input.kind,
      filename,
      mime: input.mime,
      assetId: id,
    });
    const path = reserved.path;
    const nameRef: MediaNameRef = { tenant: reserved.tenant, kind: input.kind, name: reserved.name };
    const stamp = nowIso();
    const asset: MediaAsset = {
      id,
      tenant: reserved.tenant,
      kind: input.kind,
      mime,
      sha256: sha,
      byteSize: buffer.byteLength,
      name: reserved.name,
      path,
      meta,
      createdAt: stamp,
      updatedAt: stamp,
    };

    try {
      await this.deps.blobs.put(path, buffer, objectHeaders(mime, path));
    } catch (err) {
      await this.deps.catalog.releaseName(nameRef, id);
      throw err;
    }
    try {
      await this.deps.catalog.insertAsset(asset);
    } catch (err) {
      if (!(err instanceof MediaNameConflictError)) {
        await this.deps.blobs.delete(path);
      }
      await this.deps.catalog.releaseName(nameRef, id);
      throw await this.withSuggestion(err, asset);
    }
    try {
      await this.appendAudit('asset.ingested', 'asset', id, { kind: asset.kind, sha256: sha });
    } catch (err) {
      await this.deps.catalog.deleteAsset(id);
      await this.deps.blobs.delete(path);
      throw err;
    }
    return asset;
  }

  async getAsset(id: string): Promise<MediaAsset> {
    const asset = await this.deps.catalog.getAsset(id);
    if (!asset) {
      throw new MediaNotFoundError(`Asset not found: ${id}`);
    }
    return asset;
  }

  async listAssets(filter?: ListAssetsFilter): Promise<MediaAsset[]> {
    const next = filter ? { ...filter } : undefined;
    if (next?.tag != null) {
      const tag = normalizeTag(next.tag);
      if (!tag) {
        delete next.tag;
      } else {
        next.tag = tag;
      }
    }
    return this.deps.catalog.listAssets(next);
  }

  async updateAssetMeta(id: string, meta: Record<string, unknown>): Promise<MediaAsset> {
    const asset = await this.getAsset(id);
    let next: Record<string, unknown> = { ...asset.meta, ...meta };
    // Shallow merge cannot clear tags; treat an explicit `tags` key as replace.
    if (ASSET_META_KEYS.tags in meta) {
      next = withTags(next, meta[ASSET_META_KEYS.tags]);
    }
    const updatedAt = nowIso();
    await this.deps.catalog.updateAssetMeta(id, next, updatedAt);
    await this.appendAudit('asset.meta_updated', 'asset', id, { meta: next });
    return { ...asset, meta: next, updatedAt };
  }

  /** Replace `meta.tags` (normalized). Pass `[]` to clear. */
  async setAssetTags(id: string, tags: string[]): Promise<MediaAsset> {
    return this.updateAssetMeta(id, { [ASSET_META_KEYS.tags]: tags });
  }

  /** Union tags onto `meta.tags`. */
  async addAssetTags(id: string, tags: string[]): Promise<MediaAsset> {
    const asset = await this.getAsset(id);
    return this.updateAssetMeta(id, { [ASSET_META_KEYS.tags]: [...readTags(asset.meta), ...tags] });
  }

  /** Remove tags from `meta.tags`. */
  async removeAssetTags(id: string, tags: string[]): Promise<MediaAsset> {
    const asset = await this.getAsset(id);
    return this.updateAssetMeta(id, {
      [ASSET_META_KEYS.tags]: removeTags(asset.meta, tags)[ASSET_META_KEYS.tags] ?? [],
    });
  }

  async listChildren(assetId: string): Promise<MediaChild[]> {
    await this.getAsset(assetId);
    return this.deps.catalog.listChildren(assetId);
  }

  async getChild(id: string): Promise<MediaChild> {
    const child = await this.deps.catalog.getChild(id);
    if (!child) {
      throw new MediaNotFoundError(`Child not found: ${id}`);
    }
    return child;
  }

  async getJob(id: string): Promise<JobRecord> {
    const job = await this.deps.jobs.getJob(id);
    if (!job) {
      throw new MediaNotFoundError(`Job not found: ${id}`);
    }
    return job;
  }

  async listJobs(filter?: { assetId?: string; status?: JobRecord['status'] }): Promise<JobRecord[]> {
    return this.deps.jobs.listJobs(filter);
  }

  async listAuditEvents(entityId: string): Promise<AuditEvent[]> {
    return this.deps.audit.listByEntity(entityId);
  }

  /**
   * Register an asset whose bytes already live in the blob store (presigned upload complete).
   * `path` is the reserved original key; a pending reservation held for `id` is consumed.
   */
  async registerRemoteAsset(input: {
    kind: MediaAsset['kind'];
    mime: string;
    sha256: string;
    byteSize: number;
    path: string;
    meta?: Record<string, unknown>;
    id?: string;
  }): Promise<MediaAsset> {
    const parsed = parseMediaKey(input.path);
    if (!parsed || parsed.variant !== null) {
      throw new RecipeValidationError(`path is not a valid media original key: ${input.path}`);
    }
    if (parsed.kind !== input.kind) {
      throw new RecipeValidationError(`path kind "${parsed.kind}" does not match asset kind "${input.kind}"`);
    }
    assertExtensionMatchesMime(parsed.name, parsed.ext, input.mime);
    const meta = this.assetMeta(input.kind, input.meta);
    const id = input.id ?? randomUUID();
    const stamp = nowIso();
    const asset: MediaAsset = {
      id,
      tenant: parsed.tenant,
      kind: input.kind,
      mime: input.mime,
      sha256: input.sha256,
      byteSize: input.byteSize,
      name: parsed.name,
      path: input.path,
      meta,
      createdAt: stamp,
      updatedAt: stamp,
    };
    const exists = await this.deps.blobs.exists(input.path);
    if (!exists) {
      throw new MediaNotFoundError(`Blob not found for key: ${input.path}`);
    }
    try {
      await this.deps.catalog.insertAsset(asset);
    } catch (err) {
      if (err instanceof MediaNameConflictError) {
        throw await this.withSuggestion(err, asset);
      }
      if (err instanceof MediaConflictError) {
        throw err;
      }
      const code = (err as { code?: string }).code;
      const name = (err as { name?: string }).name;
      if (
        code === 'SQLITE_CONSTRAINT_PRIMARYKEY' ||
        code === 'SQLITE_CONSTRAINT_UNIQUE' ||
        name === 'ConditionalCheckFailedException'
      ) {
        throw new MediaConflictError(`Asset already exists: ${id}`);
      }
      throw err;
    }
    try {
      await this.appendAudit('asset.ingested', 'asset', id, {
        kind: asset.kind,
        sha256: asset.sha256,
        remote: true,
      });
    } catch (err) {
      await this.deps.catalog.deleteAsset(id);
      throw err;
    }
    return asset;
  }

  /**
   * Create a pending child + queued job without running materialize (for SQS workers).
   */
  async enqueueMaterializeChild(
    assetId: string,
    role: string | null | undefined,
    recipeRaw: unknown,
    options: MaterializeOptions = {}
  ): Promise<MaterializeResult> {
    const asset = await this.getAsset(assetId);
    const resolved = this.resolveMaterialize(asset, role, recipeRaw, options);
    const stamp = nowIso();
    const jobId = randomUUID();

    // A catalog (variant, format) is one child per asset: re-materializing replaces its object
    // at the same key. Custom children are always fresh.
    let existing: MediaChild | undefined;
    if (resolved.variant !== CUSTOM_VARIANT) {
      const ext = catalogExtension(resolved.recipe);
      existing = (await this.deps.catalog.listChildren(assetId)).find(
        (candidate) => candidate.variant === resolved.variant && catalogExtension(candidate.recipe) === ext
      );
      if (existing) {
        const jobs = await this.deps.jobs.listJobs({ assetId });
        const active = jobs.find(
          (j) =>
            j.childId === existing?.id && (j.status === 'queued' || (j.status === 'running' && isRunningLeaseFresh(j)))
        );
        if (active) {
          throw new MediaConflictError(
            `Variant "${resolved.variant}" is already being materialized for asset ${assetId} (job ${active.id})`
          );
        }
      }
    }
    const childId = existing?.id ?? randomUUID();

    // A ready child being replaced stays ready, with its path and meta, while the replacement job
    // runs (the job record tracks it); its meta is swapped only when the job succeeds.
    const live = existing && isLiveChild(existing) ? existing : undefined;
    const child: MediaChild = {
      id: childId,
      assetId,
      role: live && !role?.trim() ? live.role : resolved.role,
      variant: resolved.variant,
      recipe: resolved.recipe,
      status: live ? 'ready' : 'pending',
      path: existing?.path ?? null,
      meta: live ? live.meta : {},
      createdAt: existing?.createdAt ?? stamp,
      updatedAt: stamp,
    };
    const job: JobRecord = {
      id: jobId,
      type: 'materialize',
      assetId,
      childId,
      status: 'queued',
      attempts: 0,
      lastError: null,
      createdAt: stamp,
      startedAt: null,
      finishedAt: null,
    };

    const previous = existing;
    const undoChild = async (): Promise<void> => {
      if (previous) {
        await this.deps.catalog.updateChildIfAssetExists(previous);
      } else {
        await this.deps.catalog.deleteChild(assetId, childId);
      }
    };

    if (previous) {
      const updated = await this.deps.catalog.updateChildIfAssetExists(child);
      if (!updated) {
        throw new MediaNotFoundError(`Asset not found: ${assetId}`);
      }
      try {
        await this.deps.jobs.insertJob(job);
      } catch (err) {
        await undoChild();
        throw err;
      }
    } else {
      const inserted = this.deps.catalog.insertChildAndJobIfAssetExists
        ? await this.deps.catalog.insertChildAndJobIfAssetExists(child, job)
        : await this.deps.catalog.insertChildIfAssetExists(child);
      if (!inserted) {
        throw new MediaNotFoundError(`Asset not found: ${assetId}`);
      }
      if (!this.deps.catalog.insertChildAndJobIfAssetExists) {
        try {
          await this.deps.jobs.insertJob(job);
        } catch (err) {
          await undoChild();
          throw err;
        }
      }
    }
    try {
      await this.appendAudit(
        'child.defined',
        'child',
        childId,
        { assetId, role: child.role, variant: child.variant, recipe: child.recipe },
        jobId
      );
    } catch (err) {
      // Compensate so Nuxt/SQS callers do not leave an undeliverable queued job.
      await this.deps.jobs.deleteJob(jobId);
      await undoChild();
      throw err;
    }
    return { child, job };
  }

  /**
   * Resolve a request into a child definition: a catalog variant (explicit, or a recipe that
   * equals a catalog recipe) or a custom recipe. `p` is reserved and rejected.
   */
  private resolveMaterialize(
    asset: MediaAsset,
    role: string | null | undefined,
    recipeRaw: unknown,
    options: MaterializeOptions
  ): { variant: MediaChildVariant; recipe: TransformRecipe; role: string } {
    const label = role?.trim();
    if (options.variant !== undefined) {
      if (recipeRaw != null) {
        throw new RecipeValidationError('Provide either a variant or a recipe, not both');
      }
      const variant = assertMaterializableVariant(options.variant);
      if (asset.kind !== 'image') {
        throw new RecipeValidationError(`Catalog variants require an image asset (asset kind is "${asset.kind}")`);
      }
      if (options.format !== undefined && !isImageFormat(options.format)) {
        throw new RecipeValidationError(`Invalid image format: ${String(options.format)}`);
      }
      return { variant, recipe: catalogRecipe(variant, options.format), role: label || variant };
    }
    if (options.format !== undefined) {
      throw new RecipeValidationError('format is only valid together with a variant');
    }
    if (recipeRaw == null) {
      throw new RecipeValidationError('A variant or a recipe is required');
    }
    const recipe = parseRecipe(asset.kind, recipeRaw);
    const catalog = detectCatalogVariant(recipe);
    if (catalog) {
      return {
        variant: catalog.variant,
        recipe: catalogRecipe(catalog.variant, catalog.format),
        role: label || catalog.variant,
      };
    }
    return { variant: CUSTOM_VARIANT, recipe, role: label || CUSTOM_VARIANT };
  }

  /**
   * Create a pending child from a recipe (or catalog variant) and run materialize synchronously.
   */
  async materializeChild(
    assetId: string,
    role: string | null | undefined,
    recipeRaw: unknown,
    options: MaterializeOptions = {}
  ): Promise<MaterializeResult> {
    const enqueued = await this.enqueueMaterializeChild(assetId, role, recipeRaw, options);
    return this.runMaterializeJob(enqueued.job.id);
  }

  async runMaterializeJob(jobId: string): Promise<MaterializeResult> {
    const job = await this.getJob(jobId);
    if (job.status === 'succeeded' || job.status === 'failed') {
      const child = await this.getChild(job.childId);
      return { child, job };
    }

    const child = await this.getChild(job.childId);
    const asset = await this.getAsset(job.assetId);

    let running: JobRecord;
    if (job.status === 'running') {
      if (isRunningLeaseFresh(job)) {
        // Another worker still holds the lease — caller should not ack as success.
        return { child, job };
      }
      if (!job.startedAt) {
        return { child, job };
      }
      // Stale lease after crash: reclaim atomically on previous startedAt.
      const startedAt = nowIso();
      running = {
        ...job,
        status: 'running',
        attempts: job.attempts + 1,
        startedAt,
        lastError: null,
      };
      const reclaimed = await this.deps.jobs.claimStaleRunningJob(jobId, job.startedAt, running);
      if (!reclaimed) {
        const latest = await this.getJob(jobId);
        const latestChild = await this.getChild(latest.childId);
        return { child: latestChild, job: latest };
      }
    } else {
      const startedAt = nowIso();
      running = {
        ...job,
        status: 'running',
        attempts: job.attempts + 1,
        startedAt,
        lastError: null,
      };
      const claimed = await this.deps.jobs.claimQueuedJob(jobId, running);
      if (!claimed) {
        const latest = await this.getJob(jobId);
        const latestChild = await this.getChild(latest.childId);
        return { child: latestChild, job: latest };
      }
    }

    // Keys are deterministic per child (no attempt suffix), so retries and stale workers share a
    // key. Never delete it once another worker may own it (lost lease) or when it replaces a live
    // object (`replacing`); only an asset that is gone, or a sole writer's failed attempt, deletes.
    let attemptKey: string | null = null;
    const replacing = child.path !== null;
    try {
      if (typeof this.deps.blobs.stat === 'function') {
        const info = await this.deps.blobs.stat(asset.path);
        if (info && info.byteSize > MAX_BYTES) {
          throw new RecipeValidationError(`Source blob exceeds max bytes (${MAX_BYTES})`);
        }
      }
      const source = await this.deps.blobs.get(asset.path);
      const transformer = this.deps.transformers.resolve(asset.kind);
      const output = await transformer.materialize({
        kind: asset.kind,
        source,
        recipe: child.recipe,
      });

      const suffix = child.variant === CUSTOM_VARIANT ? customVariantSuffix(child.id) : child.variant;
      const key = variantKey(asset.path, suffix, extensionForMime(output.contentType));
      await this.deps.blobs.put(key, output.buffer, objectHeaders(output.contentType, key));
      attemptKey = key;

      // Asset may have been deleted while we worked — do not resurrect catalog rows.
      const stillThere = await this.deps.catalog.getAsset(asset.id);
      if (!stillThere) {
        await this.deps.blobs.delete(key);
        attemptKey = null;
        throw new MediaConflictError(`Asset deleted during materialize: ${asset.id}`);
      }

      const finishedAt = nowIso();
      const readyChild: MediaChild = {
        ...child,
        status: 'ready',
        path: key,
        meta: { ...output.meta, contentType: output.contentType },
        updatedAt: finishedAt,
      };
      const succeeded: JobRecord = {
        ...running,
        status: 'succeeded',
        finishedAt,
        lastError: null,
      };
      if (!running.startedAt) {
        attemptKey = null;
        const latest = await this.getJob(jobId);
        const latestChild = await this.getChild(latest.childId);
        return { child: latestChild, job: latest };
      }
      // Lease-conditional finalize first so a stale worker cannot overwrite the child
      // after another worker reclaimed; then asset-conditioned child write.
      if (this.deps.catalog.finalizeRunningJobAndUpdateChildIfAssetExists) {
        const finalized = await this.deps.catalog.finalizeRunningJobAndUpdateChildIfAssetExists(
          jobId,
          running.startedAt,
          succeeded,
          readyChild
        );
        if (finalized === 'lost-lease') {
          // Another worker owns this job and writes the same key; leave the object.
          attemptKey = null;
          const latest = await this.getJob(jobId);
          const latestChild = await this.getChild(latest.childId);
          return { child: latestChild, job: latest };
        }
        if (finalized === 'asset-missing') {
          await this.deps.blobs.delete(key);
          attemptKey = null;
          throw new MediaConflictError(`Asset deleted during materialize: ${asset.id}`);
        }
      } else {
        const finalized = await this.deps.jobs.finalizeRunningJob(jobId, running.startedAt, succeeded);
        if (!finalized) {
          attemptKey = null;
          const latest = await this.getJob(jobId);
          const latestChild = await this.getChild(latest.childId);
          return { child: latestChild, job: latest };
        }
        const childWritten = await this.deps.catalog.updateChildIfAssetExists(readyChild);
        if (!childWritten) {
          await this.deps.blobs.delete(key);
          attemptKey = null;
          throw new MediaConflictError(`Asset deleted during materialize: ${asset.id}`);
        }
      }
      attemptKey = null;
      if (replacing && this.deps.hooks?.afterReplace) {
        try {
          await this.deps.hooks.afterReplace({ assetId: asset.id, paths: [key] });
        } catch (hookErr) {
          // The object is written and the job succeeded; record the failed invalidation for repair.
          const error = hookErr instanceof Error ? hookErr.message : String(hookErr);
          await this.appendAudit('child.invalidation_failed', 'child', child.id, { path: key, error }, jobId);
        }
      }
      await this.appendAudit('child.materialized', 'child', child.id, { path: key }, jobId);
      return { child: readyChild, job: succeeded };
    } catch (err) {
      if (err instanceof MediaConflictError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      if (!running.startedAt) {
        throw err;
      }
      if (!isTerminalMaterializeFailure(err)) {
        // Leave job queued so SQS redelivery can reclaim; do not terminalize infrastructure faults.
        const requeued = await this.deps.jobs.finalizeRunningJob(jobId, running.startedAt, {
          ...running,
          status: 'queued',
          startedAt: null,
          finishedAt: null,
          lastError: message,
        });
        if (!requeued) {
          // Lost the lease: the new owner writes the same key, so leave the object alone.
          const latest = await this.getJob(jobId);
          const latestChild = await this.getChild(latest.childId);
          return { child: latestChild, job: latest };
        }
        // We still own the job: drop this attempt's object so retries do not leave strays,
        // unless it replaced a live object at a shared key.
        if (attemptKey && !replacing) {
          await this.deps.blobs.delete(attemptKey);
        }
        throw err;
      }
      // Terminal failures (bad recipe, missing transformer) are raised before any object is written.
      const finishedAt = nowIso();
      const failedChild = childAfterFailure(child, message, finishedAt);
      const failed: JobRecord = {
        ...running,
        status: 'failed',
        finishedAt,
        lastError: message,
      };
      if (this.deps.catalog.finalizeRunningJobAndUpdateChildIfAssetExists) {
        const finalized = await this.deps.catalog.finalizeRunningJobAndUpdateChildIfAssetExists(
          jobId,
          running.startedAt,
          failed,
          failedChild
        );
        if (finalized === 'lost-lease') {
          const latest = await this.getJob(jobId);
          const latestChild = await this.getChild(latest.childId);
          return { child: latestChild, job: latest };
        }
        if (finalized === 'asset-missing') {
          throw new MediaConflictError(`Asset deleted during materialize: ${job.assetId}`);
        }
      } else {
        const finalized = await this.deps.jobs.finalizeRunningJob(jobId, running.startedAt, failed);
        if (!finalized) {
          const latest = await this.getJob(jobId);
          const latestChild = await this.getChild(latest.childId);
          return { child: latestChild, job: latest };
        }
        const childWritten = await this.deps.catalog.updateChildIfAssetExists(failedChild);
        if (!childWritten) {
          throw new MediaConflictError(`Asset deleted during materialize: ${job.assetId}`);
        }
      }
      await this.appendAudit('child.materialize_failed', 'child', child.id, { error: message }, jobId);
      return { child: failedChild, job: failed };
    }
  }

  /**
   * Mark a queued/running job (and its child) failed — used when SQS dispatch fails after insert.
   */
  async failMaterializeDispatch(jobId: string, reason: string): Promise<MaterializeResult> {
    const job = await this.getJob(jobId);
    if (job.status === 'succeeded' || job.status === 'failed') {
      const child = await this.getChild(job.childId);
      return { child, job };
    }
    const child = await this.getChild(job.childId);
    const finishedAt = nowIso();
    const failedChild = childAfterFailure(child, reason, finishedAt);
    const failed: JobRecord = {
      ...job,
      status: 'failed',
      finishedAt,
      lastError: reason,
    };
    let jobWritten = false;
    if (job.status === 'queued') {
      jobWritten = await this.deps.jobs.failQueuedJob(jobId, failed);
    } else if (job.status === 'running' && job.startedAt) {
      jobWritten = await this.deps.jobs.finalizeRunningJob(jobId, job.startedAt, failed);
    }
    if (!jobWritten) {
      const latest = await this.getJob(jobId);
      const latestChild = await this.getChild(latest.childId);
      return { child: latestChild, job: latest };
    }
    const childWritten = await this.deps.catalog.updateChildIfAssetExists(failedChild);
    if (!childWritten) {
      throw new MediaConflictError(`Asset deleted during dispatch fail: ${job.assetId}`);
    }
    await this.appendAudit('child.materialize_dispatch_failed', 'child', child.id, { error: reason }, jobId);
    return { child: failedChild, job: failed };
  }

  async deleteAsset(id: string): Promise<void> {
    const asset = await this.getAsset(id);
    const jobs = await this.deps.jobs.listJobs({ assetId: id });
    const running = jobs.find((j) => j.status === 'running' && isRunningLeaseFresh(j));
    if (running) {
      throw new MediaConflictError(`Cannot delete asset ${id}: materialize job ${running.id} is still running`);
    }

    // Collect blob keys before the cascade removes catalog rows.
    let children = await this.deps.catalog.listChildren(id);
    const paths = new Set<string>([asset.path, ...children.map((c) => c.path).filter((k): k is string => Boolean(k))]);
    const childIds = new Set(children.map((c) => c.id));

    // Atomic (SQLite) / parent-first (Dynamo) cascade prevents new child/job inserts
    // from racing onto a still-live parent.
    await this.deps.catalog.deleteAssetCascade(id);
    await this.deps.jobs.deleteJobsForAsset(id);

    children = await this.deps.catalog.listChildren(id);
    for (const child of children) {
      childIds.add(child.id);
      if (child.path) {
        paths.add(child.path);
      }
    }
    if (children.length) {
      await this.deps.jobs.deleteJobsForAsset(id);
      await this.deps.catalog.deleteChildrenForAsset(id);
    }

    for (const key of paths) {
      await this.deps.blobs.delete(key);
    }
    await this.appendAudit('asset.deleted', 'asset', id, {
      childIds: [...childIds],
    });
    if (this.deps.hooks?.afterDelete) {
      await this.deps.hooks.afterDelete({ assetId: id, paths: [...paths] });
    }
  }

  private async appendAudit(
    action: string,
    entityType: string,
    entityId: string,
    payload: Record<string, unknown>,
    correlationId: string | null = null
  ): Promise<void> {
    await this.deps.audit.append({
      id: randomUUID(),
      occurredAt: nowIso(),
      action,
      entityType,
      entityId,
      payload,
      correlationId,
    });
  }
}

/** Re-export for callers defining children without materialize yet. */
export type { TransformRecipe };
