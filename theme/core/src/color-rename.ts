/**
 * Colour rename map (spec: docs/superpowers/specs/2026-09-24-color-system-design.md).
 *
 * `color-rename-map.json` lists the pre-colour-system names and their `--theme-…-color` names:
 * - `renames` — old name → new name (a `--theme-…-color` name, or one of `paletteNames`). Since
 *   Task 8 the stylesheet emits only the new names — the old names are gone (archived in
 *   `scss/_archive/2026-09-29-color-aliases/`). The map stays for the codemod
 *   (`scripts/rename-color-vars.mjs`), the guards, and {@link normalizeColorNames}: an old key
 *   passed IN to the theme API is written under its new name (R-T8c).
 * - `retired` — old names with no replacement (the pruned Task-2 extras); they are dropped on input.
 * - `paletteNames` — the owner-set exception to the `--theme-` prefix: the ten basic colours
 *   `--<hue>-color` (red … magenta), following the `--navy-color` / `--oxblood-color` family pattern.
 * - `palette` — data palettes, kept as they are (not renamed, not retired).
 * - `excluded` — not colours (channel triplets, shadows, gradients) or third-party interfaces
 *   (Foundation's `--foundation-*`).
 */
import map from './color-rename-map.json' with { type: 'json' };

type NameGroup = { reason: string; names: string[] };

export type ColorRenameMap = {
  renames: Record<string, string>;
  retired: NameGroup[];
  paletteNames: string[];
  palette: string[];
  excluded: NameGroup[];
};

export const COLOR_RENAME_MAP: ColorRenameMap = map;

/** Every theme colour variable name: `--theme-<what>-color`. */
export const THEME_COLOR_NAME = /^--theme-[a-z0-9-]+-color$/;

/** Alpha steps of the `--theme-<ink|paper|primary|secondary|accent>-a<N>-color` family. */
export const COLOR_ALPHA_STEPS = [4, 8, 12, 16, 24, 32, 48, 64, 80, 90] as const;

/** A permitted new colour name: `--theme-…-color`, or one of the listed `paletteNames`. */
export function isNewColorName(name: string, m: ColorRenameMap = COLOR_RENAME_MAP): boolean {
  return THEME_COLOR_NAME.test(name) || m.paletteNames.includes(name);
}

/** The `--theme-…-color` name of an old name, if it has one. */
export function themeColorNameFor(old: string): string | undefined {
  return Object.hasOwn(COLOR_RENAME_MAP.renames, old) ? COLOR_RENAME_MAP.renames[old] : undefined;
}

/** Old names retired without a replacement (flat `retired` list). */
export function retiredColorNames(m: ColorRenameMap = COLOR_RENAME_MAP): string[] {
  return m.retired.flatMap((group) => group.names);
}

/** Names the naming guard ignores as non-colours or third-party interfaces. */
export function excludedColorNames(m: ColorRenameMap = COLOR_RENAME_MAP): string[] {
  return m.excluded.flatMap((group) => group.names);
}

/**
 * The name to write for `name` (R-T8c): an old name → its new name, a retired name → `null` (it is
 * never written), anything else unchanged. `name` must already carry its `--` prefix.
 */
export function normalizeColorName(name: string, m: ColorRenameMap = COLOR_RENAME_MAP): string | null {
  if (Object.hasOwn(m.renames, name)) return m.renames[name]!;
  const retired = m.retired.find((group) => group.names.includes(name));
  if (retired) {
    warnRetired(name, retired.reason);
    return null;
  }
  return name;
}

const warnedRetired = new Set<string>();

/**
 * Development builds only. A Vite bundle (the app, Vitest) answers through
 * `import.meta.env.DEV` — `false` in a production bundle, whatever `NODE_ENV` says; Node / Nitro
 * without Vite through `process.env.NODE_ENV` (anything but `production`). Neither available →
 * silent.
 */
function isDevelopment(): boolean {
  const viteDev = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV;
  const nodeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.NODE_ENV;
  return isDevelopmentFor(viteDev, nodeEnv);
}

/** The decision behind {@link isDevelopment}, given Vite's `DEV` and Node's `NODE_ENV` (tests). */
export function isDevelopmentFor(viteDev: boolean | undefined, nodeEnv: string | undefined): boolean {
  if (viteDev === false || nodeEnv === 'production') return false;
  return viteDev === true || nodeEnv !== undefined;
}

/**
 * A retired name passed to the theme API is dropped (nothing paints it), so in development say so
 * once per name, with the rename map's reason.
 */
function warnRetired(name: string, reason: string): void {
  if (warnedRetired.has(name) || !isDevelopment()) return;
  warnedRetired.add(name);
  console.warn(`[@tgmc/theme] "${name}" is a retired colour name and was dropped. ${reason}`);
}

/** Forget which retired names already warned (tests). */
export function resetRetiredColorWarnings(): void {
  warnedRetired.clear();
}

/**
 * A token patch with every old colour key moved to its new name, value unchanged (R-T8c). Retired
 * names are dropped. A new name the patch sets explicitly wins over a normalised old key, in any
 * order; when two old keys share one new name (`--border-strong` / `--form-border-color`), the
 * later one wins. Keys must already carry their `--` prefix.
 */
export function normalizeColorNames(
  tokens: Record<string, string>,
  m: ColorRenameMap = COLOR_RENAME_MAP
): Record<string, string> {
  const out: Record<string, string> = {};
  const explicit = new Set(Object.keys(tokens).filter((key) => normalizeColorName(key, m) === key));
  for (const [key, value] of Object.entries(tokens)) {
    const next = normalizeColorName(key, m);
    if (next === null) continue;
    if (next !== key && explicit.has(next)) continue;
    out[next] = value;
  }
  return out;
}
