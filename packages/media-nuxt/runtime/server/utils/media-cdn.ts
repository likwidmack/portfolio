import { parseMediaKey, type FsBlobStore } from '@tgmc/media';
import { presignContentDisposition } from '@tgmc/media-aws';
import {
  createError,
  defineEventHandler,
  getHeader,
  getRouterParam,
  sendStream,
  setResponseHeader,
  setResponseHeaders,
  setResponseStatus,
  type EventHandler,
} from 'h3';

/**
 * This stand-in serves on the app origin, so anything a browser could render as an active document
 * (SVG, HTML, XHTML, XML, unknown types) is sandboxed. CloudFront serves media from its own origin
 * without this policy; site pages embed media through `<img>` / `<video>`, which never run script.
 */
const SANDBOX_CSP = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox";

/**
 * Local URLs are reused (variants are overwritten in place; a deleted original can be uploaded again
 * under its key) and there is no CDN invalidation here, so browsers must revalidate against the ETag.
 * The sidecar keeps the S3 `Cache-Control` for parity; it is not sent.
 */
const LOCAL_CACHE_CONTROL = 'no-cache';

/** Types that never execute as a document. PDF stays unsandboxed: Chrome will not render it in a sandbox. */
const PASSIVE_TYPE = /^(?:image\/(?!svg\+xml)|audio\/|video\/|model\/|font\/|application\/pdf$)/;

/** MIME essence: parameters stripped, trimmed, lowercased (`Image/SVG+XML; charset=utf-8` → `image/svg+xml`). */
function mimeEssence(contentType: string): string {
  return (contentType.split(';', 1)[0] ?? '').trim().toLowerCase();
}

function opaqueTag(tag: string): string {
  const trimmed = tag.trim();
  return trimmed.startsWith('W/') ? trimmed.slice(2) : trimmed;
}

/**
 * `If-None-Match` against the current ETag (RFC 9110 §13.1.2): `*`, or any listed tag under weak
 * comparison (`W/"x"` matches `"x"`).
 */
export function ifNoneMatchMatches(header: string | undefined, etag: string): boolean {
  if (!header) {
    return false;
  }
  if (header.trim() === '*') {
    return true;
  }
  const current = opaqueTag(etag);
  return header.split(',').some((tag) => opaqueTag(tag) === current);
}

/** An inclusive byte range of an object of `size` bytes. */
export type ByteRange = { start: number; end: number };

/**
 * Parse a `Range` header for an object of `size` bytes (RFC 9110 §14).
 * - `null`: no usable range, serve the whole object (absent, another unit, malformed, several ranges).
 * - `'unsatisfiable'`: 416 (`first-pos` at or past the end, a zero suffix, or an empty object).
 * - otherwise the single range, clamped to the object.
 */
export function parseByteRange(header: string | undefined, size: number): ByteRange | 'unsatisfiable' | null {
  const match = /^\s*bytes\s*=\s*(\d*)\s*-\s*(\d*)\s*$/i.exec(header ?? '');
  if (!match) {
    return null;
  }
  const [, first = '', last = ''] = match;
  if (!first && !last) {
    return null;
  }
  if (!first) {
    const suffix = Number(last);
    if (suffix === 0 || size === 0) {
      return 'unsatisfiable';
    }
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }
  const start = Number(first);
  const end = last ? Number(last) : size - 1;
  if (last && end < start) {
    return null;
  }
  if (start >= size) {
    return 'unsatisfiable';
  }
  return { start, end: Math.min(end, size - 1) };
}

/** `If-Range` permits the range only when it names the current ETag exactly (strong comparison). */
function ifRangeAllows(header: string | undefined, etag: string): boolean {
  return header == null || header.trim() === etag;
}

export type LocalMediaCdnOptions = {
  /** Whether the stand-in exists (local media on); otherwise every request is 404. */
  enabled: () => boolean;
  /** The filesystem blob store whose `m/...` keys are served. */
  store: () => FsBlobStore;
};

/**
 * GET|HEAD /m/<tenant>/<kind>/<name>.<ext> — read-only CDN stand-in for a filesystem blob store.
 * It sits at the path CloudFront serves on AWS. Serves `FsBlobStore` objects with the sidecar
 * `Content-Type`, `Cache-Control: no-cache`, `Content-Disposition: inline`,
 * `X-Content-Type-Options: nosniff`, the `ETag` (304 on a weak or listed `If-None-Match`) and
 * `Accept-Ranges: bytes`; a single GET `Range` gets 206 (416 when unsatisfiable, `If-Range` honoured),
 * which Safari needs to play `<video>`. Headers and body come from one opened file, so a variant
 * overwritten mid-request never mixes generations. Only valid media keys resolve, so sidecars, temp
 * files and anything outside the blob root are 404.
 */
export function createLocalMediaCdnHandler(options: LocalMediaCdnOptions): EventHandler {
  return defineEventHandler(async (event) => {
    if (event.method !== 'GET' && event.method !== 'HEAD') {
      setResponseHeader(event, 'Allow', 'GET, HEAD');
      throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' });
    }
    if (!options.enabled()) {
      throw createError({ statusCode: 404, statusMessage: 'Not Found' });
    }
    const key = `m/${getRouterParam(event, 'path', { decode: true }) ?? ''}`;
    if (!parseMediaKey(key)) {
      throw createError({ statusCode: 404, statusMessage: 'Not Found' });
    }
    const reader = await options.store().openRead(key);
    if (!reader) {
      throw createError({ statusCode: 404, statusMessage: 'Not Found' });
    }
    const { meta } = reader;
    setResponseHeaders(event, {
      'Content-Type': meta.contentType,
      'Cache-Control': LOCAL_CACHE_CONTROL,
      'Content-Disposition': meta.contentDisposition ?? presignContentDisposition(key),
      'X-Content-Type-Options': 'nosniff',
      'Accept-Ranges': 'bytes',
      ETag: meta.etag,
      ...(PASSIVE_TYPE.test(mimeEssence(meta.contentType)) ? {} : { 'Content-Security-Policy': SANDBOX_CSP }),
    });
    if (ifNoneMatchMatches(getHeader(event, 'if-none-match'), meta.etag)) {
      await reader.close();
      setResponseStatus(event, 304);
      return '';
    }
    if (event.method === 'HEAD') {
      setResponseHeader(event, 'Content-Length', meta.byteSize);
      await reader.close();
      event.node.res.end();
      return;
    }
    const range = ifRangeAllows(getHeader(event, 'if-range'), meta.etag)
      ? parseByteRange(getHeader(event, 'range'), meta.byteSize)
      : null;
    if (range === 'unsatisfiable') {
      await reader.close();
      setResponseStatus(event, 416);
      setResponseHeader(event, 'Content-Range', `bytes */${meta.byteSize}`);
      return '';
    }
    if (range) {
      setResponseStatus(event, 206);
      setResponseHeaders(event, {
        'Content-Range': `bytes ${range.start}-${range.end}/${meta.byteSize}`,
        'Content-Length': range.end - range.start + 1,
      });
      return sendStream(event, reader.stream(range));
    }
    setResponseHeader(event, 'Content-Length', meta.byteSize);
    return sendStream(event, reader.stream());
  });
}
