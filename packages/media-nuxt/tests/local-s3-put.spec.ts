import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { PRESIGN_CACHE_CONTROL } from '@tgmc/media-aws';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import localPutHandler from '../runtime/server/api/media/_local-s3/[...key].put';
import { createLocalPresignedIngest, LOCAL_S3_ROUTE, verifyLocalPut } from '../runtime/server/utils/media-local-s3';
import { rawRequestStatus, serveRoutes, type TestServer } from './helpers/h3-server';

const ENV_KEYS = [
  'DATA_BACKEND',
  'SYS_ENV',
  'E2E_STORE_SYS_ENV',
  'MEDIA_LOCAL_ROOT',
  'MEDIA_LOCAL_SIGNING_SECRET',
  'MEDIA_LOCAL_UPLOAD_MAX_BYTES',
  'AWS_LAMBDA_FUNCTION_NAME',
] as const;

const md5 = (data: string) => createHash('md5').update(data).digest('hex');

describe('local presigned PUT (/api/media/_local-s3/<key>)', () => {
  const saved: Record<string, string | undefined> = {};
  let server: TestServer;
  let root: string;

  beforeAll(async () => {
    server = await serveRoutes([{ path: `${LOCAL_S3_ROUTE}/**:key`, handler: localPutHandler, method: 'put' }]);
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    root = mkdtempSync(join(tmpdir(), 'tgmc-local-s3-'));
    process.env.DATA_BACKEND = 'sqlite';
    process.env.MEDIA_LOCAL_ROOT = root;
    process.env.MEDIA_LOCAL_SIGNING_SECRET = 'test-secret';
    process.env.MEDIA_LOCAL_UPLOAD_MAX_BYTES = '16';
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    for (const key of ENV_KEYS) {
      if (saved[key] == null) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  const blob = (key: string) => join(root, 'blobs', ...key.split('/'));
  const blobFiles = () =>
    existsSync(join(root, 'blobs'))
      ? readdirSync(join(root, 'blobs'), { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile())
      : [];

  function presign(path = 'm/pf/i/hero.png', mime = 'image/png', now?: number) {
    return createLocalPresignedIngest({ path, assetId: 'a-1', mime, origin: server.url, now });
  }

  function put(url: string, headers: Record<string, string>, body: string | ReadableStream = 'png-bytes') {
    return fetch(url, {
      method: 'PUT',
      headers,
      body,
      ...(typeof body === 'string' ? {} : { duplex: 'half' }),
    } as RequestInit);
  }

  it('signs an absolute URL on this origin with exactly the AWS presign headers', () => {
    const presigned = presign();
    expect(presigned.uploadUrl).toMatch(
      new RegExp(`^${server.url}/api/media/_local-s3/m/pf/i/hero\\.png\\?expires=\\d+&sig=[0-9a-f]{64}$`)
    );
    expect(presigned.headers).toEqual({
      'Content-Type': 'image/png',
      'If-None-Match': '*',
      'Cache-Control': PRESIGN_CACHE_CONTROL,
      'Content-Disposition': 'inline; filename="hero.png"',
    });
    expect(presigned).toMatchObject({ assetId: 'a-1', path: 'm/pf/i/hero.png' });
  });

  it('stores the upload through FsBlobStore with sidecar metadata and returns the ETag', async () => {
    const presigned = presign();
    const res = await put(presigned.uploadUrl, presigned.headers);
    expect(res.status).toBe(200);
    expect(res.headers.get('etag')).toBe(`"${md5('png-bytes')}"`);
    expect(readFileSync(blob('m/pf/i/hero.png'), 'utf8')).toBe('png-bytes');
    expect(JSON.parse(readFileSync(`${blob('m/pf/i/hero.png')}.meta.json`, 'utf8'))).toMatchObject({
      contentType: 'image/png',
      byteSize: 9,
      cacheControl: PRESIGN_CACHE_CONTROL,
      contentDisposition: 'inline; filename="hero.png"',
    });
  });

  it('rejects a tampered signature (403) and writes nothing', async () => {
    const presigned = presign();
    const url = new URL(presigned.uploadUrl);
    const sig = url.searchParams.get('sig') as string;
    url.searchParams.set('sig', `${sig.startsWith('a') ? 'b' : 'a'}${sig.slice(1)}`);
    const res = await put(url.toString(), presigned.headers);
    expect(res.status).toBe(403);
    expect(blobFiles()).toEqual([]);
  });

  it('rejects a signature made for another key (403)', async () => {
    const presigned = presign('m/pf/i/other.png');
    const res = await put(presigned.uploadUrl.replace('other.png', 'hero.png'), {
      ...presigned.headers,
      'Content-Disposition': 'inline; filename="hero.png"',
    });
    expect(res.status).toBe(403);
    expect(blobFiles()).toEqual([]);
  });

  it('rejects an expired URL (403)', async () => {
    const presigned = presign('m/pf/i/hero.png', 'image/png', Date.now() - 2 * 60 * 60 * 1000);
    const res = await put(presigned.uploadUrl, presigned.headers);
    expect(res.status).toBe(403);
    expect(await res.text()).toMatch(/expired/i);
    expect(blobFiles()).toEqual([]);
  });

  it('rejects a Content-Type other than the signed one (403)', async () => {
    const presigned = presign();
    const res = await put(presigned.uploadUrl, { ...presigned.headers, 'Content-Type': 'image/jpeg' });
    expect(res.status).toBe(403);
    expect(blobFiles()).toEqual([]);
  });

  it('requires every signed header, If-None-Match included (403)', async () => {
    const presigned = presign();
    const { 'If-None-Match': _dropped, ...rest } = presigned.headers;
    const res = await put(presigned.uploadUrl, rest);
    expect(res.status).toBe(403);
    expect(blobFiles()).toEqual([]);
  });

  it('rejects a declared body over the cap (413) and writes nothing', async () => {
    const presigned = presign();
    const res = await put(presigned.uploadUrl, presigned.headers, 'x'.repeat(17));
    expect(res.status).toBe(413);
    expect(blobFiles()).toEqual([]);
  });

  it('stops a chunked body at the cap and writes nothing', async () => {
    const presigned = presign();
    const chunks = ['x'.repeat(10), 'y'.repeat(10)];
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        const next = chunks.shift();
        if (next) controller.enqueue(new TextEncoder().encode(next));
        else controller.close();
      },
    });
    const status = await put(presigned.uploadUrl, presigned.headers, body).then(
      (res) => res.status,
      () => 'connection closed'
    );
    expect(status).not.toBe(200);
    expect(blobFiles()).toEqual([]);
  });

  it('is create-only: a second PUT to the same original is 412 and keeps the first bytes', async () => {
    const presigned = presign();
    expect((await put(presigned.uploadUrl, presigned.headers, 'first')).status).toBe(200);
    expect((await put(presigned.uploadUrl, presigned.headers, 'second')).status).toBe(412);
    expect(readFileSync(blob('m/pf/i/hero.png'), 'utf8')).toBe('first');
  });

  it('rejects keys that are not media originals (400)', async () => {
    const res = await put(`${server.url}${LOCAL_S3_ROUTE}/m/pf/i/hero@640.webp?expires=1&sig=00`, {});
    expect(res.status).toBe(400);
    for (const path of ['m/pf/i/%2e%2e/%2e%2e/escape.png', 'm/pf/i/..%2F..%2Fescape.png', 'm/pf/i/../../escape.png']) {
      expect(await rawRequestStatus(server.url, `${LOCAL_S3_ROUTE}/${path}?expires=1&sig=00`, 'PUT'), path).toBe(400);
    }
    expect(blobFiles()).toEqual([]);
  });

  it('does not exist on DATA_BACKEND=dynamodb (404), even with a valid signature', async () => {
    const presigned = presign();
    process.env.DATA_BACKEND = 'dynamodb';
    const res = await put(presigned.uploadUrl, presigned.headers);
    expect(res.status).toBe(404);
    expect(blobFiles()).toEqual([]);
  });

  it('does not exist on Lambda (404), even with a filesystem backend and a valid signature', async () => {
    const presigned = presign();
    process.env.AWS_LAMBDA_FUNCTION_NAME = 'portfolio-test-Web';
    const res = await put(presigned.uploadUrl, presigned.headers);
    expect(res.status).toBe(404);
    expect(blobFiles()).toEqual([]);
  });
});

describe('verifyLocalPut', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    saved.MEDIA_LOCAL_SIGNING_SECRET = process.env.MEDIA_LOCAL_SIGNING_SECRET;
    delete process.env.MEDIA_LOCAL_SIGNING_SECRET;
  });

  afterEach(() => {
    if (saved.MEDIA_LOCAL_SIGNING_SECRET == null) delete process.env.MEDIA_LOCAL_SIGNING_SECRET;
    else process.env.MEDIA_LOCAL_SIGNING_SECRET = saved.MEDIA_LOCAL_SIGNING_SECRET;
  });

  function signedRequest(origin = 'http://localhost') {
    const presigned = createLocalPresignedIngest({ path: 'm/pf/i/hero.png', assetId: 'a', mime: 'image/png', origin });
    const url = new URL(presigned.uploadUrl);
    const headers = new Map(Object.entries(presigned.headers).map(([k, v]) => [k.toLowerCase(), v]));
    return {
      key: 'm/pf/i/hero.png',
      expires: url.searchParams.get('expires'),
      sig: url.searchParams.get('sig'),
      header: (name: string) => headers.get(name.toLowerCase()),
    };
  }

  it('round-trips with the random per-process secret when MEDIA_LOCAL_SIGNING_SECRET is unset', () => {
    expect(verifyLocalPut(signedRequest())).toEqual({ ok: true });
  });

  it('fails when the secret changes between signing and verifying', () => {
    process.env.MEDIA_LOCAL_SIGNING_SECRET = 'one';
    const request = signedRequest();
    process.env.MEDIA_LOCAL_SIGNING_SECRET = 'two';
    expect(verifyLocalPut(request)).toMatchObject({ ok: false });
  });

  it('rejects malformed expires / sig without throwing', () => {
    const request = signedRequest();
    expect(verifyLocalPut({ ...request, expires: 'soon' })).toMatchObject({ ok: false });
    expect(verifyLocalPut({ ...request, sig: 'abc' })).toMatchObject({ ok: false });
    expect(verifyLocalPut({ ...request, sig: undefined })).toMatchObject({ ok: false });
    expect(verifyLocalPut({ ...request, expires: ['1', '2'] })).toMatchObject({ ok: false });
  });
});
