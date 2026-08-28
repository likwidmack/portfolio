import { describe, expect, it } from 'vitest';

import { hexToRgb, pickContrastingInk, rgbToHsl } from '@tgmc/theme';

describe('@tgmc/theme color helpers', () => {
  it('parses hex and hsl', () => {
    expect(hexToRgb('#8B4513')).toEqual({ r: 139, g: 69, b: 19 });
    expect(hexToRgb('#abc')).toEqual({ r: 170, g: 187, b: 204 });
    expect(hexToRgb('not-a-color')).toBeNull();
    expect(rgbToHsl(139, 69, 19)).toMatchObject({ h: 25, s: 76, l: 31 });
  });

  it('picks contrasting ink against solid and gradient fills', () => {
    expect(
      pickContrastingInk({
        backgroundColor: '#ffffff',
        backgroundImage: 'none',
      })
    ).toMatch(/^#/);

    expect(
      pickContrastingInk({
        backgroundColor: '#0f172a',
        backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      })
    ).toMatch(/^#/);
  });
});
