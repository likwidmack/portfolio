/**
 * Create transparency from hue key or near-grayscale pixels.
 */

import { Color } from '@tgmc/theme';
import sharp from 'sharp';

import { sharpDecodeOptions } from './limits.js';
import { assertSafeImageInput } from './preflight.js';
import type { ImageInput, TransparencyOps } from './types.js';

function hueDistance(a: number, b: number): number {
  const d = Math.abs(Color.normalizeHue(a) - Color.normalizeHue(b));
  return Math.min(d, 360 - d);
}

/**
 * Set alpha to 0 for pixels matching a hue band or near-grayscale threshold.
 */
export async function applyTransparency(input: ImageInput, ops: TransparencyOps): Promise<Buffer> {
  await assertSafeImageInput(input);
  const { data, info } = await sharp(input, sharpDecodeOptions())
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);

  if (ops.mode === 'hue') {
    const tolerance = ops.tolerance ?? 25;
    const target = Color.normalizeHue(ops.hue);
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i]!;
      const g = pixels[i + 1]!;
      const b = pixels[i + 2]!;
      const { h } = Color.rgbToHsl(r, g, b);
      if (hueDistance(h, target) <= tolerance) {
        pixels[i + 3] = 0;
      }
    }
  } else {
    const threshold = ops.threshold ?? 12;
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i]!;
      const g = pixels[i + 1]!;
      const b = pixels[i + 2]!;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max - min <= threshold) {
        pixels[i + 3] = 0;
      }
    }
  }

  return sharp(Buffer.from(pixels), {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
}
