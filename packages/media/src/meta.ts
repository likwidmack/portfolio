/**
 * Asset `meta` conventions for `@tgmc/media`.
 *
 * - `kind` stays the exclusive processing pipeline discriminator.
 * - Editorial / cross-cutting labels live in `meta.tags` (string[]).
 * - Pipeline-relevant subtypes use boolean/string facet keys (not new kinds).
 */

/** Well-known asset meta keys. */
export const ASSET_META_KEYS = {
  tags: 'tags',
  filename: 'filename',
  /** Animated raster (GIF / APNG / animated WebP). */
  animated: 'animated',
  /** HDR / EXR / high-dynamic-range still. */
  hdr: 'hdr',
  /** Equirectangular / 360 panorama. */
  panorama: 'panorama',
  /** Design source role (psd, ai, figma export, …). */
  designSource: 'designSource',
  /** Motion package role (lottie, rive, …). */
  motionFormat: 'motionFormat',
} as const;

export type AssetMetaKey = (typeof ASSET_META_KEYS)[keyof typeof ASSET_META_KEYS];

const TAG_MAX_LEN = 64;
const TAG_MAX_COUNT = 32;

/**
 * Normalize one tag: trim, lowercase, collapse whitespace to `-`, cap length.
 * Empty / non-string → `null`.
 */
export function normalizeTag(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9./:@+-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, TAG_MAX_LEN);
  return normalized.length > 0 ? normalized : null;
}

/** Deduped, normalized tag list (capped). */
export function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of value) {
    const tag = normalizeTag(entry);
    if (!tag || seen.has(tag)) {
      continue;
    }
    seen.add(tag);
    out.push(tag);
    if (out.length >= TAG_MAX_COUNT) {
      break;
    }
  }
  return out;
}

/** Read `meta.tags` (always returns a normalized array). */
export function readTags(meta: Record<string, unknown> | null | undefined): string[] {
  if (!meta || typeof meta !== 'object') {
    return [];
  }
  return normalizeTags(meta[ASSET_META_KEYS.tags]);
}

/** True when `meta.tags` contains the (normalized) tag. */
export function assetHasTag(meta: Record<string, unknown> | null | undefined, tag: string): boolean {
  const needle = normalizeTag(tag);
  if (!needle) {
    return false;
  }
  return readTags(meta).includes(needle);
}

/** Replace tags on a meta object (other keys preserved). */
export function withTags(meta: Record<string, unknown>, tags: unknown): Record<string, unknown> {
  const next = { ...meta };
  const normalized = normalizeTags(tags);
  if (normalized.length === 0) {
    delete next[ASSET_META_KEYS.tags];
  } else {
    next[ASSET_META_KEYS.tags] = normalized;
  }
  return next;
}

/** Union tags onto meta. */
export function addTags(meta: Record<string, unknown>, tags: unknown): Record<string, unknown> {
  return withTags(meta, [...readTags(meta), ...normalizeTags(tags)]);
}

/** Remove tags from meta. */
export function removeTags(meta: Record<string, unknown>, tags: unknown): Record<string, unknown> {
  const drop = new Set(normalizeTags(tags));
  return withTags(
    meta,
    readTags(meta).filter((tag) => !drop.has(tag))
  );
}

/**
 * Normalize known meta conventions before persist.
 * Currently ensures `tags` is a clean string[] when present.
 */
export function normalizeAssetMeta(meta: Record<string, unknown>): Record<string, unknown> {
  if (!(ASSET_META_KEYS.tags in meta)) {
    return { ...meta };
  }
  return withTags(meta, meta[ASSET_META_KEYS.tags]);
}
