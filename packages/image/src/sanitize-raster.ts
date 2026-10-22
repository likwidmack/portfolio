/**
 * Raster sanitizer: decode and re-encode with sharp without `withMetadata`, which drops EXIF, XMP,
 * IPTC, PNG text chunks (`tEXt` / `iTXt` / `zTXt`, where generators write prompts and job ids) and
 * C2PA manifests. The ICC profile is kept and the EXIF orientation is applied to the pixels first.
 */
import sharp from 'sharp';

import { sharpDecodeOptions } from './limits.js';
import type { RasterSanitizeFormat } from './sanitize-format.js';

const JPEG_QUALITY = 92;
const WEBP_QUALITY = 90;
const AVIF_QUALITY = 70;

export async function sanitizeRaster(input: Buffer, format: RasterSanitizeFormat): Promise<Buffer> {
  const animated = format === 'gif' || format === 'webp';
  const image = sharp(input, { ...sharpDecodeOptions(), animated })
    .autoOrient()
    .keepIccProfile();
  switch (format) {
    case 'jpeg':
      return image.jpeg({ quality: JPEG_QUALITY, chromaSubsampling: '4:4:4' }).toBuffer();
    case 'png':
      // Lossless; no `effort` (it switches sharp to a lossy palette).
      return image.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
    case 'webp':
      return image.webp({ quality: WEBP_QUALITY }).toBuffer();
    case 'avif':
      return image.avif({ quality: AVIF_QUALITY }).toBuffer();
    case 'gif':
      return image.gif().toBuffer();
    default: {
      const unreachable: never = format;
      throw new Error(`Unsupported raster format: ${String(unreachable)}`);
    }
  }
}
