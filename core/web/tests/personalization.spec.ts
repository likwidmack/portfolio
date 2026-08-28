import { describe, expect, it } from 'vitest';

import {
  ACCENT_KEY,
  ACCENT_PRESETS,
  buildAccentTokens,
  buildPersonalizationFoucScript,
  DEFAULT_ACCENT_COLOR,
  DEFAULT_ACCENT_ID,
  loadPersonalization,
  MOTION_KEY,
  resetPersonalization,
  resolveAccentId,
} from '../shared/personalization';

describe('portfolio personalization', () => {
  it('builds readable accent and focus tokens for ember and crimson in both modes', () => {
    expect(ACCENT_PRESETS).toHaveLength(2);
    expect(DEFAULT_ACCENT_ID).toBe('ember');
    for (const preset of ACCENT_PRESETS) {
      const dark = buildAccentTokens(preset.id, 'dark');
      const light = buildAccentTokens(preset.id, 'light');
      expect(dark['--primary-color']).toBe(preset.primary.dark);
      expect(dark['--secondary-color']).toBe(preset.secondary.dark);
      expect(dark['--focus-ring']).toBe(preset.primary.dark);
      expect(light['--primary-color']).toBe(preset.primary.light);
      expect(light['--secondary-color']).toBe(preset.secondary.light);
      expect(light['--button-fg']).toMatch(/^#/);
    }
  });

  it('falls back unknown stored accent ids to ember', () => {
    expect(resolveAccentId('coral')).toBe('ember');
    expect(resolveAccentId('violet')).toBe('ember');
    expect(resolveAccentId(null)).toBe('ember');
    expect(resolveAccentId('crimson')).toBe('crimson');
  });

  it('builds FOUC script from ACCENT_PRESETS (single hex source)', () => {
    const script = buildPersonalizationFoucScript();
    for (const preset of ACCENT_PRESETS) {
      expect(script).toContain(`${preset.id}:'${preset.color}'`);
    }
    expect(script).toContain(DEFAULT_ACCENT_COLOR);
    expect(script).not.toContain('coral');
  });

  it('loads persisted accent and motion and resets both keys', () => {
    const values = new Map<string, string>([
      [ACCENT_KEY, 'crimson'],
      [MOTION_KEY, 'reduced'],
    ]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
    };
    expect(loadPersonalization(storage)).toEqual({ accent: 'crimson', motion: 'reduced' });
    resetPersonalization(storage);
    expect(values.size).toBe(0);
  });

  it('falls back legacy coral storage to ember on load', () => {
    const storage = {
      getItem: (key: string) => (key === ACCENT_KEY ? 'coral' : null),
    };
    expect(loadPersonalization(storage)).toEqual({ accent: 'ember', motion: 'system' });
  });
});
