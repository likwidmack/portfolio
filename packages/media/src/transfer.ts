/**
 * Copy a media catalog and its objects from one backend to another through the ports only
 * (SQLite + filesystem, DynamoDB + S3, ...). Used to seed production and to pull backups.
 */

import { randomUUID } from 'node:crypto';

import { sha256Hex } from '@tgmc/utilities';

import { MediaBlobExistsError, MediaConflictError } from './errors.js';
import { mimeForExtension } from './kinds.js';
import { objectHeaders } from './object-headers.js';
import { TENANT_CODES, nameKey, parseMediaKey, type MediaNameRef, type MediaTenant } from './paths.js';
import type { AuditStore, BlobPutOptions, BlobStore, CatalogStore } from './ports/index.js';
import type { MediaAsset, MediaChild, NameHolder } from './types.js';

/** Audit action appended on the target for every asset the transfer wrote (the asset or any child). */
export const TRANSFER_AUDIT_ACTION = 'asset.transferred';

export const DEFAULT_TRANSFER_PAGE_SIZE = 100;

/** How long the transfer holds an asset's name on the target while it copies the object and writes the row. */
export const TRANSFER_NAME_HOLD_MS = 15 * 60 * 1000;

/** One side of a transfer. `audit` is optional: without it no transfer event is recorded. */
export type MediaEndpoint = { catalog: CatalogStore; blobs: BlobStore; audit?: AuditStore };

/** What a transfer reads from its source (any `MediaEndpoint` qualifies). */
export type MediaTransferSource = {
  catalog: Pick<CatalogStore, 'listAssets' | 'listChildren'>;
  blobs: Pick<BlobStore, 'get' | 'digestSha256'>;
};

export type TransferFailure = { id: string; error: string };

export type TransferOutcomes = {
  copied: string[];
  skipped: string[];
  conflicts: string[];
  /** Why each id in `conflicts` was not copied. */
  conflictReasons: Record<string, string>;
  failed: TransferFailure[];
};

/**
 * Asset ids at the top level; child ids under `children`. In a dry run `copied` lists what would be
 * copied. A source listing error is recorded in `failed` as `listing <tenant> (offset <n>)`.
 */
export type TransferReport = TransferOutcomes & {
  dryRun: boolean;
  /** Source assets seen (each id once). */
  sourceCount: number;
  children: TransferOutcomes;
};

export type TransferMediaOptions = {
  source: MediaTransferSource;
  target: MediaEndpoint;
  /** Read both sides and report, but write nothing to the target. */
  dryRun?: boolean;
  /** Copy `ready` children too (default true). */
  includeChildren?: boolean;
  /** `listAssets` page size (default 100). */
  pageSize?: number;
  /** Tenants to copy (default: every tenant). */
  tenants?: readonly MediaTenant[];
  /** Recorded on the target's transfer audit events (default: a fresh id per run). */
  correlationId?: string;
  /** Audit action for the target's events (default `TRANSFER_AUDIT_ACTION`). */
  auditAction?: string;
};

/** The target already holds something else under this id, name or key: report it, never overwrite it. */
class TransferConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransferConflictError';
  }
}

function emptyOutcomes(): TransferOutcomes {
  return { copied: [], skipped: [], conflicts: [], conflictReasons: {}, failed: [] };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function record(outcomes: TransferOutcomes, id: string, err: unknown): void {
  if (
    err instanceof TransferConflictError ||
    err instanceof MediaConflictError ||
    err instanceof MediaBlobExistsError
  ) {
    outcomes.conflicts.push(id);
    outcomes.conflictReasons[id] = err.message;
    return;
  }
  outcomes.failed.push({ id, error: errorMessage(err) });
}

function isCopyableChild(child: MediaChild): child is MediaChild & { path: string } {
  return child.status === 'ready' && child.path !== null;
}

function childContentType(child: MediaChild & { path: string }): string {
  const recorded = child.meta.contentType;
  if (typeof recorded === 'string' && recorded) {
    return recorded;
  }
  return mimeForExtension(parseMediaKey(child.path)?.ext ?? '') ?? 'application/octet-stream';
}

/** A child must live under its asset's name (`m/pf/i/hero@t.webp` for `m/pf/i/hero.png`), never at an original key. */
function assertVariantPath(asset: MediaAsset, childPath: string): void {
  const parsed = parseMediaKey(childPath);
  if (
    !parsed ||
    parsed.variant === null ||
    parsed.tenant !== asset.tenant ||
    parsed.kind !== asset.kind ||
    parsed.name !== asset.name
  ) {
    throw new Error(`Child path ${childPath} is not a variant of ${asset.path}`);
  }
}

function describeHolder(holder: NameHolder): string {
  return `${holder.pending ? 'a pending upload of' : 'asset'} ${holder.assetId} (${holder.path})`;
}

async function digestOf(blobs: Pick<BlobStore, 'get' | 'digestSha256'>, key: string): Promise<string> {
  return blobs.digestSha256 ? blobs.digestSha256(key) : sha256Hex(await blobs.get(key));
}

function assertSourceSha(key: string, sha: string, expectedSha: string | null): void {
  if (expectedSha && sha !== expectedSha) {
    throw new Error(`Source object ${key} has sha256 ${sha}, catalog says ${expectedSha}`);
  }
}

type MediaTransferSettings = {
  source: MediaTransferSource;
  target: MediaEndpoint;
  dryRun: boolean;
  includeChildren: boolean;
  correlationId: string;
  auditAction: string;
};

class MediaTransfer {
  readonly report: TransferReport;
  private readonly source: MediaTransferSource;
  private readonly target: MediaEndpoint;
  private readonly dryRun: boolean;
  private readonly options: MediaTransferSettings;

  constructor(settings: MediaTransferSettings) {
    this.source = settings.source;
    this.target = settings.target;
    this.dryRun = settings.dryRun;
    this.options = settings;
    this.report = { ...emptyOutcomes(), dryRun: this.dryRun, sourceCount: 0, children: emptyOutcomes() };
  }

  async transferAsset(asset: MediaAsset): Promise<void> {
    let assetCopied: boolean;
    try {
      assetCopied = await this.copyAsset(asset);
    } catch (err) {
      record(this.report, asset.id, err);
      return;
    }
    (assetCopied ? this.report.copied : this.report.skipped).push(asset.id);
    const copiedChildren = this.options.includeChildren ? await this.copyChildren(asset, assetCopied) : [];
    if (this.dryRun || !this.target.audit || (!assetCopied && copiedChildren.length === 0)) {
      return;
    }
    try {
      await this.target.audit.append({
        id: randomUUID(),
        occurredAt: new Date().toISOString(),
        action: this.options.auditAction,
        entityType: 'asset',
        entityId: asset.id,
        payload: { path: asset.path, sha256: asset.sha256, assetCopied, children: copiedChildren },
        correlationId: this.options.correlationId,
      });
    } catch (err) {
      this.report.failed.push({ id: asset.id, error: `audit: ${errorMessage(err)}` });
    }
  }

  /** True when the asset was (or, in a dry run, would be) copied; false when the target already has it. */
  private async copyAsset(asset: MediaAsset): Promise<boolean> {
    const existing = await this.target.catalog.getAsset(asset.id);
    if (existing) {
      if (existing.sha256 !== asset.sha256) {
        throw new TransferConflictError(
          `Target already has asset ${asset.id} with sha256 ${existing.sha256} (source ${asset.sha256})`
        );
      }
      if (existing.path !== asset.path) {
        throw new TransferConflictError(
          `Target already has asset ${asset.id} at ${existing.path} (source ${asset.path})`
        );
      }
      if (!(await this.target.blobs.exists(asset.path))) {
        throw new Error(
          `Target has asset ${asset.id} but its object ${asset.path} is missing; restore the object (or delete the row) and rerun`
        );
      }
      return false;
    }
    const ref: MediaNameRef = { tenant: asset.tenant, kind: asset.kind, name: asset.name };
    const holder = await this.target.catalog.getNameHolder(ref);
    if (holder && holder.assetId !== asset.id) {
      throw new TransferConflictError(`Name ${nameKey(ref)} is held on the target by ${describeHolder(holder)}`);
    }
    const headers: BlobPutOptions = { ...objectHeaders(asset.mime, asset.path), createOnly: true };
    if (this.dryRun) {
      await this.copyObject(asset.path, asset.sha256, headers);
      return true;
    }
    await this.holdName(asset, ref);
    try {
      const wrote = await this.copyObject(asset.path, asset.sha256, headers);
      await this.insertRow(
        asset.path,
        wrote,
        () => this.target.catalog.insertAsset(asset),
        async () => {
          const landed = await this.target.catalog.getAsset(asset.id);
          return landed?.sha256 === asset.sha256 && landed.path === asset.path;
        }
      );
    } catch (err) {
      await this.target.catalog.releaseName(ref, asset.id).catch(() => undefined);
      throw err;
    }
    return true;
  }

  /**
   * Reserve the name for this asset id before anything is written, so a concurrent upload on the
   * target can neither take the name mid-copy nor have its object overwritten or cleaned up by us.
   */
  private async holdName(asset: MediaAsset, ref: MediaNameRef): Promise<void> {
    const expiresAt = new Date(Date.now() + TRANSFER_NAME_HOLD_MS).toISOString();
    if (await this.target.catalog.holdName(ref, { assetId: asset.id, path: asset.path, expiresAt })) {
      return;
    }
    const holder = await this.target.catalog.getNameHolder(ref);
    throw new TransferConflictError(
      `Name ${nameKey(ref)} was taken on the target during the run${holder ? ` by ${describeHolder(holder)}` : ''}`
    );
  }

  /**
   * Write the row for the object at `key`. If `insert` fails but `landed` finds the row anyway (a
   * timeout after the commit), keep the object and succeed. If `landed` cannot tell, keep the object
   * too (it may back a landed row; a rerun adopts it) and fail. Otherwise remove the object this run
   * wrote and rethrow.
   */
  private async insertRow(
    key: string,
    wrote: boolean,
    insert: () => Promise<void>,
    landed: () => Promise<boolean>
  ): Promise<void> {
    try {
      await insert();
    } catch (err) {
      let rowLanded: boolean;
      try {
        rowLanded = await landed();
      } catch (readErr) {
        throw new Error(
          `${errorMessage(err)}; re-reading the row failed (${errorMessage(readErr)}), so ${key} was kept: rerun to finish`
        );
      }
      if (rowLanded) {
        return;
      }
      if (wrote) {
        await this.target.blobs.delete(key).catch(() => undefined);
      }
      throw err;
    }
  }

  /** Copy the asset's `ready` children the target lacks; returns the ids copied (or that would be). */
  private async copyChildren(asset: MediaAsset, assetIsNew: boolean): Promise<string[]> {
    const outcomes = this.report.children;
    let children: Array<MediaChild & { path: string }>;
    let onTarget: MediaChild[];
    try {
      children = (await this.source.catalog.listChildren(asset.id)).filter(isCopyableChild);
      onTarget = assetIsNew && this.dryRun ? [] : await this.target.catalog.listChildren(asset.id);
    } catch (err) {
      outcomes.failed.push({ id: asset.id, error: `listing children: ${errorMessage(err)}` });
      return [];
    }
    const copied: string[] = [];
    for (const child of children) {
      try {
        const same = onTarget.find((c) => c.id === child.id);
        if (same) {
          if (same.path !== child.path) {
            throw new TransferConflictError(`Target already has child ${child.id} at ${same.path ?? 'no path'}`);
          }
          if (!(await this.target.blobs.exists(child.path))) {
            throw new Error(
              `Target has child ${child.id} but its object ${child.path} is missing; restore the object (or delete the row) and rerun`
            );
          }
          outcomes.skipped.push(child.id);
          continue;
        }
        const holder = onTarget.find((c) => c.path === child.path);
        if (holder) {
          throw new TransferConflictError(`Target child ${holder.id} already uses ${child.path}`);
        }
        assertVariantPath(asset, child.path);
        const wrote = await this.copyObject(child.path, null, {
          ...objectHeaders(childContentType(child), child.path),
          createOnly: true,
        });
        if (!this.dryRun) {
          await this.insertRow(
            child.path,
            wrote,
            async () => {
              if (!(await this.target.catalog.insertChildIfAssetExists(child))) {
                throw new Error(`Asset ${asset.id} is missing on the target`);
              }
            },
            async () =>
              (await this.target.catalog.listChildren(asset.id)).some((c) => c.id === child.id && c.path === child.path)
          );
        }
        outcomes.copied.push(child.id);
        copied.push(child.id);
      } catch (err) {
        record(outcomes, child.id, err);
      }
    }
    return copied;
  }

  /**
   * Make `key` hold the source bytes on the target, verified by re-hashing them there. Returns true
   * when this call wrote the object. The source is always checked against `expectedSha`. An
   * identical object already there is adopted (an earlier run stopped after the write); different
   * bytes are a conflict, and so is an object that appears between the check and the create-only
   * put. A dry run only verifies the source.
   */
  private async copyObject(key: string, expectedSha: string | null, headers: BlobPutOptions): Promise<boolean> {
    if (await this.target.blobs.exists(key)) {
      const [targetSha, sourceSha] = await Promise.all([
        digestOf(this.target.blobs, key),
        this.sourceDigest(key, expectedSha),
      ]);
      if (targetSha !== sourceSha) {
        throw new TransferConflictError(`Target already has different bytes at ${key}`);
      }
      return false;
    }
    if (this.dryRun) {
      await this.sourceDigest(key, expectedSha);
      return false;
    }
    const bytes = await this.source.blobs.get(key);
    const sha = sha256Hex(bytes);
    assertSourceSha(key, sha, expectedSha);
    try {
      await this.target.blobs.put(key, bytes, headers);
    } catch (err) {
      if (err instanceof MediaBlobExistsError) {
        throw new TransferConflictError(`An object appeared at ${key} on the target during the run; not overwritten`);
      }
      throw err;
    }
    await this.withCleanup(key, true, async () => {
      const written = await digestOf(this.target.blobs, key);
      if (written !== sha) {
        throw new Error(`Target verification failed for ${key}: sha256 ${written}, expected ${sha}`);
      }
    });
    return true;
  }

  private async sourceDigest(key: string, expectedSha: string | null): Promise<string> {
    const sha = await digestOf(this.source.blobs, key);
    assertSourceSha(key, sha, expectedSha);
    return sha;
  }

  /** Run `step`; if it throws, delete the object this run wrote at `key` (never one it adopted) and rethrow. */
  private async withCleanup(key: string, wrote: boolean, step: () => Promise<void>): Promise<void> {
    try {
      await step();
    } catch (err) {
      if (wrote) {
        await this.target.blobs.delete(key).catch(() => undefined);
      }
      throw err;
    }
  }
}

/**
 * Copy every asset (and its `ready` children) from `source` to `target`, keeping ids, tenants,
 * names, paths and meta, so URLs are identical in both environments.
 *
 * - Same id and sha256 on the target: skipped (reruns are idempotent); the asset's missing ready
 *   children are still copied.
 * - Same id with another sha256 or path, a name held by another id, or different bytes already at
 *   the key: a conflict, never overwritten.
 * - Before writing, the name is held on the target for `TRANSFER_NAME_HOLD_MS` (released on
 *   failure), and objects are written create-only, so a concurrent upload is a conflict rather than
 *   overwritten or deleted.
 * - Each object is re-hashed on the target before its catalog row is written; a failure on one item
 *   is recorded in `failed` and leaves no row without a verified object. An asset or child already
 *   on the target whose object is missing there is a failure too.
 * - A source listing error ends that tenant's listing, is recorded in `failed`, and the run goes on.
 * - Jobs and audit history are not copied; a `TRANSFER_AUDIT_ACTION` event is appended on the target.
 */
export async function transferMedia(opts: TransferMediaOptions): Promise<TransferReport> {
  const pageSize = opts.pageSize ?? DEFAULT_TRANSFER_PAGE_SIZE;
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new RangeError(`pageSize must be a positive integer (got ${pageSize})`);
  }
  const transfer = new MediaTransfer({
    source: opts.source,
    target: opts.target,
    dryRun: opts.dryRun ?? false,
    includeChildren: opts.includeChildren ?? true,
    correlationId: opts.correlationId ?? randomUUID(),
    auditAction: opts.auditAction ?? TRANSFER_AUDIT_ACTION,
  });
  const tenants = opts.tenants ?? (Object.keys(TENANT_CODES) as MediaTenant[]);
  const seen = new Set<string>();
  for (const tenant of tenants) {
    for (let offset = 0; ; offset += pageSize) {
      let page: MediaAsset[];
      try {
        page = await opts.source.catalog.listAssets({ tenant, limit: pageSize, offset });
      } catch (err) {
        transfer.report.failed.push({ id: `listing ${tenant} (offset ${offset})`, error: errorMessage(err) });
        break;
      }
      for (const asset of page) {
        if (!seen.has(asset.id)) {
          seen.add(asset.id);
          await transfer.transferAsset(asset);
        }
      }
      if (page.length < pageSize) {
        break;
      }
    }
  }
  transfer.report.sourceCount = seen.size;
  return transfer.report;
}
