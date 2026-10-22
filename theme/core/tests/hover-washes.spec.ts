import { join } from 'node:path';
import * as sass from 'sass';
import { describe, expect, it } from 'vitest';

import { contrast, hexToRgb, rgbToHex } from '../src/color-mix';
import {
  buildButtonInkTokens,
  buildColorVariations,
  buildPrimaryInkTokens,
  buildWashTokens,
  DEFAULT_COLOR_SOURCES,
  textGroundsFor,
  WASH_ALPHA,
  type ColorSources,
} from '../src/color-variations';
import { DEFAULT_PAPER_INK } from '../src/paper-ink';
import presetsJson from '../src/theme-presets.json' with { type: 'json' };
import { compileRootCss, parseRules } from './helpers/css-decls.js';

/**
 * Hover / active washes under `--theme-primary-ink-color` text (`.btn` outline / ghost,
 * `.p-button`, `.p-button-outlined`, `.p-button-text`): ink on the wash, composited over every text
 * ground (page, secondary page, surface, variant), reads ≥ 4.5:1 in both modes for the defaults and
 * all 21 presets. And hover is never colour-only: an inset ring, an underline or a lift.
 *
 * Compiled-CSS + maths (like `filled-control-states.spec.ts`): Cypress cannot hover natively.
 */
type Mode = 'light' | 'dark';
const MODES = ['light', 'dark'] as const;
const themeRoot = join(import.meta.dirname, '..');
const css = sass.compileString("@use 'globals/button'; @use 'globals/primevue-union';", {
  loadPaths: [join(themeRoot, 'scss')],
  style: 'expanded',
  silenceDeprecations: ['slash-div', 'import'],
}).css;

/** `parseRules` keeps only custom properties; this variant keeps every declaration. */
function parseAllRules(source: string): Array<{ selector: string; decls: Array<[string, string]> }> {
  const withCustom = source.replace(/(^|[;{\s])(?!--)([a-z-]+)\s*:/g, '$1--prop-$2:');
  return parseRules(withCustom).map((r) => ({
    selector: r.selector,
    decls: r.decls.map(([n, v]) => [n.replace(/^--prop-/, ''), v] as [string, string]),
  }));
}
const rules = parseAllRules(css);

/** The controls whose text is `--theme-primary-ink-color` and which wash on hover / active. */
const STATES: Array<{ label: string; selector: string }> = [
  { label: '.btn outline :hover', selector: '.btn[data-variant=outline]:hover' },
  { label: '.btn outline :active', selector: '.btn[data-variant=outline]:active' },
  { label: '.btn ghost :hover', selector: '.btn[data-variant=ghost]:hover' },
  { label: '.btn ghost :active', selector: '.btn[data-variant=ghost]:active' },
  { label: '.p-button :hover', selector: '.p-button:not(:disabled):hover' },
  { label: '.p-button :active', selector: '.p-button:not(:disabled):active' },
  { label: '.p-button-outlined :hover', selector: '.p-button.p-button-outlined:not(:disabled):hover' },
  { label: '.p-button-outlined :active', selector: '.p-button.p-button-outlined:not(:disabled):active' },
  { label: '.p-button-text :hover', selector: '.p-button.p-button-text:not(:disabled):hover' },
  { label: '.p-button-text :active', selector: '.p-button.p-button-text:not(:disabled):active' },
];

function declsFor(selector: string): Array<[string, string]> {
  const found = rules.filter((r) => r.selector.split(',').some((s) => s.trim() === selector));
  expect(found.length, selector).toBeGreaterThan(0);
  return found.flatMap((r) => r.decls);
}

/** Split on commas at paren depth 0. */
function splitTop(value: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '(') depth++;
    else if (value[i] === ')') depth--;
    else if (value[i] === ',' && depth === 0) {
      out.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  out.push(value.slice(start).trim());
  return out;
}

const MIX = /^color-mix\(in srgb, var\((--[\w-]+)\) ([\d.]+)%, transparent\)$/;
const lengthPx = (v: string) => (v.endsWith('rem') ? parseFloat(v) * 16 : parseFloat(v) || 0);

/**
 * Translucent layers painted under the text, bottom to top: the background-color, then any inset
 * shadow big enough to cover the label (an offset or spread ≥ 8px — a 1–2px inset ring sits on the
 * edge, not under the text).
 */
function layers(selector: string): Array<{ name: string; alpha: number }> {
  const out: Array<{ name: string; alpha: number }> = [];
  for (const [prop, value] of declsFor(selector)) {
    if (prop === 'background-color') {
      const m = MIX.exec(value);
      if (m) out.push({ name: m[1]!, alpha: Number(m[2]) / 100 });
      else
        expect(value, `${selector} background-color`).toMatch(/^(transparent|var\(--theme-button-hover-fill-color\))$/);
    }
    if (prop === 'box-shadow')
      for (const shadow of splitTop(value)) {
        if (!shadow.startsWith('inset')) continue;
        const colour = shadow.slice(shadow.indexOf('color-mix'));
        const lengths = shadow.slice(5, shadow.indexOf('color-mix')).trim().split(/\s+/).map(lengthPx);
        const covers = Math.max(...lengths.map(Math.abs)) >= 8;
        const m = MIX.exec(colour);
        if (covers && m && Number(m[2]) > 0) out.push({ name: m[1]!, alpha: Number(m[2]) / 100 });
      }
  }
  return out;
}

/** CSS compositing of a translucent colour over an opaque ground, in sRGB. */
function over(ground: string, color: string, alpha: number): string {
  const g = hexToRgb(ground);
  const c = hexToRgb(color);
  return rgbToHex({ r: g.r + alpha * (c.r - g.r), g: g.g + alpha * (c.g - g.g), b: g.b + alpha * (c.b - g.b) });
}

type Preset = { id: string; primary: ColorSources['primary']; secondary: ColorSources['secondary'] };
const presets: Preset[] = [
  { id: 'default', primary: DEFAULT_COLOR_SOURCES.primary, secondary: DEFAULT_COLOR_SOURCES.secondary },
  ...(presetsJson as { presets: Preset[] }).presets,
];

/** The active names a mode resolves, from the builders (what the runtime writes for the preset). */
function activeVars(preset: Preset, mode: Mode): Record<string, string> {
  const sources = { ...DEFAULT_COLOR_SOURCES, primary: preset.primary, secondary: preset.secondary };
  const variations = buildColorVariations(sources, DEFAULT_PAPER_INK);
  const inks = buildPrimaryInkTokens(sources, DEFAULT_PAPER_INK);
  const washes = buildWashTokens(variations, inks, DEFAULT_PAPER_INK);
  const out: Record<string, string> = {};
  for (const [name, hex] of Object.entries({ ...variations, ...inks, ...washes }))
    if (name.endsWith(`-${mode}-color`)) out[name.replace(`-${mode}-color`, '-color')] = hex;
  return out;
}

describe('hover / active washes under primary-ink text (≥ 4.5:1)', () => {
  it('the wash alpha is one constant the stylesheet uses', () => {
    expect(WASH_ALPHA).toBeGreaterThan(0.1);
    expect(WASH_ALPHA).toBeLessThanOrEqual(0.24);
  });

  it('ink on every hover / active wash, over every text ground: defaults and all 21 presets, both modes', () => {
    expect(presets).toHaveLength(22);
    const failures: string[] = [];
    for (const preset of presets)
      for (const mode of MODES) {
        const v = activeVars(preset, mode);
        const ink = v['--theme-primary-ink-color']!;
        for (const { label, selector } of STATES)
          for (const ground of textGroundsFor(DEFAULT_PAPER_INK[mode], mode)) {
            let bg = ground;
            for (const layer of layers(selector)) {
              const hex = v[layer.name];
              expect(hex, `${label}: ${layer.name} resolves`).toMatch(/^#[0-9a-f]{6}$/);
              bg = over(bg, hex!, layer.alpha);
            }
            const r = contrast(ink, bg);
            if (r < 4.5) failures.push(`${preset.id} ${mode} ${label} on ${ground}: ${r.toFixed(2)}`);
          }
      }
    expect(failures).toEqual([]);
  });

  it('hover is not colour-only: an inset ring, an underline or a lift', () => {
    const cue = (decls: Array<[string, string]>) =>
      decls.some(
        ([p, v]) =>
          (p === 'box-shadow' && /inset 0 0 0 \d/.test(v)) ||
          (p.startsWith('text-decoration') && /underline/.test(v)) ||
          (p === 'transform' && /translateY\(-/.test(v)) ||
          (p === 'box-shadow' && v.includes('var(--button-shadow-hover)'))
      );
    for (const { label, selector } of STATES.filter((s) => s.selector.endsWith(':hover')))
      expect(cue(declsFor(selector)), label).toBe(true);
    // Ghost and text buttons have no lift: they underline.
    for (const selector of ['.btn[data-variant=ghost]:hover', '.p-button.p-button-text:not(:disabled):hover'])
      expect(
        declsFor(selector).some(([p, v]) => p.startsWith('text-decoration') && v.includes('underline')),
        selector
      ).toBe(true);
    // `a.btn:hover { text-decoration: none }` must not cancel the ghost underline on links.
    expect(css).toMatch(/a\.btn:is\(\[data-variant=ghost\], \.btn--ghost, \.ghost\):hover/);
  });

  it('the stylesheet declares the per-mode wash defaults and points the active name at the mode’s one', () => {
    const root = parseRules(compileRootCss());
    const decl = (pick: (s: string) => boolean, name: string) =>
      root.filter((r) => pick(r.selector)).flatMap((r) => r.decls.filter(([n]) => n === name).map(([, v]) => v));
    const vars = buildColorVariations(DEFAULT_COLOR_SOURCES, DEFAULT_PAPER_INK);
    const washes = buildWashTokens(
      vars,
      buildPrimaryInkTokens(DEFAULT_COLOR_SOURCES, DEFAULT_PAPER_INK),
      DEFAULT_PAPER_INK
    );
    for (const c of ['primary', 'secondary']) {
      for (const mode of MODES)
        expect(decl((s) => s === ':root', `--theme-${c}-wash-${mode}-color`)).toContain(
          washes[`--theme-${c}-wash-${mode}-color`]
        );
      expect(decl((s) => s === ':root', `--theme-${c}-wash-color`)).toContain(`var(--theme-${c}-wash-dark-color)`);
      expect(decl((s) => s.includes('light'), `--theme-${c}-wash-color`)).toContain(
        `var(--theme-${c}-wash-light-color)`
      );
    }
  });
});

describe('dark --theme-button-hover-fill-color (was light-only: dark hover painted transparent)', () => {
  const root = parseRules(compileRootCss());
  const decl = (pick: (s: string) => boolean, name: string) =>
    root.filter((r) => pick(r.selector)).flatMap((r) => r.decls.filter(([n]) => n === name).map(([, v]) => v));

  it('is declared on :root (dark) as the dark fill, and light keeps the white-text primary fill', () => {
    expect(decl((s) => s === ':root', '--theme-button-hover-fill-color')).toEqual(['var(--theme-button-fill-color)']);
    expect(decl((s) => s === ':root', '--theme-button-fill-color')).toEqual(['var(--theme-primary-color)']);
    expect(decl((s) => s.includes('light'), '--theme-button-hover-fill-color')).toContain(
      'var(--theme-primary-fill-color)'
    );
  });

  it('dark button text reads ≥ 4.5:1 on that fill: defaults and all 21 presets', () => {
    for (const preset of presets) {
      const sources = { ...DEFAULT_COLOR_SOURCES, primary: preset.primary, secondary: preset.secondary };
      const variations = buildColorVariations(sources, DEFAULT_PAPER_INK);
      const fill = variations['--theme-primary-dark-color']!;
      const text = buildButtonInkTokens(variations)['--theme-button-fg-dark-color']!;
      expect(contrast(text, fill), preset.id).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('soft / glass keep their own ground on hover / active (not the primary hover fill)', () => {
  // `.btn:hover` / `.btn:active` (button-base) paint `--theme-button-hover-fill-color`; soft and glass
  // keep text-colour labels, so that fill under them read 3.25–4.02:1. Their hover / active must reset it.
  for (const variant of ['soft', 'glass'])
    for (const state of [':hover', ':active'])
      it(`${variant}${state}`, () => {
        const decls = declsFor(`.btn[data-variant=${variant}]${state}`);
        expect(decls.filter(([p]) => p === 'background-color').map(([, v]) => v)).toEqual(['transparent']);
      });
});
