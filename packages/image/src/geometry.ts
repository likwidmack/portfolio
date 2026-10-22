/**
 * Resize, fit, and crop helpers backed by sharp.
 */

import sharp from 'sharp';

import { clampEdge, sharpDecodeOptions } from './limits.js';
import { assertSafeImageInput } from './preflight.js';
import type { CropOps, ImageInput, ResizeOps } from './types.js';

async function toSharp(input: ImageInput) {
  await assertSafeImageInput(input);
  return sharp(input, sharpDecodeOptions()).rotate();
}

/**
 * Resize with optional fit mode (defaults to `inside`).
 */
export async function resizeImage(input: ImageInput, ops: ResizeOps): Promise<Buffer> {
  const width = ops.width != null ? clampEdge(ops.width) : undefined;
  const height = ops.height != null ? clampEdge(ops.height) : undefined;
  if (width == null && height == null) {
    throw new Error('resize requires width and/or height');
  }
  return (await toSharp(input))
    .resize({
      width,
      height,
      fit: ops.fit ?? 'inside',
      withoutEnlargement: ops.withoutEnlargement ?? true,
    })
    .toBuffer();
}

/**
 * Extract a crop rectangle (pixels are clamped to non-negative integers).
 */
export async function cropImage(input: ImageInput, ops: CropOps): Promise<Buffer> {
  return (await toSharp(input))
    .extract({
      left: Math.max(0, Math.round(ops.left)),
      top: Math.max(0, Math.round(ops.top)),
      width: clampEdge(ops.width),
      height: clampEdge(ops.height),
    })
    .toBuffer();
}
