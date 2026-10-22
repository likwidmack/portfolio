import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { COLOR_RENAME_MAP } from '../src/color-rename';
import { Theme } from '../src/theme';
import { getToken, getTokens, resetTokens, setTokens, updateTokens, type ThemeTokenMap } from '../src/token-registry';
import { getInlineTokensForMode } from '../src/tokens';

/**
 * R-T3d (colour system Task 3): the stylesheet switches every colour per mode, so the colour-mode
 * writer, the built-in light / dark packs and a registry reset never pin a colour inline — an
 * inline hex would freeze one mode's value over the other and hide the runtime variations.
 * The raw `updateTokens` / `Theme.apply` path still takes old names and writes their new names only
 * (Task 8, R-T8c; more in `color-name-input.spec.ts`).
 */
const colourNames = new Set([...Object.keys(COLOR_RENAME_MAP.renames), ...Object.values(COLOR_RENAME_MAP.renames)]);
const pinnedColours = (tokens: Record<string, string>) => Object.keys(tokens).filter((k) => colourNames.has(k));

describe('inline writers stop writing mode colours (R-T3d)', () => {
  // The registry is module state: snapshot it and put it back so later spec files start clean.
  let saved: ThemeTokenMap = {};
  beforeEach(() => {
    saved = { ...getTokens() };
  });
  afterEach(() => {
    setTokens(saved, { dryRun: true });
  });

  it('the colour-mode writer writes no renamed colour name (old or new) in either mode', () => {
    for (const mode of ['light', 'dark'] as const)
      expect(pinnedColours(getInlineTokensForMode(mode)), mode).toEqual([]);
  });

  it('the built-in light / dark packs and a registry reset pin no colour either', () => {
    for (const name of ['light', 'dark']) expect(pinnedColours({ ...Theme.get(name)! }), name).toEqual([]);
    resetTokens({ dryRun: true });
    expect(pinnedColours({ ...getTokens() })).toEqual([]);
  });

  it('the raw path moves old names to their --theme-…-color names (never writes the old ones)', () => {
    updateTokens({ '--primary-color': '#123456', '--paper': '#fffdf8' }, { dryRun: true, source: 'test' });
    expect(getToken('--theme-primary-color')).toBe('#123456');
    expect(getToken('--theme-paper-color')).toBe('#fffdf8');
    Theme.apply({ '--button-fg': '#000000' }, { dryRun: true });
    expect(getToken('--theme-button-fg-color')).toBe('#000000');
    const keys = Object.keys(getTokens());
    expect(keys.filter((k) => k in COLOR_RENAME_MAP.renames)).toEqual([]);
  });

  it('a new name set explicitly in the same patch wins over the expansion', () => {
    updateTokens({ '--accent-color': '#111111', '--theme-accent-color': '#222222' }, { dryRun: true });
    expect(getToken('--theme-accent-color')).toBe('#222222');
  });
});
