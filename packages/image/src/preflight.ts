/**
 * Pre-decode size / dimension guards for ingest and transform.
 */

import { promises as fs } from 'node:fs';

import sharp from 'sharp';

import { MAX_EDGE_PX, assertWithinByteLimit, sharpDecodeOptions } from './limits.js';
import type { ImageInput } from './types.js';

/**
 * Reject oversized files and oversize pixel budgets before full pipelines run.
 */
export async function assertSafeImageInput(input: ImageInput): Promise<{ width: number; height: number }> {
  if (typeof input === 'string') {
    const st = await fs.stat(input);
    assertWithinByteLimit(st.size, 'image file');
  } else if (Buffer.isBuffer(input)) {
    assertWithinByteLimit(input.byteLength, 'image buffer');
  } else {
    assertWithinByteLimit(Buffer.from(input).byteLength, 'image buffer');
  }

  const meta = await sharp(input, sharpDecodeOptions()).rotate().metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) {
    throw new Error('Unable to read image dimensions');
  }
  if (width > MAX_EDGE_PX || height > MAX_EDGE_PX) {
    throw new Error(`Image edge exceeds max (${MAX_EDGE_PX}px)`);
  }
  return { width, height };
}
