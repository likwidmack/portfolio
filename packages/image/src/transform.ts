/**
 * Apply a sequence of transform ops and encode to a target format.
 *
 * Prefers a single sharp pipeline (decode → ops → encode) to avoid
 * buffer round-trips between each op.
 */

import { deepAssign, Logging } from '@tgmc/utilities';
import { aspectRatio } from '@tgmc/utilities/universal';
import sharp, { type Sharp } from 'sharp';

import { enhancePixels, toMonotone } from './color.js';
import { cropImage, resizeImage } from './geometry.js';
import {
  assertAllowedFormat,
  assertOpCount,
  assertWithinByteLimit,
  clampEdge,
  clampQuality,
  contentTypeFor,
  DEFAULT_QUALITY,
  MAX_EDGE_PX,
  sharpDecodeOptions,
} from './limits.js';
import { assertSafeImageInput } from './preflight.js';
import { applyTransparency } from './transparency.js';
import type { ColorEnhanceOps, ImageFormat, ImageInput, TransformOp, TransformResult } from './types.js';

const log = new Logging({ scope: 'image:transform', level: 3 });

export type TransformOptions = {
  format?: ImageFormat;
  quality?: number;
};

function openPipeline(input: ImageInput): Sharp {
  const opts =
    typeof input === 'string' ? { ...sharpDecodeOptions(), sequentialRead: true as const } : sharpDecodeOptions();
  return sharp(input, opts).rotate();
}

function applyColorToPipeline(pipeline: Sharp, ops: ColorEnhanceOps): Sharp {
  const modulate: { brightness?: number; saturation?: number } = {};
  if (ops.brightness != null) {
    modulate.brightness = ops.brightness;
  }
  if (ops.saturation != null) {
    modulate.saturation = ops.saturation;
  }
  if (Object.keys(modulate).length) {
    pipeline.modulate(modulate);
  }
  if (ops.contrast != null && ops.contrast !== 1) {
    const a = ops.contrast;
    const b = 128 * (1 - a);
    pipeline.linear(a, b);
  }
  return pipeline;
}

async function encodePipeline(pipeline: Sharp, format: ImageFormat, quality: number) {
  switch (format) {
    case 'webp':
      // effort 2: faster encode; modest size tradeoff vs default 4
      return pipeline.webp({ quality, effort: 2 }).toBuffer({ resolveWithObject: true });
    case 'jpeg':
      return pipeline.jpeg({ quality, mozjpeg: true }).toBuffer({ resolveWithObject: true });
    case 'png':
      return pipeline.png().toBuffer({ resolveWithObject: true });
    case 'avif':
      return pipeline.avif({ quality }).toBuffer({ resolveWithObject: true });
    default: {
      const _exhaustive: never = format;
      throw new Error(`Unhandled format: ${_exhaustive}`);
    }
  }
}

/**
 * Run ordered transform ops then encode.
 */
export async function transformImage(
  input: ImageInput,
  ops: TransformOp[] = [],
  options: TransformOptions = {}
): Promise<TransformResult> {
  const opts = deepAssign(
    { format: 'webp' as ImageFormat, quality: DEFAULT_QUALITY },
    options
  ) as Required<TransformOptions>;
  assertAllowedFormat(opts.format);
  opts.quality = clampQuality(opts.quality);
  assertOpCount(ops.length);

  // Byte-size gate without a second full decode; pixel budget via sharpDecodeOptions.
  await assertSafeImageInput(input);

  const hasTransparency = ops.some((op) => op.type === 'transparency');

  let out: Buffer;
  let width: number;
  let height: number;

  if (hasTransparency) {
    // Raw-pixel chroma-key cannot stay on the streaming pipeline.
    let buffer: Buffer = await openPipeline(input).toBuffer();
    assertWithinByteLimit(buffer.byteLength, 'transform input');
    for (const op of ops) {
      switch (op.type) {
        case 'color':
          buffer = Buffer.from(await enhancePixels(buffer, op.ops));
          break;
        case 'mono':
          buffer = Buffer.from(await toMonotone(buffer, op.ops));
          break;
        case 'transparency':
          buffer = Buffer.from(await applyTransparency(buffer, op.ops));
          break;
        case 'resize':
          buffer = Buffer.from(await resizeImage(buffer, op.ops));
          break;
        case 'crop':
          buffer = Buffer.from(await cropImage(buffer, op.ops));
          break;
        case 'format':
          assertAllowedFormat(op.format);
          opts.format = op.format;
          if (op.quality != null) {
            opts.quality = clampQuality(op.quality);
          }
          break;
        default: {
          const _exhaustive: never = op;
          throw new Error(`Unhandled transform op: ${JSON.stringify(_exhaustive)}`);
        }
      }
    }
    const encoded = await encodePipeline(sharp(buffer, { failOn: 'none' }), opts.format, opts.quality);
    out = Buffer.from(encoded.data);
    width = encoded.info.width;
    height = encoded.info.height;
  } else {
    let pipeline = openPipeline(input);
    for (const op of ops) {
      switch (op.type) {
        case 'color':
          pipeline = applyColorToPipeline(pipeline, op.ops);
          break;
        case 'mono':
          if (op.ops?.grayscale !== false) {
            pipeline = pipeline.grayscale();
          }
          break;
        case 'resize': {
          const w = op.ops.width != null ? clampEdge(op.ops.width) : undefined;
          const h = op.ops.height != null ? clampEdge(op.ops.height) : undefined;
          if (w == null && h == null) {
            throw new Error('resize requires width and/or height');
          }
          pipeline = pipeline.resize({
            width: w,
            height: h,
            fit: op.ops.fit ?? 'inside',
            withoutEnlargement: op.ops.withoutEnlargement ?? true,
          });
          break;
        }
        case 'crop':
          pipeline = pipeline.extract({
            left: Math.max(0, Math.round(op.ops.left)),
            top: Math.max(0, Math.round(op.ops.top)),
            width: clampEdge(op.ops.width),
            height: clampEdge(op.ops.height),
          });
          break;
        case 'format':
          assertAllowedFormat(op.format);
          opts.format = op.format;
          if (op.quality != null) {
            opts.quality = clampQuality(op.quality);
          }
          break;
        case 'transparency':
          throw new Error('transparency handled in buffer fallback');
        default: {
          const _exhaustive: never = op;
          throw new Error(`Unhandled transform op: ${JSON.stringify(_exhaustive)}`);
        }
      }
    }
    const encoded = await encodePipeline(pipeline, opts.format, opts.quality);
    out = Buffer.from(encoded.data);
    width = encoded.info.width;
    height = encoded.info.height;
  }

  if (width > MAX_EDGE_PX || height > MAX_EDGE_PX) {
    throw new Error(`Image edge exceeds max (${MAX_EDGE_PX}px)`);
  }

  assertWithinByteLimit(out.byteLength, 'transform output');
  const aspect = aspectRatio(width, height);

  log.debug(`transform ${opts.format} ${width}x${height} (${out.byteLength} bytes)`);

  return {
    buffer: out,
    contentType: contentTypeFor(opts.format),
    meta: {
      width,
      height,
      format: opts.format,
      aspectCss: aspect.css,
      ratio: aspect.ratio,
    },
  };
}
