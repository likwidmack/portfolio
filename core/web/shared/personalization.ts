import { pickContrastingInk } from '@tgmc/theme';

export type MotionPreference = 'system' | 'playful' | 'reduced';
export type AccentId = 'coral' | 'cobalt' | 'teal' | 'violet' | 'amber';

export const ACCENT_KEY = 'tgmc-accent';
export const MOTION_KEY = 'tgmc-motion';

/** Single source of truth for accent ids → hex (FOUC script, CSS fallbacks, UI chips). */
export const ACCENT_PRESETS: Array<{ id: AccentId; label: string; color: string }> = [
  { id: 'coral', label: 'Coral', color: '#ff6b5e' },
  { id: 'cobalt', label: 'Cobalt', color: '#3467eb' },
  { id: 'teal', label: 'Teal', color: '#008577' },
  { id: 'violet', label: 'Violet', color: '#8656d9' },
  { id: 'amber', label: 'Amber', color: '#b45309' },
];

export const DEFAULT_ACCENT_ID: AccentId = 'coral';
export const DEFAULT_ACCENT_COLOR =
  ACCENT_PRESETS.find((preset) => preset.id === DEFAULT_ACCENT_ID)?.color ?? '#ff6b5e';

/** Ivory / ink brand surfaces — keep in sync with theme light background / dark text. */
export const PORTFOLIO_IVORY = '#f7f1e7';
export const PORTFOLIO_INK = '#141312';

/**
 * Inline FOUC guard: theme mode + accent CSS vars + motion before first paint.
 * Built from {@link ACCENT_PRESETS} so hex values are not hand-copied into app-prop.
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

export function buildAccentTokens(next: AccentId): Record<string, string> {
  const preset = ACCENT_PRESETS.find((item) => item.id === next) ?? ACCENT_PRESETS[0]!;
  const ink = pickContrastingInk({ backgroundColor: preset.color });
  return {
    '--primary-color': preset.color,
    '--secondary-color': preset.color,
    '--accent-color': preset.color,
    '--focus-ring': preset.color,
    '--button-fg': ink,
  };
}

export function loadPersonalization(storage: Pick<Storage, 'getItem'>): {
  accent: AccentId;
  motion: MotionPreference;
} {
  const accent = storage.getItem(ACCENT_KEY);
  const motion = storage.getItem(MOTION_KEY);
  return {
    accent: isAccent(accent) ? accent : DEFAULT_ACCENT_ID,
    motion: isMotion(motion) ? motion : 'system',
  };
}

export function resetPersonalization(storage: Pick<Storage, 'removeItem'>): void {
  storage.removeItem(ACCENT_KEY);
  storage.removeItem(MOTION_KEY);
}
