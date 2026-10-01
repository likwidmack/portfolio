import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { contrast, mixOklab } from '../src/color-mix';
import colors from '../src/colors.json';
import {
  DEFAULT_PAPER_INK,
  NEUTRAL_ROLE_STEPS,
  PAPER_INK_ALPHA_STEPS,
  checkPaperInk,
  invertPaperInk,
  neutralStep,
} from '../src/paper-ink';
import { Theme } from '../src/theme';
import { DERIVED_ROLE_TOKENS, getInlineTokensForMode } from '../src/tokens';

/**
 * Five-input colour model: the app sets primary, secondary, accent, paper and ink; the theme
 * derives the neutral scale (paper → ink), surfaces, text, borders and status tones.
 * Sass (build-time defaults → colors.json), CSS (runtime color-mix) and `src/color-mix.ts`
 * must agree, and every derived pair must pass WCAG AA in both modes.
 */
const root = readFileSync(join(import.meta.dirname, '../scss/globals/_root.scss'), 'utf8');
const css = colors.cssVariables as Record<'dark' | 'light', Record<string, string>>;
const pairOf = (mode: 'dark' | 'light') => ({ paper: css[mode]['--paper']!, ink: css[mode]['--ink']! });
const neutral = (mode: 'dark' | 'light', step: number) => neutralStep(pairOf(mode), step);
const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const close = (a: string, b: string) => {
  const [x, y] = [channels(a), channels(b)];
  return x.every((v, i) => Math.abs(v - y[i]!) <= 1);
};

// Role → neutral step, per mode (must match globals/_root.scss and tokens/_colors.scss).
const ROLES = NEUTRAL_ROLE_STEPS;
type Status = 'success' | 'warning' | 'error' | 'info';
// Status ink = <percent> of the status hue mixed toward the mode's text colour.
const STATUS_INK: Record<'dark' | 'light', Record<Status, number>> = {
  dark: { success: 80, warning: 100, error: 80, info: 90 },
  light: { success: 100, warning: 70, error: 90, info: 100 },
};
const STATUS_HUE: Record<'dark' | 'light', Record<Status, string>> = {
  dark: { success: '#1b7a7a', warning: '#ff8c61', error: '#c1440e', info: '#0288d1' },
  light: { success: '#146060', warning: '#c26a1f', error: '#b33a0f', info: '#0a0aef' },
};

/** Build-time (Sass → colors.json) value of a role. */
function built(mode: 'dark' | 'light', role: string): string {
  if (role === '--main-background') return colors.theme[mode].background;
  if (role === '--main-background-secondary') return colors.theme[mode].backgroundSecondary;
  if (role === '--text-color') return colors.theme[mode].text;
  return css[mode][role]!;
}

describe('five-input colour model', () => {
  it('pen & paper: paper is the background and ink the foreground, one pair per mode', () => {
    expect(root).toMatch(/--paper: #\{\$dark-paper\};/);
    expect(root).toMatch(/--ink: #\{\$dark-ink\};/);
    expect(root).toMatch(/theme-light-vars \{[\s\S]*?--paper: #\{\$light-paper\};[\s\S]*?--ink: #\{\$light-ink\};/);
    expect(pairOf('light')).toEqual(DEFAULT_PAPER_INK.light);
    expect(pairOf('dark')).toEqual(DEFAULT_PAPER_INK.dark);
    expect(invertPaperInk(DEFAULT_PAPER_INK.light)).toEqual(DEFAULT_PAPER_INK.dark);
    for (const mode of ['dark', 'light'] as const) {
      expect(ROLES[mode]['--main-background']).toBe(0);
      expect(ROLES[mode]['--text-color']).toBeGreaterThan(900);
    }
  });

  it('exposes alpha variants of paper and ink (mode-relative)', () => {
    for (const c of ['paper', 'ink'])
      for (const a of PAPER_INK_ALPHA_STEPS)
        expect(root).toContain(`--${c}-a${a}: color-mix(in srgb, var(--${c}) ${a}%, transparent);`);
    expect(root).toContain('--border-color: var(--ink-a8);');
  });

  it('derives the neutral scale in CSS with the same maths as Sass and the JS mirror', () => {
    const steps = [
      ...root.matchAll(/--neutral-(\d+): color-mix\(in oklab, var\(--ink\) ([\d.]+)%, var\(--paper\)\);/g),
    ];
    expect(steps.length).toBeGreaterThanOrEqual(15);
    for (const [, step, percent] of steps) expect(Number(percent)).toBe(Number(step) / 10);
    expect(root).toContain('--neutral-0: var(--paper);');
    expect(root).toContain('--neutral-1000: var(--ink);');
  });

  for (const mode of ['dark', 'light'] as const) {
    describe(`${mode} mode`, () => {
      const lightStart = root.indexOf('@mixin theme-light-vars');
      const block = mode === 'dark' ? root.slice(0, lightStart) : root.slice(lightStart);

      it('maps each role to its neutral step (CSS) and the Sass default matches', () => {
        for (const [role, step] of Object.entries(ROLES[mode])) {
          expect(block, `${role} → neutral-${step}`).toContain(`${role}: var(--neutral-${step});`);
          expect(
            close(built(mode, role), neutral(mode, step)),
            `${role}: Sass ${built(mode, role)} vs ${neutral(mode, step)}`
          ).toBe(true);
        }
      });

      it('derives status inks with the same percentages in Sass and CSS', () => {
        const text = neutral(mode, ROLES[mode]['--text-color']);
        for (const [status, percent] of Object.entries(STATUS_INK[mode]) as Array<[Status, number]>) {
          const expected = mixOklab(STATUS_HUE[mode][status], percent, text);
          expect(close(css[mode][`--${status}-ink`]!, expected), `${status}-ink`).toBe(true);
          const decl =
            percent === 100
              ? `--${status}-ink: var(--${status});`
              : `--${status}-ink: color-mix(in oklab, var(--${status}) ${percent}%, var(--text-color));`;
          expect(block, decl).toContain(decl);
        }
        expect(css[mode]['--danger-ink']).toBe(css[mode]['--error-ink']);
      });

      it('passes WCAG AA for every derived pair', () => {
        const r = Object.fromEntries(Object.entries(ROLES[mode]).map(([k, v]) => [k, neutral(mode, v)])) as Record<
          string,
          string
        >;
        for (const ground of [r['--main-background']!, r['--surface-color']!, r['--surface-variant']!]) {
          expect(contrast(r['--text-color']!, ground)).toBeGreaterThanOrEqual(4.5);
          expect(contrast(r['--text-secondary-color']!, ground)).toBeGreaterThanOrEqual(4.5);
          for (const status of Object.keys(STATUS_INK[mode])) {
            expect(
              contrast(css[mode][`--${status}-ink`]!, ground),
              `${status}-ink on ${ground}`
            ).toBeGreaterThanOrEqual(4.5);
          }
        }
        // Control boundaries ≥ 3:1 (WCAG 1.4.11).
        expect(contrast(r['--border-strong']!, r['--surface-color']!)).toBeGreaterThanOrEqual(3);
        expect(contrast(r['--border-strong']!, r['--main-background']!)).toBeGreaterThanOrEqual(3);
        // Status ink on its tinted surface (14% hue over the surface).
        for (const [status, hue] of Object.entries(STATUS_HUE[mode])) {
          const tint = mixOklab(hue, 14, r['--surface-color']!);
          expect(
            contrast(css[mode][`--${status}-ink`]!, tint),
            `${status}-ink on ${status}-surface`
          ).toBeGreaterThanOrEqual(4.5);
        }
      });
    });
  }

  it('never writes derived roles inline, so live paper / ink changes reach them', () => {
    for (const mode of ['dark', 'light'] as const) {
      const inline = getInlineTokensForMode(mode);
      for (const role of DERIVED_ROLE_TOKENS) expect(inline[role], `${mode} ${role}`).toBeUndefined();
      expect(inline['--link-color']).toBeTruthy();
    }
  });

  it('Theme accepts paper / ink and never overrides the focus-ring contrast role', () => {
    const tokens = Theme.create('five-input-test', {
      colors: { primary: '#dc4256', paper: '#fffdf8', ink: '#101010' },
    });
    expect(tokens['--paper']).toBe('#fffdf8');
    expect(tokens['--ink']).toBe('#101010');
    expect(tokens['--focus-ring']).toBeUndefined();
  });

  it('other paper / ink pairs (and their inverse) still yield AA text, secondary text and borders', () => {
    const pairs = [
      { paper: '#ffffff', ink: '#000000' },
      { paper: '#f5f0e6', ink: '#1a1a2e' },
      { paper: '#fdf6e3', ink: '#002b36' },
    ];
    for (const pair of pairs) {
      for (const check of checkPaperInk(pair, 'light'))
        expect(check.pass, `light ${check.id} ${pair.paper}`).toBe(true);
      for (const check of checkPaperInk(invertPaperInk(pair), 'dark')) {
        // Pure black paper crushes the OKLab steps: borders dip under 3:1 and Studio flags it.
        if (check.id === 'border-strong' && pair.ink === '#000000') continue;
        expect(check.pass, `dark ${check.id} ${pair.ink}`).toBe(true);
      }
    }
  });

  it('flags a low-contrast pair (and pure black paper borders in dark mode)', () => {
    const black = checkPaperInk({ paper: '#000000', ink: '#ffffff' }, 'dark');
    expect(black.find((c) => c.id === 'border-strong')!.pass).toBe(false);
    const checks = checkPaperInk({ paper: '#ffffff', ink: '#bbbbbb' }, 'light');
    expect(checks.find((c) => c.id === 'text')!.pass).toBe(false);
  });
});
