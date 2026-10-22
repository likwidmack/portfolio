import Database from 'better-sqlite3';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';

import { createMediaLibrary } from '../src/create-media-library.js';
import { MediaNameConflictError, RecipeValidationError } from '../src/errors.js';

async function makePng(width = 64): Promise<Buffer> {
  return sharp({
    create: { width, height: 48, channels: 3, background: { r: 30, g: 90, b: 200 } },
  })
    .png()
    .toBuffer();
}

describe('media names (SQLite + filesystem)', () => {
  let root: string;
  let dbPath: string;
  let blobDir: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'tgmc-media-names-'));
    dbPath = join(root, 'media.sqlite');
    blobDir = join(root, 'blobs');
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  describe('uniqueness is per tenant, kind and name (extension-free)', () => {
    it('rejects hero.jpg after hero.png with the suggestion hero-2', async () => {
      const handle = createMediaLibrary({ dbPath, blobDir });
      try {
        await handle.library.ingest({ kind: 'image', data: await makePng(), mime: 'image/png', filename: 'hero.png' });

        const err = await handle.library
          .ingest({ kind: 'image', data: await makePng(10), mime: 'image/jpeg', filename: 'hero.jpg' })
          .catch((e: unknown) => e);

        expect(err).toBeInstanceOf(MediaNameConflictError);
        expect(err).toMatchObject({
          path: 'm/pf/i/hero.jpg',
          suggestedName: 'hero-2',
          suggestedFilename: 'hero-2.jpg',
          suggestedPath: 'm/pf/i/hero-2.jpg',
        });
        expect(existsSync(join(blobDir, 'm/pf/i/hero.jpg'))).toBe(false);
      } finally {
        handle.close();
      }
    });

    it('reserveName treats a pending reservation as holding the name for every extension', async () => {
      const handle = createMediaLibrary({ dbPath, blobDir });
      try {
        await handle.library.reserveName({ kind: 'image', filename: 'hero.png', assetId: 'a-1' });
        const err = await handle.library
          .reserveName({ kind: 'image', filename: 'hero.webp', assetId: 'a-2' })
          .catch((e: unknown) => e);
        expect(err).toBeInstanceOf(MediaNameConflictError);
        expect((err as MediaNameConflictError).suggestedFilename).toBe('hero-2.webp');
      } finally {
        handle.close();
      }
    });

    it('suggestions skip names held under another extension', async () => {
      const handle = createMediaLibrary({ dbPath, blobDir });
      try {
        await handle.library.ingest({ kind: 'image', data: await makePng(), filename: 'hero.png' });
        await handle.library.ingest({ kind: 'image', data: await makePng(11), filename: 'hero-2.webp' });
        const err = await handle.library
          .ingest({ kind: 'image', data: await makePng(12), filename: 'hero.png' })
          .catch((e: unknown) => e);
        expect((err as MediaNameConflictError).suggestedName).toBe('hero-3');
      } finally {
        handle.close();
      }
    });

    it('two different assets never produce the same variant key', async () => {
      const handle = createMediaLibrary({ dbPath, blobDir });
      try {
        const png = await handle.library.ingest({ kind: 'image', data: await makePng(200), filename: 'hero.png' });
        await expect(
          handle.library.ingest({ kind: 'image', data: await makePng(210), filename: 'hero.jpg' })
        ).rejects.toBeInstanceOf(MediaNameConflictError);
        const jpg = await handle.library.ingest({ kind: 'image', data: await makePng(220), filename: 'hero-2.jpg' });

        const a = await handle.library.materializeChild(png.id, undefined, undefined, { variant: '640' });
        const b = await handle.library.materializeChild(jpg.id, undefined, undefined, { variant: '640' });
        expect(a.child.path).toBe('m/pf/i/hero@640.webp');
        expect(b.child.path).toBe('m/pf/i/hero-2@640.webp');

        const paths = [png.path, jpg.path, a.child.path, b.child.path];
        expect(new Set(paths).size).toBe(paths.length);

        // Deleting one asset leaves the other's variant object alone.
        await handle.library.deleteAsset(jpg.id);
        expect(existsSync(join(blobDir, 'm/pf/i/hero@640.webp'))).toBe(true);
        expect(existsSync(join(blobDir, 'm/pf/i/hero-2@640.webp'))).toBe(false);
      } finally {
        handle.close();
      }
    });

    it('still allows the same name in another kind or tenant', async () => {
      const handle = createMediaLibrary({ dbPath, blobDir });
      try {
        await handle.library.ingest({ kind: 'image', data: await makePng(), filename: 'logo.png' });
        const svg = await handle.library.ingest({
          kind: 'svg',
          data: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
          mime: 'image/svg+xml',
          filename: 'logo.svg',
        });
        const other = await handle.library.ingest({
          kind: 'image',
          tenant: 'hyperactivity',
          data: await makePng(12),
          filename: 'logo.png',
        });
        expect([svg.path, other.path]).toEqual(['m/pf/s/logo.svg', 'm/ha/i/logo.png']);
      } finally {
        handle.close();
      }
    });
  });

  describe('SQLite migration of names that collide across extensions', () => {
    const V1_SCHEMA = `
      CREATE TABLE media_assets (
        id TEXT PRIMARY KEY NOT NULL, kind TEXT NOT NULL, mime TEXT NOT NULL, sha256 TEXT NOT NULL,
        byte_size INTEGER NOT NULL, blob_key TEXT NOT NULL, meta_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        tenant TEXT NOT NULL DEFAULT 'portfolio', name TEXT NOT NULL DEFAULT '', path TEXT
      );
      CREATE UNIQUE INDEX idx_media_assets_path ON media_assets(path);
      CREATE TABLE media_children (
        id TEXT PRIMARY KEY NOT NULL, asset_id TEXT NOT NULL, role TEXT NOT NULL, recipe_json TEXT NOT NULL,
        status TEXT NOT NULL, blob_key TEXT, meta_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        variant TEXT NOT NULL DEFAULT 'custom', path TEXT
      );
      CREATE TABLE media_path_reservations (
        path TEXT PRIMARY KEY NOT NULL, asset_id TEXT NOT NULL, expires_at TEXT NOT NULL
      );
    `;
    const FIRST = 'aaaaaaaa-0000-4000-8000-000000000001';
    const SECOND = 'bbbbbbbb-0000-4000-8000-000000000002';
    const CHILD_FIRST = 'cccccccc-0000-4000-8000-000000000003';
    const CHILD_SECOND = 'dddddddd-0000-4000-8000-000000000004';

    function seedCollidingRows(): void {
      const legacy = new Database(dbPath);
      legacy.exec(V1_SCHEMA);
      const asset = legacy.prepare(
        `INSERT INTO media_assets (id, kind, mime, sha256, byte_size, blob_key, meta_json, created_at, updated_at, tenant, name, path)
         VALUES (@id, 'image', @mime, 'sha', 3, @path, '{}', @createdAt, @createdAt, 'portfolio', 'hero', @path)`
      );
      asset.run({ id: FIRST, mime: 'image/png', path: 'm/pf/i/hero.png', createdAt: '2026-01-01T00:00:00.000Z' });
      asset.run({ id: SECOND, mime: 'image/jpeg', path: 'm/pf/i/hero.jpg', createdAt: '2026-01-02T00:00:00.000Z' });
      const child = legacy.prepare(
        `INSERT INTO media_children (id, asset_id, role, recipe_json, status, blob_key, meta_json, created_at, updated_at, variant, path)
         VALUES (@id, @assetId, '640', '{"kind":"image","ops":[{"type":"resize","ops":{"width":640}}],"format":"webp"}', 'ready', @path, '{}', 'a', 'a', '640', @path)`
      );
      // Both assets mapped their 640 variant to the same key; only one object can exist on disk.
      child.run({ id: CHILD_FIRST, assetId: FIRST, path: 'm/pf/i/hero@640.webp' });
      child.run({ id: CHILD_SECOND, assetId: SECOND, path: 'm/pf/i/hero@640.webp' });
      legacy.close();
      mkdirSync(join(blobDir, 'm/pf/i'), { recursive: true });
      writeFileSync(join(blobDir, 'm/pf/i/hero.png'), 'png-bytes');
      writeFileSync(join(blobDir, 'm/pf/i/hero.jpg'), 'jpg-bytes');
      writeFileSync(join(blobDir, 'm/pf/i/hero@640.webp'), 'shared-variant');
    }

    it('renames the later asset with -2, re-keys its children and moves its blobs', async () => {
      seedCollidingRows();
      const handle = createMediaLibrary({ dbPath, blobDir });
      try {
        const first = await handle.library.getAsset(FIRST);
        const second = await handle.library.getAsset(SECOND);
        expect(first).toMatchObject({ name: 'hero', path: 'm/pf/i/hero.png' });
        expect(second).toMatchObject({ name: 'hero-2', path: 'm/pf/i/hero-2.jpg' });

        expect(readFileSync(join(blobDir, 'm/pf/i/hero.png'), 'utf8')).toBe('png-bytes');
        expect(readFileSync(join(blobDir, 'm/pf/i/hero-2.jpg'), 'utf8')).toBe('jpg-bytes');
        expect(existsSync(join(blobDir, 'm/pf/i/hero.jpg'))).toBe(false);

        const [firstChild] = await handle.library.listChildren(FIRST);
        const [secondChild] = await handle.library.listChildren(SECOND);
        expect(firstChild?.path).toBe('m/pf/i/hero@640.webp');
        expect(secondChild?.path).toBe('m/pf/i/hero-2@640.webp');
        // Both assets claimed the same variant key, so the one object on disk cannot be attributed to
        // either: both children are flagged for re-materialize, neither is left looking ready.
        expect(firstChild?.status).toBe('failed');
        expect(secondChild?.status).toBe('failed');
        expect(firstChild?.meta.error).toMatch(/collided/);
        expect(secondChild?.meta.error).toMatch(/collided/);
        expect(existsSync(join(blobDir, 'm/pf/i/hero-2@640.webp'))).toBe(false);
        // The shared object is left in place (the first child's key); re-materializing overwrites it.
        expect(readFileSync(join(blobDir, 'm/pf/i/hero@640.webp'), 'utf8')).toBe('shared-variant');
      } finally {
        handle.close();
      }
    });

    it('fails with an error naming the row when a colliding asset has an unparseable path', () => {
      const legacy = new Database(dbPath);
      legacy.exec(V1_SCHEMA);
      const insert = legacy.prepare(
        `INSERT INTO media_assets (id, kind, mime, sha256, byte_size, blob_key, meta_json, created_at, updated_at, tenant, name, path)
         VALUES (@id, 'image', 'image/png', 'sha', 3, @path, '{}', @createdAt, @createdAt, 'portfolio', 'hero', @path)`
      );
      insert.run({ id: FIRST, path: 'm/pf/i/hero.png', createdAt: '2026-01-01T00:00:00.000Z' });
      insert.run({ id: SECOND, path: 'uploads/not-a-media-key.png', createdAt: '2026-01-02T00:00:00.000Z' });
      legacy.close();

      expect(() => createMediaLibrary({ dbPath, blobDir })).toThrow(
        new RegExp(`${SECOND}.*uploads/not-a-media-key\\.png`)
      );
    });

    it('is idempotent and enforces UNIQUE(tenant, kind, name) afterwards', async () => {
      seedCollidingRows();
      createMediaLibrary({ dbPath, blobDir }).close();
      const again = createMediaLibrary({ dbPath, blobDir });
      try {
        expect((await again.library.getAsset(SECOND)).path).toBe('m/pf/i/hero-2.jpg');
        expect(readFileSync(join(blobDir, 'm/pf/i/hero-2.jpg'), 'utf8')).toBe('jpg-bytes');
      } finally {
        again.close();
      }
      const db = new Database(dbPath);
      try {
        expect(() =>
          db
            .prepare(
              `INSERT INTO media_assets (id, kind, mime, sha256, byte_size, blob_key, meta_json, created_at, updated_at, tenant, name, path)
               VALUES ('x', 'image', 'image/webp', 'x', 1, 'm/pf/i/hero.webp', '{}', 'a', 'a', 'portfolio', 'hero', 'm/pf/i/hero.webp')`
            )
            .run()
        ).toThrow(/UNIQUE/);
      } finally {
        db.close();
      }
    });
  });

  describe('abandoned presigned uploads', () => {
    it('removes a stray object at the target path before handing out the reservation, and audits it', async () => {
      const handle = createMediaLibrary({ dbPath, blobDir });
      try {
        mkdirSync(join(blobDir, 'm/pf/i'), { recursive: true });
        writeFileSync(join(blobDir, 'm/pf/i/stray.png'), 'orphan');

        const reserved = await handle.library.reserveName({ kind: 'image', filename: 'stray.png', assetId: 'a-1' });

        expect(reserved.path).toBe('m/pf/i/stray.png');
        expect(existsSync(join(blobDir, 'm/pf/i/stray.png'))).toBe(false);
        const events = await handle.library.listAuditEvents('m/pf/i/stray.png');
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({
          action: 'blob.stray_removed',
          entityType: 'blob',
          payload: { assetId: 'a-1', path: 'm/pf/i/stray.png' },
        });
      } finally {
        handle.close();
      }
    });

    it('never deletes the object of a live asset or a live reservation (name conflict)', async () => {
      const handle = createMediaLibrary({ dbPath, blobDir });
      try {
        const live = await handle.library.ingest({ kind: 'image', data: await makePng(), filename: 'keep.png' });
        await expect(
          handle.library.reserveName({ kind: 'image', filename: 'keep.png', assetId: 'a-2' })
        ).rejects.toBeInstanceOf(MediaNameConflictError);
        expect(existsSync(join(blobDir, live.path))).toBe(true);
        expect(await handle.library.listAuditEvents(live.path)).toEqual([]);
      } finally {
        handle.close();
      }
    });

    it('clears an object left behind by an expired reservation', async () => {
      const handle = createMediaLibrary({ dbPath, blobDir });
      try {
        await handle.library.reserveName({ kind: 'image', filename: 'gone.png', assetId: 'a-1', ttlMs: -1000 });
        mkdirSync(join(blobDir, 'm/pf/i'), { recursive: true });
        writeFileSync(join(blobDir, 'm/pf/i/gone.png'), 'uploaded-but-never-completed');

        await handle.library.reserveName({ kind: 'image', filename: 'gone.png', assetId: 'a-2' });

        expect(existsSync(join(blobDir, 'm/pf/i/gone.png'))).toBe(false);
      } finally {
        handle.close();
      }
    });
  });

  describe('filename extension must match the mime', () => {
    it('rejects x.png with image/jpeg and suggests x.jpg', async () => {
      const handle = createMediaLibrary({ dbPath, blobDir });
      try {
        const err = await handle.library
          .reserveName({ kind: 'image', filename: 'x.png', mime: 'image/jpeg' })
          .catch((e: unknown) => e);
        expect(err).toBeInstanceOf(RecipeValidationError);
        expect((err as Error).message).toMatch(/\.png.*image\/jpeg.*x\.jpg/);
        // A rejected request must not leave a reservation behind.
        await expect(
          handle.library.reserveName({ kind: 'image', filename: 'x.jpg', mime: 'image/jpeg' })
        ).resolves.toMatchObject({ path: 'm/pf/i/x.jpg' });
      } finally {
        handle.close();
      }
    });

    it('accepts extension aliases and unknown mimes, and ingest enforces it for an explicit mime only', async () => {
      const handle = createMediaLibrary({ dbPath, blobDir });
      try {
        await expect(
          handle.library.reserveName({ kind: 'image', filename: 'a.jpeg', mime: 'image/jpeg' })
        ).resolves.toMatchObject({ ext: 'jpeg' });
        await expect(
          handle.library.reserveName({ kind: 'document', filename: 'b.xyz', mime: 'application/x-unknown' })
        ).resolves.toMatchObject({ ext: 'xyz' });

        await expect(
          handle.library.ingest({ kind: 'image', data: await makePng(), mime: 'image/jpeg', filename: 'c.png' })
        ).rejects.toBeInstanceOf(RecipeValidationError);
        // No explicit mime: the default kind mime is a guess, so the filename wins.
        await expect(
          handle.library.ingest({ kind: 'image', data: await makePng(), filename: 'd.jpg' })
        ).resolves.toMatchObject({ path: 'm/pf/i/d.jpg' });
      } finally {
        handle.close();
      }
    });

    it('ingest: an extensionless filename without a mime takes the extension from the resolved mime, not bin', async () => {
      const handle = createMediaLibrary({ dbPath, blobDir });
      try {
        const asset = await handle.library.ingest({ kind: 'image', data: await makePng(), filename: 'photo' });
        expect(asset).toMatchObject({ path: 'm/pf/i/photo.png', mime: 'image/png' });
      } finally {
        handle.close();
      }
    });

    it('ingest: an unknown extension without a mime is not checked against the default kind mime', async () => {
      const handle = createMediaLibrary({ dbPath, blobDir });
      try {
        await expect(
          handle.library.ingest({ kind: 'image', data: await makePng(), filename: 'photo.heic' })
        ).resolves.toMatchObject({ path: 'm/pf/i/photo.heic' });
      } finally {
        handle.close();
      }
    });

    it('registerRemoteAsset rejects a reserved path whose extension contradicts the mime', async () => {
      const handle = createMediaLibrary({ dbPath, blobDir });
      try {
        const reserved = await handle.library.reserveName({ kind: 'image', filename: 'e.png', assetId: 'a-1' });
        mkdirSync(join(blobDir, 'm/pf/i'), { recursive: true });
        writeFileSync(join(blobDir, reserved.path), await makePng());
        await expect(
          handle.library.registerRemoteAsset({
            id: 'a-1',
            kind: 'image',
            mime: 'image/jpeg',
            sha256: 'x',
            byteSize: 1,
            path: reserved.path,
          })
        ).rejects.toBeInstanceOf(RecipeValidationError);
      } finally {
        handle.close();
      }
    });
  });
});
