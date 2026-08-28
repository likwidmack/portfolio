import { describe, expect, it } from 'vitest';

import {
  ACCENT_KEY,
  ACCENT_PRESETS,
  buildAccentTokens,
  buildPersonalizationFoucScript,
  DEFAULT_ACCENT_COLOR,
  loadPersonalization,
  MOTION_KEY,
  resetPersonalization,
} from '../shared/personalization';

describe('portfolio personalization', () => {
  it('builds readable accent and focus tokens for all five presets', () => {
    expect(ACCENT_PRESETS).toHaveLength(5);
    for (const preset of ACCENT_PRESETS) {
      const tokens = buildAccentTokens(preset.id);
      expect(tokens['--primary-color']).toBe(preset.color);
      expect(tokens['--focus-ring']).toBe(preset.color);
      expect(tokens['--button-fg']).toMatch(/^#/);
    }
  });

  it('builds FOUC script from ACCENT_PRESETS (single hex source)', () => {
    const script = buildPersonalizationFoucScript();
    for (const preset of ACCENT_PRESETS) {
      expect(script).toContain(`${preset.id}:'${preset.color}'`);
    }
    expect(script).toContain(DEFAULT_ACCENT_COLOR);
  });

  it('loads persisted accent and motion and resets both keys', () => {
    const values = new Map<string, string>([
      [ACCENT_KEY, 'violet'],
      [MOTION_KEY, 'reduced'],
    ]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
    };
    expect(loadPersonalization(storage)).toEqual({ accent: 'violet', motion: 'reduced' });
    resetPersonalization(storage);
    expect(values.size).toBe(0);
  });
});
