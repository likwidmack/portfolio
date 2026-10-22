/**
 * Disk cache for on-demand transforms (image-specific layout).
 */

import { createHash, randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

import { sha256Hex } from '@tgmc/utilities';

import type { TransformOp } from './types.js';

/** Dimensions (and optional format) stored beside a cached image for HIT paths. */
export type CacheMeta = {
  width: number;
  height: number;
  format?: string;
};

export type CacheLookup = {
  hit: boolean;
  path: string;
  buffer?: Buffer;
  /** Present when a `.meta.json` sidecar was written with the buffer. */
  meta?: CacheMeta;
};

/**
 * Stable cache key from source identity + ops JSON.
 */
export function imageCacheKey(sourceId: string, ops: TransformOp[], format: string, quality: number): string {
  const payload = JSON.stringify({ sourceId, ops, format, quality });
  return sha256Hex(payload);
}

export function cacheFilePath(cacheDir: string, key: string, ext: string): string {
  return join(cacheDir, `${key}.${ext}`);
}

function cacheMetaPath(cacheDir: string, key: string): string {
  return join(cacheDir, `${key}.meta.json`);
}

function normalizeCacheMeta(meta: CacheMeta | undefined): CacheMeta | undefined {
  if (!meta) {
    return undefined;
  }
  const width = Number(meta.width);
  const height = Number(meta.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return undefined;
  }
  const out: CacheMeta = { width: Math.round(width), height: Math.round(height) };
  if (meta.format) {
    out.format = String(meta.format);
  }
  return out;
}

async function readCacheMeta(cacheDir: string, key: string): Promise<CacheMeta | undefined> {
  try {
    const raw = await fs.readFile(cacheMetaPath(cacheDir, key), 'utf8');
    return normalizeCacheMeta(JSON.parse(raw) as CacheMeta);
  } catch {
    return undefined;
  }
}

async function atomicWriteFile(path: string, data: Buffer | string): Promise<void> {
  const tmp = `${path}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  await fs.writeFile(tmp, data);
  await fs.rename(tmp, path);
}

/**
 * Read a cached buffer when present. Loads optional JSON sidecar dims when available.
 */
export async function readImageCache(cacheDir: string, key: string, ext: string): Promise<CacheLookup> {
  const path = cacheFilePath(cacheDir, key, ext);
  try {
    const buffer = await fs.readFile(path);
    const meta = await readCacheMeta(cacheDir, key);
    return meta ? { hit: true, path, buffer, meta } : { hit: true, path, buffer };
  } catch {
    return { hit: false, path };
  }
}

/**
 * Write transform output into the image cache directory (temp + rename).
 * When `meta` is provided, also writes `${key}.meta.json` so HIT paths can skip sharp.metadata().
 */
export async function writeImageCache(
  cacheDir: string,
  key: string,
  ext: string,
  buffer: Buffer,
  meta?: CacheMeta
): Promise<string> {
  await fs.mkdir(cacheDir, { recursive: true });
  const path = cacheFilePath(cacheDir, key, ext);
  await atomicWriteFile(path, buffer);
  const normalized = normalizeCacheMeta(meta);
  if (normalized) {
    await atomicWriteFile(cacheMetaPath(cacheDir, key), `${JSON.stringify(normalized)}\n`);
  }
  return path;
}

/** Hash file bytes for source identity when path is a local file. */
export async function hashFile(path: string): Promise<string> {
  const buf = await fs.readFile(path);
  return hashBuffer(buf);
}

/** Hash an in-memory buffer (avoids a second disk read after `readFile`). */
export function hashBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}
