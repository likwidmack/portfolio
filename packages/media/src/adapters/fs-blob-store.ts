import { createHash, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { type BigIntStats, createReadStream, createWriteStream, type ReadStream } from 'node:fs';
import {
  constants,
  copyFile,
  type FileHandle,
  link,
  mkdir,
  open,
  readFile,
  rename,
  rm,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, resolve, sep } from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { MediaBlobExistsError, MediaBlobTooLargeError, MediaNotFoundError, RecipeValidationError } from '../errors.js';
import { mimeForExtension } from '../kinds.js';
import { parseMediaKey } from '../paths.js';
import type { BlobPutOptions, BlobStore } from '../ports/index.js';

/** Sidecar file next to each blob (`m/pf/i/hero.png.meta.json`); never a valid media key, so never served. */
export const FS_BLOB_META_SUFFIX = '.meta.json';

/** What S3 keeps as object metadata, kept in the sidecar. `etag` is the quoted MD5, as S3 returns for a single PUT. */
export type FsBlobMeta = {
  contentType: string;
  byteSize: number;
  sha256: string;
  etag: string;
  cacheControl?: string;
  contentDisposition?: string;
};

export type FsBlobPutOptions = BlobPutOptions & {
  /** Abort with `MediaBlobTooLargeError` once more than this many bytes arrive. */
  maxBytes?: number;
};

/** An opened blob: `meta` describes exactly the file `stream()` reads, even if the key is overwritten meanwhile. */
export type FsBlobReader = {
  meta: FsBlobMeta;
  /**
   * Stream the opened file, from the start or the inclusive byte `range` (HTTP `Range`); the reader
   * closes when the stream ends or is destroyed.
   */
  stream(range?: { start: number; end: number }): ReadStream;
  /** Release the file without streaming it (HEAD, 304). */
  close(): Promise<void>;
};

/**
 * On disk the sidecar also records which file it describes. A variant's body and sidecar are two
 * renames, so a reader (or a crash) between them can see the new body with the old sidecar; a
 * sidecar whose generation is not the file's is ignored and the metadata derived from the bytes.
 */
type FsBlobSidecar = FsBlobMeta & { generation: string };

/** Links can fail on filesystems without hard links; fall back to an exclusive copy there. */
const NO_LINK_CODES = new Set(['EPERM', 'ENOTSUP', 'ENOSYS', 'EXDEV', 'EOPNOTSUPP']);

const MISSING_CODES = new Set(['ENOENT', 'ENOTDIR', 'EISDIR']);

/** File identity that survives `rename` and `link` but not a replacement: inode, mtime (ns), size. */
function generationOf(info: BigIntStats): string {
  return `${info.ino}:${info.mtimeNs}:${info.size}`;
}

function errnoCode(err: unknown): string | undefined {
  return (err as NodeJS.ErrnoException | null)?.code;
}

function invalidKey(key: unknown): RecipeValidationError {
  return new RecipeValidationError(`Invalid media blob key: ${JSON.stringify(key)}`);
}

function tempPathFor(target: string): string {
  return resolve(dirname(target), `.${basename(target)}.${randomUUID()}.tmp`);
}

function derivedContentType(key: string): string {
  const ext = parseMediaKey(key)?.ext ?? '';
  return mimeForExtension(ext) ?? 'application/octet-stream';
}

function isFsBlobSidecar(value: unknown): value is FsBlobSidecar {
  const meta = value as Partial<FsBlobSidecar> | null;
  return (
    typeof meta === 'object' &&
    meta !== null &&
    typeof meta.contentType === 'string' &&
    typeof meta.byteSize === 'number' &&
    typeof meta.sha256 === 'string' &&
    typeof meta.etag === 'string' &&
    typeof meta.generation === 'string'
  );
}

async function readSidecar(path: string): Promise<FsBlobSidecar | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(path, 'utf8'));
    return isFsBlobSidecar(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function metaFromSidecar(sidecar: FsBlobSidecar): FsBlobMeta {
  return {
    contentType: sidecar.contentType,
    byteSize: sidecar.byteSize,
    sha256: sidecar.sha256,
    etag: sidecar.etag,
    ...(sidecar.cacheControl ? { cacheControl: sidecar.cacheControl } : {}),
    ...(sidecar.contentDisposition ? { contentDisposition: sidecar.contentDisposition } : {}),
  };
}

async function hashChunks(chunks: AsyncIterable<unknown>): Promise<{ sha256: string; md5: string }> {
  const sha256 = createHash('sha256');
  const md5 = createHash('md5');
  for await (const chunk of chunks) {
    sha256.update(chunk as Buffer);
    md5.update(chunk as Buffer);
  }
  return { sha256: sha256.digest('hex'), md5: md5.digest('hex') };
}

/**
 * Filesystem blob store that behaves like the S3 bucket it stands in for.
 *
 * - Layout: `<root>/<key>` with the shared `m/{tenant}/{kind}/{name}.{ext}` keys, so the disk path,
 *   the S3 key and the URL are the same string.
 * - Object metadata lives in a `<key>.meta.json` sidecar (`FsBlobMeta`); blobs without one (moved by
 *   the SQLite legacy migration) get metadata derived from the file.
 * - Originals (no `@variant`) are create-only, like a presigned PUT with `If-None-Match: *`: a second
 *   write throws `MediaBlobExistsError` (412). Variants overwrite in place unless `createOnly` is set.
 * - Every key must be a valid media key; anything else (traversal, absolute, backslashes, NUL,
 *   sidecars, temp files) is rejected before touching the disk.
 */
export class FsBlobStore implements BlobStore {
  private readonly root: string;

  constructor(baseDir: string) {
    this.root = resolve(baseDir);
  }

  private pathFor(key: string): string {
    if (
      typeof key !== 'string' ||
      key.includes('\0') ||
      key.includes('\\') ||
      key.split('/').some((segment) => segment === '' || segment === '.' || segment === '..') ||
      !parseMediaKey(key)
    ) {
      throw invalidKey(key);
    }
    const path = resolve(this.root, ...key.split('/'));
    if (!path.startsWith(this.root + sep)) {
      throw invalidKey(key);
    }
    return path;
  }

  async put(key: string, data: Buffer | Uint8Array, options?: BlobPutOptions): Promise<void> {
    await this.putStream(key, [Buffer.isBuffer(data) ? data : Buffer.from(data)], options);
  }

  /** Stream bytes in (never buffered whole), honouring `maxBytes`; returns the recorded metadata. */
  async putStream(
    key: string,
    source: AsyncIterable<Uint8Array> | Iterable<Uint8Array>,
    options: FsBlobPutOptions = {}
  ): Promise<FsBlobMeta> {
    const target = this.pathFor(key);
    const createOnly = parseMediaKey(key)?.variant === null || options.createOnly === true;
    if (createOnly && (await this.statFile(target))) {
      throw new MediaBlobExistsError(key);
    }
    await mkdir(dirname(target), { recursive: true });

    const temp = tempPathFor(target);
    const sha256 = createHash('sha256');
    const md5 = createHash('md5');
    let byteSize = 0;
    const meter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        byteSize += chunk.byteLength;
        if (options.maxBytes !== undefined && byteSize > options.maxBytes) {
          callback(new MediaBlobTooLargeError(options.maxBytes));
          return;
        }
        sha256.update(chunk);
        md5.update(chunk);
        callback(null, chunk);
      },
    });
    let generation: string;
    try {
      const sink = createWriteStream(temp, { flags: 'wx' });
      await pipeline(source, meter, sink);
      if (!sink.closed) {
        await once(sink, 'close');
      }
      // Taken from the temp file: `rename` / `link` keep it, and a concurrent variant writer may
      // already have replaced `target` by the time it could be read there.
      generation = generationOf(await stat(temp, { bigint: true }));
      if (createOnly) {
        if ((await this.linkExclusive(key, temp, target)) === 'copied') {
          generation = generationOf(await stat(target, { bigint: true }));
        }
      } else {
        await rename(temp, target);
      }
    } finally {
      await rm(temp, { force: true });
    }

    const meta: FsBlobMeta = {
      contentType: options.contentType ?? derivedContentType(key),
      byteSize,
      sha256: sha256.digest('hex'),
      etag: `"${md5.digest('hex')}"`,
      ...(options.cacheControl ? { cacheControl: options.cacheControl } : {}),
      ...(options.contentDisposition ? { contentDisposition: options.contentDisposition } : {}),
    };
    const sidecar = target + FS_BLOB_META_SUFFIX;
    const sidecarTemp = tempPathFor(sidecar);
    const record: FsBlobSidecar = { ...meta, generation };
    await writeFile(sidecarTemp, JSON.stringify(record), { flag: 'wx' });
    await rename(sidecarTemp, sidecar);
    return meta;
  }

  /** Publish `temp` at `target` only if nothing is there yet (atomic hard link, else exclusive copy). */
  private async linkExclusive(key: string, temp: string, target: string): Promise<'linked' | 'copied'> {
    try {
      await link(temp, target);
      return 'linked';
    } catch (err) {
      if (errnoCode(err) === 'EEXIST') {
        throw new MediaBlobExistsError(key);
      }
      if (!NO_LINK_CODES.has(errnoCode(err) ?? '')) {
        throw err;
      }
    }
    try {
      await copyFile(temp, target, constants.COPYFILE_EXCL);
      return 'copied';
    } catch (err) {
      throw errnoCode(err) === 'EEXIST' ? new MediaBlobExistsError(key) : err;
    }
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.pathFor(key));
  }

  /**
   * Open the blob for serving (the `/m/**` CDN stand-in); `null` when absent. The metadata is the
   * sidecar when it was recorded for this very file, else derived from the opened bytes.
   */
  async openRead(key: string): Promise<FsBlobReader | null> {
    const path = this.pathFor(key);
    let handle: FileHandle;
    try {
      handle = await open(path, 'r');
    } catch (err) {
      if (MISSING_CODES.has(errnoCode(err) ?? '')) {
        return null;
      }
      throw err;
    }
    try {
      const info = await handle.stat({ bigint: true });
      if (!info.isFile()) {
        await handle.close();
        return null;
      }
      const meta = await this.metaOf(key, path, handle, info);
      return {
        meta,
        stream: (range) => handle.createReadStream(range ?? { start: 0 }),
        close: () => handle.close(),
      };
    } catch (err) {
      await handle.close();
      throw err;
    }
  }

  private async metaOf(key: string, path: string, handle: FileHandle, info: BigIntStats): Promise<FsBlobMeta> {
    const sidecar = await readSidecar(path + FS_BLOB_META_SUFFIX);
    if (sidecar?.generation === generationOf(info)) {
      return metaFromSidecar(sidecar);
    }
    const digest = await hashChunks(handle.createReadStream({ start: 0, autoClose: false }));
    return {
      contentType: derivedContentType(key),
      byteSize: Number(info.size),
      sha256: digest.sha256,
      etag: `"${digest.md5}"`,
    };
  }

  /** Sidecar metadata, or metadata derived from the file when the sidecar is missing or stale; `null` when absent. */
  async readMeta(key: string): Promise<FsBlobMeta | null> {
    const reader = await this.openRead(key);
    if (!reader) {
      return null;
    }
    await reader.close();
    return reader.meta;
  }

  /** Same shape as `S3BlobStore.head` (HeadObject); throws `MediaNotFoundError` for a missing key. */
  async head(key: string): Promise<{ contentLength: number; contentType?: string; eTag?: string }> {
    const meta = await this.readMeta(key);
    if (!meta) {
      throw new MediaNotFoundError(`Blob not found for key: ${key}`);
    }
    return { contentLength: meta.byteSize, contentType: meta.contentType, eTag: meta.etag };
  }

  /** SHA-256 of the stored bytes, re-read from disk (like `S3BlobStore.digestSha256`). */
  async digestSha256(key: string): Promise<string> {
    const path = this.pathFor(key);
    try {
      return (await hashChunks(createReadStream(path))).sha256;
    } catch (err) {
      if (errnoCode(err) === 'ENOENT') {
        throw new MediaNotFoundError(`Blob not found for key: ${key}`);
      }
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    const path = this.pathFor(key);
    for (const file of [path, path + FS_BLOB_META_SUFFIX]) {
      try {
        await unlink(file);
      } catch (err) {
        if (errnoCode(err) !== 'ENOENT') {
          throw err;
        }
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    return (await this.statFile(this.pathFor(key))) !== null;
  }

  async stat(key: string): Promise<{ byteSize: number } | null> {
    const info = await this.statFile(this.pathFor(key));
    return info ? { byteSize: info.size } : null;
  }

  private async statFile(path: string): Promise<{ size: number } | null> {
    try {
      const info = await stat(path);
      return info.isFile() ? info : null;
    } catch (err) {
      if (errnoCode(err) === 'ENOENT' || errnoCode(err) === 'ENOTDIR') {
        return null;
      }
      throw err;
    }
  }
}
