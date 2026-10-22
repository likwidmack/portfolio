// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  COLOR_RENAME_MAP,
  isDevelopmentFor,
  normalizeColorName,
  normalizeColorNames,
  resetRetiredColorWarnings,
  retiredColorNames,
} from '../src/color-rename.js';
import { applyTheme, removeThemeVariables, setThemeVariable } from '../src/set-theme-variable.js';
import { Theme } from '../src/theme.js';
import {
  getToken,
  getTokens,
  removeTokens,
  setTokens,
  updateTokens,
  type ThemeTokenMap,
} from '../src/token-registry.js';

/**
 * Backward-compatible input (colour system Task 8, R-T8c). The public API speaks only the new
 * `--theme-…-color` names, but an old key passed IN (a third-party pack, `Theme.apply`, a raw
 * `updateTokens`, `getToken('--primary-color')`) is normalised old → new through
 * `src/color-rename-map.json` and never written: the stylesheet no longer declares the old names,
 * so an inline old name would paint nothing. The value is kept as is.
 */
const { renames } = COLOR_RENAME_MAP;
const oldNames = Object.keys(renames);
const inline = (name: string) => document.documentElement.style.getPropertyValue(name);
const oldInline = () => oldNames.filter((name) => inline(name) !== '');

describe('normalizeColorNames', () => {
  it('maps every old key to its new name with the same value, and keeps other keys', () => {
    const patch = Object.fromEntries(oldNames.map((name, i) => [name, `#${String(i).padStart(6, '0')}`]));
    const out = normalizeColorNames({ ...patch, '--space-4': '1rem', '--primary-default': '#abcdef' });
    expect(Object.keys(out).filter((k) => k in renames)).toEqual([]);
    for (const [old, value] of Object.entries(patch)) {
      // Several old keys can share one new name (`--border-strong` / `--form-border-color`): one of
      // their values wins, and it is always one of the values passed in.
      const sharing = oldNames.filter((o) => renames[o] === renames[old]).map((o) => patch[o]);
      expect(sharing, old).toContain(out[renames[old]!]);
      if (sharing.length === 1) expect(out[renames[old]!], old).toBe(value);
    }
    expect(out['--space-4']).toBe('1rem');
    expect(out['--primary-default']).toBe('#abcdef');
  });

  it('a new name set explicitly in the same patch wins over a normalised old key', () => {
    expect(normalizeColorNames({ '--accent-color': '#111111', '--theme-accent-color': '#222222' })).toEqual({
      '--theme-accent-color': '#222222',
    });
    expect(normalizeColorNames({ '--theme-accent-color': '#222222', '--accent-color': '#111111' })).toEqual({
      '--theme-accent-color': '#222222',
    });
  });

  it('drops retired names (no replacement) instead of writing them', () => {
    const retired = retiredColorNames();
    expect(retired.length).toBeGreaterThan(0);
    expect(normalizeColorNames(Object.fromEntries(retired.map((name) => [name, '#123456'])))).toEqual({});
  });

  it('normalizeColorName maps one name; retired → null; unknown names pass through', () => {
    expect(normalizeColorName('--theme-color-dark')).toBeNull();
    expect(normalizeColorName('--primary-color')).toBe('--theme-primary-color');
    expect(normalizeColorName('--paper')).toBe('--theme-paper-color');
    expect(normalizeColorName('--theme-ink-color')).toBe('--theme-ink-color');
    expect(normalizeColorName('--portfolio-rose-color')).toBe('--portfolio-rose-color');
  });
});

describe('writers take old keys and write only new names (R-T8c)', () => {
  let saved: ThemeTokenMap = {};
  beforeEach(() => {
    saved = { ...getTokens() };
    document.documentElement.removeAttribute('style');
  });
  afterEach(() => {
    setTokens(saved, { dryRun: true });
    document.documentElement.removeAttribute('style');
  });

  it('updateTokens: an old-key patch writes the new names with the same values', () => {
    updateTokens({ '--primary-color': '#123456', '--paper': '#fffdf8', '--surface-color': '#eeeeee' }, { source: 't' });
    expect(inline('--theme-primary-color')).toBe('#123456');
    expect(inline('--theme-paper-color')).toBe('#fffdf8');
    expect(inline('--theme-surface-color')).toBe('#eeeeee');
    expect(oldInline()).toEqual([]);
    const tokens = getTokens();
    expect(Object.keys(tokens).filter((k) => k in renames)).toEqual([]);
    expect(tokens['--theme-primary-color']).toBe('#123456');
  });

  it('getToken reads an old key through its new name', () => {
    updateTokens({ '--theme-accent-color': '#0a7abc' }, { dryRun: true });
    expect(getToken('--accent-color')).toBe('#0a7abc');
    expect(getToken('accent-color')).toBe('#0a7abc');
  });

  it('Theme.apply / setText / create write only new names', () => {
    Theme.apply({ '--button-fg': '#000000', '--focus-ring': '#ff00ff' });
    expect(inline('--theme-button-fg-color')).toBe('#000000');
    expect(inline('--theme-focus-ring-color')).toBe('#ff00ff');
    Theme.setText({ color: '#101010', secondary: '#202020' });
    expect(inline('--theme-text-color')).toBe('#101010');
    expect(inline('--theme-text-secondary-color')).toBe('#202020');
    Theme.apply({ colors: { primary: '#ff6600', secondary: '#331100', paper: '#fafafa', ink: '#050505' } });
    expect(inline('--theme-primary-color')).toBe('#ff6600');
    expect(inline('--theme-secondary-color')).toBe('#331100');
    expect(inline('--theme-paper-color')).toBe('#fafafa');
    expect(inline('--theme-ink-color')).toBe('#050505');
    expect(oldInline()).toEqual([]);

    const pack = Theme.create('input-normalisation', {
      colors: { primary: '#224466', accent: '#88aa00', background: '#ffffff', surface: '#f0f0f0' },
      text: { color: '#111111' },
      tokens: { '--link-color': '#0000ee' },
    });
    expect(Object.keys(pack).filter((k) => k in renames)).toEqual([]);
    expect(pack).toMatchObject({
      '--theme-primary-color': '#224466',
      '--theme-accent-color': '#88aa00',
      '--theme-main-background-color': '#ffffff',
      '--theme-surface-color': '#f0f0f0',
      '--theme-text-color': '#111111',
      '--theme-link-color': '#0000ee',
    });
  });

  it('removeTokens / removeThemeVariables accept old keys and remove the new names', () => {
    updateTokens({ '--theme-primary-color': '#123456', '--theme-ink-color': '#010101' });
    removeTokens(['--primary-color']);
    expect(inline('--theme-primary-color')).toBe('');
    expect(getToken('--theme-primary-color')).toBeUndefined();
    removeThemeVariables(['--ink']);
    expect(inline('--theme-ink-color')).toBe('');
  });

  it('the low-level helpers (setThemeVariable, applyTheme) normalise too', () => {
    setThemeVariable('--link-color', '#0000ee');
    setThemeVariable('text-color', '#111111');
    applyTheme({ '--border-strong': '#777777', '--portfolio-rose-color': '#aa0000' }, { primevue: true });
    expect(inline('--theme-link-color')).toBe('#0000ee');
    expect(inline('--theme-text-color')).toBe('#111111');
    expect(inline('--theme-border-strong-color')).toBe('#777777');
    expect(inline('--p-form-field-border-color')).toBe('#777777');
    expect(inline('--portfolio-rose-color')).toBe('#aa0000');
    expect(oldInline()).toEqual([]);
  });
});

describe('a retired colour key passed in warns in development (it is still dropped)', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    resetRetiredColorWarnings();
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    warn.mockRestore();
    vi.unstubAllEnvs();
    document.documentElement.removeAttribute('style');
  });

  it('Theme.apply / updateTokens with a retired key: one console.warn naming it and the reason, nothing written', () => {
    Theme.apply({ '--theme-color-dark': '#123456' });
    updateTokens({ '--theme-color-dark': '#654321', '--theme-color-accent-light-soft': '#111111' });
    expect(inline('--theme-color-dark')).toBe('');
    const messages = warn.mock.calls.map((call) => String(call[0]));
    expect(messages).toHaveLength(2);
    expect(messages[0]).toContain('--theme-color-dark');
    expect(messages[0]).toMatch(/retired/i);
    expect(messages[0]).toContain('a16');
    expect(messages[1]).toContain('--theme-color-accent-light-soft');
  });

  it('old (renamed) and new names do not warn', () => {
    normalizeColorNames({ '--primary-color': '#123456', '--theme-ink-color': '#000000' });
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns in a browser dev build: no `process`, Vite `import.meta.env.DEV` true', () => {
    const saved = globalThis.process;
    vi.stubEnv('DEV', true);
    try {
      // @ts-expect-error — simulate a browser bundle without a `process` global.
      delete globalThis.process;
      expect(normalizeColorName('--theme-color-dark')).toBeNull();
    } finally {
      globalThis.process = saved;
    }
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('is silent in a production bundle (Vite DEV false, whatever NODE_ENV says); Node without Vite uses NODE_ENV', () => {
    // Vite replaces `import.meta.env.DEV` statically in a build, so the decision is tested directly.
    expect(isDevelopmentFor(false, 'development')).toBe(false);
    expect(isDevelopmentFor(false, undefined)).toBe(false);
    expect(isDevelopmentFor(true, undefined)).toBe(true); // browser dev bundle
    expect(isDevelopmentFor(true, 'production')).toBe(false);
    expect(isDevelopmentFor(undefined, 'development')).toBe(true); // Node / Nitro dev
    expect(isDevelopmentFor(undefined, 'test')).toBe(true);
    expect(isDevelopmentFor(undefined, 'production')).toBe(false);
    expect(isDevelopmentFor(undefined, undefined)).toBe(false); // neither available
  });

  it('is silent in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(normalizeColorName('--theme-color-dark')).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });
});
