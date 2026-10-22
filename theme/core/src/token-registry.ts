import { normalizeColorName, normalizeColorNames } from './color-rename.js';
import {
  applyFoundationBridge,
  applyPrimeVueBridge,
  applyThemeVariables,
  clearPrimeVueBridge,
  removeThemeVariables,
} from './set-theme-variable.js';
import { getInlineTokensForMode, isModeVariationName } from './tokens.js';

/** CSS custom-property map (keys with or without `--` prefix). */
export type ThemeTokenMap = Record<string, string>;

export type ThemeBridgeOptions = {
  /** Also write Foundation bridge custom properties. */
  foundation?: boolean;
  /** Also write PrimeVue bridge custom properties. */
  primevue?: boolean;
  /** Skip writing to `document` (update in-memory registry only). */
  dryRun?: boolean;
};

export type ThemeTokenChange = {
  /** Full token snapshot after the update. */
  tokens: Readonly<ThemeTokenMap>;
  /** Only keys changed in this update (normalized with `--`). */
  patch: Readonly<ThemeTokenMap>;
  /** Who triggered the update (`'api'`, a source id, etc.). */
  source: string;
};

export type ThemeTokenListener = (change: ThemeTokenChange) => void;

export type ThemeTokenSource = {
  id: string;
  /** Sync or async token provider. Return a partial map to merge. */
  load: () => ThemeTokenMap | Promise<ThemeTokenMap>;
};

function normalizeTokenName(property: string): string {
  return property.startsWith('--') ? property : `--${property}`;
}

/**
 * Normalize keys to `--name` and move each old colour name to its `--theme-…-color` name
 * (backward-compatible input, R-T8c): a raw `updateTokens({ '--primary-color': … })` writes
 * `--theme-primary-color` with the same value and never the old name, which the stylesheet no
 * longer declares. A new name the patch sets explicitly wins; retired names are dropped.
 */
function normalizeTokenMap(variables: ThemeTokenMap): ThemeTokenMap {
  const normalized: ThemeTokenMap = {};
  for (const [key, value] of Object.entries(variables)) {
    if (value == null) continue;
    normalized[normalizeTokenName(key)] = String(value);
  }
  return normalizeColorNames(normalized);
}

/** One key, `--`-prefixed and moved to its new colour name (`null` for a retired name). */
function normalizeKey(name: string): string | null {
  return normalizeColorName(normalizeTokenName(name));
}

// Mirrors what is inline on `:root`: nothing colour-related until a writer runs (R-T3d).
const state: ThemeTokenMap = { ...getInlineTokensForMode('dark') };
const listeners = new Set<ThemeTokenListener>();
const sources = new Map<string, ThemeTokenSource>();

function notify(patch: ThemeTokenMap, source: string): void {
  if (listeners.size === 0) return;
  const change: ThemeTokenChange = {
    tokens: getTokens(),
    patch,
    source,
  };
  for (const listener of listeners) {
    listener(change);
  }
}

function writeTokens(patch: ThemeTokenMap, options: ThemeBridgeOptions): void {
  if (options.dryRun) return;
  applyThemeVariables(patch);
  if (options.foundation) {
    applyFoundationBridge(patch);
  }
  if (options.primevue) {
    applyPrimeVueBridge(patch);
  }
}

/** Snapshot of the current in-memory token map. */
export function getTokens(): Readonly<ThemeTokenMap> {
  return { ...state };
}

/** Read one token (accepts name with or without `--`; an old colour name reads its new name). */
export function getToken(name: string): string | undefined {
  const key = normalizeKey(name);
  return key === null ? undefined : state[key];
}

/**
 * Merge token updates from a third party (or the host app).
 * Writes CSS variables on `:root` unless `dryRun` is set, then notifies subscribers.
 */
export function updateTokens(
  patch: ThemeTokenMap,
  options: ThemeBridgeOptions & { source?: string } = {}
): Readonly<ThemeTokenMap> {
  const normalized = normalizeTokenMap(patch);
  Object.assign(state, normalized);
  writeTokens(normalized, options);
  notify(normalized, options.source ?? 'api');
  return getTokens();
}

/**
 * Replace the entire token map (still merges onto a fresh object). The per-mode colour map
 * (`isModeVariationName`: `--theme-…-{light,dark}{,-background}-color`) is kept unless the new map
 * sets it: the runtime writes it once for both modes and a mode switch must not wipe it (Task 3
 * fix round 1). Use {@link removeTokens} to drop those names.
 */
export function setTokens(
  tokens: ThemeTokenMap,
  options: ThemeBridgeOptions & { source?: string } = {}
): Readonly<ThemeTokenMap> {
  const normalized = normalizeTokenMap(tokens);
  const kept = Object.fromEntries(
    Object.entries(state).filter(([key]) => isModeVariationName(key) && !(key in normalized))
  );
  const removed = Object.keys(state).filter((key) => !(key in normalized) && !(key in kept));
  for (const key of Object.keys(state)) {
    delete state[key];
  }
  Object.assign(state, kept, normalized);
  if (!options.dryRun) {
    if (removed.length > 0) {
      removeThemeVariables(removed);
    }
    // Rebuild PrimeVue bridge from a cleared baseline so absent source keys
    // cannot leave stale `--p-*` inline overrides in the DOM.
    if (options.primevue) {
      clearPrimeVueBridge();
    }
  }
  writeTokens(normalized, options);
  notify(normalized, options.source ?? 'api');
  return getTokens();
}

/**
 * Remove tokens from the registry and from `:root` inline styles (keeps the registry and the DOM in
 * sync — e.g. core/web clearing its colour map when the visitor returns to the defaults).
 */
export function removeTokens(
  names: readonly string[],
  options: ThemeBridgeOptions & { source?: string } = {}
): Readonly<ThemeTokenMap> {
  const normalized = names.map(normalizeKey).filter((key): key is string => key !== null);
  for (const key of normalized) delete state[key];
  if (!options.dryRun) removeThemeVariables(normalized);
  notify({}, options.source ?? 'api:remove');
  return getTokens();
}

/**
 * Reset registry to package defaults and re-apply to the DOM (no mode colour is pinned — R-T3d).
 * The runtime per-mode colour map is kept (see {@link setTokens}).
 */
export function resetTokens(options: ThemeBridgeOptions = {}): Readonly<ThemeTokenMap> {
  return setTokens({ ...getInlineTokensForMode('dark') } as ThemeTokenMap, { ...options, source: 'reset' });
}

/**
 * Subscribe to token updates. Returns an unsubscribe function.
 * Useful for third-party widgets that need to react when the host (or another pack) changes tokens.
 */
export function subscribeTokens(listener: ThemeTokenListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Register a named third-party token source.
 * Call `applyTokenSource(id)` or `applyAllTokenSources()` to load and apply.
 */
export function registerTokenSource(source: ThemeTokenSource): () => void {
  sources.set(source.id, source);
  return () => {
    sources.delete(source.id);
  };
}

/** Load one registered source and merge its tokens. */
export async function applyTokenSource(id: string, options: ThemeBridgeOptions = {}): Promise<Readonly<ThemeTokenMap>> {
  const source = sources.get(id);
  if (!source) {
    throw new Error(`Unknown theme token source: ${id}`);
  }
  const patch = await source.load();
  return updateTokens(patch, { ...options, source: id });
}

/** Load every registered source in registration order and merge. */
export async function applyAllTokenSources(options: ThemeBridgeOptions = {}): Promise<Readonly<ThemeTokenMap>> {
  for (const source of sources.values()) {
    const patch = await source.load();
    updateTokens(patch, { ...options, source: source.id });
  }
  return getTokens();
}

/**
 * Helper for third-party packs: define a source object with a stable id.
 *
 * @example
 * ```ts
 * import { defineTokenPack, registerTokenSource, applyTokenSource } from '@tgmc/theme/tokens';
 *
 * const brand = defineTokenPack('acme-brand', () => ({
 *   '--theme-primary-color': '#0a7',
 *   '--theme-accent-color': '#f90',
 * }));
 * registerTokenSource(brand);
 * await applyTokenSource('acme-brand', { primevue: true });
 * ```
 */
export function defineTokenPack(id: string, load: ThemeTokenSource['load']): ThemeTokenSource {
  return { id, load };
}

/** Convenience: set a single token through the registry. */
export function updateToken(name: string, value: string, options: ThemeBridgeOptions & { source?: string } = {}): void {
  updateTokens({ [name]: value }, options);
}
