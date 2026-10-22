/** File formats the sanitizer handles, chosen by extension. */

export const RASTER_SANITIZE_FORMATS = ['jpeg', 'png', 'webp', 'avif', 'gif'] as const;

export type RasterSanitizeFormat = (typeof RASTER_SANITIZE_FORMATS)[number];

export type SanitizeFormat = RasterSanitizeFormat | 'svg' | 'pdf' | 'mp4';

const BY_EXTENSION: Record<string, SanitizeFormat> = {
  jpg: 'jpeg',
  jpeg: 'jpeg',
  jpe: 'jpeg',
  png: 'png',
  webp: 'webp',
  avif: 'avif',
  gif: 'gif',
  svg: 'svg',
  pdf: 'pdf',
  mp4: 'mp4',
  m4v: 'mp4',
};

/** Sanitizer format for a filename's extension, or `null` when the sanitizer has no handler for it. */
export function sanitizeFormatForFilename(filename: string): SanitizeFormat | null {
  const dot = filename.lastIndexOf('.');
  if (dot < 0) {
    return null;
  }
  return BY_EXTENSION[filename.slice(dot + 1).toLowerCase()] ?? null;
}

/**
 * Sanitizer format from the bytes themselves (files are sometimes misnamed, e.g. a GIF saved as
 * `.png`), or `null` when unrecognized.
 */
export function sniffSanitizeFormat(bytes: Buffer): SanitizeFormat | null {
  const ascii = (start: number, end: number) => bytes.toString('latin1', start, end);
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }
  if (ascii(0, 8) === '\x89PNG\r\n\x1a\n') {
    return 'png';
  }
  if (ascii(0, 4) === 'GIF8') {
    return 'gif';
  }
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') {
    return 'webp';
  }
  if (ascii(0, 5) === '%PDF-') {
    return 'pdf';
  }
  if (ascii(4, 8) === 'ftyp') {
    const brand = ascii(8, 12);
    return brand === 'avif' || brand === 'avis' ? 'avif' : 'mp4';
  }
  const head = bytes
    .subarray(0, 1024)
    .toString('utf8')
    .replace(/^\uFEFF/, '')
    .trimStart();
  if (/^(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*(?:<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(head)) {
    return 'svg';
  }
  return null;
}

export function isRasterSanitizeFormat(format: SanitizeFormat): format is RasterSanitizeFormat {
  return (RASTER_SANITIZE_FORMATS as readonly string[]).includes(format);
}
