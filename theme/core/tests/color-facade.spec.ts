import { describe, expect, it } from 'vitest';

import { Color } from '../src/color.js';
import { colorsLibrary, themeColors } from '../src/tokens.js';

function signedHueDelta(from: number, to: number): number {
  let delta = to - from;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}

describe('Color facade', () => {
  it('parses and round-trips hex through rgb/hsl helpers', () => {
    const primary = themeColors.dark.primary;
    const parsed = Color.parse(primary);
    expect(parsed).not.toBeNull();
    expect(parsed?.format).toBe('hex');
    const rgb = Color.hexToRgb(primary);
    expect(rgb).not.toBeNull();
    if (!rgb) return;
    const hsl = Color.rgbToHsl(rgb.r, rgb.g, rgb.b);
    const back = Color.hexToRgb(Color.hslToHex(hsl.h, hsl.s, hsl.l));
    expect(back).not.toBeNull();
    if (!back) return;
    // Integer HSL round-trip may drift by 1–2 channels.
    expect(Math.abs(back.r - rgb.r)).toBeLessThanOrEqual(2);
    expect(Math.abs(back.g - rgb.g)).toBeLessThanOrEqual(2);
    expect(Math.abs(back.b - rgb.b)).toBeLessThanOrEqual(2);
  });

  it('create throws on invalid input; parse returns null', () => {
    expect(Color.parse('not-a-color')).toBeNull();
    expect(() => Color.create('not-a-color')).toThrow(/Invalid color format/);
  });

  it('lightens, darkens, and adds alpha for a fixture', () => {
    const base = '#808080';
    const lighter = Color.lighten(base, 10);
    const darker = Color.darken(base, 10);
    expect(Color.hexToRgb(lighter)?.r).toBeGreaterThan(Color.hexToRgb(base)?.r ?? 0);
    expect(Color.hexToRgb(darker)?.r).toBeLessThan(Color.hexToRgb(base)?.r ?? 255);
    expect(Color.addAlpha('#ff0000', 0.5).toLowerCase()).toBe('#ff000080');
  });

  it('looks up theme role colors for dark mode', () => {
    expect(Color.get('primary', 'dark')).toBe(themeColors.dark.primary);
    expect(Color.get('secondary', 'light')).toBe(themeColors.light.secondary);
    expect(Color.lookup({ kind: 'palette', palette: 'midnightMagic', swatch: 'darkAmethyst' })).toBe(
      colorsLibrary.palettes.midnightMagic.darkAmethyst
    );
  });

  it('returns null for unknown Color.get / Color.named', () => {
    expect(Color.get('notARole' as 'primary', 'light')).toBeNull();
    expect(Color.named('totally-missing-swatch')).toBeNull();
  });

  it('resolves Color.named from base, palette, role, and extended catalog', () => {
    expect(Color.named('white')).toBe(colorsLibrary.base.white);
    expect(Color.named('darkAmethyst')).toBe(colorsLibrary.palettes.midnightMagic.darkAmethyst);
    expect(Color.named('dark-amethyst')).toBe(colorsLibrary.palettes.midnightMagic.darkAmethyst);
    expect(Color.named('primary', 'dark')).toBe(themeColors.dark.primary);
    expect(Color.named('aliceblue')?.toLowerCase()).toBe(colorsLibrary.named.aliceblue?.toLowerCase());
    expect(Color.named('absolutezero')?.toLowerCase()).toBe(colorsLibrary.named.absolutezero?.toLowerCase());
    expect(Color.named('cssRedLight')?.toLowerCase()).toBe(colorsLibrary.sass.cssRedLight?.toLowerCase());
    expect(Color.named('accent-soft')?.toLowerCase()).toBe(colorsLibrary.sass.accentSoft?.toLowerCase());
  });

  it('prefers Sass over catalog when names conflict (midnight violet dark)', () => {
    expect(Color.named('midnightVioletDark')).toBe(colorsLibrary.named.midnightVioletDark);
    expect(Color.named('midnightVioletDk')).toBe(colorsLibrary.sass.midnightVioletDk);
  });

  it('derives brand accent as complementary of primary (Sass-aligned)', () => {
    const lightPrimary = themeColors.light.primary;
    const darkPrimary = themeColors.dark.primary;
    expect(Color.brandAccent(lightPrimary).toLowerCase()).toBe(
      colorsLibrary.cssVariables.light['--accent-color']!.toLowerCase()
    );
    expect(Color.brandAccent(darkPrimary).toLowerCase()).toBe(
      colorsLibrary.cssVariables.dark['--accent-color']!.toLowerCase()
    );
    expect(Color.brandSecondaryCandidates(lightPrimary)).toHaveLength(2);
  });

  it('resolves brand roles with auto secondary/accent and overrides', () => {
    const auto = Color.resolveBrandRoles('#dc4256');
    expect(auto.primary.toLowerCase()).toBe('#dc4256');
    expect(Color.contrastRatio(auto.primary, auto.secondary)).toBeGreaterThanOrEqual(3);
    expect(
      Math.max(Color.contrastRatio(auto.secondary, '#ffffff'), Color.contrastRatio(auto.secondary, '#000000'))
    ).toBeGreaterThanOrEqual(4.5);
    expect(auto.secondary.toLowerCase()).not.toBe(auto.primary.toLowerCase());
    const dark = Color.resolveBrandRoles('#2a0a10');
    const light = Color.resolveBrandRoles('#f6c9ce');
    expect(Color.create(dark.secondary).l).toBeGreaterThan(Color.create(dark.primary).l);
    expect(Color.create(light.secondary).l).toBeLessThan(Color.create(light.primary).l);
    expect(signedHueDelta(Color.create(dark.primary).h, Color.create(dark.secondary).h)).toBeLessThan(0);
    expect(signedHueDelta(Color.create(light.primary).h, Color.create(light.secondary).h)).toBeGreaterThan(0);
    const pale = Color.resolveBrandRoles(Color.hslToHex(12, 40, 70));
    const nearBlack = Color.resolveBrandRoles(Color.hslToHex(12, 80, 12));
    expect(Color.create(pale.secondary).l).toBeLessThan(Color.create(pale.primary).l);
    expect(signedHueDelta(Color.create(nearBlack.primary).h, Color.create(nearBlack.secondary).h)).toBeLessThan(0);
    expect(Color.create(nearBlack.secondary).l).toBeGreaterThan(Color.create(nearBlack.primary).l);
    expect(auto.accent.toLowerCase()).toBe(Color.brandAccent('#dc4256').toLowerCase());

    const overridden = Color.resolveBrandRoles('#dc4256', {
      secondary: '#112233',
      accent: '#abcdef',
    });
    expect(overridden.secondary.toLowerCase()).toBe('#112233');
    expect(overridden.accent.toLowerCase()).toBe('#abcdef');
  });

  it('builds a brand swatch catalog from roles, semantics, and palettes', () => {
    const catalog = Color.brandSwatchCatalog();
    expect(catalog.length).toBeGreaterThan(10);
    expect(catalog.some((s) => s.group === 'midnightMagic')).toBe(true);
    expect(catalog.some((s) => s.id.startsWith('role-dark-primary'))).toBe(true);
    expect(catalog.every((s) => /^#/.test(s.hex))).toBe(true);
  });
});
