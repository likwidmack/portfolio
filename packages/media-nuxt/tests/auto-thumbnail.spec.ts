import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { MediaAsset, MediaChild, MediaLibrary } from '@tgmc/media';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const enqueueMaterializeJob = vi.hoisted(() => vi.fn());

vi.mock('@tgmc/media-aws', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tgmc/media-aws')>()),
  enqueueMaterializeJob,
}));

import { ensureDefaultThumbnail, getMediaLibrary, resetMediaLibraryCache } from '../runtime/server/utils/media-library';

const ENV_KEYS = [
  'DATA_BACKEND',
  'SYS_ENV',
  'E2E_STORE_SYS_ENV',
  'MEDIA_LOCAL_ROOT',
  'MEDIA_QUEUE_URL',
  'MEDIA_TABLE',
  'ASSETS_BUCKET',
  'AWS_LAMBDA_FUNCTION_NAME',
] as const;

const png = () =>
  sharp({ create: { width: 640, height: 400, channels: 3, background: { r: 200, g: 40, b: 90 } } })
    .png()
    .toBuffer();

const asset = (kind: MediaAsset['kind']): MediaAsset => ({
  id: `${kind}-1`,
  tenant: 'portfolio',
  kind,
  mime: 'application/octet-stream',
  sha256: 'x',
  byteSize: 1,
  name: 'x',
  path: `m/pf/${kind[0]}/x.bin`,
  meta: {},
  createdAt: '',
  updatedAt: '',
});

function fakeLibrary(children: Partial<MediaChild>[] = []) {
  const result = { child: { id: 'c-1' }, job: { id: 'job-1' } };
  return {
    listChildren: vi.fn().mockResolvedValue(children),
    materializeChild: vi.fn().mockResolvedValue(result),
    enqueueMaterializeChild: vi.fn().mockResolvedValue(result),
    failMaterializeDispatch: vi.fn().mockResolvedValue(undefined),
  };
}
const asLibrary = (fake: ReturnType<typeof fakeLibrary>) => fake as unknown as MediaLibrary;

describe('ensureDefaultThumbnail (the t thumbnail every uploaded image gets)', () => {
  const saved: Record<string, string | undefined> = {};
  let root: string;

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    root = mkdtempSync(join(tmpdir(), 'tgmc-auto-thumb-'));
    process.env.MEDIA_LOCAL_ROOT = root;
    process.env.DATA_BACKEND = 'sqlite';
    resetMediaLibraryCache();
    enqueueMaterializeJob.mockReset();
  });

  afterEach(() => {
    resetMediaLibraryCache();
    rmSync(root, { recursive: true, force: true });
    vi.restoreAllMocks();
    for (const key of ENV_KEYS) {
      if (saved[key] == null) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it('materializes a ready 320w webp t child for a new image, once', async () => {
    const library = getMediaLibrary();
    const image = await library.ingest({ kind: 'image', data: await png(), filename: 'auto.png' });
    const materialize = vi.spyOn(library, 'materializeChild');

    await ensureDefaultThumbnail(library, image);
    await ensureDefaultThumbnail(library, image);

    const children = await library.listChildren(image.id);
    expect(children).toHaveLength(1);
    expect(children[0]).toMatchObject({ variant: 't', role: 't', status: 'ready', path: 'm/pf/i/auto@t.webp' });
    expect(children[0]?.meta).toMatchObject({ width: 320 });
    expect(materialize).toHaveBeenCalledTimes(1);
  });

  it.each(['svg', 'audio', 'video', 'model', 'document'] as const)('leaves %s alone', async (kind) => {
    const library = fakeLibrary();
    await ensureDefaultThumbnail(asLibrary(library), asset(kind));
    expect(library.listChildren).not.toHaveBeenCalled();
    expect(library.materializeChild).not.toHaveBeenCalled();
  });

  it('retries after a failed thumbnail but not over a pending or ready one', async () => {
    const failed = fakeLibrary([{ variant: 't', status: 'failed' }]);
    await ensureDefaultThumbnail(asLibrary(failed), asset('image'));
    expect(failed.materializeChild).toHaveBeenCalledWith('image-1', 't', null, { variant: 't' });

    const pending = fakeLibrary([{ variant: 't', status: 'pending' }]);
    await ensureDefaultThumbnail(asLibrary(pending), asset('image'));
    expect(pending.materializeChild).not.toHaveBeenCalled();
  });

  it('never fails the upload: a transform error is logged', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const library = fakeLibrary();
    library.materializeChild.mockRejectedValue(new Error('Input buffer contains unsupported image format'));
    await expect(ensureDefaultThumbnail(asLibrary(library), asset('image'))).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('unsupported image format'));
  });

  it('logs a terminal failure the library reports as a failed job (it resolves, it does not throw)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const library = fakeLibrary();
    library.materializeChild.mockResolvedValue({
      child: { id: 'c-1', status: 'failed' },
      job: { id: 'job-1', status: 'failed', lastError: 'No transformer for kind' },
    });
    await expect(ensureDefaultThumbnail(asLibrary(library), asset('image'))).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith('[media] default thumbnail for m/pf/i/x.bin failed: No transformer for kind');
  });

  it('logs a real unreadable image end to end, and the upload still succeeds', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const library = getMediaLibrary();
    const image = await library.ingest({ kind: 'image', data: Buffer.from('not a png'), filename: 'broken.png' });
    await expect(ensureDefaultThumbnail(library, image)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[media] default thumbnail for m/pf/i/broken.png failed')
    );
  });

  describe('with MEDIA_QUEUE_URL (AWS media mode)', () => {
    beforeEach(() => {
      process.env.DATA_BACKEND = 'dynamodb';
      process.env.MEDIA_TABLE = 'portfolio-test-Media';
      process.env.ASSETS_BUCKET = 'portfolio-test-assets';
      process.env.MEDIA_QUEUE_URL = 'https://sqs.us-west-2.amazonaws.com/1/media';
    });

    it('queues the job for the worker instead of running sharp in the request', async () => {
      enqueueMaterializeJob.mockResolvedValue(undefined);
      const library = fakeLibrary();
      await ensureDefaultThumbnail(asLibrary(library), asset('image'));
      expect(library.enqueueMaterializeChild).toHaveBeenCalledWith('image-1', 't', null, { variant: 't' });
      expect(enqueueMaterializeJob).toHaveBeenCalledWith(process.env.MEDIA_QUEUE_URL, { jobId: 'job-1' });
      expect(library.materializeChild).not.toHaveBeenCalled();
    });

    it('marks the job failed when SQS rejects it, and still resolves', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      enqueueMaterializeJob.mockRejectedValue(new Error('throttled'));
      const library = fakeLibrary();
      await expect(ensureDefaultThumbnail(asLibrary(library), asset('image'))).resolves.toBeUndefined();
      expect(library.failMaterializeDispatch).toHaveBeenCalledWith('job-1', 'SQS dispatch failed: throttled');
    });
  });
});
