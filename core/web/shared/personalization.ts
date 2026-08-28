import { pickContrastingInk } from '@tgmc/theme';

export type MotionPreference = 'system' | 'playful' | 'reduced';
export type AccentId = 'ember' | 'crimson';
export type ThemeResolvedMode = 'light' | 'dark';

export const ACCENT_KEY = 'tgmc-accent';
export const MOTION_KEY = 'tgmc-motion';

export type AccentPreset = {
  id: AccentId;
  label: string;
  /** Dark-mode primary hex — FOUC inline map + chip swatch. */
  color: string;
  primary: { light: string; dark: string };
  secondary: { light: string; dark: string };
};

/** Two warm families: ember (orange primary) and crimson (swap). */
export const ACCENT_PRESETS: AccentPreset[] = [
  {
    id: 'ember',
    label: 'Ember',
    color: '#FF6B35',
    primary: { light: '#D9531D', dark: '#FF6B35' },
    secondary: { light: '#6E1622', dark: '#8B1E2E' },
  },
  {
    id: 'crimson',
    label: 'Crimson',
    color: '#8B1E2E',
    primary: { light: '#6E1622', dark: '#8B1E2E' },
    secondary: { light: '#D9531D', dark: '#FF6B35' },
  },
];

export const DEFAULT_ACCENT_ID: AccentId = 'ember';
export const DEFAULT_ACCENT_COLOR =
  ACCENT_PRESETS.find((preset) => preset.id === DEFAULT_ACCENT_ID)?.color ?? '#FF6B35';

/** Warm paper / ink surfaces — keep in sync with theme light background / dark text. */
export const PORTFOLIO_IVORY = '#FAF6F3';
export const PORTFOLIO_INK = '#0f0908';

/**
 * Inline FOUC guard: theme mode + accent CSS vars + motion before first paint.
 * Built from {@link ACCENT_PRESETS} so hex values are not hand-copied into app-prop.
 * Map uses dark-mode primary hexes; `applyAccent` re-runs on theme change with mode-aware tokens.
 */
export function buildPersonalizationFoucScript(): string {
  const accentMap = ACCENT_PRESETS.map((preset) => `${preset.id}:'${preset.color}'`).join(',');
  return `(function(){try{var p=localStorage.getItem('tgmc-theme-mode');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var m=(p==='light'||p==='dark')?p:(d?'dark':'light');var r=document.documentElement;r.setAttribute('data-theme',m);r.style.colorScheme=m;r.classList.toggle('p-dark',m==='dark');var a=localStorage.getItem('${ACCENT_KEY}');var c={${accentMap}}[a]||'${DEFAULT_ACCENT_COLOR}';r.style.setProperty('--primary-color',c);r.style.setProperty('--accent-color',c);var x=localStorage.getItem('${MOTION_KEY}');if(x==='system'||x==='playful'||x==='reduced')r.setAttribute('data-motion',x);}catch(e){}})();`;
}

export function isAccent(value: string | null): value is AccentId {
  return ACCENT_PRESETS.some((preset) => preset.id === value);
}

export function isMotion(value: string | null): value is MotionPreference {
  return value === 'system' || value === 'playful' || value === 'reduced';
}

/**
 * Mode-aware brand tokens. Light uses darkened hexes for contrast on warm paper.
 * Unknown stored ids (`coral`, …) fall back via {@link resolveAccentId}.
 */
export function buildAccentTokens(next: AccentId, mode: ThemeResolvedMode = 'dark'): Record<string, string> {
  const preset = ACCENT_PRESETS.find((item) => item.id === next) ?? ACCENT_PRESETS[0]!;
  const primary = mode === 'light' ? preset.primary.light : preset.primary.dark;
  const secondary = mode === 'light' ? preset.secondary.light : preset.secondary.dark;
  const ink = pickContrastingInk({ backgroundColor: primary });
  return {
    '--primary-color': primary,
    '--secondary-color': secondary,
    '--accent-color': primary,
    '--focus-ring': primary,
    '--button-fg': ink,
  };
}

/** Map legacy / unknown stored accent ids to {@link DEFAULT_ACCENT_ID}. */
export function resolveAccentId(value: string | null): AccentId {
  return isAccent(value) ? value : DEFAULT_ACCENT_ID;
}

export function loadPersonalization(storage: Pick<Storage, 'getItem'>): {
  accent: AccentId;
  motion: MotionPreference;
} {
  const accent = storage.getItem(ACCENT_KEY);
  const motion = storage.getItem(MOTION_KEY);
  return {
    accent: resolveAccentId(accent),
    motion: isMotion(motion) ? motion : 'system',
  };
}

export function resetPersonalization(storage: Pick<Storage, 'removeItem'>): void {
  storage.removeItem(ACCENT_KEY);
  storage.removeItem(MOTION_KEY);
}
