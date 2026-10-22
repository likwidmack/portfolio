import { join } from 'node:path';
import * as sass from 'sass';
import { describe, expect, it } from 'vitest';

import { contrast } from '../src/color-mix';
import {
  BUTTON_INK_TARGET,
  DEFAULT_COLOR_SOURCES,
  buildButtonInkTokens,
  buildColorVariations,
  buildPrimaryFillTokens,
  onPrimaryFor,
} from '../src/color-variations';
import { DEFAULT_PAPER_INK } from '../src/paper-ink';
import { darkCssVariables, lightCssVariables } from '../src/tokens';
import { parseRules } from './helpers/css-decls.js';

/**
 * Task 3 fix round 2 — controller ruling: hover / active on every primary-fill or status-filled
 * control keep their text ≥ 4.5:1 in both modes. The chosen mechanism is "no lightening filter":
 * hover keeps the resting fill (only a lift / underline changes), so the resting ratios hold; the
 * only colour filter left is active's `saturate(0.96)`, whose effect is computed here.
 *
 * Why a compiled-CSS + maths test (not Cypress): Cypress cannot hover natively (no realHover), and
 * `filter` is not reflected in `getComputedStyle` colours anyway, so a browser check would still
 * have to compute the filter's effect. Compiling the theme's button / PrimeVue sheets and applying
 * the CSS filter matrices to the painted defaults tests the same thing directly.
 */
const themeRoot = join(import.meta.dirname, '..');
const css = sass.compileString("@use 'globals/button'; @use 'globals/primevue-union';", {
  loadPaths: [join(themeRoot, 'scss')],
  style: 'expanded',
  silenceDeprecations: ['slash-div', 'import'],
}).css;
const rules = parseAllRules(css);

/** `parseRules` keeps only custom properties; this variant keeps every declaration. */
function parseAllRules(source: string): Array<{ selector: string; decls: Array<[string, string]> }> {
  const withCustom = source.replace(/(^|[;{\s])(?!--)([a-z-]+)\s*:/g, '$1--prop-$2:');
  return parseRules(withCustom).map((r) => ({
    selector: r.selector,
    decls: r.decls.map(([n, v]) => [n.replace(/^--prop-/, ''), v] as [string, string]),
  }));
}

const FILLED = /(^|[\s,>])(button|\.btn|\.p-button)\b/;
const stateRules = (state: ':hover' | ':active') =>
  rules.filter((r) => r.selector.includes(state) && FILLED.test(r.selector));

/** CSS Filter Effects 1: brightness / saturate as linear-RGB-free matrices on sRGB channels. */
function applyFilter(hex: string, filter: string): string {
  let [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  for (const [, fn, arg] of filter.matchAll(/(brightness|saturate)\(([\d.]+)\)/g)) {
    const s = Number(arg);
    if (fn === 'brightness') [r, g, b] = [r * s, g * s, b * s];
    else
      [r, g, b] = [
        (0.213 + 0.787 * s) * r + (0.715 - 0.715 * s) * g + (0.072 - 0.072 * s) * b,
        (0.213 - 0.213 * s) * r + (0.715 + 0.285 * s) * g + (0.072 - 0.072 * s) * b,
        (0.213 - 0.213 * s) * r + (0.715 - 0.715 * s) * g + (0.072 + 0.928 * s) * b,
      ];
    [r, g, b] = [r, g, b].map((c) => Math.min(1, Math.max(0, c))) as [number, number, number];
  }
  return `#${[r, g, b]
    .map((c) =>
      Math.round(c * 255)
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;
}

const vars = buildColorVariations(DEFAULT_COLOR_SOURCES, DEFAULT_PAPER_INK);
const fill = buildPrimaryFillTokens(vars);
/** The painted default primary button per mode: [fill, text]. */
const PRIMARY_BUTTON = {
  light: [fill['--theme-primary-fill-light-color']!, onPrimaryFor(vars)],
  dark: [vars['--theme-primary-dark-color']!, buildButtonInkTokens(vars)['--theme-button-fg-dark-color']!],
} as const;

describe('filled controls keep their text ≥ 4.5:1 on hover / active (fix round 2)', () => {
  it('no hover / active rule on a button, .btn or .p-button lightens the fill with a filter', () => {
    const offenders: string[] = [];
    for (const r of [...stateRules(':hover'), ...stateRules(':active')])
      for (const [name, value] of r.decls)
        if (name === 'filter')
          for (const [, , arg] of value.matchAll(/(brightness|saturate)\(([\d.]+)\)/g))
            if (Number(arg) > 1) offenders.push(`${r.selector} { filter: ${value} }`);
    expect(offenders).toEqual([]);
  });

  it('the remaining active filter (saturate) keeps the default primary buttons ≥ 4.5:1 in both modes', () => {
    const filters = new Set(
      stateRules(':active').flatMap((r) => r.decls.filter(([n]) => n === 'filter').map(([, v]) => v))
    );
    expect([...filters].length).toBeGreaterThan(0);
    for (const mode of ['light', 'dark'] as const) {
      const [bg, ink] = PRIMARY_BUTTON[mode];
      expect(contrast(ink, bg), `${mode} at rest`).toBeGreaterThanOrEqual(BUTTON_INK_TARGET);
      for (const f of filters) {
        // A filter applies to the whole element: text and fill alike.
        const ratio = contrast(applyFilter(ink, f), applyFilter(bg, f));
        expect(ratio, `${mode} ${f}`).toBeGreaterThanOrEqual(BUTTON_INK_TARGET);
      }
    }
  });

  it('pins the arithmetic: the old hover filter took the light fill under 4.5:1', () => {
    // The fix-round-2 fill and label (white on #c74c1b, before rule 3 moved the label to the paper).
    const [bg, ink] = ['#c74c1b', '#ffffff'];
    const old = 'saturate(1.05) brightness(1.04)';
    expect(contrast(applyFilter(ink, old), applyFilter(bg, old))).toBeLessThan(4.5);
  });
});

describe('filled status controls (fix round 2, R-T3c follow-up)', () => {
  const solid = rules.filter((r) => /\.p-(button|tag|badge)-(success|warn|warning|danger|info)\b/.test(r.selector));

  it('status fills (PrimeVue buttons, tags, badges) use the mode paper as their text', () => {
    // Filled = the background is the status colour itself (outlined / text variants are transparent).
    const fills = solid.filter((r) =>
      r.decls.some(([n, v]) => n === 'background' && /^var\(--theme-(success|warning|error|info)-hue-color\)$/.test(v))
    );
    expect(fills.length).toBeGreaterThanOrEqual(8);
    for (const r of fills)
      expect(r.decls.find(([n]) => n === 'color')?.[1], r.selector).toBe('var(--theme-paper-color)');
  });

  it('paper on every status variation reads ≥ 4.5:1 in both modes (by construction of the variation)', () => {
    for (const s of ['success', 'warning', 'error', 'info'] as const)
      for (const mode of ['light', 'dark'] as const) {
        const ratio = contrast(DEFAULT_PAPER_INK[mode].paper, vars[`--theme-${s}-${mode}-color`]!);
        expect(ratio, `${s} ${mode}`).toBeGreaterThanOrEqual(4.5);
      }
  });
});

describe('JS mirror of the primary fill (fix round 2)', () => {
  it('colors.json / tokens.ts carry the painted primary fill defaults', () => {
    expect(darkCssVariables['--theme-primary-fill-color']).toBe(fill['--theme-primary-fill-dark-color']);
    expect(lightCssVariables['--theme-primary-fill-color']).toBe(fill['--theme-primary-fill-light-color']);
  });
});
