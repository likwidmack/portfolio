/**
 * Ingest pipeline: thumb + LQIP + dominant color + ImageAsset meta.
 */

import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';

import { Logging, deepAssign } from '@tgmc/utilities';
import { aspectRatio } from '@tgmc/utilities/universal';
import sharp, { type Sharp } from 'sharp';

import { polishDominantColor } from './color.js';
import { toLqipDataUrl } from './data-url.js';
import { ImageAsset } from './image-asset.js';
import {
  DEFAULT_LQIP_LONG_EDGE,
  DEFAULT_QUALITY,
  DEFAULT_THUMB_LONG_EDGE,
  assertWithinByteLimit,
  clampEdge,
  clampQuality,
  contentTypeFor,
  sharpDecodeOptions,
} from './limits.js';
import { assertSafeImageInput } from './preflight.js';
import type { ImageInput, IngestOptions } from './types.js';

const log = new Logging({ scope: 'image:ingest', level: 3 });

function openIngest(input: ImageInput): Sharp {
  const opts =
    typeof input === 'string' ? { ...sharpDecodeOptions(), sequentialRead: true as const } : sharpDecodeOptions();
  return sharp(input, opts).rotate();
}

async function encodeWebp(input: Sharp, quality: number): Promise<Buffer> {
  // effort 2: match transformImage — faster encode, modest size tradeoff
  return input.webp({ quality, effort: 2 }).toBuffer();
}

/**
 * Produce thumb WebP, LQIP data URL, polished dominant color, and an ImageAsset.
 */
export async function ingestImage(input: ImageInput, options: IngestOptions = {}): Promise<ImageAsset> {
  // deepAssign overwrites defaults with explicit `undefined`; drop absent fields.
  const provided = Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined)
  ) as IngestOptions;
  const opts = deepAssign(
    {
      thumbLongEdge: DEFAULT_THUMB_LONG_EDGE,
      lqipLongEdge: DEFAULT_LQIP_LONG_EDGE,
      quality: DEFAULT_QUALITY,
      enhanceDominant: true,
    },
    provided
  ) as Required<Pick<IngestOptions, 'thumbLongEdge' | 'lqipLongEdge' | 'quality' | 'enhanceDominant'>> & IngestOptions;

  opts.quality = clampQuality(opts.quality);
  const { width, height } = await assertSafeImageInput(input);

  const base = openIngest(input);
  const thumbEdge = clampEdge(opts.thumbLongEdge);
  const lqipEdge = clampEdge(opts.lqipLongEdge);
  const resizeLongEdge = (edge: number) => ({
    width: width >= height ? edge : undefined,
    height: height > width ? edge : undefined,
    fit: 'inside' as const,
    withoutEnlargement: true,
  });

  // Parallel clones: stats + thumb + LQIP share one decode parent.
  const [stats, thumbBuffer, lqipBuffer] = await Promise.all([
    base.clone().stats(),
    encodeWebp(base.clone().resize(resizeLongEdge(thumbEdge)), opts.quality),
    encodeWebp(base.clone().resize(resizeLongEdge(lqipEdge)), Math.min(50, opts.quality)),
  ]);

  const dominant = stats.dominant;
  const dominantHex = polishDominantColor(
    `#${[dominant.r, dominant.g, dominant.b].map((c) => c.toString(16).padStart(2, '0')).join('')}`,
    opts.enhanceDominant !== false
  );

  assertWithinByteLimit(thumbBuffer.byteLength, 'thumb');

  const lqip = toLqipDataUrl(contentTypeFor('webp'), lqipBuffer);
  const aspect = aspectRatio(width, height);

  let thumbSrc: string | undefined;
  const artifacts: ImageAsset['artifacts'] = [];

  if (opts.thumbOutPath) {
    await fs.mkdir(dirname(opts.thumbOutPath), { recursive: true });
    const tmp = `${opts.thumbOutPath}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
    await fs.writeFile(tmp, thumbBuffer);
    await fs.rename(tmp, opts.thumbOutPath);
    thumbSrc = opts.thumbOutPath;
    artifacts.push({ path: opts.thumbOutPath });
    log.info(`wrote thumb ${opts.thumbOutPath}`);
  }

  const src = typeof input === 'string' ? input : (thumbSrc ?? `inline:${aspect.css}`);

  return new ImageAsset({
    id: typeof input === 'string' ? input : undefined,
    src,
    thumbSrc,
    lqip,
    dominantColor: dominantHex,
    width,
    height,
    // Ingest always encodes WebP thumbs/LQIP in v1.
    format: 'webp',
    artifacts,
  });
}

/** Expose thumb buffer when callers need bytes without writing to disk. */
export async function ingestThumbBuffer(
  input: ImageInput,
  longEdge = DEFAULT_THUMB_LONG_EDGE,
  quality = DEFAULT_QUALITY
): Promise<Buffer> {
  const { width, height } = await assertSafeImageInput(input);
  const edge = clampEdge(longEdge);
  return encodeWebp(
    openIngest(input).resize({
      width: width >= height ? edge : undefined,
      height: height > width ? edge : undefined,
      fit: 'inside',
      withoutEnlargement: true,
    }),
    clampQuality(quality)
  );
}
