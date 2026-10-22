/**
 * Site media manifest (`core/web/content/media.json` in the portfolio): the committed, reviewed list
 * of a site's media. Ids are fixed in the manifest so they are identical in every backend.
 */

import { createHash } from 'node:crypto';

import { isMediaNameAndExt, suggestMediaName } from './filename.js';
import { guessMediaKind, isMediaKind, mimeForExtension, type MediaKind } from './kinds.js';
import { validateMediaMeta, type MediaMetaIssue } from './meta-policy.js';
import { readTags } from './meta.js';
import { isMediaTenant, originalKey, parseMediaKey, type MediaTenant } from './paths.js';
import type { MediaAsset, MediaChild } from './types.js';
import { CATALOG_VARIANTS, isCatalogVariant, type CatalogVariantCode } from './variants.js';

export const SITE_MEDIA_TAG = 'site';
export const SITE_MANIFEST_VERSION = 1;

/** UUIDv5 namespace for {@link siteMediaId}. Never change it: committed ids derive from it. */
export const SITE_MEDIA_ID_NAMESPACE = 'b5d0c7a2-3f1e-4c8b-9a6d-0e2f4a1c7b93';

export type SiteMediaEntry = {
  id: string;
  tenant: MediaTenant;
  kind: MediaKind;
  name: string;
  ext: string;
  /** `m/{tenantCode}/{kindCode}/{name}.{ext}` */
  path: string;
  title: string;
  alt: string | null;
  description: string | null;
  credit: string;
  /** SHA-256 of the sanitized bytes. */
  sha256: string;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  lqip: string | null;
  dominantColor: string | null;
  /** Ready catalog variants (`t`, `640`, `1280`, `1920`) for `srcset`. */
  variants: CatalogVariantCode[];
  /** The URL before the catalog (`/i/...`, `/v/...`, `/d/...`), for redirects. */
  legacyPath: string | null;
  /** Owner checklist for the draft. Import refuses entries that still have notes; never imported. */
  reviewNotes?: string[];
};

export type SiteMediaManifest = { version: typeof SITE_MANIFEST_VERSION; entries: SiteMediaEntry[] };

/** Entry keys in serialization order. */
export const SITE_MEDIA_ENTRY_KEYS = [
  'id',
  'tenant',
  'kind',
  'name',
  'ext',
  'path',
  'title',
  'alt',
  'description',
  'credit',
  'sha256',
  'width',
  'height',
  'durationSec',
  'lqip',
  'dominantColor',
  'variants',
  'legacyPath',
  'reviewNotes',
] as const satisfies ReadonlyArray<keyof SiteMediaEntry>;

/** RFC 4122 version 5 (SHA-1, name-based) UUID. */
export function uuidV5(name: string, namespace: string): string {
  const hash = createHash('sha1')
    .update(Buffer.from(namespace.replace(/-/g, ''), 'hex'))
    .update(name, 'utf8')
    .digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Stable asset id for a site file, derived from its legacy URL (reproducible drafts; fixed once committed). */
export function siteMediaId(legacyPath: string): string {
  return uuidV5(legacyPath, SITE_MEDIA_ID_NAMESPACE);
}

/** `name` when free, else the first free `-2`, `-3`, ... suggestion (kept within 36 characters). */
export function uniqueSiteMediaName(name: string, ext: string, isTaken: (name: string) => boolean): string {
  if (!isTaken(name)) {
    return name;
  }
  for (let attempt = 2; ; attempt += 1) {
    const candidate = suggestMediaName(name, ext, attempt);
    if (!isTaken(candidate)) {
      return candidate;
    }
  }
}

/** Editorial + computed fields as asset meta for {@link validateMediaMeta} (with `computed: true`). */
export function siteEntryMeta(entry: SiteMediaEntry): Record<string, unknown> {
  const meta: Record<string, unknown> = { title: entry.title, credit: entry.credit };
  for (const key of ['alt', 'description', 'width', 'height', 'durationSec'] as const) {
    if (entry[key] !== null) {
      meta[key] = entry[key];
    }
  }
  return meta;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

type Check = (entry: Record<string, unknown>) => string | null;

const isNullableString = (value: unknown) => value === null || typeof value === 'string';
/** The import reads `<source><legacyPath>` from disk, so the path must not climb out of the source folder. */
const isSafeLegacyPath = (value: unknown) =>
  typeof value === 'string' &&
  value.startsWith('/') &&
  !value.includes('\\') &&
  value.split('/').every((segment) => segment !== '.' && segment !== '..');
const isNullablePositive = (value: unknown, integer: boolean) =>
  value === null ||
  (typeof value === 'number' && value > 0 && Number.isFinite(value) && (!integer || Number.isInteger(value)));

const ENTRY_CHECKS: Check[] = [
  (e) => (typeof e.id === 'string' && UUID.test(e.id) ? null : 'id must be a UUID'),
  (e) => (isMediaTenant(e.tenant) ? null : 'tenant must be a media tenant'),
  (e) => (isMediaKind(e.kind) ? null : 'kind must be a media kind'),
  (e) =>
    typeof e.name === 'string' && typeof e.ext === 'string' && isMediaNameAndExt(e.name, e.ext)
      ? null
      : 'name / ext must be a normalized media filename',
  (e) => {
    if (!isMediaKind(e.kind) || typeof e.ext !== 'string') {
      return null;
    }
    const mime = mimeForExtension(e.ext);
    return mime && guessMediaKind({ mime }) === e.kind ? null : `ext .${e.ext} does not match kind ${e.kind}`;
  },
  (e) => {
    if (!isMediaTenant(e.tenant) || !isMediaKind(e.kind) || typeof e.name !== 'string' || typeof e.ext !== 'string') {
      return null;
    }
    const expected = originalKey({ tenant: e.tenant, kind: e.kind, name: e.name, ext: e.ext });
    return e.path === expected ? null : `path must be ${expected}`;
  },
  (e) => (typeof e.title === 'string' ? null : 'title must be text'),
  (e) => (isNullableString(e.alt) ? null : 'alt must be text or null'),
  (e) => (isNullableString(e.description) ? null : 'description must be text or null'),
  (e) => (typeof e.credit === 'string' ? null : 'credit must be text'),
  (e) => (typeof e.sha256 === 'string' && SHA256.test(e.sha256) ? null : 'sha256 must be 64 lowercase hex characters'),
  (e) => (isNullablePositive(e.width, true) ? null : 'width must be a positive integer or null'),
  (e) => (isNullablePositive(e.height, true) ? null : 'height must be a positive integer or null'),
  (e) => (isNullablePositive(e.durationSec, false) ? null : 'durationSec must be a positive number or null'),
  (e) =>
    e.lqip === null || (typeof e.lqip === 'string' && e.lqip.startsWith('data:image/'))
      ? null
      : 'lqip must be a data:image/ URL or null',
  (e) =>
    e.dominantColor === null || (typeof e.dominantColor === 'string' && HEX_COLOR.test(e.dominantColor))
      ? null
      : 'dominantColor must be #rrggbb or null',
  (e) =>
    Array.isArray(e.variants) && e.variants.every((variant) => isCatalogVariant(variant))
      ? null
      : `variants must list catalog variants (${CATALOG_VARIANTS.join(', ')})`,
  (e) =>
    e.legacyPath === null || isSafeLegacyPath(e.legacyPath)
      ? null
      : 'legacyPath must be null or start with / and have no . / .. segments or backslashes',
  (e) =>
    e.reviewNotes === undefined ||
    (Array.isArray(e.reviewNotes) && e.reviewNotes.every((note) => typeof note === 'string'))
      ? null
      : 'reviewNotes must be a list of text',
];

export type SiteManifestValidation = {
  /** The manifest when there are no structural errors. */
  manifest: SiteMediaManifest | null;
  errors: string[];
  /** Metadata policy issues by entry id (expected in a draft; the import refuses them). */
  metaIssues: Record<string, MediaMetaIssue[]>;
};

function entryLabel(entry: Record<string, unknown>, index: number): string {
  return `entries[${index}] (${typeof entry.legacyPath === 'string' ? entry.legacyPath : String(entry.id)})`;
}

/** Check the manifest's structure (always errors) and each entry's metadata policy (reported separately). */
export function validateSiteManifest(value: unknown): SiteManifestValidation {
  const errors: string[] = [];
  const metaIssues: Record<string, MediaMetaIssue[]> = {};
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { manifest: null, errors: ['manifest must be an object { version, entries }'], metaIssues };
  }
  const { version, entries } = value as { version?: unknown; entries?: unknown };
  if (version !== SITE_MANIFEST_VERSION) {
    errors.push(`version must be ${SITE_MANIFEST_VERSION}`);
  }
  if (!Array.isArray(entries)) {
    return { manifest: null, errors: [...errors, 'entries must be a list'], metaIssues };
  }
  const seen = { id: new Set<string>(), name: new Set<string>(), legacyPath: new Set<string>() };
  entries.forEach((raw: unknown, index) => {
    if (typeof raw !== 'object' || raw === null) {
      errors.push(`entries[${index}] must be an object`);
      return;
    }
    const e = raw as Record<string, unknown>;
    const label = entryLabel(e, index);
    for (const key of Object.keys(e)) {
      if (!(SITE_MEDIA_ENTRY_KEYS as readonly string[]).includes(key)) {
        errors.push(`${label}: unknown key "${key}"`);
      }
    }
    const before = errors.length;
    for (const check of ENTRY_CHECKS) {
      const problem = check(e);
      if (problem) {
        errors.push(`${label}: ${problem}`);
      }
    }
    const uniques: Array<[keyof typeof seen, unknown]> = [
      ['id', e.id],
      ['name', `${String(e.tenant)}/${String(e.kind)}/${String(e.name)}`],
      ['legacyPath', e.legacyPath],
    ];
    for (const [field, key] of uniques) {
      if (typeof key !== 'string') {
        continue;
      }
      if (seen[field].has(key)) {
        errors.push(`${label}: duplicate ${field} ${key}`);
      }
      seen[field].add(key);
    }
    if (errors.length === before) {
      const entry = e as SiteMediaEntry;
      const { issues } = validateMediaMeta(entry.kind, siteEntryMeta(entry), { computed: true });
      if (issues.length > 0) {
        metaIssues[entry.id] = issues;
      }
    }
  });
  return {
    manifest: errors.length === 0 ? (value as SiteMediaManifest) : null,
    errors,
    metaIssues,
  };
}

/** The catalog row for an entry: same id, name and path; editorial and computed fields in `meta`. */
export function siteEntryToAsset(
  entry: SiteMediaEntry,
  input: { byteSize: number; mime: string; createdAt: string }
): MediaAsset {
  const meta: Record<string, unknown> = { tags: [SITE_MEDIA_TAG], filename: `${entry.name}.${entry.ext}` };
  for (const key of [
    'title',
    'alt',
    'description',
    'credit',
    'width',
    'height',
    'durationSec',
    'lqip',
    'dominantColor',
    'legacyPath',
  ] as const) {
    if (entry[key] !== null) {
      meta[key] = entry[key];
    }
  }
  return {
    id: entry.id,
    tenant: entry.tenant,
    kind: entry.kind,
    mime: input.mime,
    sha256: entry.sha256,
    byteSize: input.byteSize,
    name: entry.name,
    path: entry.path,
    meta,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };
}

function text(meta: Record<string, unknown>, key: string): string | null {
  return typeof meta[key] === 'string' && meta[key] !== '' ? (meta[key] as string) : null;
}

function positive(meta: Record<string, unknown>, key: string): number | null {
  return typeof meta[key] === 'number' && (meta[key] as number) > 0 ? (meta[key] as number) : null;
}

/** Export a catalog asset (and its ready catalog variants) back to a manifest entry. */
export function siteEntryFromAsset(asset: MediaAsset, children: MediaChild[]): SiteMediaEntry {
  const ready = new Set(
    children.filter((child) => child.status === 'ready' && child.path).map((child) => child.variant)
  );
  const meta = asset.meta;
  return {
    id: asset.id,
    tenant: asset.tenant,
    kind: asset.kind,
    name: asset.name,
    ext: parseMediaKey(asset.path)?.ext ?? '',
    path: asset.path,
    title: text(meta, 'title') ?? '',
    alt: text(meta, 'alt'),
    description: text(meta, 'description'),
    credit: text(meta, 'credit') ?? '',
    sha256: asset.sha256,
    width: positive(meta, 'width'),
    height: positive(meta, 'height'),
    durationSec: positive(meta, 'durationSec'),
    lqip: text(meta, 'lqip'),
    dominantColor: text(meta, 'dominantColor'),
    variants: CATALOG_VARIANTS.filter((variant) => ready.has(variant)),
    legacyPath: text(meta, 'legacyPath'),
  };
}

/** True when a catalog asset belongs to the site manifest (`meta.tags` has {@link SITE_MEDIA_TAG}). */
export function isSiteMediaAsset(asset: MediaAsset): boolean {
  return readTags(asset.meta).includes(SITE_MEDIA_TAG);
}

/** Stable JSON: entry keys in {@link SITE_MEDIA_ENTRY_KEYS} order, 2-space indent, trailing newline. */
export function serializeSiteManifest(manifest: SiteMediaManifest): string {
  const entries = manifest.entries.map((entry) => {
    const ordered: Record<string, unknown> = {};
    for (const key of SITE_MEDIA_ENTRY_KEYS) {
      if (entry[key] !== undefined) {
        ordered[key] = entry[key];
      }
    }
    return ordered;
  });
  return `${JSON.stringify({ version: manifest.version, entries }, null, 2)}\n`;
}
