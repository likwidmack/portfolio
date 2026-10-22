/**
 * Media metadata policy: policy filenames (token dropping on top of the mechanical slug) and the
 * editorial metadata rules every reviewed ingest must satisfy (title, alt, description, credit;
 * computed width / height / durationSec; no identifier-looking values).
 */

import { RecipeValidationError } from './errors.js';
import { slugMediaFilename } from './filename.js';
import type { MediaKind } from './kinds.js';

export const DEFAULT_MEDIA_CREDIT = 'Tamara Mack';

export const MEDIA_META_LIMITS = {
  titleMin: 3,
  titleMax: 80,
  altMax: 150,
  descriptionMax: 300,
  creditMax: 80,
} as const;

/** Leading tool / generator tokens (`vimg-`, `mj_`, `Midjourney - `, `DALL-E `), stripped repeatedly. */
const GENERATOR_PREFIX = /^(?:vimg|mj|midjourney|dall[\s_-]?e|firefly|sora|chatgpt)(?:[\s_-]+|$)/i;
/** Leading camera / phone names with their counters (`IMG_1234`, `PXL_20240101_123456789`). */
const CAMERA_PREFIX = /^(?:IMG|DSC[NF]?|PXL|MVIMG|GOPR|DJI|VID)[\s_-]?\d+(?:[\s_-]+\d+)*(?:[\s_-]+|$)/i;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const LONG_HEX_TOKEN = /^[0-9a-f]{16,}$/i;
const LONG_DIGIT_TOKEN = /^\d{10,}$/;
const CAPITALIZED_WORD = /^[A-Z][a-z]+$/;
const SINGLE_CAPITAL = /^[A-Z]$/;

function splitBaseAndExt(filename: string): { raw: string; ext: string } {
  const base = filename.trim().split(/[\\/]/).pop() ?? '';
  const dot = base.lastIndexOf('.');
  const hasExt = dot > 0 && dot < base.length - 1;
  return { raw: hasExt ? base.slice(0, dot) : base, ext: hasExt ? base.slice(dot + 1) : '' };
}

function stripLeading(raw: string): string {
  let current = raw.trim();
  for (;;) {
    const next = current.replace(GENERATOR_PREFIX, '').replace(CAMERA_PREFIX, '');
    if (next === current) {
      return current;
    }
    current = next;
  }
}

/** Drop UUIDs, long hex / digit runs and middle initials between capitalized words (`Tamara G Mack`). */
function meaningfulTokens(raw: string): string[] {
  const tokens = raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(UUID, ' ')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  return tokens.filter((token, index) => {
    if (LONG_HEX_TOKEN.test(token) || LONG_DIGIT_TOKEN.test(token)) {
      return false;
    }
    const prev = tokens[index - 1] ?? '';
    const next = tokens[index + 1] ?? '';
    return !(SINGLE_CAPITAL.test(token) && CAPITALIZED_WORD.test(prev) && CAPITALIZED_WORD.test(next));
  });
}

/**
 * Policy filename for every ingest: lowercase kebab-case, ASCII only, extension kept, at most 36
 * characters, never empty. On top of {@link slugMediaFilename} it drops generator prefixes
 * (`vimg-`), camera names (`IMG_1234`), UUIDs, long hex / digit runs and middle initials. When that
 * leaves nothing, the mechanical slug of the original is used.
 *
 * `Tamara G Mack_Resume_2026.pdf` → `tamara-mack-resume-2026.pdf`;
 * `vimg-tesseract-framework.mp4` → `tesseract-framework.mp4`.
 */
export function normalizeMediaFilename(filename: string): string {
  const { raw, ext } = splitBaseAndExt(filename);
  const cleaned = meaningfulTokens(stripLeading(raw)).join('-');
  if (!cleaned) {
    return slugMediaFilename(filename);
  }
  return slugMediaFilename(ext ? `${cleaned}.${ext}` : cleaned);
}

const IDENTIFIER_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i, 'a UUID'],
  [/(?<![0-9a-z])[0-9a-f]{16,}(?![0-9a-z])/i, 'a long hex string'],
  [/(?<![0-9a-z])(?:IMG|DSC[NF]?|PXL|MVIMG|GOPR|DJI)[_-]?\d{3,}/i, 'a camera file name'],
  // `mj` alone is also initials ("MJ Rivera"), so it only counts before `_` / `-` or as the whole value.
  [/(?<![0-9a-z])vimg(?:[_-]|(?![0-9a-z]))|(?<![0-9a-z])mj[_-]|^mj$/i, 'a generator prefix'],
  [
    /(?<![0-9a-z])(?:job|task|gen|run|req|msg|chatcmpl|file|asset)[_-](?=[a-z]*\d)[0-9a-z]{8,}(?![0-9a-z])/i,
    'a tool or vendor job id',
  ],
  [/(?<!\d)\d{10,}(?!\d)/, 'a long number'],
  [/\.(?:png|jpe?g|webp|avif|gif|svg|mp4|mov|webm|m4v|pdf|glb|gltf|mp3|wav)$/i, 'a file name'],
];

/** Why `value` reads like an identifier rather than words (`null` when it does not). */
export function looksLikeIdentifier(value: string): string | null {
  const trimmed = value.trim();
  for (const [pattern, reason] of IDENTIFIER_PATTERNS) {
    if (pattern.test(trimmed)) {
      return reason;
    }
  }
  return null;
}

export type MediaMetaField = 'title' | 'alt' | 'description' | 'credit' | 'width' | 'height' | 'durationSec';

export type MediaMetaIssueCode = 'required' | 'too_short' | 'too_long' | 'identifier' | 'computed' | 'invalid';

export type MediaMetaIssue = { field: MediaMetaField; code: MediaMetaIssueCode; message: string };

export type MediaMetaValidation = {
  ok: boolean;
  issues: MediaMetaIssue[];
  /** Input meta with trimmed editorial fields and `credit` defaulted. */
  meta: Record<string, unknown>;
};

export type ValidateMediaMetaOptions = {
  /** width / height / durationSec were measured from the file by the caller (never typed by hand). */
  computed?: boolean;
};

function altRequired(kind: MediaKind, meta: Record<string, unknown>): boolean {
  switch (kind) {
    case 'image':
    case 'svg':
      return true;
    case 'video':
      return typeof meta.posterId === 'string' && meta.posterId.trim() !== '';
    case 'audio':
    case 'model':
    case 'document':
      return false;
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

type TextRule = { field: 'title' | 'alt' | 'description' | 'credit'; required: boolean; min?: number; max: number };

function checkText(rule: TextRule, value: unknown, issues: MediaMetaIssue[]): string | undefined {
  const { field } = rule;
  if (value !== undefined && value !== null && typeof value !== 'string') {
    issues.push({ field, code: 'invalid', message: `${field} must be text` });
    return undefined;
  }
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    if (rule.required) {
      issues.push({ field, code: 'required', message: `${field} is required` });
    }
    return undefined;
  }
  if (rule.min !== undefined && text.length < rule.min) {
    issues.push({ field, code: 'too_short', message: `${field} needs at least ${rule.min} characters` });
  } else if (text.length > rule.max) {
    issues.push({ field, code: 'too_long', message: `${field} is at most ${rule.max} characters (${text.length})` });
  }
  const identifier = looksLikeIdentifier(text);
  if (identifier) {
    issues.push({ field, code: 'identifier', message: `${field} looks like ${identifier}: write words instead` });
  }
  return text;
}

function checkComputed(
  field: 'width' | 'height' | 'durationSec',
  value: unknown,
  computed: boolean,
  issues: MediaMetaIssue[]
): void {
  if (value === undefined || value === null) {
    return;
  }
  if (!computed) {
    issues.push({ field, code: 'computed', message: `${field} is measured from the file, never typed` });
    return;
  }
  const valid =
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0 &&
    (field === 'durationSec' || Number.isInteger(value));
  if (!valid) {
    issues.push({
      field,
      code: 'invalid',
      message: `${field} must be a positive ${field === 'durationSec' ? 'number' : 'integer'}`,
    });
  }
}

/**
 * Check editorial metadata for an asset of `kind`:
 * - `title` required, 3-80 characters;
 * - `alt` required for image and svg (and for a video with a `posterId`), at most 150;
 * - `description` optional, at most 300; `credit` defaults to {@link DEFAULT_MEDIA_CREDIT};
 * - `width` / `height` / `durationSec` only when the caller measured them (`options.computed`);
 * - no identifier-looking values (UUIDs, long hex, camera names, `vimg-`, vendor job ids, file names).
 */
export function validateMediaMeta(
  kind: MediaKind,
  meta: Record<string, unknown>,
  options: ValidateMediaMetaOptions = {}
): MediaMetaValidation {
  const issues: MediaMetaIssue[] = [];
  const L = MEDIA_META_LIMITS;
  const title = checkText({ field: 'title', required: true, min: L.titleMin, max: L.titleMax }, meta.title, issues);
  const alt = checkText({ field: 'alt', required: altRequired(kind, meta), max: L.altMax }, meta.alt, issues);
  const description = checkText(
    { field: 'description', required: false, max: L.descriptionMax },
    meta.description,
    issues
  );
  const credit = checkText({ field: 'credit', required: false, max: L.creditMax }, meta.credit, issues);
  for (const field of ['width', 'height', 'durationSec'] as const) {
    checkComputed(field, meta[field], options.computed === true, issues);
  }
  const next: Record<string, unknown> = { ...meta, credit: credit ?? DEFAULT_MEDIA_CREDIT };
  for (const [field, value] of [
    ['title', title],
    ['alt', alt],
    ['description', description],
  ] as const) {
    if (value === undefined) {
      delete next[field];
    } else {
      next[field] = value;
    }
  }
  return { ok: issues.length === 0, issues, meta: next };
}

/** {@link validateMediaMeta} that throws a `RecipeValidationError` (HTTP 400) listing every issue. */
export function assertMediaMeta(
  kind: MediaKind,
  meta: Record<string, unknown>,
  options: ValidateMediaMetaOptions = {}
): Record<string, unknown> {
  const result = validateMediaMeta(kind, meta, options);
  if (!result.ok) {
    throw new RecipeValidationError(
      `Invalid media metadata: ${result.issues.map((issue) => `${issue.field}: ${issue.message}`).join('; ')}`
    );
  }
  return result.meta;
}
