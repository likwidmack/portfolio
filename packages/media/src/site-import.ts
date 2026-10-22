/**
 * Import a reviewed site media manifest into a catalog, with the manifest's ids and names. The
 * manifest entries plus their sanitized bytes are presented to `transferMedia` as a read-only
 * source, so the import gets the transfer's guarantees: name hold, create-only writes, re-hash on
 * the target, idempotent skip, conflicts reported and never overwritten.
 */

import { randomUUID } from 'node:crypto';

import { sha256Hex } from '@tgmc/utilities';

import { MediaNotFoundError } from './errors.js';
import { mimeForExtension } from './kinds.js';
import { validateMediaMeta } from './meta-policy.js';
import type { MediaTenant } from './paths.js';
import { siteEntryMeta, siteEntryToAsset, type SiteMediaEntry } from './site-manifest.js';
import { transferMedia, type MediaEndpoint, type MediaTransferSource, type TransferReport } from './transfer.js';
import type { ListAssetsFilter, MediaAsset } from './types.js';

export const SITE_IMPORT_AUDIT_ACTION = 'asset.site_imported';

/**
 * A manifest entry and its sanitized bytes (which must hash to `entry.sha256`), or a loader for them;
 * a loader runs only when the entry is actually imported (not refused, not already on the target).
 */
export type SiteImportItem = { entry: SiteMediaEntry; bytes: Buffer | (() => Promise<Buffer>) };

export type SiteImportRefusal = { id: string; reason: string };

export type SiteImportReport = TransferReport & {
  /** Entries not attempted: unresolved review notes or a metadata policy failure. */
  refused: SiteImportRefusal[];
};

export type ImportSiteMediaOptions = {
  items: readonly SiteImportItem[];
  target: MediaEndpoint;
  dryRun?: boolean;
  /** Import entries that still have `reviewNotes` (rehearsals only; the notes are never imported). */
  allowUnreviewed?: boolean;
  correlationId?: string;
};

function refusalFor(entry: SiteMediaEntry, allowUnreviewed: boolean): string | null {
  if (!allowUnreviewed && entry.reviewNotes && entry.reviewNotes.length > 0) {
    return `unresolved review notes: ${entry.reviewNotes.join('; ')}`;
  }
  const { issues } = validateMediaMeta(entry.kind, siteEntryMeta(entry), { computed: true });
  return issues.length > 0 ? `metadata policy: ${issues.map((issue) => issue.message).join('; ')}` : null;
}

function memorySource(assets: MediaAsset[], bytesByPath: Map<string, Buffer>): MediaTransferSource {
  return {
    catalog: {
      async listAssets(filter: ListAssetsFilter = {}) {
        const tenant = filter.tenant ?? 'portfolio';
        const offset = filter.offset ?? 0;
        const matching = assets.filter((asset) => asset.tenant === tenant);
        return matching.slice(offset, filter.limit === undefined ? undefined : offset + filter.limit);
      },
      async listChildren() {
        return [];
      },
    },
    blobs: {
      async get(key: string) {
        const bytes = bytesByPath.get(key);
        if (!bytes) {
          throw new MediaNotFoundError(`No manifest bytes for ${key}`);
        }
        return bytes;
      },
    },
  };
}

/** The target already holds this entry as imported (same id, path and manifest sha256, object present). */
async function alreadyImported(target: MediaEndpoint, entry: SiteMediaEntry): Promise<boolean> {
  const existing = await target.catalog.getAsset(entry.id);
  return (
    existing !== null &&
    existing.path === entry.path &&
    existing.sha256 === entry.sha256 &&
    (await target.blobs.exists(entry.path))
  );
}

/**
 * Refuse entries with review notes (unless `allowUnreviewed`) or metadata policy issues; skip
 * entries the target already has as imported (before the bytes are compared, so a rerun after a
 * sanitizer upgrade stays idempotent); fail entries whose bytes do not match the manifest sha256
 * (the manifest is stale: rerun the draft); transfer the rest, tagged `site`, recording
 * `SITE_IMPORT_AUDIT_ACTION` on the target.
 */
export async function importSiteMedia(opts: ImportSiteMediaOptions): Promise<SiteImportReport> {
  const refused: SiteImportRefusal[] = [];
  const failed: TransferReport['failed'] = [];
  const skipped: string[] = [];
  const assets: MediaAsset[] = [];
  const bytesByPath = new Map<string, Buffer>();
  const createdAt = new Date().toISOString();
  for (const item of opts.items) {
    const { entry } = item;
    const reason = refusalFor(entry, opts.allowUnreviewed ?? false);
    if (reason) {
      refused.push({ id: entry.id, reason });
      continue;
    }
    if (await alreadyImported(opts.target, entry)) {
      skipped.push(entry.id);
      continue;
    }
    let bytes: Buffer;
    try {
      bytes = typeof item.bytes === 'function' ? await item.bytes() : item.bytes;
    } catch (err) {
      failed.push({ id: entry.id, error: err instanceof Error ? err.message : String(err) });
      continue;
    }
    const sha = sha256Hex(bytes);
    if (sha !== entry.sha256) {
      failed.push({
        id: entry.id,
        error: `sanitized bytes have sha256 ${sha}, manifest says ${entry.sha256}: rerun npm run media:site-manifest -- --draft and review the change`,
      });
      continue;
    }
    const mime = mimeForExtension(entry.ext) ?? 'application/octet-stream';
    assets.push(siteEntryToAsset(entry, { byteSize: bytes.length, mime, createdAt }));
    bytesByPath.set(entry.path, bytes);
  }
  const tenants = [...new Set(assets.map((asset) => asset.tenant))] as MediaTenant[];
  const report = await transferMedia({
    source: memorySource(assets, bytesByPath),
    target: opts.target,
    dryRun: opts.dryRun,
    includeChildren: false,
    tenants,
    correlationId: opts.correlationId ?? randomUUID(),
    auditAction: SITE_IMPORT_AUDIT_ACTION,
  });
  return { ...report, skipped: [...skipped, ...report.skipped], failed: [...failed, ...report.failed], refused };
}

/** Non-zero when anything was refused, conflicted or failed. */
export function siteImportSucceeded(report: SiteImportReport): boolean {
  return (
    report.refused.length === 0 &&
    report.conflicts.length === 0 &&
    report.failed.length === 0 &&
    report.children.failed.length === 0
  );
}
