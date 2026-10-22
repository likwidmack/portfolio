import { join } from 'node:path';
import * as sass from 'sass';
import { describe, expect, it } from 'vitest';

import { contrast } from '../src/color-mix';
import { buildStatusInkTokens, DEFAULT_COLOR_SOURCES, STATUS_COLORS, textGroundsFor } from '../src/color-variations';
import { checkPaperInk, DEFAULT_PAPER_INK, type PaperInkPair } from '../src/paper-ink';
import presetsJson from '../src/theme-presets.json' with { type: 'json' };
import { parseRules } from './helpers/css-decls.js';

/**
 * Outlined status buttons (`.p-button-outlined.p-button-{success,warn,danger,info}`, `pv-outline-tone`)
 * carry real labels ("Delete" in admin cdn / messages, `/styles/parity`). The label is text, so it
 * paints the status ink (`--theme-<status>-ink-color`, ≥ 4.5:1 on page, surfaces and variant); the
 * border stays on the hue (a graphic, 3:1). Hover / active keep that ground (no wash under the ink)
 * and signal with an inset ring and the lift shadow. Before: the hue as text — dark danger 4.53 on
 * the page, 4.25 on the surface, 4.06 on the variant.
 */
type Mode = 'light' | 'dark';
const MODES = ['light', 'dark'] as const;
const themeRoot = join(import.meta.dirname, '..');
const css = sass.compileString("@use 'globals/primevue-union';", {
  loadPaths: [join(themeRoot, 'scss')],
  style: 'expanded',
  silenceDeprecations: ['slash-div', 'import'],
}).css;
const rules = parseRules(css.replace(/(^|[;{\s])(?!--)([a-z-]+)\s*:/g, '$1--prop-$2:')).map((r) => ({
  selector: r.selector,
  decls: r.decls.map(([n, v]) => [n.replace(/^--prop-/, ''), v] as [string, string]),
}));
const declsFor = (selector: string) =>
  rules.filter((r) => r.selector.split(',').some((s) => s.trim() === selector)).flatMap((r) => r.decls);

/** PrimeVue severity class → theme status. */
const TONES: Array<{ severity: string; status: (typeof STATUS_COLORS)[number] }> = [
  { severity: 'success', status: 'success' },
  { severity: 'warn', status: 'warning' },
  { severity: 'warning', status: 'warning' },
  { severity: 'danger', status: 'error' },
  { severity: 'info', status: 'info' },
];

describe('outlined status buttons: the label is the status ink, the border the hue', () => {
  for (const { severity, status } of TONES)
    it(`.p-button-outlined.p-button-${severity}`, () => {
      const base = `.p-button.p-button-outlined.p-button-${severity}`;
      const rest = declsFor(base);
      expect(rest, base).toContainEqual(['color', `var(--theme-${status}-ink-color)`]);
      expect(rest, base).toContainEqual(['border-color', `var(--theme-${status}-hue-color)`]);
      for (const state of [':not(:disabled):hover', ':not(:disabled):active']) {
        const decls = declsFor(`${base}${state}`);
        expect(decls, `${base}${state} text`).toContainEqual(['color', `var(--theme-${status}-ink-color)`]);
        // No wash under the ink: it stays on the ground it is computed for.
        expect(decls, `${base}${state} ground`).toContainEqual(['background-color', 'transparent']);
        // Not colour-only: an inset ring in the hue.
        expect(
          decls.some(([p, v]) => p === 'box-shadow' && v.includes(`inset 0 0 0 1px var(--theme-${status}-hue-color)`)),
          `${base}${state} ring`
        ).toBe(true);
      }
    });

  it('no outlined / text status rule paints its text from a hue colour', () => {
    const offenders = rules.filter(
      (r) =>
        /p-button-(success|warn|warning|danger|info)/.test(r.selector) &&
        /p-button-(outlined|text)/.test(r.selector) &&
        r.decls.some(([p, v]) => p === 'color' && /-hue-color|--theme-(success|warning|error|info)-color/.test(v))
    );
    expect(offenders.map((r) => r.selector)).toEqual([]);
  });

  it('the inks read ≥ 4.5:1 on page, secondary page, surface and variant: defaults, presets and custom pairs', () => {
    // Status sources are not preset-dependent; presets run on the default paper / ink, so the
    // defaults cover them — the custom pairs exercise the runtime recompute.
    expect((presetsJson as { presets: unknown[] }).presets).toHaveLength(21);
    const pairs: Array<{ mode: Mode; pair: PaperInkPair }> = [
      ...MODES.map((mode) => ({ mode, pair: DEFAULT_PAPER_INK[mode] })),
      { mode: 'dark', pair: { paper: '#2a3814', ink: '#f9fae0' } },
      { mode: 'light', pair: { paper: '#c9c8f6', ink: '#0b0303' } },
      { mode: 'dark', pair: { paper: '#101820', ink: '#f5f0e6' } },
    ];
    const failures: string[] = [];
    for (const { mode, pair } of pairs) {
      expect(
        checkPaperInk(pair, mode).every((c) => c.pass),
        `${mode} ${pair.paper}`
      ).toBe(true);
      const inks = buildStatusInkTokens(DEFAULT_COLOR_SOURCES, { ...DEFAULT_PAPER_INK, [mode]: pair });
      for (const s of STATUS_COLORS)
        for (const g of textGroundsFor(pair, mode)) {
          const r = contrast(inks[`--theme-${s}-ink-${mode}-color`]!, g);
          if (r < 4.5) failures.push(`${mode} ${pair.paper} ${s} on ${g}: ${r.toFixed(2)}`);
        }
    }
    expect(failures).toEqual([]);
  });
});
