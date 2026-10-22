import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import Database from 'better-sqlite3';
import sharp from 'sharp';

import { FS_BLOB_META_SUFFIX } from '../src/adapters/fs-blob-store.js';
import { createSqliteMediaStores, type SqliteMediaStores } from '../src/create-media-library.js';
import { MediaLibrary } from '../src/media-library.js';
import type { MediaNameRef } from '../src/paths.js';
import type { BlobStore, CatalogStore } from '../src/ports/index.js';
import { TRANSFER_AUDIT_ACTION, transferMedia, type MediaEndpoint } from '../src/transfer.js';
import { createDefaultTransformerRegistry } from '../src/transformers/registry.js';
import type { MediaAsset, MediaChild } from '../src/types.js';

const IMMUTABLE = 'public, max-age=31536000, immutable';

function sha256(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

async function makePng(r: number): Promise<Buffer> {
  return sharp({ create: { width: 48, height: 32, channels: 3, background: { r, g: 40, b: 40 } } })
    .png()
    .toBuffer();
}

function libraryFor(stores: SqliteMediaStores): MediaLibrary {
  return new MediaLibrary({ ...stores, transformers: createDefaultTransformerRegistry() });
}

function endpoint(stores: SqliteMediaStores): MediaEndpoint {
  return { catalog: stores.catalog, blobs: stores.blobs, audit: stores.audit };
}

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
}

describe('transferMedia (SQLite + FS to SQLite + FS)', () => {
  let root: string;
  let source: SqliteMediaStores;
  let target: SqliteMediaStores;
  let sourceLib: MediaLibrary;
  let targetLib: MediaLibrary;
  let targetBlobDir: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'tgmc-transfer-'));
    targetBlobDir = join(root, 'target', 'blobs');
    source = createSqliteMediaStores({
      dbPath: join(root, 'source', 'media.sqlite'),
      blobDir: join(root, 'source', 'blobs'),
    });
    target = createSqliteMediaStores({ dbPath: join(root, 'target', 'media.sqlite'), blobDir: targetBlobDir });
    sourceLib = libraryFor(source);
    targetLib = libraryFor(target);
  });

  afterEach(() => {
    source.close();
    target.close();
    rmSync(root, { recursive: true, force: true });
  });

  async function seed(filename: string, r: number, meta: Record<string, unknown> = {}): Promise<MediaAsset> {
    return sourceLib.ingest({ kind: 'image', data: await makePng(r), mime: 'image/png', filename, meta });
  }

  it('createSqliteMediaStores wires catalog, jobs, audit and an FsBlobStore under blobDir', async () => {
    const asset = await seed('hero.png', 10);
    expect(await source.catalog.getAsset(asset.id)).toMatchObject({ path: 'm/pf/i/hero.png' });
    expect(await source.blobs.exists('m/pf/i/hero.png')).toBe(true);
    expect(existsSync(join(root, 'source', 'blobs', 'm', 'pf', 'i', 'hero.png'))).toBe(true);
    expect((await source.audit.listByEntity(asset.id)).map((e) => e.action)).toContain('asset.ingested');
    expect(await source.jobs.listJobs({ assetId: asset.id })).toEqual([]);
  });

  it('copies assets with the same id, tenant, name, path and meta, verifying the bytes on the target', async () => {
    const hero = await seed('hero.png', 10, { tags: ['hero'], alt: 'Hero' });
    const logo = await seed('logo.png', 20);

    const report = await transferMedia({ source: endpoint(source), target: endpoint(target) });

    expect(report.copied.sort()).toEqual([hero.id, logo.id].sort());
    expect(report.skipped).toEqual([]);
    expect(report.conflicts).toEqual([]);
    expect(report.failed).toEqual([]);
    expect(report.dryRun).toBe(false);

    expect(await target.catalog.getAsset(hero.id)).toEqual(hero);
    expect(await target.catalog.getAsset(logo.id)).toEqual(logo);
    const bytes = await target.blobs.get(hero.path);
    expect(sha256(bytes)).toBe(hero.sha256);

    const sidecar = JSON.parse(
      readFileSync(join(targetBlobDir, ...hero.path.split('/')) + FS_BLOB_META_SUFFIX, 'utf8')
    ) as Record<string, unknown>;
    expect(sidecar).toMatchObject({
      contentType: 'image/png',
      cacheControl: IMMUTABLE,
      contentDisposition: 'inline; filename="hero.png"',
      sha256: hero.sha256,
    });
  });

  it('reruns are idempotent: same id and sha256 on the target is skipped', async () => {
    const hero = await seed('hero.png', 10);
    await transferMedia({ source: endpoint(source), target: endpoint(target) });

    const again = await transferMedia({ source: endpoint(source), target: endpoint(target) });

    expect(again.copied).toEqual([]);
    expect(again.skipped).toEqual([hero.id]);
    expect(again.conflicts).toEqual([]);
    expect(again.failed).toEqual([]);
    expect((await target.audit.listByEntity(hero.id)).filter((e) => e.action === TRANSFER_AUDIT_ACTION)).toHaveLength(
      1
    );
  });

  it('reports the same id with a different sha256 on the target as a conflict and never overwrites it', async () => {
    const hero = await seed('hero.png', 10);
    const theirs: MediaAsset = { ...hero, sha256: 'f'.repeat(64), name: 'other', path: 'm/pf/i/other.png' };
    await target.catalog.insertAsset(theirs);

    const report = await transferMedia({ source: endpoint(source), target: endpoint(target) });

    expect(report.conflicts).toEqual([hero.id]);
    expect(report.conflictReasons[hero.id]).toMatch(/sha256/);
    expect(report.copied).toEqual([]);
    expect(await target.catalog.getAsset(hero.id)).toEqual(theirs);
    expect(await target.blobs.exists(hero.path)).toBe(false);
  });

  it('reports the same name under a different id on the target as a conflict', async () => {
    const hero = await seed('hero.png', 10);
    const theirs = await targetLib.ingest({
      kind: 'image',
      data: await makePng(99),
      mime: 'image/jpeg',
      filename: 'hero.jpg',
    });
    const theirBytes = await target.blobs.get(theirs.path);

    const report = await transferMedia({ source: endpoint(source), target: endpoint(target) });

    expect(report.conflicts).toEqual([hero.id]);
    expect(report.conflictReasons[hero.id]).toContain(theirs.id);
    expect(await target.catalog.getAsset(hero.id)).toBeNull();
    expect(await target.blobs.exists(hero.path)).toBe(false);
    expect(await target.blobs.get(theirs.path)).toEqual(theirBytes);
  });

  it('reports an object with different bytes already at the path (no catalog row) as a conflict', async () => {
    const hero = await seed('hero.png', 10);
    await target.blobs.put(hero.path, await makePng(77));

    const report = await transferMedia({ source: endpoint(source), target: endpoint(target) });

    expect(report.conflicts).toEqual([hero.id]);
    expect(await target.catalog.getAsset(hero.id)).toBeNull();
    expect(sha256(await target.blobs.get(hero.path))).not.toBe(hero.sha256);
  });

  it('adopts an identical object already at the path (a half-finished earlier run) without rewriting it', async () => {
    const hero = await seed('hero.png', 10);
    await target.blobs.put(hero.path, await source.blobs.get(hero.path));

    const report = await transferMedia({ source: endpoint(source), target: endpoint(target) });

    expect(report.copied).toEqual([hero.id]);
    expect(await target.catalog.getAsset(hero.id)).toEqual(hero);
  });

  it('verifies the source before adopting an identical object on the target', async () => {
    const hero = await seed('hero.png', 10);
    const bytes = await source.blobs.get(hero.path);
    await target.blobs.put(hero.path, bytes);
    await source.blobs.delete(hero.path);
    await source.blobs.put(hero.path, await makePng(55));

    for (const dryRun of [true, false]) {
      const report = await transferMedia({ source: endpoint(source), target: endpoint(target), dryRun });

      expect(report.copied).toEqual([]);
      expect(report.failed).toEqual([{ id: hero.id, error: expect.stringMatching(/Source object .*sha256/) }]);
    }
    expect(await target.catalog.getAsset(hero.id)).toBeNull();
    expect(await target.blobs.get(hero.path)).toEqual(bytes);
  });

  it('dry run touches nothing on the target but reports what would be copied, skipped and conflicted', async () => {
    const hero = await seed('hero.png', 10);
    const logo = await seed('logo.png', 20);
    const { child } = await sourceLib.materializeChild(hero.id, null, null, { variant: 't' });
    await target.catalog.insertAsset({ ...logo, sha256: 'e'.repeat(64), name: 'other', path: 'm/pf/i/other.png' });

    const report = await transferMedia({ source: endpoint(source), target: endpoint(target), dryRun: true });

    expect(report.dryRun).toBe(true);
    expect(report.copied).toEqual([hero.id]);
    expect(report.conflicts).toEqual([logo.id]);
    expect(report.children.copied).toEqual([child.id]);
    expect(await target.catalog.getAsset(hero.id)).toBeNull();
    expect(await target.catalog.listChildren(hero.id)).toEqual([]);
    expect(await target.audit.listByEntity(hero.id)).toEqual([]);
    expect(listFiles(targetBlobDir)).toEqual([]);
  });

  it('copies only ready children, keeping their ids and variant paths; jobs are not copied', async () => {
    const hero = await seed('hero.png', 10);
    const ready = await sourceLib.materializeChild(hero.id, null, null, { variant: 't' });
    const pending = await sourceLib.enqueueMaterializeChild(hero.id, null, null, { variant: '640' });
    expect(ready.child.status).toBe('ready');
    expect(pending.child.status).toBe('pending');

    const report = await transferMedia({ source: endpoint(source), target: endpoint(target) });

    expect(report.children.copied).toEqual([ready.child.id]);
    expect(report.children.failed).toEqual([]);
    const children = await target.catalog.listChildren(hero.id);
    expect(children).toEqual([ready.child]);
    expect(ready.child.path).toBe('m/pf/i/hero@t.webp');
    const childBytes = await target.blobs.get('m/pf/i/hero@t.webp');
    expect(childBytes).toEqual(await source.blobs.get('m/pf/i/hero@t.webp'));
    const sidecar = JSON.parse(
      readFileSync(join(targetBlobDir, 'm', 'pf', 'i', `hero@t.webp${FS_BLOB_META_SUFFIX}`), 'utf8')
    ) as Record<string, unknown>;
    expect(sidecar).toMatchObject({
      contentType: 'image/webp',
      cacheControl: IMMUTABLE,
      contentDisposition: 'inline; filename="hero@t.webp"',
    });
    expect(await target.jobs.listJobs({ assetId: hero.id })).toEqual([]);

    const again = await transferMedia({ source: endpoint(source), target: endpoint(target) });
    expect(again.children.skipped).toEqual([ready.child.id]);
    expect(again.children.copied).toEqual([]);
  });

  it('copies children missing on the target when the asset itself is skipped', async () => {
    const hero = await seed('hero.png', 10);
    await transferMedia({ source: endpoint(source), target: endpoint(target) });
    const { child } = await sourceLib.materializeChild(hero.id, null, null, { variant: 't' });

    const report = await transferMedia({ source: endpoint(source), target: endpoint(target) });

    expect(report.skipped).toEqual([hero.id]);
    expect(report.children.copied).toEqual([child.id]);
    expect(await target.catalog.listChildren(hero.id)).toEqual([child]);
  });

  it('a skipped child whose object is missing on the target is a failure', async () => {
    const hero = await seed('hero.png', 10);
    const { child } = await sourceLib.materializeChild(hero.id, null, null, { variant: 't' });
    await transferMedia({ source: endpoint(source), target: endpoint(target) });
    await target.blobs.delete(child.path!);

    const report = await transferMedia({ source: endpoint(source), target: endpoint(target) });

    expect(report.skipped).toEqual([hero.id]);
    expect(report.children.skipped).toEqual([]);
    expect(report.children.failed).toEqual([{ id: child.id, error: expect.stringMatching(/object .*missing/i) }]);
  });

  describe('a failed child insert', () => {
    function failingChildInsert(opts: { commit: boolean; rereadFails?: boolean }): CatalogStore {
      let insertAttempted = false;
      return Object.assign(Object.create(target.catalog) as CatalogStore, {
        insertChildIfAssetExists: async (child: MediaChild) => {
          insertAttempted = true;
          if (opts.commit) {
            await target.catalog.insertChildIfAssetExists(child);
          }
          throw new Error('timeout');
        },
        listChildren: async (assetId: string) => {
          if (insertAttempted && opts.rereadFails) {
            throw new Error('catalog unreachable');
          }
          return target.catalog.listChildren(assetId);
        },
      });
    }

    it('removes the object it wrote when the row did not land', async () => {
      const hero = await seed('hero.png', 10);
      const { child } = await sourceLib.materializeChild(hero.id, null, null, { variant: 't' });

      const report = await transferMedia({
        source: endpoint(source),
        target: { catalog: failingChildInsert({ commit: false }), blobs: target.blobs, audit: target.audit },
      });

      expect(report.children.failed).toEqual([{ id: child.id, error: 'timeout' }]);
      expect(await target.blobs.exists(child.path!)).toBe(false);
    });

    it('keeps the object and counts as copied when the row landed anyway', async () => {
      const hero = await seed('hero.png', 10);
      const { child } = await sourceLib.materializeChild(hero.id, null, null, { variant: 't' });

      const report = await transferMedia({
        source: endpoint(source),
        target: { catalog: failingChildInsert({ commit: true }), blobs: target.blobs, audit: target.audit },
      });

      expect(report.children.copied).toEqual([child.id]);
      expect(report.children.failed).toEqual([]);
      expect(await target.catalog.listChildren(hero.id)).toEqual([child]);
      expect(await target.blobs.exists(child.path!)).toBe(true);
    });

    it('keeps the object and records a failure when the re-read also fails', async () => {
      const hero = await seed('hero.png', 10);
      const { child } = await sourceLib.materializeChild(hero.id, null, null, { variant: 't' });

      const report = await transferMedia({
        source: endpoint(source),
        target: {
          catalog: failingChildInsert({ commit: false, rereadFails: true }),
          blobs: target.blobs,
          audit: target.audit,
        },
      });

      expect(report.children.copied).toEqual([]);
      expect(report.children.failed).toEqual([
        { id: child.id, error: expect.stringMatching(/timeout.*catalog unreachable/) },
      ]);
      expect(await target.blobs.exists(child.path!)).toBe(true);

      const rerun = await transferMedia({ source: endpoint(source), target: endpoint(target) });
      expect(rerun.children.copied).toEqual([child.id]);
      expect(await target.catalog.listChildren(hero.id)).toEqual([child]);
    });
  });

  it('includeChildren: false copies the asset only', async () => {
    const hero = await seed('hero.png', 10);
    await sourceLib.materializeChild(hero.id, null, null, { variant: 't' });

    const report = await transferMedia({ source: endpoint(source), target: endpoint(target), includeChildren: false });

    expect(report.copied).toEqual([hero.id]);
    expect(report.children.copied).toEqual([]);
    expect(await target.catalog.listChildren(hero.id)).toEqual([]);
    expect(await target.blobs.exists('m/pf/i/hero@t.webp')).toBe(false);
  });

  it('a missing source blob records a failure, creates no row, and the run continues', async () => {
    const hero = await seed('hero.png', 10);
    const logo = await seed('logo.png', 20);
    await source.blobs.delete(hero.path);

    const report = await transferMedia({ source: endpoint(source), target: endpoint(target) });

    expect(report.failed.map((f) => f.id)).toEqual([hero.id]);
    expect(report.copied).toEqual([logo.id]);
    expect(await target.catalog.getAsset(hero.id)).toBeNull();
    expect(await target.blobs.exists(hero.path)).toBe(false);
  });

  it('a source blob whose bytes do not match the catalog sha256 is a failure', async () => {
    const hero = await seed('hero.png', 10);
    await source.blobs.delete(hero.path);
    await source.blobs.put(hero.path, await makePng(55));

    const report = await transferMedia({ source: endpoint(source), target: endpoint(target) });

    expect(report.failed).toEqual([{ id: hero.id, error: expect.stringMatching(/sha256/) }]);
    expect(await target.catalog.getAsset(hero.id)).toBeNull();
    expect(await target.blobs.exists(hero.path)).toBe(false);
  });

  it('a target object that fails verification is removed and no row is written', async () => {
    const hero = await seed('hero.png', 10);
    const lying: BlobStore = {
      put: (key, data, options) => target.blobs.put(key, data, options),
      get: (key) => target.blobs.get(key),
      delete: (key) => target.blobs.delete(key),
      exists: (key) => target.blobs.exists(key),
      digestSha256: async () => '0'.repeat(64),
    };

    const report = await transferMedia({
      source: endpoint(source),
      target: { catalog: target.catalog, blobs: lying, audit: target.audit },
    });

    expect(report.failed).toEqual([{ id: hero.id, error: expect.stringMatching(/verif|sha256/i) }]);
    expect(await target.catalog.getAsset(hero.id)).toBeNull();
    expect(await target.blobs.exists(hero.path)).toBe(false);
  });

  it('a failed catalog insert removes the object it wrote', async () => {
    const hero = await seed('hero.png', 10);
    const catalog: CatalogStore = Object.assign(Object.create(target.catalog) as CatalogStore, {
      insertAsset: async () => {
        throw new Error('catalog offline');
      },
    });

    const report = await transferMedia({
      source: endpoint(source),
      target: { catalog, blobs: target.blobs, audit: target.audit },
    });

    expect(report.failed).toEqual([{ id: hero.id, error: 'catalog offline' }]);
    expect(await target.blobs.exists(hero.path)).toBe(false);
  });

  it('appends a transfer audit event on the target and does not copy the source audit history', async () => {
    const hero = await seed('hero.png', 10);
    const { child } = await sourceLib.materializeChild(hero.id, null, null, { variant: 't' });

    await transferMedia({ source: endpoint(source), target: endpoint(target), correlationId: 'run-1' });

    const events = await target.audit.listByEntity(hero.id);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      action: TRANSFER_AUDIT_ACTION,
      entityType: 'asset',
      entityId: hero.id,
      correlationId: 'run-1',
      payload: { path: hero.path, sha256: hero.sha256, assetCopied: true, children: [child.id] },
    });
    expect(await target.audit.listByEntity(child.id)).toEqual([]);
  });

  it('pages through every tenant', async () => {
    const a = await seed('a.png', 1);
    const b = await seed('b.png', 2);
    const c = await seed('c.png', 3);
    const ha = await sourceLib.ingest({
      kind: 'image',
      data: await makePng(4),
      mime: 'image/png',
      filename: 'ha.png',
      tenant: 'hyperactivity',
    });

    const report = await transferMedia({ source: endpoint(source), target: endpoint(target), pageSize: 1 });

    expect(report.copied.sort()).toEqual([a.id, b.id, c.id, ha.id].sort());
    expect(await target.catalog.getAsset(ha.id)).toMatchObject({ tenant: 'hyperactivity', path: 'm/ha/i/ha.png' });
  });

  it('rejects a non-positive page size', async () => {
    await expect(transferMedia({ source: endpoint(source), target: endpoint(target), pageSize: 0 })).rejects.toThrow(
      /pageSize/
    );
  });

  it('reports how many source assets it saw', async () => {
    await seed('a.png', 1);
    await seed('b.png', 2);

    const dry = await transferMedia({ source: endpoint(source), target: endpoint(target), dryRun: true });
    const real = await transferMedia({ source: endpoint(source), target: endpoint(target), pageSize: 1 });

    expect(dry.sourceCount).toBe(2);
    expect(real.sourceCount).toBe(2);
  });

  it('a listing error mid-run keeps the partial report, records the error and moves on to the next tenant', async () => {
    await seed('a.png', 1);
    await seed('b.png', 2);
    const ha = await sourceLib.ingest({
      kind: 'image',
      data: await makePng(4),
      mime: 'image/png',
      filename: 'ha.png',
      tenant: 'hyperactivity',
    });
    const catalog: CatalogStore = Object.assign(Object.create(source.catalog) as CatalogStore, {
      listAssets: async (filter: Parameters<CatalogStore['listAssets']>[0]) => {
        if (filter?.tenant === 'portfolio' && (filter.offset ?? 0) > 0) {
          throw new Error('throttled');
        }
        return source.catalog.listAssets(filter);
      },
    });

    const report = await transferMedia({
      source: { catalog, blobs: source.blobs },
      target: endpoint(target),
      pageSize: 1,
    });

    const newest = (await source.catalog.listAssets({ limit: 1 }))[0];
    expect(report.copied.sort()).toEqual([newest.id, ha.id].sort());
    expect(report.failed).toEqual([{ id: 'listing portfolio (offset 1)', error: 'throttled' }]);
    expect(report.sourceCount).toBe(2);
  });

  describe('target reservations and create-only writes', () => {
    const heroRef: MediaNameRef = { tenant: 'portfolio', kind: 'image', name: 'hero' };

    it('holds the name on the target for 15 minutes while copying, and releases it when the copy fails', async () => {
      const hero = await seed('hero.png', 10);
      const logo = await seed('logo.png', 20);
      await source.blobs.delete(logo.path);
      const holds: Array<{ assetId: string; path: string; expiresAt: string }> = [];
      const catalog: CatalogStore = Object.assign(Object.create(target.catalog) as CatalogStore, {
        holdName: async (ref: MediaNameRef, input: { assetId: string; path: string; expiresAt: string }) => {
          holds.push(input);
          return target.catalog.holdName(ref, input);
        },
      });
      const started = Date.now();

      const report = await transferMedia({
        source: endpoint(source),
        target: { catalog, blobs: target.blobs, audit: target.audit },
      });

      expect(report.copied).toEqual([hero.id]);
      expect(report.failed.map((f) => f.id)).toEqual([logo.id]);
      expect(
        holds.map(({ assetId, path }) => ({ assetId, path })).sort((x, y) => x.path.localeCompare(y.path))
      ).toEqual([
        { assetId: hero.id, path: hero.path },
        { assetId: logo.id, path: logo.path },
      ]);
      for (const { expiresAt } of holds) {
        const ttl = Date.parse(expiresAt) - started;
        expect(ttl).toBeGreaterThan(14 * 60_000);
        expect(ttl).toBeLessThan(16 * 60_000);
      }
      expect(await target.catalog.getNameHolder(heroRef)).toMatchObject({ assetId: hero.id, pending: false });
      expect(await target.catalog.getNameHolder({ ...heroRef, name: 'logo' })).toBeNull();
    });

    it('a dry run reserves nothing', async () => {
      await seed('hero.png', 10);
      const catalog: CatalogStore = Object.assign(Object.create(target.catalog) as CatalogStore, {
        holdName: async () => {
          throw new Error('dry run must not reserve');
        },
      });

      const report = await transferMedia({
        source: endpoint(source),
        target: { catalog, blobs: target.blobs, audit: target.audit },
        dryRun: true,
      });

      expect(report.failed).toEqual([]);
      expect(report.copied).toHaveLength(1);
    });

    it('a name reserved by an admin upload mid-run is a conflict: the upload is neither overwritten nor deleted', async () => {
      const hero = await seed('hero.png', 10);
      const adminBytes = await makePng(200);
      let admin: { assetId: string; path: string } | undefined;
      const catalog: CatalogStore = Object.assign(Object.create(target.catalog) as CatalogStore, {
        getNameHolder: async (ref: MediaNameRef) => {
          const holder = await target.catalog.getNameHolder(ref);
          admin ??= await targetLib.reserveName({ kind: 'image', filename: 'hero.png', mime: 'image/png' });
          return holder;
        },
      });
      let adminUploaded = false;
      const adminUpload = async () => {
        if (admin && !adminUploaded) {
          adminUploaded = true;
          await target.blobs.put(admin.path, adminBytes);
        }
      };
      const transferPuts: string[] = [];
      const blobs: BlobStore = Object.assign(Object.create(target.blobs) as BlobStore, {
        exists: async (key: string) => {
          const found = await target.blobs.exists(key);
          await adminUpload();
          return found;
        },
        put: async (key: string, data: Buffer, options: Parameters<BlobStore['put']>[2]) => {
          transferPuts.push(key);
          return target.blobs.put(key, data, options);
        },
      });

      const report = await transferMedia({ source: endpoint(source), target: { catalog, blobs, audit: target.audit } });
      await adminUpload();

      expect(report.conflicts).toEqual([hero.id]);
      expect(report.failed).toEqual([]);
      expect(transferPuts).toEqual([]);
      expect(await target.blobs.get(hero.path)).toEqual(adminBytes);
      expect(await target.catalog.getAsset(hero.id)).toBeNull();
      expect(await target.catalog.getNameHolder(heroRef)).toMatchObject({ assetId: admin?.assetId, pending: true });
    });

    it('an object appearing at the key after the existence check is a conflict and is never overwritten', async () => {
      const hero = await seed('hero.png', 10);
      const stranger = await makePng(150);
      const blobs: BlobStore = Object.assign(Object.create(target.blobs) as BlobStore, {
        exists: async (key: string) => {
          const found = await target.blobs.exists(key);
          if (!found) {
            await target.blobs.put(key, stranger);
          }
          return found;
        },
      });

      const report = await transferMedia({
        source: endpoint(source),
        target: { catalog: target.catalog, blobs, audit: target.audit },
      });

      expect(report.conflicts).toEqual([hero.id]);
      expect(report.failed).toEqual([]);
      expect(await target.blobs.get(hero.path)).toEqual(stranger);
      expect(await target.catalog.getAsset(hero.id)).toBeNull();
      expect(await target.catalog.getNameHolder(heroRef)).toBeNull();
    });

    it('a variant object appearing after the existence check is a child conflict and is never overwritten', async () => {
      const hero = await seed('hero.png', 10);
      await transferMedia({ source: endpoint(source), target: endpoint(target) });
      const { child } = await sourceLib.materializeChild(hero.id, null, null, { variant: 't' });
      const stranger = Buffer.from('not the transfer bytes');
      const blobs: BlobStore = Object.assign(Object.create(target.blobs) as BlobStore, {
        exists: async (key: string) => {
          const found = await target.blobs.exists(key);
          if (!found && key === child.path) {
            await target.blobs.put(key, stranger);
          }
          return found;
        },
      });

      const report = await transferMedia({
        source: endpoint(source),
        target: { catalog: target.catalog, blobs, audit: target.audit },
      });

      expect(report.children.conflicts).toEqual([child.id]);
      expect(await target.blobs.get(child.path!)).toEqual(stranger);
      expect(await target.catalog.listChildren(hero.id)).toEqual([]);
    });

    it('an insert that fails after the row landed keeps the object and counts as copied', async () => {
      const hero = await seed('hero.png', 10);
      const catalog: CatalogStore = Object.assign(Object.create(target.catalog) as CatalogStore, {
        insertAsset: async (asset: MediaAsset) => {
          await target.catalog.insertAsset(asset);
          throw new Error('timeout after commit');
        },
      });

      const report = await transferMedia({
        source: endpoint(source),
        target: { catalog, blobs: target.blobs, audit: target.audit },
      });

      expect(report.copied).toEqual([hero.id]);
      expect(report.failed).toEqual([]);
      expect(await target.catalog.getAsset(hero.id)).toEqual(hero);
      expect(sha256(await target.blobs.get(hero.path))).toBe(hero.sha256);
    });

    it('a failed insert whose re-read also fails keeps the object and records a failure', async () => {
      const hero = await seed('hero.png', 10);
      let insertAttempted = false;
      const catalog: CatalogStore = Object.assign(Object.create(target.catalog) as CatalogStore, {
        insertAsset: async () => {
          insertAttempted = true;
          throw new Error('timeout');
        },
        getAsset: async (id: string) => {
          if (insertAttempted) {
            throw new Error('catalog unreachable');
          }
          return target.catalog.getAsset(id);
        },
      });

      const report = await transferMedia({
        source: endpoint(source),
        target: { catalog, blobs: target.blobs, audit: target.audit },
      });

      expect(report.copied).toEqual([]);
      expect(report.failed).toEqual([{ id: hero.id, error: expect.stringMatching(/timeout.*catalog unreachable/) }]);
      expect(sha256(await target.blobs.get(hero.path))).toBe(hero.sha256);

      const rerun = await transferMedia({ source: endpoint(source), target: endpoint(target) });
      expect(rerun.copied).toEqual([hero.id]);
      expect(await target.catalog.getAsset(hero.id)).toEqual(hero);
    });

    it('a skipped asset whose object is missing on the target is a failure', async () => {
      const hero = await seed('hero.png', 10);
      await transferMedia({ source: endpoint(source), target: endpoint(target) });
      await target.blobs.delete(hero.path);

      const report = await transferMedia({ source: endpoint(source), target: endpoint(target) });

      expect(report.skipped).toEqual([]);
      expect(report.failed).toEqual([{ id: hero.id, error: expect.stringMatching(/object .*missing/i) }]);
    });
  });
});

describe('createSqliteMediaStores({ readOnly: true })', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'tgmc-transfer-ro-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('rejects readOnly with a pre-opened database, which it could not make read-only', () => {
    const db = new Database(':memory:');
    try {
      expect(() =>
        createSqliteMediaStores({
          dbPath: join(root, 'media.sqlite'),
          blobDir: join(root, 'blobs'),
          database: db,
          readOnly: true,
        })
      ).toThrow(/readOnly/);
    } finally {
      db.close();
    }
  });

  it('a missing database reads as an empty catalog and nothing is created', async () => {
    const dir = join(root, 'missing');
    const stores = createSqliteMediaStores({
      dbPath: join(dir, 'media.sqlite'),
      blobDir: join(dir, 'blobs'),
      readOnly: true,
    });
    try {
      expect(await stores.catalog.listAssets()).toEqual([]);
      expect(await stores.catalog.getNameHolder({ tenant: 'portfolio', kind: 'image', name: 'hero' })).toBeNull();
      expect(await stores.blobs.exists('m/pf/i/hero.png')).toBe(false);
    } finally {
      stores.close();
    }
    expect(existsSync(dir)).toBe(false);
  });

  it('an existing database opens as is: readable, never migrated or written', async () => {
    const dir = join(root, 'existing');
    mkdirSync(dir);
    const writable = createSqliteMediaStores({ dbPath: join(dir, 'media.sqlite'), blobDir: join(dir, 'blobs') });
    const hero = await libraryFor(writable).ingest({
      kind: 'image',
      data: await makePng(10),
      mime: 'image/png',
      filename: 'hero.png',
    });
    writable.close();
    const before = sha256(readFileSync(join(dir, 'media.sqlite')));

    const stores = createSqliteMediaStores({
      dbPath: join(dir, 'media.sqlite'),
      blobDir: join(dir, 'blobs'),
      readOnly: true,
    });
    try {
      expect(await stores.catalog.getAsset(hero.id)).toEqual(hero);
      await expect(stores.catalog.insertAsset({ ...hero, id: 'x', name: 'x', path: 'm/pf/i/x.png' })).rejects.toThrow();
    } finally {
      stores.close();
    }
    expect(sha256(readFileSync(join(dir, 'media.sqlite')))).toBe(before);
  });

  it('a dry run onto a missing read-only target reports everything as would-copy and creates nothing', async () => {
    const source = createSqliteMediaStores({
      dbPath: join(root, 'source', 'media.sqlite'),
      blobDir: join(root, 'source', 'blobs'),
    });
    const target = createSqliteMediaStores({
      dbPath: join(root, 'target', 'media.sqlite'),
      blobDir: join(root, 'target', 'blobs'),
      readOnly: true,
    });
    try {
      const hero = await libraryFor(source).ingest({
        kind: 'image',
        data: await makePng(10),
        mime: 'image/png',
        filename: 'hero.png',
      });
      const { child } = await libraryFor(source).materializeChild(hero.id, null, null, { variant: 't' });

      const report = await transferMedia({ source: endpoint(source), target: endpoint(target), dryRun: true });

      expect(report).toMatchObject({ copied: [hero.id], conflicts: [], failed: [], sourceCount: 1 });
      expect(report.children.copied).toEqual([child.id]);
    } finally {
      source.close();
      target.close();
    }
    expect(existsSync(join(root, 'target'))).toBe(false);
  });
});
