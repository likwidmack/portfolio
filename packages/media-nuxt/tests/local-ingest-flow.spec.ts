import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createError, type H3Event } from 'h3';
import sharp from 'sharp';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import localPutHandler from '../runtime/server/api/media/_local-s3/[...key].put';
import mediaCdnHandler from '../runtime/server/routes/m/[...path]';
import { getMediaLibrary, resetMediaLibraryCache } from '../runtime/server/utils/media-library';
import { LOCAL_S3_ROUTE } from '../runtime/server/utils/media-local-s3';
import { serveRoutes, type TestServer } from './helpers/h3-server';

vi.mock('../runtime/server/utils/media-library', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../runtime/server/utils/media-library')>()),
  requireMediaAdmin: () => {},
}));

const ENV_KEYS = [
  'DATA_BACKEND',
  'SYS_ENV',
  'E2E_STORE_SYS_ENV',
  'MEDIA_LOCAL_ROOT',
  'MEDIA_TABLE',
  'ASSETS_BUCKET',
] as const;

type Handler = (event: H3Event) => Promise<unknown>;

describe('local presign → PUT → complete → /m/** (sqlite, real library)', () => {
  const saved: Record<string, string | undefined> = {};
  let server: TestServer;
  let root: string;

  beforeAll(async () => {
    server = await serveRoutes([
      { path: `${LOCAL_S3_ROUTE}/**:key`, handler: localPutHandler, method: 'put' },
      { path: '/m/**:path', handler: mediaCdnHandler },
    ]);
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    root = mkdtempSync(join(tmpdir(), 'tgmc-local-flow-'));
    process.env.DATA_BACKEND = 'sqlite';
    process.env.MEDIA_LOCAL_ROOT = root;
    vi.stubGlobal('defineEventHandler', <T>(handler: T) => handler);
    vi.stubGlobal('createError', createError);
    resetMediaLibraryCache();
  });

  afterEach(() => {
    resetMediaLibraryCache();
    vi.unstubAllGlobals();
    rmSync(root, { recursive: true, force: true });
    for (const key of ENV_KEYS) {
      if (saved[key] == null) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  async function call(route: 'presign' | 'complete', body: Record<string, unknown>): Promise<unknown> {
    vi.stubGlobal('readBody', async () => body);
    const mod =
      route === 'presign'
        ? await import('../runtime/server/api/media/ingest/presign.post')
        : await import('../runtime/server/api/media/ingest/complete.post');
    const event = { node: { req: { headers: { host: new URL(server.url).host } } } } as unknown as H3Event;
    return (mod.default as unknown as Handler)(event);
  }

  it('registers the uploaded object and serves it at its key', async () => {
    const presigned = (await call('presign', { kind: 'image', mime: 'image/png', filename: 'Flow Test.png' })) as {
      assetId: string;
      path: string;
      uploadUrl: string;
      headers: Record<string, string>;
    };
    expect(presigned.path).toBe('m/pf/i/flow-test.png');

    const upload = await fetch(presigned.uploadUrl, { method: 'PUT', headers: presigned.headers, body: 'flow-bytes' });
    expect(upload.status).toBe(200);

    const asset = (await call('complete', {
      assetId: presigned.assetId,
      path: presigned.path,
      kind: 'image',
      mime: 'image/png',
    })) as Record<string, unknown>;
    expect(asset).toMatchObject({
      id: presigned.assetId,
      path: 'm/pf/i/flow-test.png',
      byteSize: 10,
      mime: 'image/png',
      sha256: createHash('sha256').update('flow-bytes').digest('hex'),
    });

    const served = await fetch(`${server.url}/${presigned.path}`);
    expect(served.status).toBe(200);
    expect(served.headers.get('content-type')).toBe('image/png');
    expect(await served.text()).toBe('flow-bytes');

    const again = await fetch(presigned.uploadUrl, { method: 'PUT', headers: presigned.headers, body: 'overwrite' });
    expect(again.status).toBe(412);
  });

  it('gives an uploaded image its t thumbnail on complete; an unreadable image still registers', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const upload = async (filename: string, body: Uint8Array | string) => {
      const presigned = (await call('presign', { kind: 'image', mime: 'image/png', filename })) as {
        assetId: string;
        path: string;
        uploadUrl: string;
        headers: Record<string, string>;
      };
      await fetch(presigned.uploadUrl, { method: 'PUT', headers: presigned.headers, body });
      return (await call('complete', {
        assetId: presigned.assetId,
        path: presigned.path,
        kind: 'image',
        mime: 'image/png',
      })) as { id: string; previewUrl?: string | null; publicUrl?: string };
    };
    const image = await sharp({
      create: { width: 400, height: 300, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .png()
      .toBuffer();

    const good = await upload('thumbed.png', new Uint8Array(image));
    expect(good).toMatchObject({ previewUrl: '/m/pf/i/thumbed@t.webp', publicUrl: '/m/pf/i/thumbed.png' });
    const thumbs = await getMediaLibrary().listChildren(good.id);
    expect(thumbs).toMatchObject([{ variant: 't', status: 'ready', path: 'm/pf/i/thumbed@t.webp' }]);
    expect((await fetch(`${server.url}/m/pf/i/thumbed@t.webp`)).headers.get('content-type')).toBe('image/webp');

    const bad = await upload('broken.png', 'not-a-png');
    expect(bad).toMatchObject({ previewUrl: '/m/pf/i/broken.png' });
    expect((await getMediaLibrary().listChildren(bad.id)).map((child) => child.status)).not.toContain('ready');
    warn.mockRestore();
  });

  it('keeps the 409 name-conflict flow identical to AWS', async () => {
    const first = (await call('presign', { kind: 'image', mime: 'image/png', filename: 'taken.png' })) as {
      assetId: string;
      path: string;
    };
    expect(first.path).toBe('m/pf/i/taken.png');
    const err = await call('presign', { kind: 'image', mime: 'image/jpeg', filename: 'taken.jpg' }).catch(
      (e: unknown) => e
    );
    expect(err).toMatchObject({
      statusCode: 409,
      data: { code: 'name_conflict', suggestedFilename: 'taken-2.jpg' },
    });
  });
});
