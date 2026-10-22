import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { aspectRatio } from '@tgmc/utilities/universal';
import { imageCacheKey, readImageCache, writeImageCache } from '../src/cache.js';
import { enhancePixels, toMonotone } from '../src/color.js';
import { parseDataUrl, toLqipDataUrl } from '../src/data-url.js';
import { cropImage, resizeImage } from '../src/geometry.js';
import { ImageAsset } from '../src/image-asset.js';
import { ingestImage } from '../src/ingest.js';
import {
  MAX_BYTES,
  MAX_EDGE_PX,
  assertAllowedFormat,
  assertOpCount,
  assertWithinByteLimit,
  clampEdge,
  clampQuality,
} from '../src/limits.js';
import { transformImage } from '../src/transform.js';
import { applyTransparency } from '../src/transparency.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(here, 'fixtures');
const fixturePath = join(fixtureDir, 'sample.png');

async function ensureFixture() {
  mkdirSync(fixtureDir, { recursive: true });
  const buf = await sharp({
    create: {
      width: 64,
      height: 48,
      channels: 3,
      background: { r: 200, g: 40, b: 40 },
    },
  })
    .png()
    .toBuffer();
  writeFileSync(fixturePath, buf);
  return buf;
}

describe('@tgmc/image', () => {
  let sample: Buffer;

  beforeAll(async () => {
    sample = await ensureFixture();
  });

  it('ImageAsset normalizes src and aspect', () => {
    const asset = new ImageAsset({ src: '/i/a.webp', width: 1600, height: 900, format: 'webp' });
    expect(asset.aspect?.css).toBe(aspectRatio(1600, 900).css);
    expect(asset.toUrl('https://cdn.example.com')).toBe('https://cdn.example.com/i/a.webp');
  });

  it('enhances, mono, resizes, and crops', async () => {
    const bright = await enhancePixels(sample, { brightness: 1.1, contrast: 1.05, saturation: 0.9 });
    expect(bright.byteLength).toBeGreaterThan(0);
    const mono = await toMonotone(sample);
    const monoStats = await sharp(mono).stats();
    expect(monoStats.channels.length).toBeGreaterThanOrEqual(1);
    const resized = await resizeImage(sample, { width: 32, fit: 'inside' });
    const meta = await sharp(resized).metadata();
    expect(meta.width).toBeLessThanOrEqual(32);
    const cropped = await cropImage(sample, { left: 0, top: 0, width: 16, height: 16 });
    const cropMeta = await sharp(cropped).metadata();
    expect(cropMeta.width).toBe(16);
    expect(cropMeta.height).toBe(16);
  });

  it('applies hue transparency', async () => {
    const keyed = await applyTransparency(sample, { mode: 'hue', hue: 0, tolerance: 40 });
    const meta = await sharp(keyed).metadata();
    expect(meta.hasAlpha).toBe(true);
  });

  it('ingests thumb + lqip + dominant', async () => {
    const outPath = join(fixtureDir, 'out.thumb.webp');
    const asset = await ingestImage(fixturePath, { thumbOutPath: outPath, enhanceDominant: false });
    expect(asset.width).toBe(64);
    expect(asset.height).toBe(48);
    expect(asset.format).toBe('webp');
    expect(asset.lqip?.startsWith('data:image/webp;base64,')).toBe(true);
    expect(asset.dominantColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(asset.thumbSrc).toBe(outPath);
    const parsed = parseDataUrl(asset.lqip!);
    expect(parsed.mime).toBe('image/webp');
    expect(toLqipDataUrl(parsed.mime, parsed.buffer).startsWith('data:')).toBe(true);
  });

  it('transforms multi-ops and caches by sha256 key with meta sidecar', async () => {
    const result = await transformImage(
      sample,
      [
        { type: 'color', ops: { brightness: 1.05 } },
        { type: 'mono', ops: {} },
        { type: 'resize', ops: { width: 40 } },
      ],
      { format: 'webp' }
    );
    expect(result.contentType).toBe('image/webp');
    expect(result.meta.width).toBeLessThanOrEqual(40);

    const jpeg = await transformImage(sample, [{ type: 'resize', ops: { width: 20 } }], { format: 'jpeg' });
    expect(jpeg.contentType).toBe('image/jpeg');

    const key = imageCacheKey('sample', [{ type: 'resize', ops: { width: 40 } }], 'webp', 80);
    expect(key).toMatch(/^[a-f0-9]{64}$/);
    const cacheDir = join(fixtureDir, '.cache');
    await writeImageCache(cacheDir, key, 'webp', result.buffer, {
      width: result.meta.width,
      height: result.meta.height,
      format: result.meta.format,
    });
    const hit = await readImageCache(cacheDir, key, 'webp');
    expect(hit.hit).toBe(true);
    expect(hit.buffer?.equals(result.buffer)).toBe(true);
    expect(hit.meta?.width).toBe(result.meta.width);
    expect(hit.meta?.height).toBe(result.meta.height);
    expect(hit.meta?.format).toBe('webp');
    const miss = await readImageCache(cacheDir, 'deadbeef'.repeat(8), 'webp');
    expect(miss.hit).toBe(false);
  });

  it('transforms with transparency on the buffer fallback path', async () => {
    const result = await transformImage(
      sample,
      [
        { type: 'transparency', ops: { mode: 'hue', hue: 0, tolerance: 40 } },
        { type: 'resize', ops: { width: 32 } },
      ],
      { format: 'webp' }
    );
    expect(result.contentType).toBe('image/webp');
    expect(result.meta.width).toBeLessThanOrEqual(32);
    const meta = await sharp(result.buffer).metadata();
    expect(meta.hasAlpha).toBe(true);
  });

  it('enforces limits and format allow-list', () => {
    expect(() => assertWithinByteLimit(MAX_BYTES + 1)).toThrow(/exceeds max bytes/);
    expect(() => assertAllowedFormat('gif')).toThrow(/Unsupported/);
    expect(() => assertOpCount(99)).toThrow(/Too many/);
    expect(clampEdge(MAX_EDGE_PX + 100)).toBe(MAX_EDGE_PX);
    expect(clampEdge(NaN)).toBe(1);
    expect(clampQuality(150)).toBe(100);
    expect(clampQuality(0)).toBe(1);
  });

  it('rejects unknown transform format', async () => {
    await expect(transformImage(sample, [], { format: 'gif' as 'webp' })).rejects.toThrow(/Unsupported/);
  });
});
