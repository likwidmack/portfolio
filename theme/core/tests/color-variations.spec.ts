import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Color } from '../src/color';
import { contrast } from '../src/color-mix';
import {
  adjustLightnessFor,
  backgroundFor,
  buildButtonInkTokens,
  buildColorVariations,
  buildPrimaryFillTokens,
  buildPrimaryInkTokens,
  buildSecondaryInkTokens,
  BUTTON_INK_TARGET,
  buttonInkFor,
  CONTRAST_TARGET,
  DEFAULT_COLOR_SOURCES,
  PRIMARY_INK_TARGET,
  primaryFillFor,
  primaryInkFor,
  SECONDARY_INK_TARGET,
  secondaryInkFor,
  SOLID_COLORS,
  textGroundsFor,
} from '../src/color-variations';
import { ON_FILL_INK_DARK, ON_FILL_INK_LIGHT } from '../src/contrast';
import { DEFAULT_PAPER_INK, NEUTRAL_ROLE_STEPS, neutralStep } from '../src/paper-ink';
import presetsJson from '../src/theme-presets.json' with { type: 'json' };

const vars = buildColorVariations(DEFAULT_COLOR_SOURCES, DEFAULT_PAPER_INK);

describe('colour variations', () => {
  it('names four variations for every solid colour and the ink / paper pairs', () => {
    for (const c of SOLID_COLORS)
      for (const v of ['light', 'dark', 'light-background', 'dark-background'])
        expect(vars[`--theme-${c}-${v}-color`], `${c} ${v}`).toMatch(/^#[0-9a-f]{6}$/);
    for (const g of ['paper', 'ink'])
      for (const m of ['light', 'dark']) expect(vars[`--theme-${g}-${m}-color`]).toBeTruthy();
  });

  it('light / dark pass their target against that mode paper; backgrounds carry that mode ink at 4.5:1', () => {
    for (const c of SOLID_COLORS)
      for (const mode of ['light', 'dark'] as const) {
        const { paper, ink } = DEFAULT_PAPER_INK[mode];
        expect(contrast(vars[`--theme-${c}-${mode}-color`]!, paper), `${c} ${mode}`).toBeGreaterThanOrEqual(
          CONTRAST_TARGET[c]
        );
        expect(contrast(ink, vars[`--theme-${c}-${mode}-background-color`]!), `${c} ${mode} bg`).toBeGreaterThanOrEqual(
          4.5
        );
      }
  });

  it('adjustLightnessFor moves only lightness, and moves away from the ground first', () => {
    expect(adjustLightnessFor('#ffffff', '#ffffff', 3)).not.toBe('#ffffff');
    expect(adjustLightnessFor('#0a0aef', '#faf6f3', 4.5)).toBe('#0a0aef'); // already passes

    // A colour that fails against light paper moves darker (away from the light ground), not
    // lighter — even though lightening it would also be a valid contrast direction in isolation.
    const candidate = '#4d90b3';
    const paper = '#faf6f3';
    expect(Color.contrastRatio(candidate, paper)).toBeLessThan(4.5);
    const darkened = adjustLightnessFor(candidate, paper, 4.5);
    expect(Color.create(darkened).l).toBeLessThan(Color.create(candidate).l);
    expect(Color.contrastRatio(darkened, paper)).toBeGreaterThanOrEqual(4.5);
  });

  it('backgroundFor moves the colour until the ink reads on it, and returns an already-passing source unchanged', () => {
    // Fails at its own lightness under dark ink → moves lighter (away from the dark ink) until ≥ 4.5:1.
    const source = '#6e1622';
    const ink = '#0f0908';
    expect(Color.contrastRatio(ink, source)).toBeLessThan(4.5);
    const lightened = backgroundFor(source, ink);
    expect(Color.create(lightened).l).toBeGreaterThan(Color.create(source).l);
    expect(Color.contrastRatio(ink, lightened)).toBeGreaterThanOrEqual(4.5);

    // Already passes at its own lightness → returned unchanged (lowercased), not pushed further.
    expect(backgroundFor('#dc4256', '#0f0908')).toBe('#dc4256');
  });

  it('backgroundFor keeps hue and saturation when 4.5:1 is unreachable', () => {
    // Mid-grey ink: no lightness of this hue/saturation reaches 4.5:1, so the best-reached
    // candidate is returned — never a hard-coded black/white that would discard hue and saturation.
    const source = '#cc3333';
    const ink = '#777777';
    const result = backgroundFor(source, ink);
    expect(Color.contrastRatio(ink, result)).toBeLessThan(4.5);
    const parsed = Color.create(result);
    const original = Color.create(source);
    expect(parsed.h).toBeCloseTo(original.h, 0);
    expect(parsed.s).toBeCloseTo(original.s, 0);
    expect(parsed.l).not.toBe(original.l);
  });

  it('keeps the committed Sass defaults in sync with the builder', () => {
    const scss = readFileSync(join(import.meta.dirname, '../scss/tokens/_variations.generated.scss'), 'utf8');
    for (const [name, hex] of Object.entries({ ...vars, ...buildButtonInkTokens(vars) }))
      expect(scss).toContain(`$${name.slice(2)}: ${hex};`);
  });
});

describe('button ink (--button-fg)', () => {
  it('dark mode: reads ≥ 4.5:1 on the dark primary variation (light buttons use the white-text fill)', () => {
    const ink = buildButtonInkTokens(vars);
    // Fix round 1 (owner option C): light-mode buttons sit on --theme-primary-fill-color with white
    // text (--theme-on-primary-color), so only the dark-mode ink is computed.
    expect(Object.keys(ink)).toEqual(['--theme-button-fg-dark-color']);
    expect(contrast(ink['--theme-button-fg-dark-color']!, vars['--theme-primary-dark-color']!)).toBeGreaterThanOrEqual(
      BUTTON_INK_TARGET
    );
  });

  it('keeps the on-fill ink pair when one passes, and falls back to white / black when neither does', () => {
    // #ac1922: the light on-fill ink passes (the site's pre-variation look is kept).
    expect(buttonInkFor('#ac1922')).toBe(ON_FILL_INK_LIGHT);
    // #ffd400: the dark on-fill ink passes.
    expect(buttonInkFor('#ffd400')).toBe(ON_FILL_INK_DARK);
    // #d9531d (light-mode default primary): neither on-fill ink reaches 4.5:1 → pure black does.
    expect(contrast(ON_FILL_INK_LIGHT, '#d9531d')).toBeLessThan(4.5);
    expect(contrast(ON_FILL_INK_DARK, '#d9531d')).toBeLessThan(4.5);
    expect(buttonInkFor('#d9531d')).toBe('#000000');
    // Any fill: white or black always reaches 4.5:1, so the result always does.
    for (const fill of ['#777777', '#808080', '#2f7fbf', '#e0115f', '#00a86b', '#6b4fbb'])
      expect(contrast(buttonInkFor(fill), fill), fill).toBeGreaterThanOrEqual(4.5);
  });
});

describe('primary fill (white text on primary buttons — fix round 1, option C)', () => {
  const fill = buildPrimaryFillTokens(vars);

  it('is the active primary with only its lightness moved until the on-primary paper reads ≥ 4.5:1, per mode', () => {
    expect(Object.keys(fill).sort()).toEqual(['--theme-primary-fill-dark-color', '--theme-primary-fill-light-color']);
    for (const mode of ['light', 'dark'] as const) {
      const f = fill[`--theme-primary-fill-${mode}-color`]!;
      const src = Color.create(vars[`--theme-primary-${mode}-color`]!);
      expect(contrast('#ffffff', f), mode).toBeGreaterThanOrEqual(4.5);
      expect(Color.create(f).h, `${mode} hue`).toBeCloseTo(src.h, 0);
      expect(Color.create(f).s, `${mode} saturation`).toBeCloseTo(src.s, 0);
    }
  });

  it('lands near the design system fill (#b83f16) for the default light primary, and keeps dark as is', () => {
    // Against the on-primary paper (#faf6f3, rule 3) — was #c74c1b against #ffffff.
    expect(fill['--theme-primary-fill-light-color']).toBe('#be4919');
    expect(Math.abs(Color.create('#be4919').h - Color.create('#b83f16').h)).toBeLessThan(3);
    expect(fill['--theme-primary-fill-dark-color']).toBe(vars['--theme-primary-dark-color']);
    expect(primaryFillFor('#f4c2c2')).not.toBe('#f4c2c2');
    expect(contrast('#ffffff', primaryFillFor('#f4c2c2'))).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the committed Sass defaults in sync', () => {
    const scss = readFileSync(join(import.meta.dirname, '../scss/tokens/_variations.generated.scss'), 'utf8');
    for (const [name, hex] of Object.entries(fill)) expect(scss).toContain(`$${name.slice(2)}: ${hex};`);
  });
});

describe('primary ink (--theme-primary-ink-color — brand-coloured small text)', () => {
  const ink = buildPrimaryInkTokens(DEFAULT_COLOR_SOURCES, DEFAULT_PAPER_INK);
  /** Every ground text sits on, per mode: page, secondary page, surface, surface variant. */
  const grounds = (mode: 'light' | 'dark', pair = DEFAULT_PAPER_INK[mode]) => {
    const steps = NEUTRAL_ROLE_STEPS[mode];
    return [
      steps['--theme-main-background-color'],
      steps['--theme-main-background-secondary-color'],
      steps['--theme-surface-color'],
      steps['--theme-surface-variant-color'],
    ].map((step) => neutralStep(pair, step));
  };
  const worst = (fg: string, on: string[]) => Math.min(...on.map((g) => contrast(fg, g)));

  it('targets body-text contrast (WCAG 1.4.3), not the 3:1 of the main variation', () => {
    expect(PRIMARY_INK_TARGET).toBe(4.5);
    expect(CONTRAST_TARGET.primary).toBe(3);
  });

  it('names one per mode', () => {
    expect(Object.keys(ink).sort()).toEqual(['--theme-primary-ink-dark-color', '--theme-primary-ink-light-color']);
  });

  it('textGroundsFor lists page, secondary page, surface and surface variant for the mode', () => {
    for (const mode of ['light', 'dark'] as const)
      expect(textGroundsFor(DEFAULT_PAPER_INK[mode], mode), mode).toEqual(grounds(mode));
  });

  it('defaults: reach ≥ 4.5:1 on paper and every text surface, in both modes, moving only lightness', () => {
    for (const mode of ['light', 'dark'] as const) {
      const hex = ink[`--theme-primary-ink-${mode}-color`]!;
      expect(worst(hex, grounds(mode)), mode).toBeGreaterThanOrEqual(4.5);
      const src = Color.create(DEFAULT_COLOR_SOURCES.primary[mode]);
      expect(Color.create(hex).h, `${mode} hue`).toBeCloseTo(src.h, 0);
      // The 3:1 main variation fails small text today — the reason this role exists.
      expect(worst(vars[`--theme-primary-${mode}-color`]!, grounds(mode)), `${mode} main`).toBeLessThan(4.5);
    }
  });

  it('every theme preset: its primary pair reaches ≥ 4.5:1 on paper and every text surface, both modes', () => {
    const presets = (presetsJson as { presets: Array<{ id: string; primary: { light: string; dark: string } }> })
      .presets;
    expect(presets.length).toBeGreaterThan(0);
    for (const preset of presets) {
      const tokens = buildPrimaryInkTokens({ primary: preset.primary }, DEFAULT_PAPER_INK);
      for (const mode of ['light', 'dark'] as const)
        expect(
          worst(tokens[`--theme-primary-ink-${mode}-color`]!, grounds(mode)),
          `${preset.id} ${mode}`
        ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('uses the worst ground, not only paper', () => {
    // Light mode: the surface (step 50) is darker than paper, so it is the harder ground for dark text.
    const light = textGroundsFor(DEFAULT_PAPER_INK.light, 'light');
    const onPaperOnly = adjustLightnessFor('#d9531d', DEFAULT_PAPER_INK.light.paper, 4.5);
    const onAll = primaryInkFor('#d9531d', light);
    expect(worst(onAll, light)).toBeGreaterThanOrEqual(4.5);
    expect(Color.create(onAll).l).toBeLessThanOrEqual(Color.create(onPaperOnly).l);
  });

  it('keeps the best-reached fallback when 4.5:1 is unreachable', () => {
    const mid = ['#777777', '#7a7a7a'];
    const result = primaryInkFor('#cc3333', mid);
    expect(worst(result, mid)).toBeLessThan(4.5);
    expect(worst(result, mid)).toBeGreaterThan(worst('#cc3333', mid));
  });

  it('keeps the committed Sass defaults in sync', () => {
    const scss = readFileSync(join(import.meta.dirname, '../scss/tokens/_variations.generated.scss'), 'utf8');
    for (const [name, hex] of Object.entries(ink)) expect(scss).toContain(`$${name.slice(2)}: ${hex};`);
  });
});

describe('secondary ink (--theme-secondary-ink-color — secondary-coloured small text)', () => {
  const ink = buildSecondaryInkTokens(DEFAULT_COLOR_SOURCES, DEFAULT_PAPER_INK);
  const grounds = (mode: 'light' | 'dark') => textGroundsFor(DEFAULT_PAPER_INK[mode], mode);
  const worst = (fg: string, on: string[]) => Math.min(...on.map((g) => contrast(fg, g)));

  it('targets body-text contrast (WCAG 1.4.3), not the 3:1 of the main variation', () => {
    expect(SECONDARY_INK_TARGET).toBe(4.5);
    expect(CONTRAST_TARGET.secondary).toBe(3);
  });

  it('names one per mode', () => {
    expect(Object.keys(ink).sort()).toEqual(['--theme-secondary-ink-dark-color', '--theme-secondary-ink-light-color']);
  });

  it('defaults: reach ≥ 4.5:1 on paper and every text surface, in both modes, moving only lightness', () => {
    for (const mode of ['light', 'dark'] as const) {
      const hex = ink[`--theme-secondary-ink-${mode}-color`]!;
      expect(worst(hex, grounds(mode)), mode).toBeGreaterThanOrEqual(4.5);
      const src = Color.create(DEFAULT_COLOR_SOURCES.secondary[mode]);
      expect(Color.create(hex).h, `${mode} hue`).toBeCloseTo(src.h, 0);
    }
    // The dark main variation fails small text today (4.02:1 on paper, 3.77:1 on surface) — the reason this role exists.
    expect(worst(vars['--theme-secondary-dark-color']!, grounds('dark'))).toBeLessThan(4.5);
  });

  it('a source that already reads ≥ 4.5:1 is kept as is', () => {
    const light = grounds('light');
    expect(worst('#6e1622', light)).toBeGreaterThanOrEqual(4.5);
    expect(secondaryInkFor('#6e1622', light)).toBe('#6e1622');
  });

  it('every theme preset: its secondary pair reaches ≥ 4.5:1 on paper and every text surface, both modes', () => {
    const presets = (presetsJson as { presets: Array<{ id: string; secondary: { light: string; dark: string } }> })
      .presets;
    expect(presets).toHaveLength(21);
    for (const preset of presets) {
      const tokens = buildSecondaryInkTokens({ secondary: preset.secondary }, DEFAULT_PAPER_INK);
      for (const mode of ['light', 'dark'] as const)
        expect(
          worst(tokens[`--theme-secondary-ink-${mode}-color`]!, grounds(mode)),
          `${preset.id} ${mode}`
        ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps the committed Sass defaults in sync', () => {
    const scss = readFileSync(join(import.meta.dirname, '../scss/tokens/_variations.generated.scss'), 'utf8');
    for (const [name, hex] of Object.entries(ink)) expect(scss).toContain(`$${name.slice(2)}: ${hex};`);
  });
});
