/**
 * Server helpers wrapping `@tgmc/image` for Nitro routes.
 */
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, promises as fs } from 'node:fs';
import { basename, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';

import {
  ALLOWED_FORMATS,
  MAX_BYTES,
  MAX_TRANSFORM_OPS,
  assertAllowedFormat,
  assertOpCount,
  assertWithinByteLimit,
  clampEdge,
  clampQuality,
  contentTypeFor,
  hashBuffer,
  imageCacheKey,
  ingestImage,
  readImageCache,
  transformImage,
  writeImageCache,
  type ImageFormat,
  type IngestOptions,
  type TransformOp,
  type TransformResult,
} from '@tgmc/image';
import { Logging } from '@tgmc/utilities';
import sharp from 'sharp';

const log = new Logging({ scope: 'web:image', level: 3 });

const DEFAULT_CACHE_DIR = join(process.cwd(), '.cache', 'image');

/** Color multipliers accepted from HTTP ops (finite, bounded). */
const COLOR_OP_MIN = 0.1;
const COLOR_OP_MAX = 10;

/**
 * Canonical public asset root for host `npm run dev`, workspace builds, and Docker
 * (`.output` / `.output/<SYS_ENV>/public`). Override with `IMAGE_PUBLIC_DIR`.
 */
export function imagePublicRoot(): string {
  if (process.env.IMAGE_PUBLIC_DIR) {
    return resolve(process.env.IMAGE_PUBLIC_DIR);
  }
  const sysEnv = process.env.SYS_ENV || 'local';
  const candidates = [
    resolve(process.cwd(), 'public'),
    resolve(process.cwd(), '.output', 'public'),
    resolve(process.cwd(), '.output', sysEnv, 'public'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0]!;
}

export function imageCacheDir(): string {
  return process.env.IMAGE_CACHE_DIR || DEFAULT_CACHE_DIR;
}

export function imageDerivedDir(): string {
  return process.env.IMAGE_DERIVED_DIR || join(imagePublicRoot(), 'i', '_derived');
}

/**
 * Public-URL path for a file already inside the jail (POSIX, leading slash).
 */
export function publicUrlPath(absolute: string, publicRoot = imagePublicRoot()): string {
  const rel = relative(publicRoot, absolute).replace(/\\/g, '/');
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid image path' });
  }
  return `/${rel}`;
}

/**
 * Local/dev-only gate until media-management owns auth + storage.
 * Fail-closed: only exact raw SYS_ENV values enable the surface (no trim).
 * Returns 404 (not 403) so the surface stays unadvertised in test/prod.
 */
export function assertImageApiEnabled(): void {
  const raw = process.env.SYS_ENV ?? '';
  switch (raw) {
    case 'local':
    case 'development':
    case 'remote': // legacy alias for development stacks
      return;
    default:
      throw createError({ statusCode: 404, statusMessage: 'Not Found' });
  }
}

/**
 * Resolve a public-relative path and ensure it stays under the public jail (realpath).
 */
export async function resolvePublicImagePath(src: string): Promise<string> {
  if (typeof src !== 'string' || !src.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid image path' });
  }
  // Reject absolute / protocol-relative URLs before joining the jail.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(src) || src.startsWith('//')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid image path' });
  }

  const publicRoot = imagePublicRoot();
  const cleaned = src.replace(/^\/+/, '');
  const absolute = resolve(publicRoot, cleaned);
  const rel = relative(publicRoot, absolute);
  if (rel.startsWith('..') || isAbsolute(rel) || rel.split(/[/\\]/).includes('..')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid image path' });
  }

  let realPublic: string;
  let realAbsolute: string;
  try {
    realPublic = await fs.realpath(publicRoot);
    realAbsolute = await fs.realpath(absolute);
  } catch {
    // File may not exist yet for 404 at caller; still reject escapes via lexical check above.
    return absolute;
  }

  const prefix = realPublic.endsWith(sep) ? realPublic : realPublic + sep;
  if (realAbsolute !== realPublic && !realAbsolute.startsWith(prefix)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid image path' });
  }
  return realAbsolute;
}

function parsePositiveInt(raw: string | number | undefined, label: string): number | undefined {
  if (raw == null || raw === '') {
    return undefined;
  }
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${label}` });
  }
  return clampEdge(Math.round(n));
}

function clampColorFactor(value: unknown, field: string): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < COLOR_OP_MIN || n > COLOR_OP_MAX) {
    throw createError({ statusCode: 400, statusMessage: `Invalid color op ${field}` });
  }
  return n;
}

function assertFiniteNumber(value: unknown, label: string): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${label}` });
  }
  return n;
}

/**
 * Parse and validate transform ops from the HTTP query.
 * Rejects `type: format` — query `format`/`quality` own the encode contract (avoids HIT Content-Type drift).
 */
function parseOps(raw: unknown): TransformOp[] {
  if (!raw) {
    return [];
  }
  if (typeof raw !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid ops JSON' });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid ops JSON' });
  }
  if (!Array.isArray(parsed)) {
    throw createError({ statusCode: 400, statusMessage: 'ops must be a JSON array' });
  }
  try {
    assertOpCount(parsed.length);
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: `Too many transform ops (max ${MAX_TRANSFORM_OPS})`,
    });
  }

  const out: TransformOp[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object' || !('type' in item)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid transform op' });
    }
    const type = String((item as { type: unknown }).type);
    switch (type) {
      case 'color': {
        const opsRaw = (item as { ops?: unknown }).ops;
        if (opsRaw != null && (typeof opsRaw !== 'object' || Array.isArray(opsRaw))) {
          throw createError({ statusCode: 400, statusMessage: 'Invalid transform op' });
        }
        const src = (opsRaw ?? {}) as Record<string, unknown>;
        const ops: TransformOp & { type: 'color' } = { type: 'color', ops: {} };
        if (src.brightness != null) {
          ops.ops.brightness = clampColorFactor(src.brightness, 'brightness');
        }
        if (src.contrast != null) {
          ops.ops.contrast = clampColorFactor(src.contrast, 'contrast');
        }
        if (src.saturation != null) {
          ops.ops.saturation = clampColorFactor(src.saturation, 'saturation');
        }
        out.push(ops);
        break;
      }
      case 'mono': {
        const opsRaw = (item as { ops?: unknown }).ops;
        if (opsRaw != null && (typeof opsRaw !== 'object' || Array.isArray(opsRaw))) {
          throw createError({ statusCode: 400, statusMessage: 'Invalid transform op' });
        }
        out.push({ type: 'mono', ops: (opsRaw as { grayscale?: boolean }) ?? {} });
        break;
      }
      case 'transparency': {
        const opsRaw = (item as { ops?: unknown }).ops;
        if (!opsRaw || typeof opsRaw !== 'object' || Array.isArray(opsRaw)) {
          throw createError({ statusCode: 400, statusMessage: 'Invalid transform op' });
        }
        const mode = String((opsRaw as { mode?: unknown }).mode ?? '');
        if (mode === 'hue') {
          const hue = assertFiniteNumber((opsRaw as { hue?: unknown }).hue, 'transparency hue');
          const tolerance =
            (opsRaw as { tolerance?: unknown }).tolerance != null
              ? assertFiniteNumber((opsRaw as { tolerance?: unknown }).tolerance, 'transparency tolerance')
              : undefined;
          out.push({ type: 'transparency', ops: { mode: 'hue', hue, tolerance } });
        } else if (mode === 'grayscale') {
          const threshold =
            (opsRaw as { threshold?: unknown }).threshold != null
              ? assertFiniteNumber((opsRaw as { threshold?: unknown }).threshold, 'transparency threshold')
              : undefined;
          out.push({ type: 'transparency', ops: { mode: 'grayscale', threshold } });
        } else {
          throw createError({ statusCode: 400, statusMessage: 'Invalid transform op' });
        }
        break;
      }
      case 'resize': {
        const opsRaw = (item as { ops?: unknown }).ops;
        if (!opsRaw || typeof opsRaw !== 'object' || Array.isArray(opsRaw)) {
          throw createError({ statusCode: 400, statusMessage: 'Invalid transform op' });
        }
        const width =
          (opsRaw as { width?: unknown }).width != null
            ? clampEdge(assertFiniteNumber((opsRaw as { width?: unknown }).width, 'resize width'))
            : undefined;
        const height =
          (opsRaw as { height?: unknown }).height != null
            ? clampEdge(assertFiniteNumber((opsRaw as { height?: unknown }).height, 'resize height'))
            : undefined;
        if (width == null && height == null) {
          throw createError({ statusCode: 400, statusMessage: 'Invalid transform op' });
        }
        const fitRaw = (opsRaw as { fit?: unknown }).fit;
        const fit =
          fitRaw === 'cover' || fitRaw === 'contain' || fitRaw === 'fill' || fitRaw === 'inside' || fitRaw === 'outside'
            ? fitRaw
            : undefined;
        out.push({
          type: 'resize',
          ops: {
            width,
            height,
            fit,
            withoutEnlargement: (opsRaw as { withoutEnlargement?: boolean }).withoutEnlargement,
          },
        });
        break;
      }
      case 'crop': {
        const opsRaw = (item as { ops?: unknown }).ops;
        if (!opsRaw || typeof opsRaw !== 'object' || Array.isArray(opsRaw)) {
          throw createError({ statusCode: 400, statusMessage: 'Invalid transform op' });
        }
        out.push({
          type: 'crop',
          ops: {
            left: Math.max(0, Math.round(assertFiniteNumber((opsRaw as { left?: unknown }).left, 'crop left'))),
            top: Math.max(0, Math.round(assertFiniteNumber((opsRaw as { top?: unknown }).top, 'crop top'))),
            width: clampEdge(assertFiniteNumber((opsRaw as { width?: unknown }).width, 'crop width')),
            height: clampEdge(assertFiniteNumber((opsRaw as { height?: unknown }).height, 'crop height')),
          },
        });
        break;
      }
      case 'format':
        // Query `format`/`quality` own encode; nested format ops cause HIT Content-Type drift.
        throw createError({ statusCode: 400, statusMessage: 'Invalid transform op' });
      default:
        throw createError({ statusCode: 400, statusMessage: 'Invalid transform op' });
    }
  }
  return out;
}

/** Stable HTTP 400 messages / patterns (library message text stays server-side when unstable). */
const CLIENT_ERROR_RULES: Array<{ test: (msg: string) => boolean; statusMessage: string }> = [
  { test: (m) => m.includes('exceeds max bytes'), statusMessage: 'Image exceeds max bytes' },
  { test: (m) => m.includes('exceeds max'), statusMessage: 'Image exceeds max dimensions' },
  { test: (m) => m.includes('Unsupported image format'), statusMessage: 'Unsupported image format' },
  { test: (m) => m.includes('Too many transform ops'), statusMessage: 'Too many transform ops' },
  { test: (m) => m.includes('Unable to read image dimensions'), statusMessage: 'Unable to read image dimensions' },
  { test: (m) => m.includes('resize requires'), statusMessage: 'Invalid transform op' },
  { test: (m) => /^Invalid\b/.test(m), statusMessage: 'Invalid image request' },
];

function mapImageError(err: unknown): never {
  if (err && typeof err === 'object' && 'statusCode' in err) {
    throw err;
  }
  const message = err instanceof Error ? err.message : 'Image processing failed';
  for (const rule of CLIENT_ERROR_RULES) {
    if (rule.test(message)) {
      throw createError({ statusCode: 400, statusMessage: rule.statusMessage });
    }
  }
  log.warn(`image error: ${message}`);
  throw createError({ statusCode: 500, statusMessage: 'Image processing failed' });
}

/**
 * Resolve source content hash, reusing a size/mtime/(ino|dev) fingerprint when
 * unchanged so cache HIT paths avoid a full-file re-hash. Returns bytes when a
 * fresh read was required (reuse for transform miss).
 *
 * Identity is not pure content-addressing: a same-size replace that preserves
 * mtime and inode can still hit. Local/dev image APIs accept that tradeoff for
 * HIT latency; rehash-every-request remains available if that contract changes.
 */
async function resolveSourceIdentity(
  absolute: string,
  cacheDir: string
): Promise<{ sourceId: string; buffer?: Buffer }> {
  const st = await fs.stat(absolute);
  assertWithinByteLimit(st.size, 'source image');

  const fpDir = join(cacheDir, '_source');
  const fpKey = createHash('sha256').update(absolute).digest('hex');
  const fpPath = join(fpDir, `${fpKey}.json`);
  const ino = typeof st.ino === 'number' ? st.ino : undefined;
  const dev = typeof st.dev === 'number' ? st.dev : undefined;

  try {
    const raw = JSON.parse(await fs.readFile(fpPath, 'utf8')) as {
      size?: number;
      mtimeMs?: number;
      ino?: number;
      dev?: number;
      sourceId?: string;
    };
    const metaMatch =
      raw.size === st.size &&
      raw.mtimeMs === st.mtimeMs &&
      (ino === undefined || raw.ino === ino) &&
      (dev === undefined || raw.dev === dev);
    if (metaMatch && typeof raw.sourceId === 'string' && raw.sourceId) {
      return { sourceId: raw.sourceId };
    }
  } catch {
    /* miss or corrupt fingerprint */
  }

  const buffer = await fs.readFile(absolute);
  const sourceId = hashBuffer(buffer);
  await fs.mkdir(fpDir, { recursive: true });
  const payload = `${JSON.stringify({ size: st.size, mtimeMs: st.mtimeMs, ino, dev, sourceId })}\n`;
  const tmp = `${fpPath}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  await fs.writeFile(tmp, payload);
  await fs.rename(tmp, fpPath);
  return { sourceId, buffer };
}

export type OnDemandTransformQuery = {
  src?: string;
  w?: string | number;
  h?: string | number;
  format?: string;
  quality?: string | number;
  ops?: string;
};

/**
 * Transform a public image with disk cache keyed by content hash + ops.
 */
export async function runOnDemandTransform(
  query: OnDemandTransformQuery
): Promise<TransformResult & { cacheHit: boolean }> {
  assertImageApiEnabled();

  if (!query.src || typeof query.src !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing src' });
  }

  const formatRaw = query.format || 'webp';
  try {
    assertAllowedFormat(formatRaw);
  } catch {
    throw createError({ statusCode: 400, statusMessage: `Unsupported image format: ${formatRaw}` });
  }
  const format = formatRaw as ImageFormat;
  if (query.quality != null && !Number.isFinite(Number(query.quality))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid quality' });
  }
  const quality = clampQuality(query.quality != null ? Number(query.quality) : 80);

  // Validate query shape before filesystem I/O so bad ops/format yield 400, not 404.
  const ops = parseOps(query.ops);
  const width = parsePositiveInt(query.w, 'w');
  const height = parsePositiveInt(query.h, 'h');

  if (width != null || height != null) {
    ops.unshift({
      type: 'resize',
      ops: {
        width,
        height,
        fit: 'inside',
        withoutEnlargement: true,
      },
    });
    try {
      assertOpCount(ops.length);
    } catch {
      throw createError({
        statusCode: 400,
        statusMessage: `Too many transform ops (max ${MAX_TRANSFORM_OPS})`,
      });
    }
  }

  let absolute = await resolvePublicImagePath(query.src);
  try {
    const st = await fs.stat(absolute);
    assertWithinByteLimit(st.size, 'source image');
  } catch (err) {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      throw err;
    }
    if (err instanceof Error && err.message.includes('exceeds max bytes')) {
      throw createError({ statusCode: 400, statusMessage: 'Image exceeds max bytes' });
    }
    throw createError({ statusCode: 404, statusMessage: 'Image not found' });
  }

  // Re-resolve after existence so realpath jail runs (not the lexical ENOENT fallback).
  absolute = await resolvePublicImagePath(query.src);

  try {
    const cacheDir = imageCacheDir();
    const { sourceId, buffer: sourceBuf } = await resolveSourceIdentity(absolute, cacheDir);
    const key = imageCacheKey(sourceId, ops, format, quality);
    const cached = await readImageCache(cacheDir, key, format);

    if (cached.hit && cached.buffer) {
      log.debug(`cache hit ${key}`);
      let w = cached.meta?.width ?? 0;
      let h = cached.meta?.height ?? 0;
      let encodedFormat = (cached.meta?.format as ImageFormat | undefined) ?? format;

      if (!w || !h || !ALLOWED_FORMATS.includes(encodedFormat)) {
        try {
          const metaInfo = await sharp(cached.buffer).metadata();
          w = metaInfo.width ?? 0;
          h = metaInfo.height ?? 0;
          if (metaInfo.format && ALLOWED_FORMATS.includes(metaInfo.format as ImageFormat)) {
            encodedFormat = metaInfo.format as ImageFormat;
          }
          if (w && h) {
            await writeImageCache(cacheDir, key, format, cached.buffer, {
              width: w,
              height: h,
              format: encodedFormat,
            });
          }
        } catch {
          // Corrupt HIT — drop and recompute.
          try {
            await fs.unlink(cached.path);
          } catch {
            /* ignore */
          }
          w = 0;
          h = 0;
        }
      }

      if (w > 0 && h > 0) {
        return {
          buffer: cached.buffer,
          contentType: contentTypeFor(encodedFormat),
          meta: {
            width: w,
            height: h,
            format: encodedFormat,
            aspectCss: `${w} / ${h}`,
            ratio: w / h,
          },
          cacheHit: true,
        };
      }
    }

    const input = sourceBuf ?? (await fs.readFile(absolute));
    const result = await transformImage(input, ops, { format, quality });
    await writeImageCache(cacheDir, key, format, result.buffer, {
      width: result.meta.width,
      height: result.meta.height,
      format: result.meta.format,
    });
    return { ...result, cacheHit: false };
  } catch (err) {
    mapImageError(err);
  }
}

export type IngestBody = {
  /** Path relative to `public/` (e.g. `i/portfolio/photo.jpg`). */
  src?: string;
  thumbLongEdge?: number;
  lqipLongEdge?: number;
  enhanceDominant?: boolean;
};

/**
 * Ingest a public asset: write thumb under `public/i/_derived/` and return delivery DTO JSON.
 */
export async function runIngest(body: IngestBody) {
  assertImageApiEnabled();

  if (!body.src || typeof body.src !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing src' });
  }

  const absolute = await resolvePublicImagePath(body.src);
  try {
    const st = await fs.stat(absolute);
    if (st.size > MAX_BYTES) {
      throw createError({ statusCode: 400, statusMessage: 'Image exceeds max bytes' });
    }
  } catch (err) {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      throw err;
    }
    throw createError({ statusCode: 404, statusMessage: 'Image not found' });
  }

  const derivedRoot = imageDerivedDir();
  await fs.mkdir(derivedRoot, { recursive: true });
  const base = basename(absolute, extname(absolute));
  const thumbEdge = body.thumbLongEdge != null ? clampEdge(body.thumbLongEdge) : undefined;
  const lqipEdge = body.lqipLongEdge != null ? clampEdge(body.lqipLongEdge) : undefined;
  const thumbKey = createHash('sha256')
    .update(JSON.stringify({ absolute, thumbEdge: thumbEdge ?? 'default', lqipEdge: lqipEdge ?? 'default' }))
    .digest('hex')
    .slice(0, 8);
  const thumbName = `${base}.${thumbKey}.thumb.webp`;
  const thumbOutPath = join(derivedRoot, thumbName);

  const options: IngestOptions = {
    thumbOutPath,
    ...(thumbEdge != null ? { thumbLongEdge: thumbEdge } : {}),
    ...(lqipEdge != null ? { lqipLongEdge: lqipEdge } : {}),
    ...(body.enhanceDominant !== undefined ? { enhanceDominant: body.enhanceDominant } : {}),
  };

  try {
    const asset = await ingestImage(absolute, options);
    const publicRoot = imagePublicRoot();
    const publicSrc = publicUrlPath(absolute, publicRoot);
    const publicThumb = publicUrlPath(thumbOutPath, publicRoot);

    return {
      // Never expose absolute filesystem paths from ingestImage's string id.
      id: publicSrc,
      src: publicSrc,
      thumbSrc: publicThumb,
      lqip: asset.lqip,
      dominantColor: asset.dominantColor,
      width: asset.width,
      height: asset.height,
      format: asset.format,
      aspectCss: asset.aspect?.css,
    };
  } catch (err) {
    mapImageError(err);
  }
}
