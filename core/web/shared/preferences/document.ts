/**
 * Preferences document types + pure helpers (brand roles, motion, background, paper/ink).
 * Storage: `tgmc-preferences` (see `./storage`); legacy flat keys are read once by `./legacy`.
 * Paint token builders + `paintDocument` live in `./paint` (`Theme.apply` only).
 * FOUC codegen: `./fouc`. Style setups CRUD: `./setups`.
 *
 * Brand roles: primary pick auto-fills secondary (analogous) + accent (complementary) via
 * `Color.resolveBrandRoles`; overrides lock until primary changes. Background: particles | grid |
 * camera | custom (+ custom hex). Pen & paper neutrals: paper = background, ink = foreground, one
 * pair per mode; `linked` keeps the other mode as the inverse. Named setups: `tgmc-style-setups` +
 * `tgmc-style-setup-active`.
 *
 * Colour system (stages 3–4): paint writes both-mode `--theme-*` variations + `--portfolio-*-color`
 * via `./paint` → `Theme.apply`; the FOUC map is persisted as `tgmc-theme-color-tokens`.
 * Docs: `docs/web/features/personalization.md`.
 */
import {
  backgroundFor,
  Color,
  DEFAULT_PAPER_INK,
  invertPaperInk,
  Theme,
  themeColors,
  type PaperInkPair,
  type ResolvedBrandRoles,
  type StudioPresetBackground,
} from '@tgmc/theme';

import { PORTFOLIO_INK_HEX, PORTFOLIO_IVORY_HEX } from '../portfolio-chrome';
import { PORTFOLIO_COLOR_RENAMES } from '../portfolio-color-names';

export type MotionPreference = 'system' | 'playful' | 'reduced';
/** Palette id or `color*` id from theme JSON. Legacy ember/crimson values are not packs. */
export type AccentId = string;
export type ThemeResolvedMode = 'light' | 'dark';
/** Depth-field backdrop: ambient particles, a scrolling 3D grid, live camera, or a solid custom color. */
export type BackgroundMode = 'particles' | 'grid' | 'camera' | 'custom';

/** Named Style Studio setups (`{ v: 1, setups }`, see `./setups`). */
export const STYLE_SETUPS_KEY = 'tgmc-style-setups';
/** Active setup id after Apply / quick-apply (`null` when none). */
export const STYLE_SETUP_ACTIVE_KEY = 'tgmc-style-setup-active';
/** Persisted runtime colour map for FOUC (JSON; written by paint on commit). */
export const COLOR_TOKENS_KEY = 'tgmc-theme-color-tokens';
/**
 * Pre-`tgmc-preferences` flat keys; read once by `./legacy`, then removed. Delete together with
 * `./legacy` and the `legacy` list in `PREFERENCE_KEYS` (`./storage`).
 */
export const LEGACY_KEYS = {
  themeMode: 'tgmc-theme-mode',
  brandRoles: 'tgmc-brand-roles',
  accent: 'tgmc-accent',
  motion: 'tgmc-motion',
  background: 'tgmc-background',
  backgroundCustom: 'tgmc-background-custom',
  paperInk: 'tgmc-paper-ink',
  backgroundOptions: 'tgmc-background-options',
} as const;

/** Color-mode preference stored on a setup (matches theme package preference union). */
export type StyleSetupMode = 'system' | 'light' | 'dark';

/**
 * Committed preference document — flat live keys + color mode.
 * Owned by Preferences; painted via `paintDocument` → `Theme.apply` in `./paint`.
 */
export type PreferenceDocument = {
  brandRoles: BrandRolesState;
  motion: MotionPreference;
  background: BackgroundMode;
  backgroundCustom: string;
  mode: StyleSetupMode | 'system';
  paperInk: PaperInkState;
  backgroundOptions: BackgroundOptions;
  accent: BrandPackId | null;
};

/** Named snapshot of a full preference document (app-owned; not Theme.create packs). */
export type StyleSetup = {
  id: string;
  name: string;
  document: PreferenceDocument;
};

/**
 * Pen & paper: paper is the background and ink the foreground in every mode. One pair per mode;
 * `linked` means one edit drives both (the other mode uses the same colours, swapped).
 */
export type PaperInkState = {
  light: PaperInkPair;
  dark: PaperInkPair;
  linked: boolean;
};

export function defaultPaperInk(): PaperInkState {
  return { light: { ...DEFAULT_PAPER_INK.light }, dark: { ...DEFAULT_PAPER_INK.dark }, linked: true };
}

/**
 * Set one mode's pair; when linked, the other mode becomes its inverse. Values are stored as
 * lower-case `#rrggbb` (what `parsePaperInk` reads back); a translucent or unparseable value
 * returns `state` unchanged, so a save never writes a pair that would reset to the defaults on reload.
 */
export function withPaperInk(state: PaperInkState, mode: ThemeResolvedMode, pair: PaperInkPair): PaperInkState {
  const paper = normalizeOpaqueHex(pair.paper);
  const ink = normalizeOpaqueHex(pair.ink);
  if (!paper || !ink) return state;
  const clean = { paper, ink };
  const other: ThemeResolvedMode = mode === 'dark' ? 'light' : 'dark';
  return {
    ...state,
    [mode]: clean,
    [other]: state.linked ? invertPaperInk(clean) : state[other],
  } as PaperInkState;
}

/** Toggle linking; linking re-derives the other mode from `from`. */
export function withPaperInkLinked(state: PaperInkState, linked: boolean, from: ThemeResolvedMode): PaperInkState {
  const next = { ...state, linked };
  return linked ? withPaperInk(next, from, state[from]) : next;
}

export function isDefaultPaperInk(state: PaperInkState): boolean {
  const d = defaultPaperInk();
  return (
    state.linked === d.linked &&
    (['light', 'dark'] as const).every(
      (m) => state[m].paper.toLowerCase() === d[m].paper && state[m].ink.toLowerCase() === d[m].ink
    )
  );
}

const OPAQUE_HEX = /^#[0-9a-f]{6}$/;

/**
 * Normalise a stored paper / ink value to lower-case `#rrggbb`, the only form the FOUC colour map
 * keeps (`sanitizeColorTokenMap`). `#rgb`, `rgb()` and opaque alpha forms (`#rrggbbff`) flatten; alpha below 1 or what
 * `Color` cannot parse returns `null`, so the pair is rejected rather than painted at runtime only.
 */
export function normalizeOpaqueHex(value: unknown): string | null {
  if (typeof value !== 'string' || !isHexColor(value)) return null;
  const hex = Color.toHex(value).toLowerCase();
  return OPAQUE_HEX.test(hex) ? hex : null;
}

function parsePair(value: unknown): PaperInkPair | null {
  if (!value || typeof value !== 'object') return null;
  const { paper, ink } = value as Partial<PaperInkPair>;
  const cleanPaper = normalizeOpaqueHex(paper);
  const cleanInk = normalizeOpaqueHex(ink);
  if (!cleanPaper || !cleanInk) return null;
  return { paper: cleanPaper, ink: cleanInk };
}

export function parsePaperInk(value: unknown): PaperInkState | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<PaperInkState>;
  const light = parsePair(raw.light);
  const dark = parsePair(raw.dark);
  if (!light || !dark) return null;
  return { light, dark, linked: raw.linked !== false };
}

export const BACKGROUND_MODES: Array<{ value: BackgroundMode; label: string }> = [
  { value: 'particles', label: 'Particles' },
  { value: 'grid', label: 'Grid' },
  { value: 'camera', label: 'Camera' },
  { value: 'custom', label: 'Custom' },
];

/**
 * Shown under Background → Custom. Each control writes a `--portfolio-background-*` variable that
 * defaults to `--theme-*`; the colours use the `--portfolio-*-color` names (R-T4a).
 */
export const BACKGROUND_CUSTOM_OPTIONS = [
  { id: 'primary', label: 'Primary', variable: '--portfolio-background-primary-color', kind: 'color' },
  { id: 'secondary', label: 'Secondary', variable: '--portfolio-background-secondary-color', kind: 'color' },
  { id: 'accent', label: 'Accent', variable: '--portfolio-background-accent-color', kind: 'color' },
  { id: 'image', label: 'Image', variable: '--portfolio-background-image', kind: 'text' },
  {
    id: 'repeat',
    label: 'Repeat',
    variable: '--portfolio-background-repeat',
    kind: 'choice',
    choices: ['no-repeat', 'repeat', 'repeat-x', 'repeat-y'],
  },
  {
    id: 'size',
    label: 'Size',
    variable: '--portfolio-background-size',
    kind: 'choice',
    choices: ['cover', 'contain', 'auto'],
  },
  {
    id: 'position',
    label: 'Position',
    variable: '--portfolio-background-position',
    kind: 'choice',
    choices: ['center', 'top', 'bottom', 'left', 'right'],
  },
  {
    id: 'attachment',
    label: 'Attachment',
    variable: '--portfolio-background-attachment',
    kind: 'choice',
    choices: ['fixed', 'scroll', 'local'],
  },
  {
    id: 'blend',
    label: 'Blend',
    variable: '--portfolio-background-blend-mode',
    kind: 'choice',
    choices: ['normal', 'multiply', 'screen', 'overlay'],
  },
] as const;

export type BackgroundOptionVariable = (typeof BACKGROUND_CUSTOM_OPTIONS)[number]['variable'];
/** Visitor overrides for Background → Custom, by CSS variable. Absent = the preset / theme default. */
export type BackgroundOptions = Partial<Record<BackgroundOptionVariable, string>>;

const BACKGROUND_OPTION_BY_VARIABLE = new Map<string, (typeof BACKGROUND_CUSTOM_OPTIONS)[number]>(
  BACKGROUND_CUSTOM_OPTIONS.map((option) => [option.variable, option])
);
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
/** Image values: CSS image functions only (url / gradients), no declarations or markup. */
const SAFE_IMAGE =
  /^(?:none|(?:url|linear-gradient|radial-gradient|conic-gradient|repeating-linear-gradient|repeating-radial-gradient)\([^;{}<>]*\)(?:\s*,\s*(?:url|linear-gradient|radial-gradient|conic-gradient|repeating-linear-gradient|repeating-radial-gradient)\([^;{}<>]*\))*)$/i;

/** One option value, validated for its control: hex for colors, a listed choice, an image function. */
export function sanitizeBackgroundOption(variable: string, value: unknown): string | null {
  const option = BACKGROUND_OPTION_BY_VARIABLE.get(variable);
  if (!option || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  switch (option.kind) {
    case 'color':
      return HEX_COLOR.test(trimmed) ? Color.toHex(trimmed) : null;
    case 'choice':
      return (option.choices as readonly string[]).includes(trimmed) ? trimmed : null;
    case 'text':
      return trimmed.length <= 600 && SAFE_IMAGE.test(trimmed) ? trimmed : null;
    default:
      return null;
  }
}

/**
 * Old option keys stored before the colour rename (`--portfolio-background-primary` …) → their
 * `--portfolio-*-color` names. Persisted maps (`tgmc-background-options`, setups) may carry them.
 */
export const LEGACY_BACKGROUND_OPTION_KEYS: Readonly<Record<string, BackgroundOptionVariable>> = Object.freeze(
  Object.fromEntries(
    BACKGROUND_CUSTOM_OPTIONS.flatMap((option) =>
      Object.entries(PORTFOLIO_COLOR_RENAMES)
        .filter(([, next]) => next === option.variable)
        .map(([old]) => [old, option.variable])
    )
  )
);

/** Whether a stored options map still uses an old (pre-rename) key. */
export function hasLegacyBackgroundOptionKeys(value: unknown): boolean {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    Object.keys(value as object).some((key) => key in LEGACY_BACKGROUND_OPTION_KEYS)
  );
}

/**
 * Keep only known variables with valid values. Old keys migrate to their new names: a valid new
 * value wins; otherwise a valid old value is kept under the new name.
 */
export function sanitizeBackgroundOptions(value: unknown): BackgroundOptions {
  if (!value || typeof value !== 'object') return {};
  const out: BackgroundOptions = {};
  const entries = Object.entries(value as Record<string, unknown>);
  for (const [variable, raw] of entries) {
    const clean = sanitizeBackgroundOption(variable, raw);
    if (clean) out[variable as BackgroundOptionVariable] = clean;
  }
  for (const [key, raw] of entries) {
    const variable = LEGACY_BACKGROUND_OPTION_KEYS[key];
    if (!variable || out[variable]) continue;
    const clean = sanitizeBackgroundOption(variable, raw);
    if (clean) out[variable] = clean;
  }
  return out;
}

/** Set (or clear, with an empty value) one option. */
export function withBackgroundOption(
  options: BackgroundOptions,
  variable: BackgroundOptionVariable,
  value: string | null | undefined
): BackgroundOptions {
  const rest = Object.fromEntries(Object.entries(options).filter(([key]) => key !== variable)) as BackgroundOptions;
  const clean = sanitizeBackgroundOption(variable, value ?? '');
  return clean ? { ...rest, [variable]: clean } : rest;
}

/** Hand each changed option (value, or `null` when cleared) to `set` — the picker emits whole maps. */
export function applyBackgroundOptionChanges(
  previous: BackgroundOptions,
  next: BackgroundOptions,
  set: (variable: BackgroundOptionVariable, value: string | null) => void
): void {
  for (const option of BACKGROUND_CUSTOM_OPTIONS) {
    const before = previous[option.variable] ?? null;
    const after = next[option.variable] ?? null;
    if (before !== after) set(option.variable, after);
  }
}

export const DEFAULT_BACKGROUND_MODE: BackgroundMode = 'particles';

/** Warm paper / ink surfaces — theme `themeColors` SoT via {@link PORTFOLIO_IVORY_HEX}. */
export const PORTFOLIO_IVORY = PORTFOLIO_IVORY_HEX;
/** @see PORTFOLIO_INK_HEX */
export const PORTFOLIO_INK = PORTFOLIO_INK_HEX;

/** Default solid fill when Background → Custom is selected (theme dark main background). */
export const DEFAULT_BACKGROUND_CUSTOM = PORTFOLIO_INK;

/** Persisted brand roles — hex as-is for the active mode; locks mark user overrides. */
export type BrandRolesState = {
  primary: string;
  secondary: string;
  accent: string;
  secondaryLocked?: boolean;
  accentLocked?: boolean;
};

export type BrandPackId = string;
export type BrandPackKind = 'palette' | 'color';

export type BrandPack = {
  id: BrandPackId;
  kind: BrandPackKind;
  label: string;
  /** Chip swatch. Palettes use the first swatch; single colors use the dark hex. */
  color: string;
  swatches: string[];
  primary: { light: string; dark: string };
  secondary: { light: string; dark: string };
  accent: { light: string; dark: string };
  /** Extra collection swatches, painted as a clipped gradient. Null for triads and single colors. */
  background: StudioPresetBackground | null;
};

/**
 * Studio list from {@link Theme.presets} (`theme-presets.json`).
 * Collections keep every swatch. Single colors already carry harmony secondary and accent.
 */
export const BRAND_PACKS: BrandPack[] = Theme.presets().map((preset) => ({
  id: preset.id,
  kind: preset.kind === 'collection' ? 'palette' : 'color',
  label: preset.label,
  color: preset.primary.dark,
  swatches: preset.swatches,
  primary: preset.primary,
  secondary: preset.secondary,
  accent: preset.accent,
  background: preset.background,
}));

/** No pack is selected until the visitor picks one. */
export const DEFAULT_ACCENT_ID: AccentId | null = null;

export const DEFAULT_ACCENT_COLOR = Color.toHex(themeColors.dark.primary);

export function isHexColor(value: string): boolean {
  return Color.isValid(value);
}

/** Resolve primary → secondary (analogous) + accent (complementary), honoring override locks. */
export function resolveBrandRolesState(
  primary: string,
  overrides?: Partial<Pick<BrandRolesState, 'secondary' | 'accent' | 'secondaryLocked' | 'accentLocked'>>
): BrandRolesState {
  const resolved = Color.resolveBrandRoles(primary, {
    secondary: overrides?.secondaryLocked ? overrides.secondary : undefined,
    accent: overrides?.accentLocked ? overrides.accent : undefined,
  });
  return {
    primary: resolved.primary,
    secondary: resolved.secondary,
    accent: resolved.accent,
    secondaryLocked: Boolean(overrides?.secondaryLocked),
    accentLocked: Boolean(overrides?.accentLocked),
  };
}

/** Default brand roles from theme role tokens. Accent stays harmony-derived; secondary keeps the theme hex. */
export function defaultBrandRoles(mode: ThemeResolvedMode = 'dark'): BrandRolesState {
  const roles = mode === 'light' ? themeColors.light : themeColors.dark;
  return resolveBrandRolesState(roles.primary, {
    secondary: roles.secondary,
    secondaryLocked: true,
  });
}

/**
 * Palette packs apply the first three swatches. Single colors use the light or dark hex for `mode`
 * and derive secondary and accent from that primary.
 */
export function brandRolesFromPack(packId: BrandPackId, mode: ThemeResolvedMode = 'dark'): BrandRolesState {
  const preset = Theme.preset(packId);
  if (!preset) return defaultBrandRoles(mode);
  const primary = mode === 'light' ? preset.primary.light : preset.primary.dark;
  const secondary = mode === 'light' ? preset.secondary.light : preset.secondary.dark;
  const accent = mode === 'light' ? preset.accent.light : preset.accent.dark;
  return {
    primary,
    secondary,
    accent,
    secondaryLocked: true,
    accentLocked: true,
  };
}

/**
 * Changing primary clears locks and re-derives secondary + accent.
 */
export function withPrimary(roles: BrandRolesState, primary: string): BrandRolesState {
  return resolveBrandRolesState(primary);
}

/** User override of secondary — locks until primary changes or reset. */
export function withSecondary(roles: BrandRolesState, secondary: string): BrandRolesState {
  return resolveBrandRolesState(roles.primary, {
    secondary,
    accent: roles.accent,
    secondaryLocked: true,
    accentLocked: roles.accentLocked,
  });
}

/**
 * "Derive from primary" switch for secondary / accent.
 * `derive: true` unlocks the role and re-derives it from the primary; `false` locks its current value.
 */
export function withDerivedRole(
  roles: BrandRolesState,
  role: 'secondary' | 'accent',
  derive: boolean
): BrandRolesState {
  const secondaryLocked = role === 'secondary' ? !derive : roles.secondaryLocked;
  const accentLocked = role === 'accent' ? !derive : roles.accentLocked;
  return resolveBrandRolesState(roles.primary, {
    secondary: roles.secondary,
    accent: roles.accent,
    secondaryLocked,
    accentLocked,
  });
}

/** User override of accent — locks until primary changes or reset. */
export function withAccent(roles: BrandRolesState, accent: string): BrandRolesState {
  return resolveBrandRolesState(roles.primary, {
    secondary: roles.secondary,
    accent,
    secondaryLocked: roles.secondaryLocked,
    accentLocked: true,
  });
}

/**
 * Portfolio role variables a preset overrides (colours: `--portfolio-*-color`; images keep their
 * names). Cleared when no preset is selected so `--theme-*` defaults return.
 */
export const PRESET_BACKGROUND_KEYS = [
  '--portfolio-primary-color',
  '--portfolio-secondary-color',
  '--portfolio-accent-color',
  '--portfolio-background-primary-color',
  '--portfolio-background-secondary-color',
  '--portfolio-background-accent-color',
  '--portfolio-background-image',
  '--portfolio-primary-light-color',
  '--portfolio-primary-dark-color',
  '--portfolio-secondary-light-color',
  '--portfolio-secondary-dark-color',
  '--portfolio-accent-light-color',
  '--portfolio-accent-dark-color',
  '--portfolio-background-primary-light-color',
  '--portfolio-background-primary-dark-color',
  '--portfolio-background-secondary-light-color',
  '--portfolio-background-secondary-dark-color',
  '--portfolio-background-accent-light-color',
  '--portfolio-background-accent-dark-color',
  '--portfolio-background-image-light',
  '--portfolio-background-image-dark',
] as const;

export function isAccent(value: string | null): value is BrandPackId {
  return BRAND_PACKS.some((preset) => preset.id === value);
}

export function isStyleSetupMode(value: unknown): value is StyleSetupMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function isMotion(value: string | null): value is MotionPreference {
  return value === 'system' || value === 'playful' || value === 'reduced';
}

export function isBackgroundMode(value: string | null): value is BackgroundMode {
  return value === 'particles' || value === 'grid' || value === 'camera' || value === 'custom';
}

export function resolveBackgroundMode(value: string | null): BackgroundMode {
  return isBackgroundMode(value) ? value : DEFAULT_BACKGROUND_MODE;
}

/** Resolve stored custom background color; invalid/missing → default ink. */
export function resolveBackgroundCustom(value: string | null): string {
  if (!value || !isHexColor(value)) {
    return DEFAULT_BACKGROUND_CUSTOM;
  }
  return Color.toHex(value);
}

/**
 * The custom colour for `mode`. Never picked (still {@link DEFAULT_BACKGROUND_CUSTOM}, the dark
 * paper) → that mode's paper, so light mode does not start on its own ink.
 */
export function backgroundCustomFor(custom: string, paperInk: PaperInkState, mode: 'light' | 'dark'): string {
  const hex = resolveBackgroundCustom(custom);
  return hex.toLowerCase() === DEFAULT_BACKGROUND_CUSTOM.toLowerCase() ? paperInk[mode].paper : hex;
}

/**
 * The custom fill as painted for `mode`: page text sits on it, so only its lightness moves until
 * that mode's ink reads (theme `backgroundFor`, ≥ 4.5:1, kept in the lightness band). The paper
 * itself is a ground and is painted as-is. The stored choice is unchanged.
 */
export function paintedBackgroundCustom(doc: PreferenceDocument, mode: 'light' | 'dark'): string {
  const { paper, ink } = doc.paperInk[mode];
  const custom = backgroundCustomFor(doc.backgroundCustom, doc.paperInk, mode);
  return custom === paper ? paper : backgroundFor(custom, ink);
}

/** CSS custom property applied when background mode is `custom`. */
export const BACKGROUND_CUSTOM_CSS_VAR = '--portfolio-depth-custom-color';

/** Known pack or color id, or `null` for missing and legacy ember/crimson values. */
export function resolveAccentId(value: string | null): BrandPackId | null {
  return isAccent(value) ? value : null;
}

/** Validate a stored brand-roles object (primary required; locks preserved). */
export function parseBrandRoles(value: unknown): BrandRolesState | null {
  if (!value || typeof value !== 'object') return null;
  const parsed = value as Partial<BrandRolesState>;
  if (typeof parsed.primary !== 'string' || !isHexColor(parsed.primary)) return null;
  return resolveBrandRolesState(parsed.primary, {
    secondary: parsed.secondary,
    accent: parsed.accent,
    secondaryLocked: Boolean(parsed.secondaryLocked),
    accentLocked: Boolean(parsed.accentLocked),
  });
}

/** Swatch catalog for Personalize (theme Color API). */
export function brandSwatchCatalog() {
  return Color.brandSwatchCatalog();
}

export type { ResolvedBrandRoles };
