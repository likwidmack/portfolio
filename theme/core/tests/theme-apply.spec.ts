import { afterEach, describe, expect, it } from 'vitest';

import { Theme } from '../src/theme.js';
import { getToken, resetTokens } from '../src/token-registry.js';

describe('Theme.apply seam', () => {
  afterEach(() => {
    resetTokens({ dryRun: true });
  });

  it('merges a token map (dryRun keeps DOM quiet)', () => {
    Theme.apply({ '--theme-primary-color': '#112233' }, { dryRun: true, source: 'test' });
    expect(getToken('--theme-primary-color')).toBe('#112233');
  });

  it('accepts a ThemeDefinition and writes brand colours', () => {
    Theme.apply({ colors: { primary: '#ff6600', secondary: '#331100' } }, { dryRun: true });
    expect(getToken('--theme-primary-color')).toBe('#ff6600');
    expect(getToken('--theme-secondary-color')).toBe('#331100');
    expect(getToken('--theme-button-fg-color')).toBeTruthy();
  });

  it('does not require bridge options on the call site', () => {
    // Signature check: one-arg call is valid.
    expect(() => Theme.apply({ '--theme-accent-color': '#abcdef' }, { dryRun: true })).not.toThrow();
    expect(getToken('--theme-accent-color')).toBe('#abcdef');
  });
});
