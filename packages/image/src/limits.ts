/**
 * Safety bounds for raster ingest / transforms.
 */

import type { ImageFormat } from './types.js';

/** Maximum long-edge pixels accepted for transform / ingest (protects Lambda memory). */
export const MAX_EDGE_PX = 4096;

/** Sharp `limitInputPixels` budget (~MAX_EDGE_PX²). */
export const MAX_INPUT_PIXELS = MAX_EDGE_PX * MAX_EDGE_PX;

/** Maximum input / output payload size in bytes (~25 MiB). */
export const MAX_BYTES = 25 * 1024 * 1024;

/** Max transform ops in one request (CPU amplification guard). */
export const MAX_TRANSFORM_OPS = 8;

export const DEFAULT_THUMB_LONG_EDGE = 320;
export const DEFAULT_LQIP_LONG_EDGE = 32;
export const DEFAULT_QUALITY = 80;

export const ALLOWED_FORMATS: readonly ImageFormat[] = ['webp', 'jpeg', 'png', 'avif'] as const;

const CONTENT_TYPES: Record<ImageFormat, string> = {
  webp: 'image/webp',
  jpeg: 'image/jpeg',
  png: 'image/png',
  avif: 'image/avif',
};

export function contentTypeFor(format: ImageFormat): string {
  return CONTENT_TYPES[format];
}

export function assertWithinByteLimit(size: number, label = 'image'): void {
  if (size > MAX_BYTES) {
    throw new Error(`${label} exceeds max bytes (${MAX_BYTES})`);
  }
}

export function clampEdge(edge: number): number {
  if (!Number.isFinite(edge) || edge <= 0) {
    return 1;
  }
  return Math.min(MAX_EDGE_PX, Math.round(edge));
}

export function assertAllowedFormat(format: string): asserts format is ImageFormat {
  if (!ALLOWED_FORMATS.includes(format as ImageFormat)) {
    throw new Error(`Unsupported image format: ${format}`);
  }
}

export function clampQuality(quality: number): number {
  if (!Number.isFinite(quality)) {
    return DEFAULT_QUALITY;
  }
  return Math.min(100, Math.max(1, Math.round(quality)));
}

export function assertOpCount(opsLength: number): void {
  if (opsLength > MAX_TRANSFORM_OPS) {
    throw new Error(`Too many transform ops (max ${MAX_TRANSFORM_OPS})`);
  }
}

/** Shared sharp open options: reject megapixel bombs early. */
export function sharpDecodeOptions(): { failOn: 'error'; limitInputPixels: number } {
  return { failOn: 'error', limitInputPixels: MAX_INPUT_PIXELS };
}
