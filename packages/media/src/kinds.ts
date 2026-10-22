/**
 * Catalog media kinds for `@tgmc/media`.
 *
 * - `image` — raster images (sharp pipeline)
 * - `svg` — vector SVG (parallel to raster; transform stub for now)
 * - `audio` / `video` — A/V (transform stubs)
 * - `model` — 3D / XR (`.glb`, `.gltf`, `.usdz`)
 * - `document` — text / PDF / office docs
 */

export const MEDIA_KINDS = ['image', 'svg', 'audio', 'video', 'model', 'document'] as const;

export type MediaKind = (typeof MEDIA_KINDS)[number];

export function isMediaKind(value: unknown): value is MediaKind {
  return typeof value === 'string' && (MEDIA_KINDS as readonly string[]).includes(value);
}

const AUDIO_EXT = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.opus']);
const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov', '.mkv', '.m4v', '.ogv']);
const MODEL_EXT = new Set(['.glb', '.gltf', '.usdz']);
const DOCUMENT_EXT = new Set(['.md', '.txt', '.pdf', '.doc', '.docx', '.rtf', '.csv', '.json']);

function extensionOf(filename: string): string {
  const i = filename.lastIndexOf('.');
  return i >= 0 ? filename.slice(i).toLowerCase() : '';
}

/**
 * Resolve a catalog kind from an explicit kind, MIME type, and/or filename.
 * Prefer MIME when present; fall back to extension (needed for `.glb` with empty MIME).
 */
export function guessMediaKind(input: {
  kind?: string | null;
  mime?: string | null;
  filename?: string | null;
}): MediaKind | null {
  if (isMediaKind(input.kind)) {
    return input.kind;
  }
  const mime = (input.mime ?? '').trim().toLowerCase();
  const ext = extensionOf((input.filename ?? '').trim());

  if (mime === 'image/svg+xml' || ext === '.svg') {
    return 'svg';
  }
  if (mime.startsWith('image/')) {
    return 'image';
  }
  if (mime.startsWith('audio/') || AUDIO_EXT.has(ext)) {
    return 'audio';
  }
  if (mime.startsWith('video/') || VIDEO_EXT.has(ext)) {
    return 'video';
  }
  if (
    mime === 'model/gltf-binary' ||
    mime === 'model/gltf+json' ||
    mime === 'model/vnd.usdz+zip' ||
    MODEL_EXT.has(ext)
  ) {
    return 'model';
  }
  if (
    mime.startsWith('text/') ||
    mime === 'application/pdf' ||
    mime === 'application/msword' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime.includes('markdown') ||
    DOCUMENT_EXT.has(ext)
  ) {
    return 'document';
  }
  return null;
}

/** Default MIME when callers omit one for a known kind. */
export function defaultMimeForKind(kind: MediaKind): string {
  switch (kind) {
    case 'image':
      return 'image/png';
    case 'svg':
      return 'image/svg+xml';
    case 'audio':
      return 'audio/mpeg';
    case 'video':
      return 'video/mp4';
    case 'model':
      return 'model/gltf-binary';
    case 'document':
      return 'application/octet-stream';
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/flac': 'flac',
  'audio/aac': 'aac',
  'audio/mp4': 'm4a',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/ogg': 'ogv',
  'model/gltf-binary': 'glb',
  'model/gltf+json': 'gltf',
  'model/vnd.usdz+zip': 'usdz',
  'application/pdf': 'pdf',
  'application/json': 'json',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'text/csv': 'csv',
};

/** File extension (no dot) for a MIME type; `bin` when unknown. */
export function extensionForMime(mime: string | null | undefined): string {
  return EXTENSION_BY_MIME[mimeKey(mime)] ?? 'bin';
}

/** Extra extensions (beside the canonical one in `EXTENSION_BY_MIME`) that are valid for a MIME type. */
const EXTENSION_ALIASES_BY_MIME: Record<string, readonly string[]> = {
  'image/jpeg': ['jpeg', 'jpe'],
  'audio/mpeg': ['mpga'],
  'audio/wav': ['wave'],
  'audio/ogg': ['oga', 'opus'],
  'audio/mp4': ['mp4a'],
  'video/mp4': ['m4v'],
  'video/quicktime': ['qt'],
  'video/ogg': ['ogg'],
  'text/plain': ['text', 'log'],
  'text/markdown': ['markdown'],
};

function mimeKey(mime: string | null | undefined): string {
  return (mime ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
}

/**
 * Whether `ext` (no dot) is an accepted extension for `mime`. Unknown MIME types accept any
 * extension: only combinations the table knows to be contradictory (`.png` + `image/jpeg`) fail.
 */
export function extensionMatchesMime(ext: string, mime: string | null | undefined): boolean {
  const key = mimeKey(mime);
  const canonical = EXTENSION_BY_MIME[key];
  if (!canonical) {
    return true;
  }
  const lower = ext.toLowerCase();
  return lower === canonical || (EXTENSION_ALIASES_BY_MIME[key] ?? []).includes(lower);
}

/** MIME type for a file extension (no dot) when the table knows it, else `undefined`. */
export function mimeForExtension(ext: string): string | undefined {
  const lower = ext.toLowerCase();
  for (const [mime, canonical] of Object.entries(EXTENSION_BY_MIME)) {
    if (canonical === lower) {
      return mime;
    }
  }
  for (const [mime, aliases] of Object.entries(EXTENSION_ALIASES_BY_MIME)) {
    if (aliases.includes(lower)) {
      return mime;
    }
  }
  return undefined;
}
