/**
 * Pixel color enhancement / monochrome via sharp.
 * CSS-color polish for dominant swatches uses `@tgmc/theme` `Color`.
 */

import { Color } from '@tgmc/theme';
import sharp from 'sharp';

import { sharpDecodeOptions } from './limits.js';
import { assertSafeImageInput } from './preflight.js';
import type { ColorEnhanceOps, ImageInput, MonoOps } from './types.js';

async function toSharp(input: ImageInput) {
  await assertSafeImageInput(input);
  return sharp(input, sharpDecodeOptions()).rotate();
}

/**
 * Apply brightness / contrast / saturation multipliers (1 = unchanged).
 */
export async function enhancePixels(input: ImageInput, ops: ColorEnhanceOps = {}): Promise<Buffer> {
  const pipeline = await toSharp(input);
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
    // sharp linear: output = input * a + b; contrast around mid-gray
    const a = ops.contrast;
    const b = 128 * (1 - a);
    pipeline.linear(a, b);
  }
  return pipeline.toBuffer();
}

/**
 * Convert to grayscale when requested (default true).
 */
export async function toMonotone(input: ImageInput, ops: MonoOps = {}): Promise<Buffer> {
  const pipeline = await toSharp(input);
  if (ops.grayscale !== false) {
    pipeline.grayscale();
  }
  return pipeline.toBuffer();
}

/**
 * Format and optionally enhance a solid CSS color (dominant swatch, etc.).
 */
export function polishDominantColor(color: string, enhance = true): string {
  const hex = Color.toHex(color);
  return enhance ? Color.enhance(hex) : hex;
}
