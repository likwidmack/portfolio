/**
 * LQIP / data-URL helpers local to `@tgmc/image` (not promoted to utilities yet).
 */

/**
 * Encode binary image bytes as a `data:` URL.
 */
export function toLqipDataUrl(mime: string, bytes: Buffer | Uint8Array): string {
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  return `data:${mime};base64,${buf.toString('base64')}`;
}

/**
 * Parse a `data:` URL into mime + buffer. Throws when the input is not a data URL.
 */
export function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } {
  const match = /^data:([^;,]+)?(?:;charset=[^;,]+)?(;base64)?,([\s\S]*)$/i.exec(dataUrl);
  if (!match) {
    throw new Error('Invalid data URL');
  }
  const mime = match[1] || 'application/octet-stream';
  const isBase64 = Boolean(match[2]);
  const payload = match[3] ?? '';
  const buffer = isBase64 ? Buffer.from(payload, 'base64') : Buffer.from(decodeURIComponent(payload), 'utf8');
  return { mime, buffer };
}
