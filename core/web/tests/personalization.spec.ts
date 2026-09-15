import { describe, expect, it } from 'vitest';

import {
  ACCENT_KEY,
  ACCENT_PRESETS,
  BACKGROUND_MODES,
  buildAccentTokens,
  buildPersonalizationFoucScript,
  DEFAULT_ACCENT_COLOR,
  DEFAULT_ACCENT_ID,
  DEFAULT_BACKGROUND_MODE,
  loadPersonalization,
  MOTION_KEY,
  resetPersonalization,
  resolveAccentId,
  resolveBackgroundMode,
} from '../shared/personalization';

describe('portfolio personalization', () => {
  it('builds readable accent and focus tokens for ember and crimson in both modes', () => {
    expect(ACCENT_PRESETS).toHaveLength(2);
    expect(DEFAULT_ACCENT_ID).toBe('crimson');
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

  it('uses the updated vivid-crimson hexes for the crimson preset', () => {
    const crimson = ACCENT_PRESETS.find((preset) => preset.id === 'crimson');
    expect(crimson?.primary).toEqual({ light: '#a81b32', dark: '#dc4256' });
    expect(crimson?.color).toBe('#dc4256');
  });

  it('falls back unknown stored accent ids to crimson', () => {
    expect(resolveAccentId('coral')).toBe('crimson');
    expect(resolveAccentId('violet')).toBe('crimson');
    expect(resolveAccentId(null)).toBe('crimson');
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
    expect(loadPersonalization(storage)).toEqual({ accent: 'crimson', motion: 'reduced', background: 'particles' });
    resetPersonalization(storage);
    expect(values.size).toBe(0);
  });

  it('falls back legacy coral storage to crimson on load', () => {
    const storage = {
      getItem: (key: string) => (key === ACCENT_KEY ? 'coral' : null),
    };
    expect(loadPersonalization(storage)).toEqual({ accent: 'crimson', motion: 'system', background: 'particles' });
  });

  it('exposes Particles, Grid, and Camera background modes with a particles default', () => {
    expect(BACKGROUND_MODES.map((option) => option.value)).toEqual(['particles', 'grid', 'camera']);
    expect(DEFAULT_BACKGROUND_MODE).toBe('particles');
    expect(resolveBackgroundMode('grid')).toBe('grid');
    expect(resolveBackgroundMode('bogus')).toBe('particles');
    expect(resolveBackgroundMode(null)).toBe('particles');
  });
});
