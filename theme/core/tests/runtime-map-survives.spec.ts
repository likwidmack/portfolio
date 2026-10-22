// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { disposeThemeMode, setThemeMode } from '../src/color-mode';
import { Theme } from '../src/theme';
import { getToken, removeTokens, resetTokens, setTokens, updateTokens } from '../src/token-registry';
import { isModeVariationName } from '../src/tokens';

/**
 * Task 3 fix round 1 (Important 1): core/web writes the per-mode colour map
 * (`--theme-…-{light,dark}{,-background}-color`) once; the stylesheet switches the active names.
 * A mode switch (or any full-replace writer) must therefore never wipe that map — with no
 * listener re-writing it.
 */
const map = {
  '--theme-primary-light-color': '#aa3344',
  '--theme-primary-dark-color': '#cc5566',
  '--theme-primary-dark-background-color': '#dd7788',
  '--theme-paper-light-color': '#fffdf8',
  '--theme-button-fg-dark-color': '#000000',
  '--theme-primary-fill-light-color': '#993322',
};
const inline = (name: string) => document.documentElement.style.getPropertyValue(name);

afterEach(() => {
  removeTokens(Object.keys(map));
  disposeThemeMode();
});

describe('the runtime colour map survives full-replace writers', () => {
  it('names the per-mode variation family', () => {
    for (const name of Object.keys(map)) expect(isModeVariationName(name), name).toBe(true);
    for (const name of ['--theme-primary-color', '--primary-color', '--theme-text-color', '--border-radius-md'])
      expect(isModeVariationName(name), name).toBe(false);
  });

  it('keeps inline values and registry entries across a mode switch with no listener', () => {
    updateTokens(map, { source: 'test' });
    setThemeMode('light', { persist: false });
    setThemeMode('dark', { persist: false });
    for (const [name, value] of Object.entries(map)) {
      expect(inline(name), name).toBe(value);
      expect(getToken(name), name).toBe(value);
    }
  });

  it('keeps them across Theme.applyModeVariables, Theme.set, Theme.select and resetTokens', () => {
    updateTokens(map, { source: 'test' });
    Theme.applyModeVariables('light');
    Theme.set({ '--space-x': '1rem' });
    Theme.select('dark');
    resetTokens();
    setTokens({});
    for (const [name, value] of Object.entries(map)) expect(inline(name), name).toBe(value);
  });

  it('removeTokens clears both the registry and the DOM', () => {
    updateTokens(map, { source: 'test' });
    removeTokens(['--theme-primary-light-color']);
    expect(inline('--theme-primary-light-color')).toBe('');
    expect(getToken('--theme-primary-light-color')).toBeUndefined();
    expect(inline('--theme-primary-dark-color')).toBe('#cc5566');
  });
});
