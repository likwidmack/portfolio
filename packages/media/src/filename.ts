/**
 * Mechanical filename normalization for catalog media (`{name}.{ext}` in keys and URLs).
 *
 * Rules: lowercase kebab-case, ASCII only, extension kept, the whole filename at most
 * {@link MAX_MEDIA_FILENAME_LENGTH} characters, never empty. Token-dropping policy (generator
 * prefixes, identifier-looking values) lives in `meta-policy.ts` (`normalizeMediaFilename`), which
 * ends with {@link slugMediaFilename}.
 */

export const MAX_MEDIA_FILENAME_LENGTH = 36;

const FALLBACK_NAME = 'untitled';
const MAX_EXT_LENGTH = 8;

const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EXT_PATTERN = /^[a-z0-9]+$/;

function basename(filename: string): string {
  const parts = filename.split(/[\\/]/);
  return parts[parts.length - 1] ?? '';
}

function slug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function truncateName(name: string, maxLength: number): string {
  return name.slice(0, Math.max(1, maxLength)).replace(/-+$/g, '') || FALLBACK_NAME.slice(0, Math.max(1, maxLength));
}

/**
 * Mechanically normalize an arbitrary filename to `{name}.{ext}` (or `{name}` when it has no
 * extension). Ingest uses the policy version, `normalizeMediaFilename` in `meta-policy.ts`.
 */
export function slugMediaFilename(filename: string): string {
  const base = basename(filename.trim());
  const dot = base.lastIndexOf('.');
  const hasExt = dot > 0 && dot < base.length - 1;
  const rawName = hasExt ? base.slice(0, dot) : base;
  const ext = hasExt
    ? base
        .slice(dot + 1)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, MAX_EXT_LENGTH)
    : '';

  const name = slug(rawName) || FALLBACK_NAME;
  const budget = ext ? MAX_MEDIA_FILENAME_LENGTH - ext.length - 1 : MAX_MEDIA_FILENAME_LENGTH;
  const fitted = name.length > budget ? truncateName(name, budget) : name;
  return ext ? `${fitted}.${ext}` : fitted;
}

/** Split a normalized filename into name and extension (extension is `''` when absent). */
export function splitMediaFilename(filename: string): { name: string; ext: string } {
  const dot = filename.lastIndexOf('.');
  if (dot <= 0) {
    return { name: filename, ext: '' };
  }
  return { name: filename.slice(0, dot), ext: filename.slice(dot + 1) };
}

/** True when `name` is a valid key name segment (lowercase kebab-case, no repeated/edge hyphens). */
export function isMediaNameSegment(name: string): boolean {
  return NAME_PATTERN.test(name);
}

/** True when `ext` is a valid key extension segment. */
export function isMediaExtSegment(ext: string): boolean {
  return EXT_PATTERN.test(ext);
}

/** True when `name.ext` is a valid, already-normalized media filename within the length limit. */
export function isMediaNameAndExt(name: string, ext: string): boolean {
  return (
    isMediaNameSegment(name) && isMediaExtSegment(ext) && name.length + 1 + ext.length <= MAX_MEDIA_FILENAME_LENGTH
  );
}

/** True when `filename` is `{name}.{ext}` exactly as {@link slugMediaFilename} would emit it. */
export function isNormalizedMediaFilename(filename: string): boolean {
  const { name, ext } = splitMediaFilename(filename);
  return isMediaNameAndExt(name, ext);
}

/**
 * Suggest a numbered alternative name (`manhattan-keyframe-2`), truncating the base so the
 * whole filename stays within the limit.
 */
export function suggestMediaName(name: string, ext: string, attempt: number): string {
  const suffix = `-${attempt}`;
  const budget = MAX_MEDIA_FILENAME_LENGTH - (ext ? ext.length + 1 : 0) - suffix.length;
  const base = name.length > budget ? truncateName(name, budget) : name;
  return `${base}${suffix}`;
}
