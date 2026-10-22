/**
 * Media storage keys and URL paths, shared by every backend.
 *
 * A URL is the key: `/m/{tenant}/{kind}/{name}.{ext}` (original) and
 * `/m/{tenant}/{kind}/{name}@{variant}.{ext}` (processed variant). Keys have no leading slash.
 */

import { createHash } from 'node:crypto';

import { isMediaExtSegment, isMediaNameAndExt, isMediaNameSegment, MAX_MEDIA_FILENAME_LENGTH } from './filename.js';
import { MEDIA_KINDS, type MediaKind } from './kinds.js';

export const MEDIA_ROOT = 'm';

export const KIND_CODES = {
  image: 'i',
  svg: 's',
  video: 'v',
  audio: 'a',
  document: 'd',
  model: 'o',
} as const satisfies Record<MediaKind, string>;

export type MediaKindCode = (typeof KIND_CODES)[MediaKind];

export const TENANT_CODES = {
  portfolio: 'pf',
  hyperactivity: 'ha',
} as const;

export type MediaTenant = keyof typeof TENANT_CODES;
export type MediaTenantCode = (typeof TENANT_CODES)[MediaTenant];

export const DEFAULT_TENANT: MediaTenant = 'portfolio';

/**
 * Variant codes: `t` thumbnail (320 px), `640`/`1280`/`1920` widths, `p` poster.
 * `p` is reserved: materialize rejects it for now (posters become separate image assets).
 */
export const VARIANT_CODES = ['t', '640', '1280', '1920', 'p'] as const;
export type MediaVariantCode = (typeof VARIANT_CODES)[number];

/** Child `variant` value for any recipe outside the catalog; keyed `@c-{8 hex}`. */
export const CUSTOM_VARIANT = 'custom' as const;
export type MediaChildVariant = MediaVariantCode | typeof CUSTOM_VARIANT;

/** Key suffix after `@`: a variant code or `c-{8 hex}` for custom children. */
export type MediaVariantSuffix = MediaVariantCode | `c-${string}`;

const CUSTOM_SUFFIX_PATTERN = /^c-[0-9a-f]{8}$/;

const KIND_BY_CODE = new Map<string, MediaKind>(MEDIA_KINDS.map((kind) => [KIND_CODES[kind], kind]));
const TENANT_BY_CODE = new Map<string, MediaTenant>(
  (Object.keys(TENANT_CODES) as MediaTenant[]).map((tenant) => [TENANT_CODES[tenant], tenant])
);

export function isMediaTenant(value: unknown): value is MediaTenant {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(TENANT_CODES, value);
}

export function isVariantCode(value: unknown): value is MediaVariantCode {
  return typeof value === 'string' && (VARIANT_CODES as readonly string[]).includes(value);
}

function isVariantSuffix(value: string): value is MediaVariantSuffix {
  return isVariantCode(value) || CUSTOM_SUFFIX_PATTERN.test(value);
}

export type OriginalKeyInput = {
  tenant: MediaTenant;
  kind: MediaKind;
  name: string;
  ext: string;
};

function assertNameAndExt(name: string, ext: string): void {
  if (!isMediaNameAndExt(name, ext)) {
    throw new Error(
      `Invalid media filename "${name}.${ext}": expected lowercase kebab-case name and alphanumeric extension, ` +
        `at most ${MAX_MEDIA_FILENAME_LENGTH} characters in total`
    );
  }
}

/** `m/pf/i/manhattan-keyframe.png` */
export function originalKey(input: OriginalKeyInput): string {
  if (!isMediaTenant(input.tenant)) {
    throw new Error(`Unknown media tenant: ${String(input.tenant)}`);
  }
  const kindCode = KIND_CODES[input.kind];
  if (!kindCode) {
    throw new Error(`Unknown media kind: ${String(input.kind)}`);
  }
  assertNameAndExt(input.name, input.ext);
  return `${MEDIA_ROOT}/${TENANT_CODES[input.tenant]}/${kindCode}/${input.name}.${input.ext}`;
}

/** Identity of an asset's name: unique per tenant and kind, whatever the extension. */
export type MediaNameRef = {
  tenant: MediaTenant;
  kind: MediaKind;
  name: string;
};

/**
 * `m/pf/i/manhattan-keyframe` — the extension-free prefix shared by an original and its variants.
 * Variant keys drop the original's extension, so this (not the full path) is what must be unique.
 */
export function nameKey(ref: MediaNameRef): string {
  if (!isMediaTenant(ref.tenant)) {
    throw new Error(`Unknown media tenant: ${String(ref.tenant)}`);
  }
  const kindCode = KIND_CODES[ref.kind];
  if (!kindCode) {
    throw new Error(`Unknown media kind: ${String(ref.kind)}`);
  }
  if (!isMediaNameSegment(ref.name)) {
    throw new Error(`Invalid media name "${ref.name}": expected lowercase kebab-case`);
  }
  return `${MEDIA_ROOT}/${TENANT_CODES[ref.tenant]}/${kindCode}/${ref.name}`;
}

export type ParsedMediaKey = {
  tenant: MediaTenant;
  kind: MediaKind;
  name: string;
  ext: string;
  /** Suffix after `@`, or `null` for an original. */
  variant: MediaVariantSuffix | null;
};

const KEY_PATTERN = /^m\/([a-z]{2})\/([a-z])\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:@([a-z0-9-]+))?\.([a-z0-9]+)$/;

/** Reverse of {@link originalKey} / {@link variantKey}; `null` when `key` is not a valid media key. */
export function parseMediaKey(key: string): ParsedMediaKey | null {
  const match = KEY_PATTERN.exec(key);
  if (!match) {
    return null;
  }
  const [, tenantCode, kindCode, name, variant, ext] = match;
  const tenant = TENANT_BY_CODE.get(tenantCode as string);
  const kind = KIND_BY_CODE.get(kindCode as string);
  if (!tenant || !kind || !name || !ext || !isMediaNameAndExt(name, ext)) {
    return null;
  }
  if (variant !== undefined && !isVariantSuffix(variant)) {
    return null;
  }
  return { tenant, kind, name, ext, variant: variant === undefined ? null : (variant as MediaVariantSuffix) };
}

/** `m/pf/i/manhattan-keyframe@640.webp` â€” `original` must be an original key (no `@variant`). */
export function variantKey(original: string, variant: MediaVariantSuffix | string, ext: string): string {
  const parsed = parseMediaKey(original);
  if (!parsed || parsed.variant !== null) {
    throw new Error(`variantKey requires an original media key, got "${original}"`);
  }
  if (!isVariantSuffix(variant)) {
    throw new Error(`Unknown media variant: ${variant}`);
  }
  if (!isMediaExtSegment(ext)) {
    throw new Error(`Invalid variant extension: "${ext}"`);
  }
  const dot = original.lastIndexOf('.');
  return `${original.slice(0, dot)}@${variant}.${ext}`;
}

/**
 * Key suffix for a custom child: `c-` plus the first 8 hex characters of the child id (a UUID).
 * Ids that are not hex (tests, imports) get a stable 8-hex digest instead.
 */
export function customVariantSuffix(childId: string): `c-${string}` {
  const compact = childId.replace(/-/g, '').toLowerCase();
  const head = compact.slice(0, 8);
  if (/^[0-9a-f]{8}$/.test(head)) {
    return `c-${head}`;
  }
  return `c-${createHash('sha256').update(childId).digest('hex').slice(0, 8)}`;
}
