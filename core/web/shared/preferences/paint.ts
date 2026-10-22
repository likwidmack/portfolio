/**
 * Preferences paint — token builders + `Theme.apply` / `Theme.remove` only (bridges default ON).
 * Colour system stages 3–4: both-mode `--theme-*` variations + `--portfolio-*-color` preset layer.
 */
import {
  adjustLightnessFor,
  buildButtonInkTokens,
  buildButtonStopTokens,
  buildColorVariations,
  buildLinkTokens,
  buildPrimaryFillTokens,
  buildPrimaryInkTokens,
  buildSecondaryInkTokens,
  buildStatusInkTokens,
  buildWashTokens,
  Color,
  DEFAULT_COLOR_SOURCES,
  SOLID_COLORS,
  STATUS_COLORS,
  Theme,
  type ColorSources,
  type ThemeTokenMap,
} from '@tgmc/theme';

import {
  BACKGROUND_CUSTOM_OPTIONS,
  COLOR_TOKENS_KEY,
  defaultBrandRoles,
  defaultPaperInk,
  isDefaultPaperInk,
  PRESET_BACKGROUND_KEYS,
  sanitizeBackgroundOptions,
  type BackgroundOptions,
  type BrandRolesState,
  type PaperInkState,
  type PreferenceDocument,
  type ThemeResolvedMode,
} from './document';

/**
 * Both modes' pairs as `--theme-paper-{light,dark}-color` / `--theme-ink-{light,dark}-color`
 * (R-T3a). The stylesheet points the active aliases at the mode's pair.
 */
export function buildPaperInkTokens(state: PaperInkState): ThemeTokenMap {
  return {
    '--theme-paper-light-color': state.light.paper,
    '--theme-ink-light-color': state.light.ink,
    '--theme-paper-dark-color': state.dark.paper,
    '--theme-ink-dark-color': state.dark.ink,
  };
}

/**
 * The background layer as written to <html>: the preset's tokens, then the visitor's options on
 * top (an option always wins over the preset value for the same variable). `null` = remove.
 */
export function buildBackgroundLayer(
  presetTokens: Record<string, string>,
  options: BackgroundOptions
): Record<string, string | null> {
  const layer: Record<string, string | null> = {};
  for (const key of PRESET_BACKGROUND_KEYS) layer[key] = presetTokens[key] ?? null;
  for (const option of BACKGROUND_CUSTOM_OPTIONS) layer[option.variable] = presetTokens[option.variable] ?? null;
  for (const [variable, value] of Object.entries(sanitizeBackgroundOptions(options))) layer[variable] = value;
  return layer;
}

const AA_INK = 4.5;
const AA_SURFACE = 3;

/**
 * Each image stop keeps the ink readable (4.5:1) and, where that still holds, stands out from the
 * paper (3:1) — a pastel image on light paper or a near-black one on dark paper would vanish.
 */
function imageStopFor(hex: string, ink: string, paper: string): string {
  const readable = adjustLightnessFor(hex, ink, AA_INK);
  if (Color.contrastRatio(readable, paper) >= AA_SURFACE) return readable;
  const visible = adjustLightnessFor(readable, paper, AA_SURFACE);
  return Color.contrastRatio(visible, ink) >= AA_INK ? visible : readable;
}

function adjustImageForAa(image: string, ink: string, paper: string): string {
  return image.replace(/#[0-9a-fA-F]{3,8}\b/g, (hex) => imageStopFor(hex, ink, paper));
}

export interface PackColors {
  primary: string;
  secondary: string;
  accent: string;
}

/**
 * A pack's brand colours as the site paints them in `mode`: lightness moved to 3:1 on that
 * mode's paper. The background triad and the Style Studio pack tile both show these.
 */
export function paintedPackColors(
  packId: string,
  mode: ThemeResolvedMode,
  paperInk: PaperInkState = defaultPaperInk()
): PackColors | null {
  const preset = Theme.preset(packId);
  if (!preset) return null;
  const paper = paperInk[mode].paper;
  return {
    primary: adjustLightnessFor(preset.primary[mode], paper, AA_SURFACE),
    secondary: adjustLightnessFor(preset.secondary[mode], paper, AA_SURFACE),
    accent: adjustLightnessFor(preset.accent[mode], paper, AA_SURFACE),
  };
}

/**
 * Map a studio preset onto portfolio role and background variables for light and dark.
 * Lightness moves with the theme's `adjustLightnessFor` (R-T3f). Colour names are
 * `--portfolio-<role>[-<mode>]-color` (R-T4a); the image stays `--portfolio-background-image*`.
 */
export function buildPresetBackgroundTokens(
  packId: string | null,
  roles: BrandRolesState,
  mode: ThemeResolvedMode = 'dark',
  paperInk: PaperInkState = defaultPaperInk()
): ThemeTokenMap {
  const preset = packId ? Theme.preset(packId) : undefined;
  if (!packId || !preset) return {};
  const tokens: ThemeTokenMap = {};
  for (const themeMode of ['light', 'dark'] as const) {
    const ink = paperInk[themeMode].ink;
    const painted = paintedPackColors(packId, themeMode, paperInk)!;
    for (const role of BRAND_ROLE_KEYS) {
      tokens[`--portfolio-${role}-${themeMode}-color`] = painted[role];
      tokens[`--portfolio-background-${role}-${themeMode}-color`] = painted[role];
    }
    if (preset.background)
      tokens[`--portfolio-background-image-${themeMode}`] = adjustImageForAa(
        preset.background.image,
        ink,
        paperInk[themeMode].paper
      );
  }
  tokens['--portfolio-primary-color'] = tokens[`--portfolio-primary-${mode}-color`] ?? roles.primary;
  tokens['--portfolio-secondary-color'] = tokens[`--portfolio-secondary-${mode}-color`] ?? roles.secondary;
  tokens['--portfolio-accent-color'] = tokens[`--portfolio-accent-${mode}-color`] ?? roles.accent;
  tokens['--portfolio-background-primary-color'] =
    tokens[`--portfolio-background-primary-${mode}-color`] ?? roles.primary;
  tokens['--portfolio-background-secondary-color'] =
    tokens[`--portfolio-background-secondary-${mode}-color`] ?? roles.secondary;
  tokens['--portfolio-background-accent-color'] = tokens[`--portfolio-background-accent-${mode}-color`] ?? roles.accent;
  const image = tokens[`--portfolio-background-image-${mode}`];
  if (image) tokens['--portfolio-background-image'] = image;
  return tokens;
}

const BRAND_ROLE_KEYS = ['primary', 'secondary', 'accent'] as const;
type BrandRoleKey = (typeof BRAND_ROLE_KEYS)[number];
const VARIATIONS = ['light', 'dark', 'light-background', 'dark-background'] as const;

/** Per-mode source colours for the three brand roles. */
export type BrandColorSources = Pick<ColorSources, BrandRoleKey>;

const sameHex = (a: string, b: string) => Color.toHex(a).toLowerCase() === Color.toHex(b).toLowerCase();

/** The untouched default roles (either mode's theme pair) — the stylesheet already paints them. */
export function isDefaultBrandRoles(roles: BrandRolesState): boolean {
  return (['light', 'dark'] as const).some((mode) => {
    const d = defaultBrandRoles(mode);
    return BRAND_ROLE_KEYS.every((role) => sameHex(roles[role], d[role]));
  });
}

/**
 * Per-mode sources for the brand variations (R-T3b): a pack / preset role uses its light / dark
 * pair; untouched defaults use the theme's own pair; a custom pick is the source for both modes.
 */
export function brandColorSources(roles: BrandRolesState, packId: string | null = null): BrandColorSources {
  if (!packId && isDefaultBrandRoles(roles)) {
    return {
      primary: DEFAULT_COLOR_SOURCES.primary,
      secondary: DEFAULT_COLOR_SOURCES.secondary,
      accent: DEFAULT_COLOR_SOURCES.accent,
    };
  }
  const preset = packId ? Theme.preset(packId) : undefined;
  const pick = (role: BrandRoleKey) => {
    const pair = preset?.[role];
    if (pair && (sameHex(roles[role], pair.light) || sameHex(roles[role], pair.dark))) return pair;
    const hex = Color.toHex(roles[role]).toLowerCase();
    return { light: hex, dark: hex };
  };
  return { primary: pick('primary'), secondary: pick('secondary'), accent: pick('accent') };
}

/**
 * Brand variations for BOTH modes (R-T3b): `--theme-{primary,secondary,accent}-{light,dark}
 * {,-background}-color`, plus primary-fill, primary-ink and secondary-ink (the primary /
 * secondary as ≥ 4.5:1 text on this paper / ink's page and surfaces), button-fg-dark and the
 * hover / active washes behind primary-ink text (`--theme-{primary,secondary}-wash-*`), the link
 * ink (`--theme-link-*`, ≥ 4.5:1 on page, surfaces and its own washes) and the solid-button gradient
 * stops (`--theme-{secondary-fill,secondary-inverted,primary-sheen}-*`, the label ≥ 4.5:1 on every
 * colour the sheen paints). The primary fill reads this pair's light paper (on-primary). Only new
 * names: the stylesheet points the active `--theme-<c>-color` / `--theme-{primary,secondary}-ink-color`
 * at the mode's one. `mode` is call-site compat only.
 */
export function buildBrandTokens(
  roles: BrandRolesState,
  mode: ThemeResolvedMode = 'dark',
  paperInk: Pick<PaperInkState, 'light' | 'dark'> = defaultPaperInk(),
  packId: string | null = null
): ThemeTokenMap {
  void mode;
  const sources = { ...DEFAULT_COLOR_SOURCES, ...brandColorSources(roles, packId) };
  const pairs = { light: paperInk.light, dark: paperInk.dark };
  const variations = buildColorVariations(sources, pairs);
  const tokens: ThemeTokenMap = {};
  for (const role of BRAND_ROLE_KEYS)
    for (const variation of VARIATIONS) {
      const name = `--theme-${role}-${variation}-color`;
      tokens[name] = variations[name]!;
    }
  const primaryInk = buildPrimaryInkTokens(sources, pairs);
  return {
    ...tokens,
    ...buildButtonInkTokens(variations),
    ...buildPrimaryFillTokens(variations),
    ...primaryInk,
    ...buildSecondaryInkTokens(sources, pairs),
    ...buildWashTokens(variations, primaryInk, pairs),
    ...buildLinkTokens(sources, pairs),
    ...buildButtonStopTokens(variations),
  };
}

/** The flags: warning, error, info, success and focus (`SOLID_COLORS` minus the brand roles). */
const FLAG_KEYS = SOLID_COLORS.filter((c) => !(BRAND_ROLE_KEYS as readonly string[]).includes(c));

/**
 * Status and focus for BOTH modes against a paper / ink pair: `--theme-<flag>-{light,dark}
 * {,-background}-color` for warning, error, info, success and focus, from the default sources (no
 * picker changes them), plus the status text roles `--theme-<status>-ink-{light,dark}-color`
 * (≥ 4.5:1 on page, surfaces and variant — `buildStatusInkTokens`). For the default pair every
 * value equals the stylesheet default.
 */
export function buildStatusTokens(paperInk: Pick<PaperInkState, 'light' | 'dark'> = defaultPaperInk()): ThemeTokenMap {
  const pairs = { light: paperInk.light, dark: paperInk.dark };
  const variations = buildColorVariations(DEFAULT_COLOR_SOURCES, pairs);
  const tokens: ThemeTokenMap = {};
  for (const flag of FLAG_KEYS)
    for (const variation of VARIATIONS) {
      const name = `--theme-${flag}-${variation}-color`;
      tokens[name] = variations[name]!;
    }
  return { ...tokens, ...buildStatusInkTokens(DEFAULT_COLOR_SOURCES, pairs) };
}

/** Every name the runtime colour map may carry (the FOUC allowlist). */
export const RUNTIME_COLOR_TOKEN_NAMES: readonly string[] = [
  ...SOLID_COLORS.flatMap((c) => VARIATIONS.map((variation) => `--theme-${c}-${variation}-color`)),
  ...STATUS_COLORS.flatMap((s) => ['light', 'dark'].map((mode) => `--theme-${s}-ink-${mode}-color`)),
  '--theme-button-fg-dark-color',
  '--theme-primary-fill-light-color',
  '--theme-primary-fill-dark-color',
  '--theme-primary-ink-light-color',
  '--theme-primary-ink-dark-color',
  '--theme-secondary-ink-light-color',
  '--theme-secondary-ink-dark-color',
  '--theme-primary-wash-light-color',
  '--theme-primary-wash-dark-color',
  '--theme-secondary-wash-light-color',
  '--theme-secondary-wash-dark-color',
  '--theme-link-light-color',
  '--theme-link-dark-color',
  '--theme-secondary-fill-light-color',
  '--theme-secondary-fill-dark-color',
  '--theme-secondary-inverted-light-color',
  '--theme-secondary-inverted-dark-color',
  '--theme-primary-sheen-light-color',
  '--theme-primary-sheen-dark-color',
  '--theme-paper-light-color',
  '--theme-ink-light-color',
  '--theme-paper-dark-color',
  '--theme-ink-dark-color',
];

/**
 * Runtime colour map for both modes: paper / ink, status and focus (recomputed against the pair),
 * and the brand roles. `null` for untouched defaults — stylesheet owns those.
 */
export function buildRuntimeColorTokens(
  roles: BrandRolesState,
  paperInk: PaperInkState,
  packId: string | null = null
): ThemeTokenMap | null {
  if (!packId && isDefaultBrandRoles(roles) && isDefaultPaperInk(paperInk)) return null;
  return {
    ...buildPaperInkTokens(paperInk),
    ...buildStatusTokens(paperInk),
    ...buildBrandTokens(roles, 'dark', paperInk, packId),
  };
}

/** Stored JSON longer than this is ignored (the full map is 2,749 characters: 63 names, every value `#rrggbb`). */
export const COLOR_TOKENS_MAX_LENGTH = 4096;
const TOKEN_HEX = /^#[0-9a-f]{6}$/i;

/** Keep only allowlisted `--theme-*-color` names whose value is a `#rrggbb` hex (lowercased). */
export function sanitizeColorTokenMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const name of RUNTIME_COLOR_TOKEN_NAMES) {
    const hex = raw[name];
    if (typeof hex === 'string' && TOKEN_HEX.test(hex)) out[name] = hex.toLowerCase();
  }
  return out;
}

export function loadColorTokens(storage: Pick<Storage, 'getItem'>): Record<string, string> {
  const raw = storage.getItem(COLOR_TOKENS_KEY);
  if (!raw || raw.length > COLOR_TOKENS_MAX_LENGTH) return {};
  try {
    return sanitizeColorTokenMap(JSON.parse(raw));
  } catch {
    return {};
  }
}

/** Stored form of the map: sanitized JSON, or `null` when nothing remains (the key is removed). */
export function serializeColorTokens(tokens: Record<string, string> | null): string | null {
  const clean = sanitizeColorTokenMap(tokens);
  return Object.keys(clean).length ? JSON.stringify(clean) : null;
}

/** Store the map; `null` / empty removes the key so CSS keeps owning the untouched case. */
export function persistColorTokens(
  storage: Pick<Storage, 'setItem' | 'removeItem'>,
  tokens: Record<string, string> | null
): void {
  const json = serializeColorTokens(tokens);
  if (json) storage.setItem(COLOR_TOKENS_KEY, json);
  else storage.removeItem(COLOR_TOKENS_KEY);
}

/**
 * Compose paint tokens for the resolved color mode: runtime colour map + background layer.
 * Absent background keys are listed separately for {@link Theme.remove}.
 */
export function buildPaintPlan(
  doc: PreferenceDocument,
  resolvedMode: 'light' | 'dark'
): { written: ThemeTokenMap; removed: string[]; colorTokens: ThemeTokenMap | null } {
  const colorTokens = buildRuntimeColorTokens(doc.brandRoles, doc.paperInk, doc.accent);
  const presetTokens = buildPresetBackgroundTokens(doc.accent, doc.brandRoles, resolvedMode, doc.paperInk);
  const layer = buildBackgroundLayer(presetTokens, doc.backgroundOptions);
  const written: ThemeTokenMap = {};
  const removed: string[] = [];
  for (const [key, value] of Object.entries(layer)) {
    if (value) written[key] = value;
    else removed.push(key);
  }
  if (!colorTokens) removed.push(...RUNTIME_COLOR_TOKEN_NAMES);
  else Object.assign(written, colorTokens);
  return { written, removed, colorTokens };
}

/** Paint a preference document through Theme.remove + Theme.apply only — no bridge options. */
export function paintDocument(doc: PreferenceDocument, resolvedMode: 'light' | 'dark', source: string): void {
  const { written, removed } = buildPaintPlan(doc, resolvedMode);
  if (removed.length) Theme.remove(removed, { source });
  Theme.apply(written, { source });
}
