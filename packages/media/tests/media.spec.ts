import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';
import { expect, vi } from 'vitest';

import { FsBlobStore } from '../src/adapters/fs-blob-store.js';
import { openMediaDatabase } from '../src/adapters/sqlite/db.js';
import { SqliteAuditStore, SqliteCatalogStore, SqliteJobStore } from '../src/adapters/sqlite/stores.js';
import { runCli } from '../src/cli.js';
import { createMediaLibrary } from '../src/create-media-library.js';
import { MediaNotFoundError, RecipeValidationError } from '../src/errors.js';
import { MediaLibrary } from '../src/media-library.js';
import { parseRecipe } from '../src/recipe.js';
import { createDefaultTransformerRegistry } from '../src/transformers/registry.js';

async function makePng(): Promise<Buffer> {
  return sharp({
    create: {
      width: 64,
      height: 48,
      channels: 3,
      background: { r: 200, g: 40, b: 40 },
    },
  })
    .png()
    .toBuffer();
}

describe('@tgmc/media', () => {
  let root: string;
  let dbPath: string;
  let blobDir: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'tgmc-media-'));
    dbPath = join(root, 'media.sqlite');
    blobDir = join(root, 'blobs');
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('rejects invalid recipes', () => {
    expect(() => parseRecipe('image', { kind: 'audio' })).toThrow(RecipeValidationError);
    expect(() => parseRecipe('image', { kind: 'image', ops: [] })).toThrow(RecipeValidationError);
    expect(() => parseRecipe('image', { kind: 'image', ops: [{ type: 'resize' }] })).toThrow(
      /resize op requires an ops object/
    );
    expect(() => parseRecipe('image', { kind: 'image', ops: [{ type: 'resize', ops: {} }] })).toThrow(
      /width and\/or height/
    );
    expect(() =>
      parseRecipe('image', {
        kind: 'image',
        ops: [{ type: 'transparency', ops: { mode: 'hue' } }],
      })
    ).toThrow(/transparency\.hue/);
    expect(() =>
      parseRecipe('image', {
        kind: 'image',
        ops: [{ type: 'transparency', ops: { mode: 'grayscale', threshold: Number.NaN } }],
      })
    ).toThrow(/transparency\.threshold/);
  });

  it('ingests, materializes an image child, and records audit/jobs', async () => {
    const handle = createMediaLibrary({ dbPath, blobDir });
    try {
      const png = await makePng();
      const file = join(root, 'sample.png');
      writeFileSync(file, png);

      const asset = await handle.library.ingest({ kind: 'image', data: file, mime: 'image/png' });
      expect(asset.kind).toBe('image');
      expect(asset.byteSize).toBeGreaterThan(0);

      const result = await handle.library.materializeChild(asset.id, 'thumb', {
        kind: 'image',
        ops: [{ type: 'resize', ops: { width: 32 } }],
        format: 'webp',
      });

      expect(result.job.status).toBe('succeeded');
      expect(result.child.status).toBe('ready');
      expect(result.child.path).toBe(`m/pf/i/${asset.name}@c-${result.child.id.slice(0, 8)}.webp`);

      const auditAsset = await handle.library.listAuditEvents(asset.id);
      const auditChild = await handle.library.listAuditEvents(result.child.id);
      expect(auditAsset.some((e) => e.action === 'asset.ingested')).toBe(true);
      expect(auditChild.some((e) => e.action === 'child.materialized')).toBe(true);
    } finally {
      handle.close();
    }
  });

  it('fails audio materialize as not implemented', async () => {
    const handle = createMediaLibrary({ dbPath, blobDir });
    try {
      const file = join(root, 'sample.mp3');
      writeFileSync(file, Buffer.from([1, 2, 3, 4]));
      const asset = await handle.library.ingest({ kind: 'audio', data: file, mime: 'audio/mpeg' });
      const result = await handle.library.materializeChild(asset.id, 'preview', {
        kind: 'audio',
        ops: {},
      });
      expect(result.job.status).toBe('failed');
      expect(result.child.status).toBe('failed');
      expect(result.job.lastError).toMatch(/not implemented/i);
    } finally {
      handle.close();
    }
  });

  it('hard-deletes asset children blobs and jobs', async () => {
    const handle = createMediaLibrary({ dbPath, blobDir });
    try {
      const png = await makePng();
      const file = join(root, 'sample.png');
      writeFileSync(file, png);
      const asset = await handle.library.ingest({ kind: 'image', data: file, mime: 'image/png' });
      const result = await handle.library.materializeChild(asset.id, 'thumb', {
        kind: 'image',
        ops: [{ type: 'resize', ops: { width: 16 } }],
        format: 'webp',
      });
      expect(result.job.status).toBe('succeeded');

      await handle.library.deleteAsset(asset.id);

      await expect(handle.library.getAsset(asset.id)).rejects.toThrow(/not found/i);
      const jobs = await handle.library.listJobs({ assetId: asset.id });
      expect(jobs).toHaveLength(0);
      const audit = await handle.library.listAuditEvents(asset.id);
      expect(audit.some((e) => e.action === 'asset.deleted')).toBe(true);
    } finally {
      handle.close();
    }
  });

  it('enqueues materialize without running', async () => {
    const handle = createMediaLibrary({ dbPath, blobDir });
    try {
      const png = await makePng();
      const file = join(root, 'sample.png');
      writeFileSync(file, png);
      const asset = await handle.library.ingest({ kind: 'image', data: file, mime: 'image/png' });
      const enqueued = await handle.library.enqueueMaterializeChild(asset.id, 'thumb', {
        kind: 'image',
        ops: [{ type: 'resize', ops: { width: 16 } }],
        format: 'webp',
      });
      expect(enqueued.job.status).toBe('queued');
      expect(enqueued.child.status).toBe('pending');
      const ran = await handle.library.runMaterializeJob(enqueued.job.id);
      expect(ran.job.status).toBe('succeeded');
    } finally {
      handle.close();
    }
  });

  it('registerRemoteAsset catalogs an existing blob with meta', async () => {
    const handle = createMediaLibrary({ dbPath, blobDir });
    try {
      const png = await makePng();
      const path = 'm/pf/i/preplaced.png';
      const dest = join(blobDir, path);
      mkdirSync(join(blobDir, 'm', 'pf', 'i'), { recursive: true });
      writeFileSync(dest, png);
      const asset = await handle.library.registerRemoteAsset({
        id: 'remote-asset-1',
        kind: 'image',
        mime: 'image/png',
        sha256: 'deadbeef',
        byteSize: png.byteLength,
        path,
        meta: { filename: 'preplaced.png' },
      });
      expect(asset.id).toBe('remote-asset-1');
      expect(asset.meta.filename).toBe('preplaced.png');
      const audit = await handle.library.listAuditEvents(asset.id);
      expect(audit.some((e) => e.action === 'asset.ingested')).toBe(true);
    } finally {
      handle.close();
    }
  });

  it('stores and filters assets by meta.tags', async () => {
    const handle = createMediaLibrary({ dbPath, blobDir });
    try {
      const png = await makePng();
      const file = join(root, 'tagged.png');
      writeFileSync(file, png);
      const asset = await handle.library.ingest({
        kind: 'image',
        data: file,
        mime: 'image/png',
        meta: { tags: ['Hero Shot', 'logo'] },
      });
      expect(asset.meta.tags).toEqual(['hero-shot', 'logo']);
      await handle.library.addAssetTags(asset.id, ['Brand']);
      const tagged = await handle.library.listAssets({ tag: 'brand' });
      expect(tagged.map((a) => a.id)).toContain(asset.id);
      await handle.library.removeAssetTags(asset.id, ['logo']);
      const after = await handle.library.getAsset(asset.id);
      expect(after.meta.tags).toEqual(['hero-shot', 'brand']);
      await handle.library.setAssetTags(asset.id, []);
      expect((await handle.library.getAsset(asset.id)).meta.tags).toBeUndefined();
    } finally {
      handle.close();
    }
  });

  it('fails a queued dispatch job and child without running materialize', async () => {
    const handle = createMediaLibrary({ dbPath, blobDir });
    try {
      const png = await makePng();
      const file = join(root, 'sample.png');
      writeFileSync(file, png);
      const asset = await handle.library.ingest({ kind: 'image', data: file, mime: 'image/png' });
      const enqueued = await handle.library.enqueueMaterializeChild(asset.id, 'thumb', {
        kind: 'image',
        ops: [{ type: 'resize', ops: { width: 32 } }],
        format: 'webp',
      });
      expect(enqueued.job.status).toBe('queued');
      const failed = await handle.library.failMaterializeDispatch(enqueued.job.id, 'sqs send failed');
      expect(failed.job.status).toBe('failed');
      expect(failed.job.lastError).toBe('sqs send failed');
      expect(failed.child.status).toBe('failed');
    } finally {
      handle.close();
    }
  });

  it('rolls back child and job when audit append fails during enqueue', async () => {
    const database = openMediaDatabase(dbPath);
    const catalog = new SqliteCatalogStore(database);
    const jobs = new SqliteJobStore(database);
    const blobs = new FsBlobStore(blobDir);
    const okAudit = new SqliteAuditStore(database);
    const library = new MediaLibrary({
      catalog,
      jobs,
      blobs,
      audit: okAudit,
      transformers: createDefaultTransformerRegistry(),
    });
    try {
      const png = await makePng();
      const file = join(root, 'sample.png');
      writeFileSync(file, png);
      const asset = await library.ingest({ kind: 'image', data: file, mime: 'image/png' });

      const failingAudit = new MediaLibrary({
        catalog,
        jobs,
        blobs,
        audit: {
          append: async () => {
            throw new Error('audit offline');
          },
          listByEntity: okAudit.listByEntity.bind(okAudit),
        },
        transformers: createDefaultTransformerRegistry(),
      });

      await expect(
        failingAudit.enqueueMaterializeChild(asset.id, 'thumb', {
          kind: 'image',
          ops: [{ type: 'resize', ops: { width: 32 } }],
          format: 'webp',
        })
      ).rejects.toThrow(/audit offline/);

      expect(await catalog.listChildren(asset.id)).toHaveLength(0);
      expect(await jobs.listJobs({ assetId: asset.id })).toHaveLength(0);
    } finally {
      database.close();
    }
  });

  it('maps a missing parent race during enqueue to not found', async () => {
    const insertJob = vi.fn();
    const library = new MediaLibrary({
      catalog: {
        insertAsset: async () => {},
        getNameHolder: async () => null,
        holdName: async () => true,
        releaseName: async () => {},
        updateAssetMeta: async () => {},
        getAsset: async () => null,
        listAssets: async () => [],
        deleteAsset: async () => {},
        deleteAssetCascade: async () => {},
        insertChild: async () => {},
        insertChildIfAssetExists: async () => false,
        updateChild: async () => {},
        getChild: async () => null,
        listChildren: async () => [],
        deleteChild: async () => {},
        deleteChildrenForAsset: async () => {},
        updateChildIfAssetExists: async () => false,
      },
      jobs: {
        insertJob,
        updateJob: async () => {},
        claimQueuedJob: async () => false,
        claimStaleRunningJob: async () => false,
        finalizeRunningJob: async () => false,
        failQueuedJob: async () => false,
        deleteJob: async () => {},
        getJob: async () => {
          throw new Error('not used');
        },
        listJobs: async () => [],
        deleteJobsForAsset: async () => {},
      },
      blobs: {
        put: async () => {},
        get: async () => Buffer.alloc(0),
        delete: async () => {},
        exists: async () => false,
      },
      audit: {
        append: async () => {},
        listByEntity: async () => [],
      },
      transformers: createDefaultTransformerRegistry(),
    });

    await expect(
      library.enqueueMaterializeChild('missing-asset', 'thumb', {
        kind: 'image',
        ops: [{ type: 'resize', ops: { width: 32 } }],
        format: 'webp',
      })
    ).rejects.toThrow(MediaNotFoundError);
    expect(insertJob).not.toHaveBeenCalled();
  });

  it('uses an atomic child/job insert when the catalog provides one', async () => {
    const insertChildAndJobIfAssetExists = vi.fn().mockResolvedValue(true);
    const insertJob = vi.fn(async () => {
      throw new Error('should not be called');
    });
    const library = new MediaLibrary({
      catalog: {
        insertAsset: async () => {},
        getNameHolder: async () => null,
        holdName: async () => true,
        releaseName: async () => {},
        updateAssetMeta: async () => {},
        getAsset: async (id) => ({
          id,
          tenant: 'portfolio' as const,
          kind: 'image',
          mime: 'image/png',
          sha256: 'abc',
          byteSize: 1,
          name: 'hero',
          path: 'm/pf/i/hero.png',
          meta: {},
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }),
        listAssets: async () => [],
        deleteAsset: async () => {},
        deleteAssetCascade: async () => {},
        insertChild: async () => {},
        insertChildIfAssetExists: async () => {
          throw new Error('should not be called');
        },
        insertChildAndJobIfAssetExists,
        updateChild: async () => {},
        getChild: async () => null,
        listChildren: async () => [],
        deleteChild: async () => {},
        deleteChildrenForAsset: async () => {},
        updateChildIfAssetExists: async () => true,
      },
      jobs: {
        insertJob,
        updateJob: async () => {},
        claimQueuedJob: async () => false,
        claimStaleRunningJob: async () => false,
        finalizeRunningJob: async () => false,
        failQueuedJob: async () => false,
        deleteJob: async () => {},
        getJob: async () => {
          throw new Error('not used');
        },
        listJobs: async () => [],
        deleteJobsForAsset: async () => {},
      },
      blobs: {
        put: async () => {},
        get: async () => Buffer.alloc(0),
        delete: async () => {},
        exists: async () => false,
      },
      audit: {
        append: async () => {},
        listByEntity: async () => [],
      },
      transformers: createDefaultTransformerRegistry(),
    });

    const enqueued = await library.enqueueMaterializeChild('asset-1', 'thumb', {
      kind: 'image',
      ops: [{ type: 'resize', ops: { width: 32 } }],
      format: 'webp',
    });

    expect(enqueued.job.status).toBe('queued');
    expect(insertChildAndJobIfAssetExists).toHaveBeenCalledOnce();
    expect(insertJob).not.toHaveBeenCalled();
  });

  it('surfaces a repairable child-write failure after finalization instead of returning success', async () => {
    const finalizeRunningJob = vi.fn(async () => true);
    const finalizeRunningJobAndUpdateChildIfAssetExists = vi.fn(async () => {
      throw new Error('catalog offline');
    });
    const child = {
      id: 'c0ffee11-0000-4000-8000-000000000001',
      assetId: 'asset-1',
      role: 'thumb',
      variant: 'custom' as const,
      recipe: { kind: 'image', ops: [{ type: 'resize', ops: { width: 32 } }], format: 'webp' } as const,
      status: 'pending' as const,
      path: null,
      meta: {},
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const job = {
      id: 'job-1',
      type: 'materialize' as const,
      assetId: 'asset-1',
      childId: 'c0ffee11-0000-4000-8000-000000000001',
      status: 'queued' as const,
      attempts: 0,
      lastError: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      startedAt: null,
      finishedAt: null,
    };
    const library = new MediaLibrary({
      catalog: {
        insertAsset: async () => {},
        getNameHolder: async () => null,
        holdName: async () => true,
        releaseName: async () => {},
        updateAssetMeta: async () => {},
        getAsset: async (id) => ({
          id,
          tenant: 'portfolio' as const,
          kind: 'image',
          mime: 'image/png',
          sha256: 'abc',
          byteSize: 1,
          name: 'hero',
          path: 'm/pf/i/hero.png',
          meta: {},
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }),
        listAssets: async () => [],
        deleteAsset: async () => {},
        deleteAssetCascade: async () => {},
        insertChild: async () => {},
        insertChildIfAssetExists: async () => true,
        updateChild: async () => {},
        getChild: async () => child,
        listChildren: async () => [],
        deleteChild: async () => {},
        deleteChildrenForAsset: async () => {},
        updateChildIfAssetExists: async () => true,
        finalizeRunningJobAndUpdateChildIfAssetExists,
      },
      jobs: {
        insertJob: async () => {},
        updateJob: async () => {},
        claimQueuedJob: async () => true,
        claimStaleRunningJob: async () => false,
        finalizeRunningJob,
        failQueuedJob: async () => false,
        deleteJob: async () => {},
        getJob: async () => job,
        listJobs: async () => [],
        deleteJobsForAsset: async () => {},
      },
      blobs: {
        put: async () => {},
        get: async () => Buffer.from([1]),
        delete: async () => {},
        exists: async () => true,
      },
      audit: {
        append: async () => {},
        listByEntity: async () => [],
      },
      transformers: {
        resolve: () => ({
          supports: () => true,
          materialize: async () => ({
            buffer: Buffer.from([2]),
            contentType: 'image/webp',
            meta: {},
          }),
        }),
      },
    });

    await expect(library.runMaterializeJob('job-1')).rejects.toThrow(/catalog offline/);
    expect(finalizeRunningJobAndUpdateChildIfAssetExists).toHaveBeenCalledOnce();
    expect(finalizeRunningJob).toHaveBeenCalledOnce();
    expect(finalizeRunningJob.mock.calls[0]?.[2]).toMatchObject({ status: 'queued', startedAt: null });
  });

  it('never deletes the shared variant key when a stale worker loses finalization', async () => {
    const put = vi.fn();
    const del = vi.fn();
    const child = {
      id: 'c0ffee11-0000-4000-8000-000000000001',
      assetId: 'asset-1',
      role: 'thumb',
      variant: 'custom' as const,
      recipe: { kind: 'image', ops: [{ type: 'resize', ops: { width: 32 } }], format: 'webp' } as const,
      status: 'pending' as const,
      path: null,
      meta: {},
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const job = {
      id: 'job-1',
      type: 'materialize' as const,
      assetId: 'asset-1',
      childId: 'c0ffee11-0000-4000-8000-000000000001',
      status: 'running' as const,
      attempts: 1,
      lastError: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      startedAt: '2026-01-01T00:00:00.000Z',
      finishedAt: null,
    };
    const library = new MediaLibrary({
      catalog: {
        insertAsset: async () => {},
        getNameHolder: async () => null,
        holdName: async () => true,
        releaseName: async () => {},
        updateAssetMeta: async () => {},
        getAsset: async (id) => ({
          id,
          tenant: 'portfolio' as const,
          kind: 'image',
          mime: 'image/png',
          sha256: 'abc',
          byteSize: 1,
          name: 'hero',
          path: 'm/pf/i/hero.png',
          meta: {},
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }),
        listAssets: async () => [],
        deleteAsset: async () => {},
        deleteAssetCascade: async () => {},
        insertChild: async () => {},
        insertChildIfAssetExists: async () => true,
        updateChild: async () => {},
        getChild: async () => child,
        listChildren: async () => [],
        deleteChild: async () => {},
        deleteChildrenForAsset: async () => {},
        updateChildIfAssetExists: async () => true,
      },
      jobs: {
        insertJob: async () => {},
        updateJob: async () => {},
        claimQueuedJob: async () => false,
        claimStaleRunningJob: async () => true,
        finalizeRunningJob: async () => false,
        failQueuedJob: async () => false,
        deleteJob: async () => {},
        getJob: async () => job,
        listJobs: async () => [],
        deleteJobsForAsset: async () => {},
      },
      blobs: {
        put: async (key, data) => {
          put(key, data);
        },
        get: async () => Buffer.from([1]),
        delete: async (key) => {
          del(key);
        },
        exists: async () => true,
      },
      audit: {
        append: async () => {},
        listByEntity: async () => [],
      },
      transformers: {
        resolve: () => ({
          supports: () => true,
          materialize: async () => ({
            buffer: Buffer.from([2]),
            contentType: 'image/webp',
            meta: {},
          }),
        }),
      },
    });

    await library.runMaterializeJob('job-1');

    // Keys have no attempt suffix, so a stale worker shares the key with the live one: it
    // writes the same bytes but must not delete the object the new owner relies on.
    expect(put).toHaveBeenCalledWith('m/pf/i/hero@c-c0ffee11.webp', expect.any(Buffer));
    expect(del).not.toHaveBeenCalled();
  });

  it('smoke CLI exits 0', async () => {
    const code = await runCli(['smoke', '--db', dbPath, '--blob-dir', blobDir]);
    expect(code).toBe(0);
  });
});
