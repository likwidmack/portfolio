import { setTokens, type ThemeBridgeOptions, type ThemeTokenMap } from './token-registry.js';
import { getCssVariablesForMode } from './tokens.js';

export type ThemeModePreference = 'light' | 'dark' | 'system';
export type ThemeResolvedMode = 'light' | 'dark';

export type ThemeModeChange = {
  preference: ThemeModePreference;
  resolved: ThemeResolvedMode;
  tokens: Readonly<ThemeTokenMap>;
};

export type ThemeModeListener = (change: ThemeModeChange) => void;

export type InitThemeModeOptions = ThemeBridgeOptions & {
  /** Initial preference when storage is empty. */
  preference?: ThemeModePreference;
  /** localStorage key for explicit light/dark; `system` clears it. */
  storageKey?: string;
  /** When true, re-apply on `prefers-color-scheme` changes while preference is `system`. */
  listenToSystem?: boolean;
};

const STORAGE_KEY_DEFAULT = 'tgmc-theme-mode';
const MEDIA_QUERY = '(prefers-color-scheme: dark)';

let preference: ThemeModePreference = 'system';
let resolved: ThemeResolvedMode = 'dark';
let bridges: ThemeBridgeOptions = { primevue: true, foundation: true };
let storageKey = STORAGE_KEY_DEFAULT;
let mediaQueryList: MediaQueryList | null = null;
let mediaListener: ((event: MediaQueryListEvent) => void) | null = null;
const listeners = new Set<ThemeModeListener>();

function isBrowser(): boolean {
  return typeof document !== 'undefined' && typeof window !== 'undefined';
}

function readStoredPreference(key: string): ThemeModePreference | null {
  if (!isBrowser()) return null;
  try {
    const value = window.localStorage.getItem(key);
    if (value === 'light' || value === 'dark' || value === 'system') {
      return value;
    }
  } catch {
    // Ignore storage access failures (private mode, SSR polyfills).
  }
  return null;
}

function writeStoredPreference(key: string, next: ThemeModePreference): void {
  if (!isBrowser()) return;
  try {
    if (next === 'system') {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, next);
    }
  } catch {
    // Ignore storage write failures.
  }
}

/** Resolve a preference against the current OS color scheme. */
export function resolveThemeMode(next: ThemeModePreference, isSystemDark = getSystemPrefersDark()): ThemeResolvedMode {
  if (next === 'light' || next === 'dark') {
    return next;
  }
  return isSystemDark ? 'dark' : 'light';
}

/** Whether the OS currently prefers dark color scheme. */
export function getSystemPrefersDark(): boolean {
  if (!isBrowser() || typeof window.matchMedia !== 'function') {
    return true;
  }
  return window.matchMedia(MEDIA_QUERY).matches;
}

function applyDomSignals(mode: ThemeResolvedMode): void {
  if (!isBrowser()) return;
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.style.colorScheme = mode;
  root.classList.toggle('p-dark', mode === 'dark');
}

function notify(change: ThemeModeChange): void {
  for (const listener of listeners) {
    listener(change);
  }
}

function applyResolvedMode(nextResolved: ThemeResolvedMode, source = 'color-mode'): ThemeModeChange {
  resolved = nextResolved;
  const tokens = setTokens(getCssVariablesForMode(nextResolved), {
    ...bridges,
    source,
  });
  applyDomSignals(nextResolved);
  const change: ThemeModeChange = {
    preference,
    resolved: nextResolved,
    tokens,
  };
  notify(change);
  return change;
}

function onSystemSchemeChange(event: MediaQueryListEvent): void {
  if (preference !== 'system') return;
  applyResolvedMode(event.matches ? 'dark' : 'light', 'color-mode:system');
}

function bindSystemListener(): void {
  if (!isBrowser() || typeof window.matchMedia !== 'function') return;
  unbindSystemListener();
  mediaQueryList = window.matchMedia(MEDIA_QUERY);
  mediaListener = onSystemSchemeChange;
  mediaQueryList.addEventListener('change', mediaListener);
}

function unbindSystemListener(): void {
  if (mediaQueryList && mediaListener) {
    mediaQueryList.removeEventListener('change', mediaListener);
  }
  mediaQueryList = null;
  mediaListener = null;
}

/** Current mode preference (`light` | `dark` | `system`). */
export function getThemeMode(): ThemeModePreference {
  return preference;
}

/** Currently applied resolved mode (`light` | `dark`). */
export function getResolvedThemeMode(): ThemeResolvedMode {
  return resolved;
}

/**
 * Set the mode preference, persist when explicit, apply tokens + DOM signals.
 * Pass `system` to follow OS preference and clear storage override.
 */
export function setThemeMode(
  next: ThemeModePreference,
  options: ThemeBridgeOptions & { persist?: boolean } = {}
): ThemeModeChange {
  preference = next;
  if (options.primevue !== undefined || options.foundation !== undefined || options.dryRun !== undefined) {
    bridges = {
      ...bridges,
      ...(options.primevue !== undefined ? { primevue: options.primevue } : {}),
      ...(options.foundation !== undefined ? { foundation: options.foundation } : {}),
      ...(options.dryRun !== undefined ? { dryRun: options.dryRun } : {}),
    };
  }
  if (options.persist !== false) {
    writeStoredPreference(storageKey, next);
  }
  return applyResolvedMode(resolveThemeMode(next), 'color-mode');
}

/** Subscribe to mode changes (preference or OS scheme). Returns unsubscribe. */
export function subscribeThemeMode(listener: ThemeModeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Initialize unified color mode: restore preference, apply token maps + bridges,
 * set `data-theme` / `p-dark` / `color-scheme`, and optionally listen to OS scheme.
 */
export function initThemeMode(options: InitThemeModeOptions = {}): ThemeModeChange {
  bridges = {
    primevue: options.primevue ?? true,
    foundation: options.foundation ?? true,
    dryRun: options.dryRun,
  };
  storageKey = options.storageKey ?? STORAGE_KEY_DEFAULT;

  const stored = readStoredPreference(storageKey);
  preference = stored ?? options.preference ?? 'system';

  if (options.listenToSystem !== false) {
    bindSystemListener();
  } else {
    unbindSystemListener();
  }

  return applyResolvedMode(resolveThemeMode(preference), 'color-mode:init');
}

/** Tear down the system media listener (tests / HMR). */
export function disposeThemeMode(): void {
  unbindSystemListener();
}
