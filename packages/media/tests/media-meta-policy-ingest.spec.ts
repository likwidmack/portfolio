import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';

import { createMediaLibrary } from '../src/create-media-library.js';
import { RecipeValidationError } from '../src/errors.js';

async function makePng(): Promise<Buffer> {
  return sharp({ create: { width: 16, height: 12, channels: 3, background: { r: 10, g: 20, b: 30 } } })
    .png()
    .toBuffer();
}

describe('metadata policy in the ingest path', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'tgmc-media-policy-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  function open(enforceMetaPolicy?: boolean) {
    return createMediaLibrary({ dbPath: join(root, 'media.sqlite'), blobDir: join(root, 'blobs'), enforceMetaPolicy });
  }

  it('names every ingest with the policy filename (generator prefix dropped)', async () => {
    const handle = open();
    try {
      const asset = await handle.library.ingest({
        kind: 'image',
        data: await makePng(),
        filename: 'vimg-crystal-volume.png',
      });
      expect(asset.path).toBe('m/pf/i/crystal-volume.png');
      const reserved = await handle.library.reserveName({
        kind: 'document',
        filename: 'Tamara G Mack_Resume_2026.pdf',
      });
      expect(reserved.path).toBe('m/pf/d/tamara-mack-resume-2026.pdf');
    } finally {
      handle.close();
    }
  });

  it('leaves meta unchecked by default (admin uploads have no title / alt yet)', async () => {
    const handle = open();
    try {
      const asset = await handle.library.ingest({ kind: 'image', data: await makePng(), filename: 'a.png' });
      expect(asset.meta).toEqual({});
    } finally {
      handle.close();
    }
  });

  it('with enforceMetaPolicy, ingest rejects missing title / alt and writes nothing', async () => {
    const handle = open(true);
    try {
      await expect(
        handle.library.ingest({ kind: 'image', data: await makePng(), filename: 'hero.png', meta: { tags: ['site'] } })
      ).rejects.toBeInstanceOf(RecipeValidationError);
      expect(await handle.library.listAssets()).toEqual([]);
      const ok = await handle.library.ingest({
        kind: 'image',
        data: await makePng(),
        filename: 'hero.png',
        meta: { title: 'Hero', alt: 'A blue square' },
      });
      expect(ok.meta).toMatchObject({ title: 'Hero', alt: 'A blue square', credit: 'Tamara Mack' });
    } finally {
      handle.close();
    }
  });

  it('with enforceMetaPolicy, registerRemoteAsset validates meta too', async () => {
    const handle = open(true);
    try {
      await expect(
        handle.library.registerRemoteAsset({
          kind: 'document',
          mime: 'application/pdf',
          sha256: 'x'.repeat(64),
          byteSize: 1,
          path: 'm/pf/d/resume.pdf',
          meta: { title: 'IMG_1234' },
        })
      ).rejects.toBeInstanceOf(RecipeValidationError);
    } finally {
      handle.close();
    }
  });
});
