import Database from 'better-sqlite3';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';
import { vi } from 'vitest';

import { FsBlobStore } from '../src/adapters/fs-blob-store.js';
import { openMediaDatabase } from '../src/adapters/sqlite/db.js';
import { SqliteAuditStore, SqliteCatalogStore, SqliteJobStore } from '../src/adapters/sqlite/stores.js';
import { createMediaLibrary } from '../src/create-media-library.js';
import { MediaConflictError, MediaNameConflictError, RecipeValidationError } from '../src/errors.js';
import { MediaLibrary } from '../src/media-library.js';
import type { BlobStore } from '../src/ports/index.js';
import { createDefaultTransformerRegistry } from '../src/transformers/registry.js';

async function makePng(width = 64): Promise<Buffer> {
  return sharp({
    create: { width, height: 48, channels: 3, background: { r: 200, g: 40, b: 40 } },
  })
    .png()
    .toBuffer();
}

describe('media keys (SQLite + filesystem)', () => {
  let root: string;
  let dbPath: string;
  let blobDir: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'tgmc-media-keys-'));
    dbPath = join(root, 'media.sqlite');
    blobDir = join(root, 'blobs');
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  describe('ingest', () => {
    it('stores the original at m/pf/{kind}/{name}.{ext} and records tenant, name and path', async () => {
      const handle = createMediaLibrary({ dbPath, blobDir });
      try {
        const asset = await handle.library.ingest({
          kind: 'image',
          data: await makePng(),
          mime: 'image/png',
          filename: 'Manhattan Keyframe.PNG',
        });
        expect(asset.tenant).toBe('portfolio');
        expect(asset.name).toBe('manhattan-keyframe');
        expect(asset.path).toBe('m/pf/i/manhattan-keyframe.png');
        expect(asset).not.toHaveProperty('blobKey');
        expect(existsSync(join(blobDir, 'm', 'pf', 'i', 'manhattan-keyframe.png'))).toBe(true);
        expect((await handle.library.getAsset(asset.id)).path).toBe(asset.path);
      } finally {
        handle.close();
      }
    });

    it('derives the filename from a file path, else from kind + digest and the mime extension', async () => {
      const handle = createMediaLibrary({ dbPath, blobDir });
      try {
        const file = join(root, 'Some File_Name.png');
        writeFileSync(file, await makePng(20));
        const fromPath = await handle.library.ingest({ kind: 'image', data: file, mime: 'image/png' });
        expect(fromPath.path).toBe('m/pf/i/some-file-name.png');

        const fromBuffer = await handle.library.ingest({ kind: 'image', data: await makePng(21), mime: 'image/png' });
        expect(fromBuffer.path).toBe(`m/pf/i/image-${fromBuffer.sha256.slice(0, 8)}.png`);
      } finally {
        handle.close();
      }
    });

    it('uses the kind code for non-image kinds', async () => {
      const handle = createMediaLibrary({ dbPath, blobDir });
      try {
        const svg = await handle.library.ingest({
          kind: 'svg',
          data: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
          mime: 'image/svg+xml',
          filename: 'logo.svg',
        });
        const model = await handle.library.ingest({
          kind: 'model',
          data: Buffer.from([1, 2, 3]),
          filename: 'rig.glb',
        });
        const audio = await handle.library.ingest({ kind: 'audio', data: Buffer.from([1]), filename: 'theme.mp3' });
        expect([svg.path, model.path, audio.path]).toEqual(['m/pf/s/logo.svg', 'm/pf/o/rig.glb', 'm/pf/a/theme.mp3']);
      } finally {
        handle.close();
      }
    });

    it('returns a name conflict with a suggested free name, and frees the name on delete', async () => {
      const handle = createMediaLibrary({ dbPath, blobDir });
      try {
        const png = await makePng();
        const first = await handle.library.ingest({ kind: 'image', data: png, filename: 'hero.png' });
        const originalBytes = readFileSync(join(blobDir, first.path));

        const err = await handle.library
          .ingest({ kind: 'image', data: await makePng(10), filename: 'hero.png' })
          .catch((e: unknown) => e);
        expect(err).toBeInstanceOf(MediaNameConflictError);
        expect(err).toBeInstanceOf(MediaConflictError);
        expect((err as MediaNameConflictError).suggestedName).toBe('hero-2');
        expect((err as MediaNameConflictError).suggestedFilename).toBe('hero-2.png');
        expect((err as MediaNameConflictError).path).toBe('m/pf/i/hero.png');
        // The loser must not have touched the winner's object.
        expect(readFileSync(join(blobDir, first.path)).equals(originalBytes)).toBe(true);

        const second = await handle.library.ingest({ kind: 'image', data: await makePng(10), filename: 'hero-2.png' });
        const third = await handle.library
          .ingest({ kind: 'image', data: await makePng(11), filename: 'hero.png' })
          .catch((e: unknown) => e);
        expect((third as MediaNameConflictError).suggestedName).toBe('hero-3');

        await handle.library.deleteAsset(first.id);
        expect(existsSync(join(blobDir, first.path))).toBe(false);
        const reused = await handle.library.ingest({ kind: 'image', data: await makePng(12), filename: 'hero.png' });
        expect(reused.path).toBe('m/pf/i/hero.png');
        expect(second.path).toBe('m/pf/i/hero-2.png');
      } finally {
        handle.close();
      }
    });

    it('scopes names per kind and tenant', async () => {
      const handle = createMediaLibrary({ dbPath, blobDir });
      try {
        await handle.library.ingest({ kind: 'image', data: await makePng(), filename: 'same.png' });
        const doc = await handle.library.ingest({ kind: 'document', data: Buffer.from('x'), filename: 'same.png' });
        const other = await handle.library.ingest({
          kind: 'image',
          data: await makePng(9),
          filename: 'same.png',
          tenant: 'hyperactivity',
        });
        expect(doc.path).toBe('m/pf/d/same.png');
        expect(other.path).toBe('m/ha/i/same.png');
      } finally {
        handle.close();
      }
    });

    it('filters listAssets by tenant (default portfolio)', async () => {
      const handle = createMediaLibrary({ dbPath, blobDir });
      try {
        const pf = await handle.library.ingest({ kind: 'image', data: await makePng(), filename: 'a.png' });
        const ha = await handle.library.ingest({
          kind: 'image',
          data: await makePng(9),
          filename: 'a.png',
          tenant: 'hyperactivity',
        });
        expect((await handle.library.listAssets()).map((a) => a.id)).toEqual([pf.id]);
        expect((await handle.library.listAssets({ tenant: 'portfolio' })).map((a) => a.id)).toEqual([pf.id]);
        expect((await handle.library.listAssets({ tenant: 'hyperactivity' })).map((a) => a.id)).toEqual([ha.id]);
      } finally {
        handle.close();
      }
    });
  });

  describe('object headers', () => {
    it('passes contentType, cacheControl and contentDisposition when putting blobs', async () => {
      const put = vi.fn(async () => {});
      const blobs: BlobStore = {
        put,
        get: async () => makePng(),
        delete: async () => {},
        exists: async () => true,
      };
      const db = openMediaDatabase(dbPath);
      const library = new MediaLibrary({
        catalog: new SqliteCatalogStore(db),
        jobs: new SqliteJobStore(db),
        audit: new SqliteAuditStore(db),
        blobs,
        transformers: createDefaultTransformerRegistry(),
      });
      try {
        const asset = await library.ingest({
          kind: 'image',
          data: await makePng(),
          mime: 'image/png',
          filename: 'hero.png',
        });
        expect(put).toHaveBeenCalledWith('m/pf/i/hero.png', expect.any(Buffer), {
          contentType: 'image/png',
          cacheControl: 'public, max-age=31536000, immutable',
          contentDisposition: 'inline; filename="hero.png"',
        });

        await library.materializeChild(asset.id, undefined, undefined, { variant: '640' });
        expect(put).toHaveBeenCalledWith('m/pf/i/hero@640.webp', expect.any(Buffer), {
          contentType: 'image/webp',
          cacheControl: 'public, max-age=31536000, immutable',
          contentDisposition: 'inline; filename="hero@640.webp"',
        });
      } finally {
        db.close();
      }
    });

    it('FsBlobStore keeps the header options as sidecar metadata', async () => {
      const store = new FsBlobStore(blobDir);
      await store.put('m/pf/i/a.png', Buffer.from([1]), { contentType: 'image/png' });
      expect((await store.get('m/pf/i/a.png')).byteLength).toBe(1);
      expect(await store.readMeta('m/pf/i/a.png')).toMatchObject({ contentType: 'image/png', byteSize: 1 });
    });
  });

  describe('variants', () => {
    async function ingestHero(handle: ReturnType<typeof createMediaLibrary>) {
      return handle.library.ingest({
        kind: 'image',
        data: await makePng(200),
        mime: 'image/png',
        filename: 'hero.png',
      });
    }

    it('keys catalog variants by code and format, with role defaulting to the code', async () => {
      const handle = createMediaLibrary({ dbPath, blobDir });
      try {
        const asset = await ingestHero(handle);
        const t = await handle.library.materializeChild(asset.id, undefined, undefined, { variant: 't' });
        const w640 = await handle.library.materializeChild(asset.id, undefined, undefined, { variant: '640' });
        const avif = await handle.library.materializeChild(asset.id, 'hero', undefined, {
          variant: '1920',
          format: 'avif',
        });
        const webp = await handle.library.materializeChild(asset.id, undefined, undefined, { variant: '1920' });

        expect(t.child).toMatchObject({ variant: 't', role: 't', status: 'ready', path: 'm/pf/i/hero@t.webp' });
        expect(w640.child).toMatchObject({ variant: '640', path: 'm/pf/i/hero@640.webp' });
        expect(avif.child).toMatchObject({ variant: '1920', role: 'hero', path: 'm/pf/i/hero@1920.avif' });
        expect(webp.child).toMatchObject({ variant: '1920', path: 'm/pf/i/hero@1920.webp' });
        expect(avif.child.id).not.toBe(webp.child.id);
        for (const key of ['hero@t.webp', 'hero@640.webp', 'hero@1920.avif', 'hero@1920.webp']) {
          expect(existsSync(join(blobDir, 'm', 'pf', 'i', key)), key).toBe(true);
        }
        expect(t.child.recipe).toEqual({
          kind: 'image',
          ops: [{ type: 'resize', ops: { width: 320 } }],
          format: 'webp',
        });
      } finally {
        handle.close();
      }
    });

    it('treats a recipe equal to a catalog recipe as that catalog variant', async () => {
      const handle = createMediaLibrary({ dbPath, blobDir });
      try {
        const asset = await ingestHero(handle);
        const thumb = await handle.library.materializeChild(asset.id, 'thumb', {
          kind: 'image',
          ops: [{ type: 'resize', ops: { width: 320 } }],
          format: 'webp',
        });
        const card = await handle.library.materializeChild(asset.id, 'card', {
          kind: 'image',
          ops: [{ type: 'resize', ops: { width: 640 } }],
          format: 'webp',
        });
        expect(thumb.child).toMatchObject({ variant: 't', role: 'thumb', path: 'm/pf/i/hero@t.webp' });
        expect(card.child).toMatchObject({ variant: '640', role: 'card', path: 'm/pf/i/hero@640.webp' });
      } finally {
        handle.close();
      }
    });

    it('re-materializing a catalog (variant, format) replaces the same child and key', async () => {
      const afterReplace = vi.fn(async () => {});
      const db = openMediaDatabase(dbPath);
      const library = new MediaLibrary({
        catalog: new SqliteCatalogStore(db),
        jobs: new SqliteJobStore(db),
        audit: new SqliteAuditStore(db),
        blobs: new FsBlobStore(blobDir),
        transformers: createDefaultTransformerRegistry(),
        hooks: { afterReplace },
      });
      try {
        const asset = await library.ingest({ kind: 'image', data: await makePng(200), filename: 'hero.png' });
        const first = await library.materializeChild(asset.id, undefined, undefined, { variant: '640' });
        expect(afterReplace).not.toHaveBeenCalled();
        const second = await library.materializeChild(asset.id, 'card', undefined, { variant: '640' });

        expect(second.child.id).toBe(first.child.id);
        expect(second.child).toMatchObject({ path: 'm/pf/i/hero@640.webp', role: 'card', status: 'ready' });
        expect(await library.listChildren(asset.id)).toHaveLength(1);
        expect(afterReplace).toHaveBeenCalledOnce();
        expect(afterReplace).toHaveBeenCalledWith({ assetId: asset.id, paths: ['m/pf/i/hero@640.webp'] });
      } finally {
        db.close();
      }
    });

    it('custom recipes get a fresh child and an @c-{8 hex} key each time, and never overwrite', async () => {
      const afterReplace = vi.fn(async () => {});
      const db = openMediaDatabase(dbPath);
      const library = new MediaLibrary({
        catalog: new SqliteCatalogStore(db),
        jobs: new SqliteJobStore(db),
        audit: new SqliteAuditStore(db),
        blobs: new FsBlobStore(blobDir),
        transformers: createDefaultTransformerRegistry(),
        hooks: { afterReplace },
      });
      try {
        const asset = await library.ingest({ kind: 'image', data: await makePng(200), filename: 'hero.png' });
        const recipe = {
          kind: 'image',
          ops: [{ type: 'resize', ops: { width: 80, height: 80 } }],
          format: 'webp',
        };
        const a = await library.materializeChild(asset.id, 'square', recipe);
        const b = await library.materializeChild(asset.id, 'square', recipe);

        expect(a.child.variant).toBe('custom');
        expect(a.child.id).not.toBe(b.child.id);
        expect(a.child.path).toBe(`m/pf/i/hero@c-${a.child.id.replace(/-/g, '').slice(0, 8)}.webp`);
        expect(b.child.path).not.toBe(a.child.path);
        expect(existsSync(join(blobDir, a.child.path as string))).toBe(true);
        expect(existsSync(join(blobDir, b.child.path as string))).toBe(true);
        expect(afterReplace).not.toHaveBeenCalled();
      } finally {
        db.close();
      }
    });

    it('rejects the reserved poster variant, bad combinations and non-image catalog variants', async () => {
      const handle = createMediaLibrary({ dbPath, blobDir });
      try {
        const asset = await ingestHero(handle);
        await expect(handle.library.materializeChild(asset.id, undefined, undefined, { variant: 'p' })).rejects.toThrow(
          /poster/i
        );
        await expect(
          handle.library.materializeChild(asset.id, undefined, undefined, { variant: 'p' })
        ).rejects.toBeInstanceOf(RecipeValidationError);
        await expect(
          handle.library.materializeChild(
            asset.id,
            undefined,
            { kind: 'image', ops: [{ type: 'resize', ops: { width: 5 } }] },
            { variant: '640' }
          )
        ).rejects.toThrow(/either/i);
        await expect(
          handle.library.materializeChild(asset.id, undefined, undefined, { variant: '800' as never })
        ).rejects.toBeInstanceOf(RecipeValidationError);
        await expect(handle.library.materializeChild(asset.id, undefined, undefined)).rejects.toBeInstanceOf(
          RecipeValidationError
        );
        const doc = await handle.library.ingest({ kind: 'document', data: Buffer.from('x'), filename: 'a.txt' });
        await expect(handle.library.materializeChild(doc.id, undefined, undefined, { variant: '640' })).rejects.toThrow(
          /image/i
        );
      } finally {
        handle.close();
      }
    });

    it('deleting an asset removes the original and every variant key', async () => {
      const handle = createMediaLibrary({ dbPath, blobDir });
      try {
        const asset = await ingestHero(handle);
        await handle.library.materializeChild(asset.id, undefined, undefined, { variant: 't' });
        await handle.library.materializeChild(asset.id, 'x', {
          kind: 'image',
          ops: [{ type: 'resize', ops: { width: 11 } }],
        });
        await handle.library.deleteAsset(asset.id);
        expect(readdirRecursive(join(blobDir, 'm'))).toEqual([]);
      } finally {
        handle.close();
      }
    });
  });

  describe('name reservation', () => {
    it('reserveName holds a path for the asset id; registerRemoteAsset claims it', async () => {
      const handle = createMediaLibrary({ dbPath, blobDir });
      try {
        const reserved = await handle.library.reserveName({ kind: 'image', filename: 'Upload Me.png', assetId: 'a-1' });
        expect(reserved).toMatchObject({
          assetId: 'a-1',
          tenant: 'portfolio',
          kind: 'image',
          name: 'upload-me',
          ext: 'png',
          path: 'm/pf/i/upload-me.png',
        });
        expect(await handle.library.getPathReservation('m/pf/i/upload-me.png')).toMatchObject({
          assetId: 'a-1',
          pending: true,
        });

        const err = await handle.library
          .reserveName({ kind: 'image', filename: 'upload-me.png' })
          .catch((e: unknown) => e);
        expect(err).toBeInstanceOf(MediaNameConflictError);
        expect((err as MediaNameConflictError).suggestedName).toBe('upload-me-2');

        const png = await makePng();
        mkdirSync(join(blobDir, 'm', 'pf', 'i'), { recursive: true });
        writeFileSync(join(blobDir, reserved.path), png);
        const asset = await handle.library.registerRemoteAsset({
          id: 'a-1',
          kind: 'image',
          mime: 'image/png',
          sha256: 'abc',
          byteSize: png.byteLength,
          path: reserved.path,
        });
        expect(asset).toMatchObject({ id: 'a-1', name: 'upload-me', path: 'm/pf/i/upload-me.png' });
        expect(await handle.library.getPathReservation(reserved.path)).toMatchObject({
          assetId: 'a-1',
          pending: false,
        });
      } finally {
        handle.close();
      }
    });

    it('an expired reservation can be taken by someone else', async () => {
      const handle = createMediaLibrary({ dbPath, blobDir });
      try {
        await handle.library.reserveName({ kind: 'image', filename: 'old.png', assetId: 'a-1', ttlMs: -1000 });
        const next = await handle.library.reserveName({ kind: 'image', filename: 'old.png', assetId: 'a-2' });
        expect(next.path).toBe('m/pf/i/old.png');
      } finally {
        handle.close();
      }
    });

    it('registerRemoteAsset rejects a path reserved for a different asset', async () => {
      const handle = createMediaLibrary({ dbPath, blobDir });
      try {
        const reserved = await handle.library.reserveName({ kind: 'image', filename: 'taken.png', assetId: 'a-1' });
        const png = await makePng();
        mkdirSync(join(blobDir, 'm', 'pf', 'i'), { recursive: true });
        writeFileSync(join(blobDir, reserved.path), png);
        await expect(
          handle.library.registerRemoteAsset({
            id: 'a-2',
            kind: 'image',
            mime: 'image/png',
            sha256: 'abc',
            byteSize: png.byteLength,
            path: reserved.path,
          })
        ).rejects.toBeInstanceOf(MediaNameConflictError);
      } finally {
        handle.close();
      }
    });
  });

  describe('SQLite migration from the legacy schema', () => {
    const LEGACY_SCHEMA = `
      CREATE TABLE media_assets (
        id TEXT PRIMARY KEY NOT NULL, kind TEXT NOT NULL, mime TEXT NOT NULL, sha256 TEXT NOT NULL,
        byte_size INTEGER NOT NULL, blob_key TEXT NOT NULL, meta_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE media_children (
        id TEXT PRIMARY KEY NOT NULL, asset_id TEXT NOT NULL, role TEXT NOT NULL, recipe_json TEXT NOT NULL,
        status TEXT NOT NULL, blob_key TEXT, meta_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        FOREIGN KEY (asset_id) REFERENCES media_assets(id)
      );
    `;

    function seedLegacy(): void {
      const legacy = new Database(dbPath);
      legacy.exec(LEGACY_SCHEMA);
      const insertAsset = legacy.prepare(
        `INSERT INTO media_assets VALUES (@id, @kind, @mime, 'sha', 3, @blobKey, @meta, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`
      );
      insertAsset.run({
        id: '11111111-aaaa-bbbb-cccc-000000000001',
        kind: 'image',
        mime: 'image/png',
        blobKey: 'assets/11111111-aaaa-bbbb-cccc-000000000001/original',
        meta: JSON.stringify({ filename: 'Hero Shot.PNG' }),
      });
      insertAsset.run({
        id: '22222222-aaaa-bbbb-cccc-000000000002',
        kind: 'image',
        mime: 'image/png',
        blobKey: 'assets/22222222-aaaa-bbbb-cccc-000000000002/original',
        meta: JSON.stringify({ filename: 'hero shot.png' }),
      });
      insertAsset.run({
        id: '33333333-aaaa-bbbb-cccc-000000000003',
        kind: 'document',
        mime: 'application/pdf',
        blobKey: 'assets/33333333-aaaa-bbbb-cccc-000000000003/original',
        meta: '{}',
      });
      insertAsset.run({
        id: '44444444-aaaa-bbbb-cccc-000000000004',
        kind: 'image',
        mime: 'image/png',
        blobKey: 'assets/44444444-aaaa-bbbb-cccc-000000000004/original',
        meta: JSON.stringify({ filename: 'missing-file.png' }),
      });
      legacy
        .prepare(
          `INSERT INTO media_children VALUES ('55555555-aaaa-bbbb-cccc-000000000005', '11111111-aaaa-bbbb-cccc-000000000001', 'thumb', '{"kind":"image","ops":[{"type":"resize","ops":{"width":16}}],"format":"webp"}', 'ready', 'assets/11111111-aaaa-bbbb-cccc-000000000001/children/55555555-aaaa-bbbb-cccc-000000000005/attempt-1', '{"contentType":"image/webp"}', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`
        )
        .run();
      legacy.close();
      for (const [id, body] of [
        ['11111111-aaaa-bbbb-cccc-000000000001', 'one'],
        ['22222222-aaaa-bbbb-cccc-000000000002', 'two'],
        ['33333333-aaaa-bbbb-cccc-000000000003', 'pdf'],
      ] as const) {
        mkdirSync(join(blobDir, 'assets', id), { recursive: true });
        writeFileSync(join(blobDir, 'assets', id, 'original'), body);
      }
      mkdirSync(
        join(
          blobDir,
          'assets',
          '11111111-aaaa-bbbb-cccc-000000000001',
          'children',
          '55555555-aaaa-bbbb-cccc-000000000005'
        ),
        {
          recursive: true,
        }
      );
      writeFileSync(
        join(
          blobDir,
          'assets',
          '11111111-aaaa-bbbb-cccc-000000000001',
          'children',
          '55555555-aaaa-bbbb-cccc-000000000005',
          'attempt-1'
        ),
        'child-bytes'
      );
    }

    it('adds tenant/name/path, names rows uniquely, and moves blobs on disk without data loss', async () => {
      seedLegacy();
      const handle = createMediaLibrary({ dbPath, blobDir });
      try {
        const assets = await handle.library.listAssets();
        const byId = new Map(assets.map((a) => [a.id, a]));
        const one = byId.get('11111111-aaaa-bbbb-cccc-000000000001');
        const two = byId.get('22222222-aaaa-bbbb-cccc-000000000002');
        const pdf = byId.get('33333333-aaaa-bbbb-cccc-000000000003');
        const missing = byId.get('44444444-aaaa-bbbb-cccc-000000000004');

        expect(one).toMatchObject({ tenant: 'portfolio', name: 'hero-shot', path: 'm/pf/i/hero-shot.png' });
        expect(two).toMatchObject({ tenant: 'portfolio', name: 'hero-shot-2', path: 'm/pf/i/hero-shot-2.png' });
        expect(pdf?.path).toBe('m/pf/d/document-33333333.pdf');
        expect(missing?.path).toBe('m/pf/i/missing-file.png');

        expect(readFileSync(join(blobDir, 'm/pf/i/hero-shot.png'), 'utf8')).toBe('one');
        expect(readFileSync(join(blobDir, 'm/pf/i/hero-shot-2.png'), 'utf8')).toBe('two');
        expect(readFileSync(join(blobDir, 'm/pf/d/document-33333333.pdf'), 'utf8')).toBe('pdf');
        expect(existsSync(join(blobDir, 'assets', '11111111-aaaa-bbbb-cccc-000000000001', 'original'))).toBe(false);

        const children = await handle.library.listChildren('11111111-aaaa-bbbb-cccc-000000000001');
        expect(children).toHaveLength(1);
        expect(children[0]).toMatchObject({
          variant: 'custom',
          path: 'm/pf/i/hero-shot@c-55555555.webp',
        });
        expect(readFileSync(join(blobDir, 'm/pf/i/hero-shot@c-55555555.webp'), 'utf8')).toBe('child-bytes');
      } finally {
        handle.close();
      }
    });

    it('is idempotent and safe when a file is missing or already moved', async () => {
      seedLegacy();
      createMediaLibrary({ dbPath, blobDir }).close();
      const again = createMediaLibrary({ dbPath, blobDir });
      try {
        const assets = await again.library.listAssets();
        expect(assets.map((a) => a.path).sort()).toEqual([
          'm/pf/d/document-33333333.pdf',
          'm/pf/i/hero-shot-2.png',
          'm/pf/i/hero-shot.png',
          'm/pf/i/missing-file.png',
        ]);
        expect(readFileSync(join(blobDir, 'm/pf/i/hero-shot.png'), 'utf8')).toBe('one');
        // The row whose file was missing keeps its row; a late-arriving file is moved on the next open.
        mkdirSync(join(blobDir, 'assets', '44444444-aaaa-bbbb-cccc-000000000004'), { recursive: true });
        writeFileSync(join(blobDir, 'assets', '44444444-aaaa-bbbb-cccc-000000000004', 'original'), 'late');
      } finally {
        again.close();
      }
      const third = createMediaLibrary({ dbPath, blobDir });
      try {
        expect(readFileSync(join(blobDir, 'm/pf/i/missing-file.png'), 'utf8')).toBe('late');
      } finally {
        third.close();
      }
    });

    it('enforces a unique path after migration', async () => {
      seedLegacy();
      const db = openMediaDatabase(dbPath, { blobDir });
      try {
        expect(() =>
          db
            .prepare(
              `INSERT INTO media_assets (id, kind, mime, sha256, byte_size, blob_key, meta_json, created_at, updated_at, tenant, name, path)
               VALUES ('dup', 'image', 'image/png', 'x', 1, 'm/pf/i/hero-shot.png', '{}', 'a', 'a', 'portfolio', 'hero-shot', 'm/pf/i/hero-shot.png')`
            )
            .run()
        ).toThrow(/UNIQUE/);
      } finally {
        db.close();
      }
    });
  });
});

function readdirRecursive(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) {
    return out;
  }
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...readdirRecursive(full));
    } else {
      out.push(full);
    }
  }
  return out;
}
