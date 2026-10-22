/** Measured facts for the manifest: width / height (display orientation) and duration. Never typed by hand. */
import sharp from 'sharp';

import { sharpDecodeOptions } from './limits.js';
import { readMp4Facts } from './mp4-boxes.js';
import type { SanitizeFormat } from './sanitize-format.js';

export type MediaFacts = { width: number | null; height: number | null; durationSec: number | null };

async function imageFacts(bytes: Buffer): Promise<MediaFacts> {
  const meta = await sharp(bytes, sharpDecodeOptions()).metadata();
  const width = meta.autoOrient?.width ?? meta.width ?? null;
  const height = meta.autoOrient?.height ?? meta.height ?? null;
  return { width, height, durationSec: null };
}

export async function probeMedia(bytes: Buffer, format: SanitizeFormat): Promise<MediaFacts> {
  switch (format) {
    case 'jpeg':
    case 'png':
    case 'webp':
    case 'avif':
    case 'gif':
    case 'svg':
      return imageFacts(bytes);
    case 'mp4':
      return readMp4Facts(bytes);
    case 'pdf':
      return { width: null, height: null, durationSec: null };
    default: {
      const unreachable: never = format;
      throw new Error(`Unsupported format: ${String(unreachable)}`);
    }
  }
}
