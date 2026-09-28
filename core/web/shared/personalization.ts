/**
 * Portfolio personalization SoT — brand roles, FOUC script, motion, depth-field background,
 * and named style setups (Style Studio).
 *
 * Brand roles: primary pick auto-fills secondary (analogous) + accent (complementary) via
 * `Color.resolveBrandRoles`; overrides lock until primary changes. Storage: `tgmc-brand-roles`
 * (legacy `tgmc-accent` pack ids still migrate). Background: particles | grid | camera | custom
 * (+ `tgmc-background-custom` hex). Pen & paper neutrals: `tgmc-paper-ink` (paper = background, ink =
 * foreground, one pair per mode; `linked` keeps the other mode as the inverse). Named setups: `tgmc-style-setups` + `tgmc-style-setup-active`.
 * Docs: `docs/web/features/personalization.md`.
 */
import {
  Color,
  DEFAULT_PAPER_INK,
  invertPaperInk,
  ON_FILL_INK_DARK,
  ON_FILL_INK_LIGHT,
  pickContrastingInk,
  Theme,
  themeColors,
  type PaperInkPair,
  type ResolvedBrandRoles,
  type StudioPresetBackground,
} from '@tgmc/theme';

import { PORTFOLIO_INK_HEX, PORTFOLIO_IVORY_HEX } from './portfolio-chrome';

export type MotionPreference = 'system' | 'playful' | 'reduced';
/** Palette id or `color*` id from theme JSON. Legacy ember/crimson values are not packs. */
export type AccentId = string;
export type ThemeResolvedMode = 'light' | 'dark';
/** Depth-field backdrop: ambient particles, a scrolling 3D grid, live camera, or a solid custom color. */
export type BackgroundMode = 'particles' | 'grid' | 'camera' | 'custom';

export const ACCENT_KEY = 'tgmc-accent';
export const BRAND_ROLES_KEY = 'tgmc-brand-roles';
export const MOTION_KEY = 'tgmc-motion';
export const BACKGROUND_KEY = 'tgmc-background';
export const BACKGROUND_CUSTOM_KEY = 'tgmc-background-custom';
/** Named Style Studio setups (JSON array of {@link StyleSetup}). */
export const STYLE_SETUPS_KEY = 'tgmc-style-setups';
/** Active setup id after Apply / quick-apply (`null` when none). */
export const STYLE_SETUP_ACTIVE_KEY = 'tgmc-style-setup-active';
/** Pen & paper neutrals (JSON {@link PaperInkState}). */
export const PAPER_INK_KEY = 'tgmc-paper-ink';

/** Color-mode preference stored on a setup (matches theme package preference union). */
export type StyleSetupMode = 'system' | 'light' | 'dark';

/**
 * Named personalization snapshot — app-owned (not Theme.create packs).
 * Live prefs stay on flat keys for FOUC; setups are optional named copies.
 */
export type StyleSetup = {
  id: string;
  name: string;
  brandRoles: BrandRolesState;
  motion: MotionPreference;
  background: BackgroundMode;
  backgroundCustom?: string;
  mode?: StyleSetupMode;
  paperInk?: PaperInkState;
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

/** Set one mode's pair; when linked, the other mode becomes its inverse. */
export function withPaperInk(state: PaperInkState, mode: ThemeResolvedMode, pair: PaperInkPair): PaperInkState {
  const clean = { paper: pair.paper.toLowerCase(), ink: pair.ink.toLowerCase() };
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

/** `--paper` / `--ink` for the resolved mode (every neutral role derives from these in CSS). */
export function buildPaperInkTokens(state: PaperInkState, mode: ThemeResolvedMode): Record<string, string> {
  return { '--paper': state[mode].paper, '--ink': state[mode].ink };
}

function parsePair(value: unknown): PaperInkPair | null {
  if (!value || typeof value !== 'object') return null;
  const { paper, ink } = value as Partial<PaperInkPair>;
  if (!paper || !ink || !isHexColor(paper) || !isHexColor(ink)) return null;
  return { paper: paper.toLowerCase(), ink: ink.toLowerCase() };
}

export function parsePaperInk(value: unknown): PaperInkState | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<PaperInkState>;
  const light = parsePair(raw.light);
  const dark = parsePair(raw.dark);
  if (!light || !dark) return null;
  return { light, dark, linked: raw.linked !== false };
}

export function loadPaperInk(storage: Pick<Storage, 'getItem'>): PaperInkState {
  const raw = storage.getItem(PAPER_INK_KEY);
  if (!raw) return defaultPaperInk();
  try {
    return parsePaperInk(JSON.parse(raw)) ?? defaultPaperInk();
  } catch {
    return defaultPaperInk();
  }
}

/** Defaults are removed rather than stored, so CSS keeps owning the untouched case. */
export function persistPaperInk(storage: Pick<Storage, 'setItem' | 'removeItem'>, state: PaperInkState): void {
  if (isDefaultPaperInk(state)) storage.removeItem(PAPER_INK_KEY);
  else storage.setItem(PAPER_INK_KEY, JSON.stringify(state));
}

export const BACKGROUND_MODES: Array<{ value: BackgroundMode; label: string }> = [
  { value: 'particles', label: 'Particles' },
  { value: 'grid', label: 'Grid' },
  { value: 'camera', label: 'Camera' },
  { value: 'custom', label: 'Custom' },
];

/** Shown under Background → Custom. Each control writes a `--portfolio-background-*` variable that defaults to `--theme-*`. */
export const BACKGROUND_CUSTOM_OPTIONS = [
  { id: 'primary', label: 'Primary', variable: '--portfolio-background-primary', kind: 'color' },
  { id: 'secondary', label: 'Secondary', variable: '--portfolio-background-secondary', kind: 'color' },
  { id: 'accent', label: 'Accent', variable: '--portfolio-background-accent', kind: 'color' },
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

/** @deprecated Use {@link BRAND_PACKS}. */
export const ACCENT_PRESETS = BRAND_PACKS;

/** No pack is selected until the visitor picks one. */
export const DEFAULT_ACCENT_ID: AccentId | null = null;

export const DEFAULT_ACCENT_COLOR = Color.toHex(themeColors.dark.primary);

function isHexColor(value: string): boolean {
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

/** Portfolio role variables a preset overrides. Cleared when no preset is selected so `--theme-*` defaults return. */
export const PRESET_BACKGROUND_KEYS = [
  '--portfolio-primary',
  '--portfolio-secondary',
  '--portfolio-accent',
  '--portfolio-background-primary',
  '--portfolio-background-secondary',
  '--portfolio-background-accent',
  '--portfolio-background-image',
  '--portfolio-primary-light',
  '--portfolio-primary-dark',
  '--portfolio-secondary-light',
  '--portfolio-secondary-dark',
  '--portfolio-accent-light',
  '--portfolio-accent-dark',
  '--portfolio-background-primary-light',
  '--portfolio-background-primary-dark',
  '--portfolio-background-secondary-light',
  '--portfolio-background-secondary-dark',
  '--portfolio-background-accent-light',
  '--portfolio-background-accent-dark',
  '--portfolio-background-image-light',
  '--portfolio-background-image-dark',
] as const;

const AA_INK = 4.5;
const AA_SURFACE = 3;

/** Shift only this color's lightness until it reaches `min` contrast against `against`. */
function adjustForAa(color: string, against: string, min: number): string {
  const hex = Color.toHex(color);
  const base = Color.create(hex);
  let best = hex;
  let bestRatio = Color.contrastRatio(hex, against);
  if (bestRatio >= min) return hex;
  const againstL = Color.create(against).l;
  const directions: Array<1 | -1> = base.l <= againstL ? [1, -1] : [-1, 1];
  for (const direction of directions) {
    for (let step = 2; step <= 84; step += 2) {
      const lightness = Math.min(92, Math.max(8, base.l + direction * step));
      const candidate = Color.hslToHex(base.h, base.s, lightness);
      const ratio = Color.contrastRatio(candidate, against);
      if (ratio > bestRatio) {
        best = candidate;
        bestRatio = ratio;
      }
      if (ratio >= min) return candidate;
    }
  }
  return best;
}

function adjustImageForAa(image: string, ink: string): string {
  return image.replace(/#[0-9a-fA-F]{3,8}\b/g, (hex) => adjustForAa(hex, ink, AA_INK));
}

/**
 * Map a studio preset onto portfolio role and background variables for light and dark.
 * The brand triad is adjusted against that mode's paper. The background triad, and background image stops, are adjusted against that mode's ink.
 */
export function buildPresetBackgroundTokens(
  packId: string | null,
  roles: BrandRolesState,
  mode: ThemeResolvedMode = 'dark',
  paperInk: PaperInkState = defaultPaperInk()
): Record<string, string> {
  const preset = packId ? Theme.preset(packId) : undefined;
  if (!preset) return {};
  const tokens: Record<string, string> = {};
  for (const themeMode of ['light', 'dark'] as const) {
    const ink = paperInk[themeMode].ink;
    const paper = paperInk[themeMode].paper;
    const background = preset.backgroundRoles ?? {
      primary: preset.primary,
      secondary: preset.secondary,
      accent: preset.accent,
    };
    tokens[`--portfolio-primary-${themeMode}`] = adjustForAa(preset.primary[themeMode], paper, AA_SURFACE);
    tokens[`--portfolio-secondary-${themeMode}`] = adjustForAa(preset.secondary[themeMode], paper, AA_SURFACE);
    tokens[`--portfolio-accent-${themeMode}`] = adjustForAa(preset.accent[themeMode], paper, AA_SURFACE);
    tokens[`--portfolio-background-primary-${themeMode}`] = adjustForAa(background.primary[themeMode], ink, AA_INK);
    tokens[`--portfolio-background-secondary-${themeMode}`] = adjustForAa(background.secondary[themeMode], ink, AA_INK);
    tokens[`--portfolio-background-accent-${themeMode}`] = adjustForAa(background.accent[themeMode], ink, AA_INK);
    if (preset.background)
      tokens[`--portfolio-background-image-${themeMode}`] = adjustImageForAa(preset.background.image, ink);
  }
  tokens['--portfolio-primary'] = tokens[`--portfolio-primary-${mode}`] ?? roles.primary;
  tokens['--portfolio-secondary'] = tokens[`--portfolio-secondary-${mode}`] ?? roles.secondary;
  tokens['--portfolio-accent'] = tokens[`--portfolio-accent-${mode}`] ?? roles.accent;
  tokens['--portfolio-background-primary'] = tokens[`--portfolio-background-primary-${mode}`] ?? roles.primary;
  tokens['--portfolio-background-secondary'] = tokens[`--portfolio-background-secondary-${mode}`] ?? roles.secondary;
  tokens['--portfolio-background-accent'] = tokens[`--portfolio-background-accent-${mode}`] ?? roles.accent;
  const image = tokens[`--portfolio-background-image-${mode}`];
  if (image) tokens['--portfolio-background-image'] = image;
  return tokens;
}

/**
 * Brand CSS tokens from a fully resolved roles state.
 * Hexes apply as-is for the current mode (no opposite-mode lighten/darken).
 * `mode` is accepted so callers can re-apply on theme change without reshaping the API.
 * `--focus-ring` is intentionally not set: it stays on the theme's AA role so a low-contrast
 * brand pick can never hide keyboard focus.
 */
export function buildBrandTokens(roles: BrandRolesState, mode: ThemeResolvedMode = 'dark'): Record<string, string> {
  void mode;
  const primary = Color.toHex(roles.primary);
  const secondary = Color.toHex(roles.secondary);
  const accent = Color.toHex(roles.accent);
  const ink = pickContrastingInk({ backgroundColor: primary });
  return {
    '--primary-color': primary,
    '--secondary-color': secondary,
    '--accent-color': accent,
    '--button-fg': ink,
  };
}

/**
 * @deprecated Prefer {@link buildBrandTokens} with {@link brandRolesFromPack}.
 * Mode-aware brand tokens from a legacy accent pack id.
 */
export function buildAccentTokens(next: BrandPackId, mode: ThemeResolvedMode = 'dark'): Record<string, string> {
  return buildBrandTokens(brandRolesFromPack(next, mode), mode);
}

function serializeBrandRolesForFouc(roles: BrandRolesState): string {
  return JSON.stringify({
    primary: roles.primary,
    secondary: roles.secondary,
    accent: roles.accent,
  }).replace(/'/g, "\\'");
}

/**
 * Compact FOUC-only `--button-fg` picker matching `pickContrastingInk({ backgroundColor })`.
 * Embedded literals only — no runtime theme import inside `<head>` (KTD3).
 */
function buildFoucButtonFgHelper(): string {
  const light = ON_FILL_INK_LIGHT;
  const dark = ON_FILL_INK_DARK;
  return `function bf(p){function hx(s){var h=String(s||'').replace('#','');if(h.length===3)h=h.charAt(0)+h.charAt(0)+h.charAt(1)+h.charAt(1)+h.charAt(2)+h.charAt(2);if(h.length!==6)return null;var n=parseInt(h,16);if(isNaN(n))return null;return{r:(n>>16)&255,g:(n>>8)&255,b:n&255}}function L(c){c=c/255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)}function Y(rgb){return 0.2126*L(rgb.r)+0.7152*L(rgb.g)+0.0722*L(rgb.b)}function cr(a,b){var x=Y(a),y=Y(b);var hi=Math.max(x,y),lo=Math.min(x,y);return(hi+0.05)/(lo+0.05)}var bg=hx(p);if(!bg)return'${dark}';var li=hx('${light}'),di=hx('${dark}');if(!li||!di)return'${dark}';return cr(li,bg)>=cr(di,bg)?'${light}':'${dark}'}`;
}

/**
 * Inline FOUC guard: theme mode + brand role CSS vars + motion before first paint.
 * Reads `tgmc-brand-roles` JSON when present; else migrates legacy `tgmc-accent` pack ids.
 * Brand hexes and ink constants are embedded from theme `Color` / contrast at generation time.
 */
export function buildPersonalizationFoucScript(): string {
  const packMap = BRAND_PACKS.map((preset) => {
    const roles = brandRolesFromPack(preset.id, 'dark');
    return `${preset.id}:{primary:'${roles.primary}',secondary:'${roles.secondary}',accent:'${roles.accent}'}`;
  }).join(',');
  const defaults = defaultBrandRoles('dark');
  const defaultJson = serializeBrandRolesForFouc(defaults);
  const buttonFgHelper = buildFoucButtonFgHelper();
  return `(function(){try{${buttonFgHelper};var p=localStorage.getItem('tgmc-theme-mode');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var m=(p==='light'||p==='dark')?p:(d?'dark':'light');var r=document.documentElement;r.setAttribute('data-theme',m);r.style.colorScheme=m;r.classList.toggle('p-dark',m==='dark');var roles=null;var raw=localStorage.getItem('${BRAND_ROLES_KEY}');if(raw){try{roles=JSON.parse(raw);}catch(e){roles=null;}}if(!roles||!roles.primary){var a=localStorage.getItem('${ACCENT_KEY}');var packs={${packMap}};roles=packs[a]||${defaultJson};}r.style.setProperty('--primary-color',roles.primary);r.style.setProperty('--secondary-color',roles.secondary);r.style.setProperty('--accent-color',roles.accent);r.style.setProperty('--button-fg',bf(roles.primary));var pi=localStorage.getItem('${PAPER_INK_KEY}');if(pi){try{var pp=JSON.parse(pi)[m];if(pp&&pp.paper&&pp.ink){r.style.setProperty('--paper',pp.paper);r.style.setProperty('--ink',pp.ink);}}catch(e){}}var x=localStorage.getItem('${MOTION_KEY}');if(x==='system'||x==='playful'||x==='reduced')r.setAttribute('data-motion',x);}catch(e){}})();`;
}

export function isAccent(value: string | null): value is BrandPackId {
  return BRAND_PACKS.some((preset) => preset.id === value);
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

/** CSS custom property applied when background mode is `custom`. */
export const BACKGROUND_CUSTOM_CSS_VAR = '--portfolio-depth-custom';

/** Known pack or color id, or `null` for missing and legacy ember/crimson values. */
export function resolveAccentId(value: string | null): BrandPackId | null {
  return isAccent(value) ? value : null;
}

function parseBrandRolesJson(raw: string | null): BrandRolesState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<BrandRolesState>;
    if (!parsed.primary || !isHexColor(parsed.primary)) return null;
    return resolveBrandRolesState(parsed.primary, {
      secondary: parsed.secondary,
      accent: parsed.accent,
      secondaryLocked: Boolean(parsed.secondaryLocked),
      accentLocked: Boolean(parsed.accentLocked),
    });
  } catch {
    return null;
  }
}

export function loadBrandRoles(storage: Pick<Storage, 'getItem'>, mode: ThemeResolvedMode = 'dark'): BrandRolesState {
  const fromKey = parseBrandRolesJson(storage.getItem(BRAND_ROLES_KEY));
  if (fromKey) return fromKey;
  const legacy = storage.getItem(ACCENT_KEY);
  if (isAccent(legacy)) {
    return brandRolesFromPack(legacy, mode);
  }
  return defaultBrandRoles(mode);
}

export function persistBrandRoles(storage: Pick<Storage, 'setItem'>, roles: BrandRolesState): void {
  storage.setItem(
    BRAND_ROLES_KEY,
    JSON.stringify({
      primary: roles.primary,
      secondary: roles.secondary,
      accent: roles.accent,
      secondaryLocked: Boolean(roles.secondaryLocked),
      accentLocked: Boolean(roles.accentLocked),
    })
  );
}

export function loadPersonalization(storage: Pick<Storage, 'getItem'>): {
  accent: BrandPackId | null;
  brandRoles: BrandRolesState;
  motion: MotionPreference;
  background: BackgroundMode;
  backgroundCustom: string;
  paperInk: PaperInkState;
} {
  const accent = storage.getItem(ACCENT_KEY);
  const motion = storage.getItem(MOTION_KEY);
  const background = storage.getItem(BACKGROUND_KEY);
  const backgroundCustom = storage.getItem(BACKGROUND_CUSTOM_KEY);
  const brandRoles = loadBrandRoles(storage, 'dark');
  return {
    accent: resolveAccentId(accent),
    brandRoles,
    motion: isMotion(motion) ? motion : 'system',
    background: resolveBackgroundMode(background),
    backgroundCustom: resolveBackgroundCustom(backgroundCustom),
    paperInk: loadPaperInk(storage),
  };
}

export function resetPersonalization(storage: Pick<Storage, 'removeItem'>): void {
  storage.removeItem(ACCENT_KEY);
  storage.removeItem(BRAND_ROLES_KEY);
  storage.removeItem(MOTION_KEY);
  storage.removeItem(BACKGROUND_KEY);
  storage.removeItem(BACKGROUND_CUSTOM_KEY);
  storage.removeItem(STYLE_SETUPS_KEY);
  storage.removeItem(STYLE_SETUP_ACTIVE_KEY);
  storage.removeItem(PAPER_INK_KEY);
}

function isStyleSetupMode(value: unknown): value is StyleSetupMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

/** Stable id for a new setup (UUID when available). */
export function createStyleSetupId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `setup-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function parseStyleSetup(value: unknown): StyleSetup | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<StyleSetup>;
  if (typeof raw.id !== 'string' || !raw.id.trim()) return null;
  if (typeof raw.name !== 'string' || !raw.name.trim()) return null;
  if (!raw.brandRoles || typeof raw.brandRoles !== 'object') return null;
  const primary = raw.brandRoles.primary;
  if (!primary || !isHexColor(primary)) return null;
  const brandRoles = resolveBrandRolesState(primary, {
    secondary: raw.brandRoles.secondary,
    accent: raw.brandRoles.accent,
    secondaryLocked: Boolean(raw.brandRoles.secondaryLocked),
    accentLocked: Boolean(raw.brandRoles.accentLocked),
  });
  const motion = isMotion(typeof raw.motion === 'string' ? raw.motion : null) ? raw.motion : 'system';
  const background = resolveBackgroundMode(typeof raw.background === 'string' ? raw.background : null);
  const backgroundCustom =
    typeof raw.backgroundCustom === 'string' ? resolveBackgroundCustom(raw.backgroundCustom) : undefined;
  const mode = isStyleSetupMode(raw.mode) ? raw.mode : undefined;
  const paperInk = parsePaperInk(raw.paperInk);
  return {
    id: raw.id.trim(),
    name: raw.name.trim(),
    brandRoles,
    motion,
    background,
    ...(backgroundCustom ? { backgroundCustom } : {}),
    ...(mode ? { mode } : {}),
    ...(paperInk ? { paperInk } : {}),
  };
}

/** Load named setups; corrupt / missing JSON → empty list (live prefs untouched). */
export function loadStyleSetups(storage: Pick<Storage, 'getItem'>): StyleSetup[] {
  const raw = storage.getItem(STYLE_SETUPS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseStyleSetup).filter((item): item is StyleSetup => item != null);
  } catch {
    return [];
  }
}

export function persistStyleSetups(storage: Pick<Storage, 'setItem'>, setups: StyleSetup[]): void {
  storage.setItem(STYLE_SETUPS_KEY, JSON.stringify(setups));
}

export function loadActiveStyleSetupId(storage: Pick<Storage, 'getItem'>): string | null {
  const raw = storage.getItem(STYLE_SETUP_ACTIVE_KEY);
  if (!raw || !raw.trim()) return null;
  return raw.trim();
}

export function persistActiveStyleSetupId(storage: Pick<Storage, 'setItem' | 'removeItem'>, id: string | null): void {
  if (!id) {
    storage.removeItem(STYLE_SETUP_ACTIVE_KEY);
    return;
  }
  storage.setItem(STYLE_SETUP_ACTIVE_KEY, id);
}

/** Snapshot live personalization into a named setup (new id unless `id` provided). */
export function snapshotFromLive(input: {
  name: string;
  brandRoles: BrandRolesState;
  motion: MotionPreference;
  background: BackgroundMode;
  backgroundCustom?: string;
  mode?: StyleSetupMode;
  paperInk?: PaperInkState;
  id?: string;
}): StyleSetup {
  const paperInk = input.paperInk ? parsePaperInk(input.paperInk) : null;
  const backgroundCustom = input.backgroundCustom != null ? resolveBackgroundCustom(input.backgroundCustom) : undefined;
  return {
    id: input.id?.trim() || createStyleSetupId(),
    name: input.name.trim() || 'Untitled',
    brandRoles: resolveBrandRolesState(input.brandRoles.primary, {
      secondary: input.brandRoles.secondary,
      accent: input.brandRoles.accent,
      secondaryLocked: Boolean(input.brandRoles.secondaryLocked),
      accentLocked: Boolean(input.brandRoles.accentLocked),
    }),
    motion: isMotion(input.motion) ? input.motion : 'system',
    background: resolveBackgroundMode(input.background),
    ...(backgroundCustom ? { backgroundCustom } : {}),
    ...(isStyleSetupMode(input.mode) ? { mode: input.mode } : {}),
    ...(paperInk ? { paperInk } : {}),
  };
}

/** Insert or replace a setup by id. */
export function upsertStyleSetup(setups: StyleSetup[], setup: StyleSetup): StyleSetup[] {
  const next = parseStyleSetup(setup);
  if (!next) return setups;
  const index = setups.findIndex((item) => item.id === next.id);
  if (index < 0) return [...setups, next];
  const copy = setups.slice();
  copy[index] = next;
  return copy;
}

/** Re-inserts a deleted setup at its former position (Undo); no-op when the id is already present. */
export function restoreStyleSetup(setups: StyleSetup[], setup: StyleSetup, index: number): StyleSetup[] {
  if (setups.some((item) => item.id === setup.id)) return setups;
  const at = Math.max(0, Math.min(index, setups.length));
  return [...setups.slice(0, at), setup, ...setups.slice(at)];
}

/** Remove a setup by id. Returns `{ setups, clearedActive }` when the active id matched. */
export function deleteStyleSetup(
  setups: StyleSetup[],
  id: string,
  activeId: string | null = null
): { setups: StyleSetup[]; clearedActive: boolean } {
  const next = setups.filter((item) => item.id !== id);
  return {
    setups: next,
    clearedActive: Boolean(activeId && activeId === id),
  };
}

/**
 * Write a setup onto the flat live preference keys (FOUC-relevant).
 * Does not mutate the setups array — callers set active id separately.
 */
export function applyStyleSetup(
  storage: Pick<Storage, 'setItem' | 'removeItem'>,
  setup: StyleSetup
): {
  brandRoles: BrandRolesState;
  motion: MotionPreference;
  background: BackgroundMode;
  backgroundCustom: string;
  mode?: StyleSetupMode;
  paperInk: PaperInkState;
} {
  const parsed = parseStyleSetup(setup) ?? setup;
  // Setups saved before pen & paper carry no pair → defaults.
  const paperInk = parsed.paperInk ?? defaultPaperInk();
  persistPaperInk(storage, paperInk);
  persistBrandRoles(storage, parsed.brandRoles);
  storage.setItem(MOTION_KEY, parsed.motion);
  storage.setItem(BACKGROUND_KEY, parsed.background);
  const backgroundCustom = resolveBackgroundCustom(parsed.backgroundCustom ?? DEFAULT_BACKGROUND_CUSTOM);
  storage.setItem(BACKGROUND_CUSTOM_KEY, backgroundCustom);
  return {
    brandRoles: parsed.brandRoles,
    motion: parsed.motion,
    background: parsed.background,
    backgroundCustom,
    ...(parsed.mode ? { mode: parsed.mode } : {}),
    paperInk,
  };
}

/** Swatch catalog for Personalize (theme Color API). */
export function brandSwatchCatalog() {
  return Color.brandSwatchCatalog();
}

export type { ResolvedBrandRoles };
