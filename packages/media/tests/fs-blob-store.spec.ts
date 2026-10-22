import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';

import { FS_BLOB_META_SUFFIX, FsBlobStore } from '../src/adapters/fs-blob-store.js';
import {
  MediaBlobExistsError,
  MediaBlobTooLargeError,
  MediaNotFoundError,
  RecipeValidationError,
} from '../src/errors.js';
import { mediaErrorToHttp } from '../src/http-errors.js';

const sha256 = (data: Buffer | string) => createHash('sha256').update(data).digest('hex');
const md5 = (data: Buffer | string) => createHash('md5').update(data).digest('hex');

function listFiles(dir: string, prefix = ''): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? listFiles(join(dir, entry.name), `${prefix}${entry.name}/`) : [`${prefix}${entry.name}`]
  );
}

describe('FsBlobStore', () => {
  let root: string;
  let store: FsBlobStore;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'tgmc-fs-blob-'));
    store = new FsBlobStore(root);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  /** What `putStream` does to a variant before its sidecar rename: a new body renamed over the blob. */
  function replaceBody(key: string, body: string): void {
    const next = join(root, `${key}.next`);
    writeFileSync(next, body);
    renameSync(next, join(root, key));
  }

  describe('openRead', () => {
    it('pairs the sidecar metadata with a stream of the same file', async () => {
      await store.put('m/pf/i/hero@t.webp', Buffer.from('thumb-v1'), { contentType: 'image/webp' });
      const reader = await store.openRead('m/pf/i/hero@t.webp');
      expect(reader?.meta).toMatchObject({ contentType: 'image/webp', sha256: sha256('thumb-v1') });
      expect(Buffer.concat(await reader!.stream().toArray()).toString()).toBe('thumb-v1');
    });

    it('describes the bytes it streams, never an older sidecar', async () => {
      await store.put('m/pf/i/hero@t.webp', Buffer.from('thumb-v1'), { contentType: 'image/webp' });
      replaceBody('m/pf/i/hero@t.webp', 'thumb-v2');
      const reader = await store.openRead('m/pf/i/hero@t.webp');
      const bytes = Buffer.concat(await reader!.stream().toArray());
      expect(bytes.toString()).toBe('thumb-v2');
      expect(reader?.meta).toMatchObject({
        byteSize: bytes.byteLength,
        sha256: sha256(bytes),
        etag: `"${md5(bytes)}"`,
      });
    });

    it('streams an inclusive byte range of the opened file (Range requests)', async () => {
      await store.put('m/pf/v/clip.mp4', Buffer.from('0123456789'), { contentType: 'video/mp4' });
      const reader = await store.openRead('m/pf/v/clip.mp4');
      expect(Buffer.concat(await reader!.stream({ start: 2, end: 5 }).toArray()).toString()).toBe('2345');
    });

    it('can be closed without streaming (HEAD, 304)', async () => {
      await store.put('m/pf/i/hero.png', Buffer.from('png'));
      const reader = await store.openRead('m/pf/i/hero.png');
      await reader!.close();
      await store.delete('m/pf/i/hero.png');
      expect(listFiles(root)).toEqual([]);
    });

    it('is null for a missing key and rejects invalid keys', async () => {
      expect(await store.openRead('m/pf/i/nope.png')).toBeNull();
      await expect(store.openRead('m/pf/i/../../x.png')).rejects.toBeInstanceOf(RecipeValidationError);
    });
  });

  describe('layout', () => {
    it('writes <root>/<key> so the disk layout matches the S3 key and the URL', async () => {
      await store.put('m/pf/i/manhattan-keyframe.png', Buffer.from('png'));
      expect(readFileSync(join(root, 'm', 'pf', 'i', 'manhattan-keyframe.png'), 'utf8')).toBe('png');
      expect(await store.get('m/pf/i/manhattan-keyframe.png')).toEqual(Buffer.from('png'));
    });

    it('leaves only the blob and its sidecar behind (no temp files)', async () => {
      await store.put('m/pf/i/hero.png', Buffer.from('a'));
      await store.put('m/pf/i/hero@640.webp', Buffer.from('b'));
      expect(listFiles(root).sort()).toEqual([
        'm/pf/i/hero.png',
        `m/pf/i/hero.png${FS_BLOB_META_SUFFIX}`,
        'm/pf/i/hero@640.webp',
        `m/pf/i/hero@640.webp${FS_BLOB_META_SUFFIX}`,
      ]);
    });
  });

  describe('sidecar metadata', () => {
    it('records contentType, byteSize, sha256, an S3-style etag and the object headers', async () => {
      const body = Buffer.from('hello world');
      await store.put('m/pf/i/hero.png', body, {
        contentType: 'image/png',
        cacheControl: 'public, max-age=31536000, immutable',
        contentDisposition: 'inline; filename="hero.png"',
      });
      const sidecar = JSON.parse(readFileSync(join(root, `m/pf/i/hero.png${FS_BLOB_META_SUFFIX}`), 'utf8'));
      const expected = {
        contentType: 'image/png',
        byteSize: body.byteLength,
        sha256: sha256(body),
        etag: `"${md5(body)}"`,
        cacheControl: 'public, max-age=31536000, immutable',
        contentDisposition: 'inline; filename="hero.png"',
      };
      expect(sidecar).toEqual({ ...expected, generation: expect.any(String) });
      expect(await store.readMeta('m/pf/i/hero.png')).toEqual(expected);
    });

    it('head() and stat() read the sidecar like S3 HeadObject', async () => {
      await store.put('m/pf/i/hero.png', Buffer.from('abc'), { contentType: 'image/png' });
      expect(await store.head('m/pf/i/hero.png')).toEqual({
        contentLength: 3,
        contentType: 'image/png',
        eTag: `"${md5('abc')}"`,
      });
      expect(await store.stat('m/pf/i/hero.png')).toEqual({ byteSize: 3 });
    });

    it('derives metadata from the file when there is no sidecar (legacy-migrated blobs)', async () => {
      mkdirSync(join(root, 'm/pf/i'), { recursive: true });
      writeFileSync(join(root, 'm/pf/i/legacy.jpg'), 'jpeg-bytes');
      expect(await store.readMeta('m/pf/i/legacy.jpg')).toEqual({
        contentType: 'image/jpeg',
        byteSize: 10,
        sha256: sha256('jpeg-bytes'),
        etag: `"${md5('jpeg-bytes')}"`,
      });
    });

    it('ignores a stale sidecar whose size no longer matches the file', async () => {
      await store.put('m/pf/i/hero@t.webp', Buffer.from('old'), { contentType: 'image/webp' });
      writeFileSync(join(root, 'm/pf/i/hero@t.webp'), 'replaced-out-of-band');
      const meta = await store.readMeta('m/pf/i/hero@t.webp');
      expect(meta).toMatchObject({ byteSize: 20, sha256: sha256('replaced-out-of-band') });
    });

    it('ignores a same-size sidecar recorded for a previous body (crash between body and sidecar)', async () => {
      await store.put('m/pf/i/hero@t.webp', Buffer.from('thumb-v1'), { contentType: 'image/webp' });
      replaceBody('m/pf/i/hero@t.webp', 'thumb-v2');
      expect(await store.readMeta('m/pf/i/hero@t.webp')).toEqual({
        contentType: 'image/webp',
        byteSize: 8,
        sha256: sha256('thumb-v2'),
        etag: `"${md5('thumb-v2')}"`,
      });
    });

    it('reports missing blobs as null / false / not found', async () => {
      expect(await store.readMeta('m/pf/i/nope.png')).toBeNull();
      expect(await store.stat('m/pf/i/nope.png')).toBeNull();
      expect(await store.exists('m/pf/i/nope.png')).toBe(false);
      await expect(store.head('m/pf/i/nope.png')).rejects.toBeInstanceOf(MediaNotFoundError);
    });

    it('digestSha256 hashes the stored bytes', async () => {
      await store.put('m/pf/d/report.pdf', Buffer.from('%PDF'));
      expect(await store.digestSha256('m/pf/d/report.pdf')).toBe(sha256('%PDF'));
    });

    it('delete removes the blob and its sidecar and tolerates a missing key', async () => {
      await store.put('m/pf/i/hero.png', Buffer.from('a'));
      await store.delete('m/pf/i/hero.png');
      await store.delete('m/pf/i/hero.png');
      expect(listFiles(root)).toEqual([]);
    });
  });

  describe('create-only originals', () => {
    it('rejects a second write to the same original like If-None-Match: * (412)', async () => {
      await store.put('m/pf/i/hero.png', Buffer.from('first'));
      const err = await store.put('m/pf/i/hero.png', Buffer.from('second')).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(MediaBlobExistsError);
      expect(mediaErrorToHttp(err)).toMatchObject({ statusCode: 412 });
      expect(await store.get('m/pf/i/hero.png')).toEqual(Buffer.from('first'));
      expect(listFiles(root).sort()).toEqual(['m/pf/i/hero.png', `m/pf/i/hero.png${FS_BLOB_META_SUFFIX}`]);
    });

    it('lets exactly one of two concurrent writers win', async () => {
      const results = await Promise.allSettled([
        store.put('m/pf/i/race.png', Buffer.from('one')),
        store.put('m/pf/i/race.png', Buffer.from('two')),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
      expect(rejected.reason).toBeInstanceOf(MediaBlobExistsError);
    });

    it('allows an original to be written again after delete', async () => {
      await store.put('m/pf/i/hero.png', Buffer.from('first'));
      await store.delete('m/pf/i/hero.png');
      await store.put('m/pf/i/hero.png', Buffer.from('second'));
      expect(await store.get('m/pf/i/hero.png')).toEqual(Buffer.from('second'));
    });

    it('lets variants overwrite in place and refreshes their sidecar', async () => {
      await store.put('m/pf/i/hero@640.webp', Buffer.from('v1'), { contentType: 'image/webp' });
      await store.put('m/pf/i/hero@640.webp', Buffer.from('v2-longer'), { contentType: 'image/webp' });
      expect(await store.get('m/pf/i/hero@640.webp')).toEqual(Buffer.from('v2-longer'));
      expect(await store.readMeta('m/pf/i/hero@640.webp')).toMatchObject({ byteSize: 9, sha256: sha256('v2-longer') });
    });

    it('createOnly makes a variant create-only too', async () => {
      await store.put('m/pf/i/hero@640.webp', Buffer.from('v1'), { contentType: 'image/webp' });
      const err = await store
        .put('m/pf/i/hero@640.webp', Buffer.from('v2'), { contentType: 'image/webp', createOnly: true })
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(MediaBlobExistsError);
      expect(await store.get('m/pf/i/hero@640.webp')).toEqual(Buffer.from('v1'));

      await store.put('m/pf/i/hero@t.webp', Buffer.from('t1'), { createOnly: true });
      expect(await store.get('m/pf/i/hero@t.webp')).toEqual(Buffer.from('t1'));
      expect(listFiles(root).filter((f) => f.includes('.tmp'))).toEqual([]);
    });
  });

  describe('putStream', () => {
    it('streams into the store and returns the recorded metadata', async () => {
      const meta = await store.putStream('m/pf/i/streamed.png', Readable.from([Buffer.from('ab'), Buffer.from('cd')]), {
        contentType: 'image/png',
        maxBytes: 4,
      });
      expect(meta).toMatchObject({ byteSize: 4, sha256: sha256('abcd'), contentType: 'image/png' });
      expect(await store.get('m/pf/i/streamed.png')).toEqual(Buffer.from('abcd'));
    });

    it('aborts past maxBytes (413) and leaves nothing behind', async () => {
      const err = await store
        .putStream('m/pf/i/big.png', Readable.from([Buffer.alloc(3), Buffer.alloc(3)]), { maxBytes: 5 })
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(MediaBlobTooLargeError);
      expect(mediaErrorToHttp(err)).toMatchObject({ statusCode: 413 });
      expect(listFiles(root)).toEqual([]);
    });

    it('is create-only for originals too', async () => {
      await store.put('m/pf/i/hero.png', Buffer.from('first'));
      await expect(store.putStream('m/pf/i/hero.png', Readable.from([Buffer.from('x')]))).rejects.toBeInstanceOf(
        MediaBlobExistsError
      );
      expect(listFiles(root)).toHaveLength(2);
    });
  });

  describe('key guards', () => {
    const badKeys = [
      '../escape.png',
      'm/pf/i/../../../escape.png',
      'm/pf/i/..',
      '/m/pf/i/hero.png',
      'C:/m/pf/i/hero.png',
      'm\\pf\\i\\hero.png',
      'm/pf/i/hero\0.png',
      'm//pf/i/hero.png',
      'm/pf/i/hero.png.meta.json',
      'm/pf/i/.hero.png.tmp',
      'other/pf/i/hero.png',
      'm/pf/i/Hero.PNG',
      '',
    ];

    for (const key of badKeys) {
      it(`rejects ${JSON.stringify(key)} on every operation`, async () => {
        await expect(store.put(key, Buffer.from('x'))).rejects.toBeInstanceOf(RecipeValidationError);
        await expect(store.get(key)).rejects.toBeInstanceOf(RecipeValidationError);
        await expect(store.exists(key)).rejects.toBeInstanceOf(RecipeValidationError);
        await expect(store.readMeta(key)).rejects.toBeInstanceOf(RecipeValidationError);
        await expect(store.delete(key)).rejects.toBeInstanceOf(RecipeValidationError);
      });
    }

    it('never writes outside the root', async () => {
      await store.put('m/pf/i/../../../escape.png', Buffer.from('x')).catch(() => undefined);
      expect(existsSync(join(root, '..', 'escape.png'))).toBe(false);
    });
  });
});
