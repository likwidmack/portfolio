import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';
import { vi } from 'vitest';

import { FsBlobStore } from '../src/adapters/fs-blob-store.js';
import { openMediaDatabase } from '../src/adapters/sqlite/db.js';
import { SqliteAuditStore, SqliteCatalogStore, SqliteJobStore } from '../src/adapters/sqlite/stores.js';
import { RecipeValidationError } from '../src/errors.js';
import { MediaLibrary } from '../src/media-library.js';
import type { MediaTransformer } from '../src/ports/index.js';
import { TransformerRegistry } from '../src/transformers/registry.js';

/** Image transformer whose n-th call tags its output (`meta.call = n`) and may fail on chosen calls. */
function countingTransformer(options: { failOn?: number[] } = {}): MediaTransformer & { calls: () => number } {
  let calls = 0;
  return {
    calls: () => calls,
    supports: (kind) => kind === 'image',
    async materialize() {
      calls += 1;
      if (options.failOn?.includes(calls)) {
        throw new RecipeValidationError(`recipe rejected on call ${calls}`);
      }
      const buffer = await sharp({
        create: { width: 8, height: 8, channels: 3, background: { r: calls * 20, g: 0, b: 0 } },
      })
        .webp()
        .toBuffer();
      return { buffer, contentType: 'image/webp', meta: { call: calls } };
    },
  };
}

describe('re-materializing a ready catalog variant', () => {
  let root: string;
  let blobDir: string;
  let db: ReturnType<typeof openMediaDatabase>;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'tgmc-media-replace-'));
    blobDir = join(root, 'blobs');
    db = openMediaDatabase(join(root, 'media.sqlite'), { blobDir });
  });

  afterEach(() => {
    db.close();
    rmSync(root, { recursive: true, force: true });
  });

  function makeLibrary(transformer: MediaTransformer, afterReplace = vi.fn(async () => {})): MediaLibrary {
    return new MediaLibrary({
      catalog: new SqliteCatalogStore(db),
      jobs: new SqliteJobStore(db),
      audit: new SqliteAuditStore(db),
      blobs: new FsBlobStore(blobDir),
      transformers: new TransformerRegistry([transformer]),
      hooks: { afterReplace },
    });
  }

  async function ingestHero(library: MediaLibrary) {
    const png = await sharp({ create: { width: 64, height: 48, channels: 3, background: '#336699' } })
      .png()
      .toBuffer();
    return library.ingest({ kind: 'image', data: png, mime: 'image/png', filename: 'hero.png' });
  }

  it('keeps the child ready with its old meta while the replacement job is queued', async () => {
    const library = makeLibrary(countingTransformer());
    const asset = await ingestHero(library);
    const first = await library.materializeChild(asset.id, undefined, undefined, { variant: '640' });
    expect(first.child.meta).toMatchObject({ call: 1 });

    const queued = await library.enqueueMaterializeChild(asset.id, undefined, undefined, { variant: '640' });

    expect(queued.job.status).toBe('queued');
    expect(queued.child).toMatchObject({
      id: first.child.id,
      status: 'ready',
      path: 'm/pf/i/hero@640.webp',
      meta: { call: 1 },
    });
    const [stored] = await library.listChildren(asset.id);
    expect(stored).toMatchObject({ status: 'ready', meta: { call: 1 } });
    // The in-flight job is tracked on its own.
    expect(await library.listJobs({ assetId: asset.id, status: 'queued' })).toHaveLength(1);
  });

  it('swaps the meta only when the replacement job succeeds', async () => {
    const afterReplace = vi.fn(async () => {});
    const library = makeLibrary(countingTransformer(), afterReplace);
    const asset = await ingestHero(library);
    await library.materializeChild(asset.id, undefined, undefined, { variant: '640' });

    const second = await library.materializeChild(asset.id, undefined, undefined, { variant: '640' });

    expect(second.job.status).toBe('succeeded');
    expect(second.child).toMatchObject({ status: 'ready', meta: { call: 2, contentType: 'image/webp' } });
    expect((await library.listChildren(asset.id))[0]?.meta).toMatchObject({ call: 2 });
    expect(afterReplace).toHaveBeenCalledOnce();
  });

  it('keeps the old child ready and records the failure on the job and audit when the replacement fails', async () => {
    const library = makeLibrary(countingTransformer({ failOn: [2] }));
    const asset = await ingestHero(library);
    const first = await library.materializeChild(asset.id, undefined, undefined, { variant: '640' });
    const oldBytes = readFileSync(join(blobDir, 'm/pf/i/hero@640.webp'));

    const second = await library.materializeChild(asset.id, undefined, undefined, { variant: '640' });

    expect(second.job).toMatchObject({ status: 'failed', lastError: 'recipe rejected on call 2' });
    expect(second.child).toMatchObject({ id: first.child.id, status: 'ready', meta: { call: 1 } });
    expect((await library.listChildren(asset.id))[0]).toMatchObject({ status: 'ready', meta: { call: 1 } });
    expect(readFileSync(join(blobDir, 'm/pf/i/hero@640.webp')).equals(oldBytes)).toBe(true);
    const events = await library.listAuditEvents(first.child.id);
    expect(events.find((event) => event.action === 'child.materialize_failed')).toMatchObject({
      payload: { error: 'recipe rejected on call 2' },
    });
  });

  it('keeps the old child ready when dispatching the replacement job fails', async () => {
    const library = makeLibrary(countingTransformer());
    const asset = await ingestHero(library);
    await library.materializeChild(asset.id, undefined, undefined, { variant: '640' });
    const queued = await library.enqueueMaterializeChild(asset.id, undefined, undefined, { variant: '640' });

    const failed = await library.failMaterializeDispatch(queued.job.id, 'queue unavailable');

    expect(failed.job).toMatchObject({ status: 'failed', lastError: 'queue unavailable' });
    expect(failed.child).toMatchObject({ status: 'ready', meta: { call: 1 } });
  });

  it('still fails a first materialize that has no previous object', async () => {
    const library = makeLibrary(countingTransformer({ failOn: [1] }));
    const asset = await ingestHero(library);

    const result = await library.materializeChild(asset.id, undefined, undefined, { variant: '640' });

    expect(result.child).toMatchObject({ status: 'failed', path: null });
    expect(result.job.status).toBe('failed');
  });
});
