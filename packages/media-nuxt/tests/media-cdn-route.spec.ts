import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { FsBlobStore } from '@tgmc/media';
import { PRESIGN_CACHE_CONTROL } from '@tgmc/media-aws';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import mediaCdnHandler from '../runtime/server/routes/m/[...path]';
import { rawRequestStatus, serveRoutes, type TestServer } from './helpers/h3-server';

const ENV_KEYS = [
  'DATA_BACKEND',
  'SYS_ENV',
  'E2E_STORE_SYS_ENV',
  'MEDIA_LOCAL_ROOT',
  'AWS_LAMBDA_FUNCTION_NAME',
] as const;

const md5 = (data: string) => createHash('md5').update(data).digest('hex');

describe('GET /m/** (CDN stand-in for filesystem backends)', () => {
  const saved: Record<string, string | undefined> = {};
  let server: TestServer;
  let root: string;
  let store: FsBlobStore;

  beforeAll(async () => {
    server = await serveRoutes([{ path: '/m/**:path', handler: mediaCdnHandler }]);
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(async () => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    root = mkdtempSync(join(tmpdir(), 'tgmc-media-cdn-'));
    process.env.DATA_BACKEND = 'sqlite';
    process.env.MEDIA_LOCAL_ROOT = root;
    store = new FsBlobStore(join(root, 'blobs'));
    await store.put('m/pf/i/hero.png', Buffer.from('png-bytes'), {
      contentType: 'image/png',
      cacheControl: PRESIGN_CACHE_CONTROL,
      contentDisposition: 'inline; filename="hero.png"',
    });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    for (const key of ENV_KEYS) {
      if (saved[key] == null) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  const get = (path: string, init?: RequestInit) => fetch(`${server.url}${path}`, init);

  it('serves the blob with the sidecar Content-Type and CloudFront-like headers', async () => {
    const res = await get('/m/pf/i/hero.png');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('png-bytes');
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('content-length')).toBe('9');
    expect(res.headers.get('cache-control')).toBe('no-cache');
    expect(res.headers.get('content-disposition')).toBe('inline; filename="hero.png"');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('etag')).toBe(`"${md5('png-bytes')}"`);
  });

  it('serves blobs without a sidecar with derived type and the default headers', async () => {
    mkdirSync(join(root, 'blobs/m/pf/i'), { recursive: true });
    writeFileSync(join(root, 'blobs/m/pf/i/legacy.jpg'), 'jpeg');
    const res = await get('/m/pf/i/legacy.jpg');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/jpeg');
    expect(res.headers.get('cache-control')).toBe('no-cache');
    expect(res.headers.get('content-disposition')).toBe('inline; filename="legacy.jpg"');
  });

  it('makes browsers revalidate, so a variant overwritten in place is not served stale', async () => {
    await store.put('m/pf/i/hero@t.webp', Buffer.from('thumb-v1'), { contentType: 'image/webp' });
    const first = await get('/m/pf/i/hero@t.webp');
    const firstTag = first.headers.get('etag') ?? '';
    await first.text();
    expect(first.headers.get('cache-control')).toBe('no-cache');

    await store.put('m/pf/i/hero@t.webp', Buffer.from('thumb-v2'), { contentType: 'image/webp' });
    const revalidated = await get('/m/pf/i/hero@t.webp', { headers: { 'If-None-Match': firstTag } });
    expect(revalidated.status).toBe(200);
    expect(await revalidated.text()).toBe('thumb-v2');
    expect(revalidated.headers.get('etag')).toBe(`"${md5('thumb-v2')}"`);
  });

  it('answers HEAD with the headers and no body', async () => {
    const res = await get('/m/pf/i/hero.png', { method: 'HEAD' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('content-length')).toBe('9');
    expect(await res.text()).toBe('');
  });

  it('returns 304 for a matching If-None-Match', async () => {
    const res = await get('/m/pf/i/hero.png', { headers: { 'If-None-Match': `"${md5('png-bytes')}"` } });
    expect(res.status).toBe(304);
    expect(await res.text()).toBe('');
  });

  describe('conditional requests (If-None-Match)', () => {
    const etag = `"${md5('png-bytes')}"`;

    for (const header of [`W/${etag}`, `"other", ${etag}`, `W/"other",W/${etag}`, '*']) {
      it(`returns 304 for ${JSON.stringify(header)} (weak comparison, lists, *)`, async () => {
        const res = await get('/m/pf/i/hero.png', { headers: { 'If-None-Match': header } });
        expect(res.status).toBe(304);
        expect(res.headers.get('etag')).toBe(etag);
      });
    }

    it('serves the body when no listed tag matches', async () => {
      const res = await get('/m/pf/i/hero.png', { headers: { 'If-None-Match': `"a", W/"b"` } });
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('png-bytes');
    });

    it('answers 304 before looking at Range', async () => {
      const res = await get('/m/pf/i/hero.png', { headers: { 'If-None-Match': etag, Range: 'bytes=0-1' } });
      expect(res.status).toBe(304);
    });
  });

  describe('Range requests (video / audio previews; Safari needs 206)', () => {
    // 'png-bytes': p0 n1 g2 -3 b4 y5 t6 e7 s8
    const ranged = (range: string, extra: Record<string, string> = {}) =>
      get('/m/pf/i/hero.png', { headers: { Range: range, ...extra } });

    it('advertises byte ranges on full responses and HEAD', async () => {
      expect((await get('/m/pf/i/hero.png')).headers.get('accept-ranges')).toBe('bytes');
      expect((await get('/m/pf/i/hero.png', { method: 'HEAD' })).headers.get('accept-ranges')).toBe('bytes');
    });

    for (const [range, body, contentRange] of [
      ['bytes=0-2', 'png', 'bytes 0-2/9'],
      ['bytes=4-', 'bytes', 'bytes 4-8/9'],
      ['bytes=-3', 'tes', 'bytes 6-8/9'],
      ['bytes=6-100', 'tes', 'bytes 6-8/9'],
      ['bytes=-100', 'png-bytes', 'bytes 0-8/9'],
      [' bytes = 1 - 1 ', 'n', 'bytes 1-1/9'],
    ] as const) {
      it(`answers ${JSON.stringify(range)} with 206 ${contentRange}`, async () => {
        const res = await ranged(range);
        expect(res.status).toBe(206);
        expect(await res.text()).toBe(body);
        expect(res.headers.get('content-range')).toBe(contentRange);
        expect(res.headers.get('content-length')).toBe(String(body.length));
        expect(res.headers.get('content-type')).toBe('image/png');
        expect(res.headers.get('etag')).toBe(`"${md5('png-bytes')}"`);
        expect(res.headers.get('accept-ranges')).toBe('bytes');
      });
    }

    for (const range of ['bytes=9-', 'bytes=20-30', 'bytes=-0']) {
      it(`answers the unsatisfiable ${JSON.stringify(range)} with 416 and the full length`, async () => {
        const res = await ranged(range);
        expect(res.status).toBe(416);
        expect(res.headers.get('content-range')).toBe('bytes */9');
        await res.text();
      });
    }

    for (const range of ['bytes=5-2', 'bytes=0-1,3-4', 'items=0-1', 'bytes=abc', 'bytes=', 'bytes=-']) {
      it(`ignores ${JSON.stringify(range)} and serves the whole object (200)`, async () => {
        const res = await ranged(range);
        expect(res.status).toBe(200);
        expect(await res.text()).toBe('png-bytes');
      });
    }

    it('honours If-Range only when it names the current ETag', async () => {
      const etag = `"${md5('png-bytes')}"`;
      const matching = await ranged('bytes=0-2', { 'If-Range': etag });
      expect(matching.status).toBe(206);
      expect(await matching.text()).toBe('png');
      const stale = await ranged('bytes=0-2', { 'If-Range': '"stale"' });
      expect(stale.status).toBe(200);
      expect(await stale.text()).toBe('png-bytes');
      const weak = await ranged('bytes=0-2', { 'If-Range': `W/${etag}` });
      expect(weak.status).toBe(200);
      await weak.text();
    });

    it('ignores Range on HEAD (range handling is defined for GET only)', async () => {
      const res = await get('/m/pf/i/hero.png', { method: 'HEAD', headers: { Range: 'bytes=0-2' } });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-length')).toBe('9');
    });

    it('treats any range of an empty object as unsatisfiable', async () => {
      await store.put('m/pf/a/empty.mp3', Buffer.alloc(0), { contentType: 'audio/mpeg' });
      const res = await get('/m/pf/a/empty.mp3', { headers: { Range: 'bytes=0-' } });
      expect(res.status).toBe(416);
      expect(res.headers.get('content-range')).toBe('bytes */0');
      await res.text();
    });
  });

  it('sandboxes SVG responses with a restrictive CSP', async () => {
    await store.put('m/pf/s/logo.svg', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'), {
      contentType: 'image/svg+xml',
    });
    const res = await get('/m/pf/s/logo.svg');
    expect(res.status).toBe(200);
    const csp = res.headers.get('content-security-policy') ?? '';
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain('sandbox');
  });

  describe('sandbox CSP on anything that is not passive media', () => {
    const cspOf = async (contentType: string) => {
      await store.put('m/pf/d/probe.bin', Buffer.from('<x/>'), { contentType });
      const res = await get('/m/pf/d/probe.bin');
      expect(res.status).toBe(200);
      return res.headers.get('content-security-policy');
    };

    for (const contentType of [
      'image/svg+xml',
      'image/svg+xml; charset=utf-8',
      'Image/SVG+XML',
      ' image/svg+xml ',
      'text/html',
      'text/html; charset=utf-8',
      'application/xhtml+xml',
      'application/xml',
      'text/plain',
      'application/octet-stream',
    ]) {
      it(`sandboxes ${JSON.stringify(contentType)}`, async () => {
        const csp = (await cspOf(contentType)) ?? '';
        expect(csp).toContain("default-src 'none'");
        expect(csp).toContain('sandbox');
      });
    }

    for (const contentType of ['image/png', 'IMAGE/WEBP', 'video/mp4', 'audio/mpeg', 'font/woff2', 'application/pdf']) {
      it(`leaves passive ${JSON.stringify(contentType)} without a CSP`, async () => {
        expect(await cspOf(contentType)).toBeNull();
      });
    }
  });

  it('never serves sidecars or temp files', async () => {
    writeFileSync(join(root, 'blobs/m/pf/i/.hero.png.1234.tmp'), 'partial');
    expect((await get('/m/pf/i/hero.png.meta.json')).status).toBe(404);
    expect((await get('/m/pf/i/.hero.png.1234.tmp')).status).toBe(404);
  });

  it('rejects traversal and keys outside the media scheme (404)', async () => {
    writeFileSync(join(root, 'media.sqlite'), 'secret');
    writeFileSync(join(root, 'blobs', 'secret.png'), 'secret');
    for (const path of [
      '/m/../media.sqlite',
      '/m/pf/i/../../../../media.sqlite',
      '/m/pf/i/%2e%2e/%2e%2e/%2e%2e/secret.png',
      '/m/pf/i/..%2F..%2F..%2Fsecret.png',
      '/m/pf/i/..%5C..%5C..%5Csecret.png',
      '/m/pf/i/hero.png%00.txt',
      '/m/pf/i/Hero.PNG',
    ]) {
      expect(await rawRequestStatus(server.url, path), path).toBe(404);
    }
  });

  it('is 404 for a missing blob', async () => {
    expect((await get('/m/pf/i/missing.png')).status).toBe(404);
  });

  it('only answers GET and HEAD (405 otherwise)', async () => {
    const res = await get('/m/pf/i/hero.png', { method: 'POST', body: 'x' });
    expect(res.status).toBe(405);
  });

  it('does not exist on DATA_BACKEND=dynamodb (CloudFront / MinIO serve m/* there)', async () => {
    process.env.DATA_BACKEND = 'dynamodb';
    expect((await get('/m/pf/i/hero.png')).status).toBe(404);
  });

  it('does not exist on Lambda, even with a filesystem backend resolved', async () => {
    process.env.AWS_LAMBDA_FUNCTION_NAME = 'portfolio-test-Web';
    expect((await get('/m/pf/i/hero.png')).status).toBe(404);
  });
});
