/**
 * `@tgmc/image/sanitize` — strip third-party identifiers from media before it is hashed and stored.
 *
 * A separate entry (not re-exported from `@tgmc/image`) so svgo and pdf-lib, optional peer
 * dependencies, stay out of the Nitro / Lambda bundles and installs; the ffmpeg command for MP4 is
 * passed in by the caller (`resolveFfmpegPath`).
 *
 * @packageDocumentation
 */
import { isRasterSanitizeFormat, type SanitizeFormat } from './sanitize-format.js';
import { sanitizePdf, type PdfDocumentInfo } from './sanitize-pdf.js';
import { sanitizeRaster } from './sanitize-raster.js';
import { sanitizeSvg } from './sanitize-svg.js';
import { sanitizeMp4 } from './sanitize-video.js';

export { FFMPEG_NOT_FOUND, resolveFfmpegPath, type FfmpegResolveOptions } from './ffmpeg.js';
export { probeMedia, type MediaFacts } from './media-probe.js';
export { mp4MetadataBytes, readMp4Facts } from './mp4-boxes.js';
export {
  isRasterSanitizeFormat,
  RASTER_SANITIZE_FORMATS,
  sanitizeFormatForFilename,
  sniffSanitizeFormat,
  type RasterSanitizeFormat,
  type SanitizeFormat,
} from './sanitize-format.js';
export { sanitizePdf, type PdfDocumentInfo } from './sanitize-pdf.js';
export { sanitizeRaster } from './sanitize-raster.js';
export { IDENTIFIER_DENYLIST, scanForIdentifiers } from './sanitize-scan.js';
export { sanitizeSvg } from './sanitize-svg.js';
export { sanitizeMp4 } from './sanitize-video.js';

export type SanitizeOptions = {
  format: SanitizeFormat;
  /** PDF Info: Title (required for PDFs), Author, Subject. */
  document?: PdfDocumentInfo;
  /** ffmpeg command for MP4 (`resolveFfmpegPath()`). */
  ffmpegPath?: string;
};

/** Sanitized bytes for `format`. Deterministic for the same input, options and tool versions. */
export async function sanitizeMedia(input: Buffer, options: SanitizeOptions): Promise<Buffer> {
  const { format } = options;
  if (isRasterSanitizeFormat(format)) {
    return sanitizeRaster(input, format);
  }
  switch (format) {
    case 'svg':
      return sanitizeSvg(input);
    case 'pdf':
      return sanitizePdf(input, options.document);
    case 'mp4':
      return sanitizeMp4(input, options.ffmpegPath);
    default: {
      const unreachable: never = format;
      throw new Error(`Unsupported format: ${String(unreachable)}`);
    }
  }
}
