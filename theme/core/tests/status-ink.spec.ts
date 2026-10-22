import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { contrast, mixOklab } from '../src/color-mix';
import {
  buildColorVariations,
  buildStatusInkTokens,
  DEFAULT_COLOR_SOURCES,
  STATUS_COLORS,
  STATUS_INK_MIX,
  STATUS_INK_TARGET,
  textGroundsFor,
} from '../src/color-variations';
import { checkPaperInk, DEFAULT_PAPER_INK, NEUTRAL_ROLE_STEPS, neutralStep, type PaperInkPair } from '../src/paper-ink';
import { compileRootCss, parseRules } from './helpers/css-decls.js';

/**
 * Status inks (`--theme-{success,warning,error,info}-ink-color`) are text: ≥ 4.5:1 on every ground
 * text sits on (page, secondary page, surface, variant) for any paper / ink pair whose body text,
 * secondary text and borders pass `checkPaperInk`. Before this, they were stylesheet `color-mix()`es
 * of the status variation toward the text colour, which can drop to ~3.5:1 for a custom pair even
 * after the variations are recomputed — so they are builder-computed per mode, like primary-ink.
 */
type Mode = 'light' | 'dark';
const MODES = ['light', 'dark'] as const;
const worst = (fg: string, pair: PaperInkPair, mode: Mode) =>
  Math.min(...textGroundsFor(pair, mode).map((g) => contrast(fg, g)));

/** The pre-builder stylesheet: `color-mix(in oklab, <status variation> N%, var(--theme-text-color))`. */
const OLD_MIX: Record<Mode, Record<(typeof STATUS_COLORS)[number], number>> = {
  light: { success: 100, warning: 70, error: 90, info: 100 },
  dark: { success: 80, warning: 100, error: 80, info: 90 },
};

/** Deterministic custom pairs that pass the body-text / secondary-text / border rows of `checkPaperInk`. */
function customPairs(count: number): Array<{ mode: Mode; pair: PaperInkPair }> {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const hex = (lo: number, hi: number) =>
    '#' +
    [0, 1, 2]
      .map(() =>
        Math.round(lo + rnd() * (hi - lo))
          .toString(16)
          .padStart(2, '0')
      )
      .join('');
  const out: Array<{ mode: Mode; pair: PaperInkPair }> = [
    // Worst pairs found by the analysis in the colour follow-ups report.
    { mode: 'dark', pair: { paper: '#2a3814', ink: '#f9fae0' } },
    { mode: 'light', pair: { paper: '#c9c8f6', ink: '#0b0303' } },
    { mode: 'light', pair: { paper: '#d4c9ce', ink: '#08171d' } },
    { mode: 'light', pair: { paper: '#e9dee2', ink: '#31082f' } },
  ];
  const base = new Set(['text', 'text-secondary', 'border-strong']);
  for (let i = 0; out.length < count && i < 20 * count; i++) {
    const mode: Mode = i % 2 ? 'light' : 'dark';
    const pair =
      mode === 'light' ? { paper: hex(200, 255), ink: hex(0, 70) } : { paper: hex(0, 60), ink: hex(190, 255) };
    if (
      checkPaperInk(pair, mode)
        .filter((c) => base.has(c.id))
        .every((c) => c.pass)
    )
      out.push({ mode, pair });
  }
  return out;
}

describe('status ink (--theme-<status>-ink-{light,dark}-color)', () => {
  const defaults = buildStatusInkTokens(DEFAULT_COLOR_SOURCES, DEFAULT_PAPER_INK);

  it('names one per status per mode, and targets body-text contrast', () => {
    expect(STATUS_INK_TARGET).toBe(4.5);
    expect([...STATUS_COLORS]).toEqual(['success', 'warning', 'error', 'info']);
    expect(Object.keys(defaults).sort()).toEqual(
      STATUS_COLORS.flatMap((s) => MODES.map((m) => `--theme-${s}-ink-${m}-color`)).sort()
    );
    expect(STATUS_INK_MIX).toEqual(OLD_MIX);
  });

  it('defaults are unchanged: the old color-mix start, which already reads ≥ 4.5:1 on every text ground', () => {
    const vars = buildColorVariations(DEFAULT_COLOR_SOURCES, DEFAULT_PAPER_INK);
    for (const mode of MODES) {
      const pair = DEFAULT_PAPER_INK[mode];
      const text = neutralStep(pair, NEUTRAL_ROLE_STEPS[mode]['--theme-text-color']);
      for (const s of STATUS_COLORS) {
        const hue = vars[`--theme-${s}-${mode}-color`]!;
        const old = OLD_MIX[mode][s] >= 100 ? hue : mixOklab(hue, OLD_MIX[mode][s], text);
        expect(defaults[`--theme-${s}-ink-${mode}-color`], `${s} ${mode}`).toBe(old.toLowerCase());
        expect(worst(old, pair, mode), `${s} ${mode}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('every custom pair that passes checkPaperInk’s text and border rows: ≥ 4.5:1 on page, surfaces and variant', () => {
    const pairs = customPairs(300);
    expect(pairs.length).toBe(300);
    const failures: string[] = [];
    for (const { mode, pair } of pairs) {
      const tokens = buildStatusInkTokens(DEFAULT_COLOR_SOURCES, { ...DEFAULT_PAPER_INK, [mode]: pair });
      for (const s of STATUS_COLORS) {
        const r = worst(tokens[`--theme-${s}-ink-${mode}-color`]!, pair, mode);
        if (r < 4.5) failures.push(`${mode} ${s} ${pair.paper}/${pair.ink} ${r.toFixed(2)}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('the old color-mix definition did not hold for those pairs (why the role is builder-computed)', () => {
    const { mode, pair } = { mode: 'light' as const, pair: { paper: '#c9c8f6', ink: '#0b0303' } };
    const vars = buildColorVariations(DEFAULT_COLOR_SOURCES, { ...DEFAULT_PAPER_INK, [mode]: pair });
    expect(worst(vars['--theme-success-light-color']!, pair, mode)).toBeLessThan(4.5);
  });

  it('keeps the committed Sass defaults in sync', () => {
    const scss = readFileSync(join(import.meta.dirname, '../scss/tokens/_variations.generated.scss'), 'utf8');
    for (const [name, hex] of Object.entries(defaults)) expect(scss).toContain(`$${name.slice(2)}: ${hex};`);
  });

  it('the stylesheet declares the per-mode defaults and points the active name at the mode’s one', () => {
    const rules = parseRules(compileRootCss());
    const decl = (selector: (s: string) => boolean, name: string) =>
      rules.filter((r) => selector(r.selector)).flatMap((r) => r.decls.filter(([n]) => n === name).map(([, v]) => v));
    const isRoot = (s: string) => s === ':root';
    const isLight = (s: string) => s.includes('light');
    for (const s of STATUS_COLORS) {
      for (const mode of MODES)
        expect(decl(isRoot, `--theme-${s}-ink-${mode}-color`), `${s} ${mode}`).toContain(
          defaults[`--theme-${s}-ink-${mode}-color`]
        );
      expect(decl(isRoot, `--theme-${s}-ink-color`), `${s} dark`).toContain(`var(--theme-${s}-ink-dark-color)`);
      expect(decl(isLight, `--theme-${s}-ink-color`), `${s} light`).toContain(`var(--theme-${s}-ink-light-color)`);
    }
  });
});

describe('checkPaperInk status-ink rows (Style Studio shows them)', () => {
  it('adds one row per status ink: worst ratio on page, surface and variant, min 4.5', () => {
    for (const mode of MODES) {
      const pair = DEFAULT_PAPER_INK[mode];
      const rows = checkPaperInk(pair, mode);
      const tokens = buildStatusInkTokens(DEFAULT_COLOR_SOURCES, DEFAULT_PAPER_INK);
      for (const s of STATUS_COLORS) {
        const row = rows.find((r) => r.id === `${s}-ink`);
        expect(row, `${mode} ${s}`).toBeDefined();
        expect(row!.min).toBe(4.5);
        expect(row!.pass).toBe(true);
        const hex = tokens[`--theme-${s}-ink-${mode}-color`]!;
        const grounds = [0, 50, mode === 'light' ? 100 : 75].map((step) => neutralStep(pair, step));
        expect(row!.ratio).toBeCloseTo(Math.min(...grounds.map((g) => contrast(hex, g))), 2);
      }
    }
  });

  it('flags a pair whose status ink cannot reach 4.5:1', () => {
    const rows = checkPaperInk({ paper: '#6a6a6a', ink: '#ffffff' }, 'dark');
    expect(rows.filter((r) => r.id.endsWith('-ink') && !r.pass).length).toBeGreaterThan(0);
  });
});
