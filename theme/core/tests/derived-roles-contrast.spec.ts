import { describe, expect, it } from 'vitest';

import { Color } from '../src/color';
import { contrast, mixOklab } from '../src/color-mix';
import {
  buildButtonInkTokens,
  buildButtonStopTokens,
  buildColorVariations,
  buildLinkTokens,
  buildPrimaryFillTokens,
  buildStatusInkTokens,
  BUTTON_INK_TARGET,
  compositeOver,
  DEFAULT_COLOR_SOURCES,
  gradientColorsOver,
  gradientStopFor,
  LINK_WASH_ALPHAS,
  linkInkFor,
  onPrimaryFor,
  SECONDARY_SHEEN_ALPHAS,
  textGroundsFor,
  type ColorSources,
} from '../src/color-variations';
import {
  checkPaperInk,
  DEFAULT_PAPER_INK,
  NEUTRAL_ROLE_STEPS,
  neutralStep,
  type PaperInkMode,
  type PaperInkPair,
} from '../src/paper-ink';
import presetsJson from '../src/theme-presets.json' with { type: 'json' };

/**
 * Rule 3 derived roles keep their contrast targets on their real grounds — defaults, all 21
 * presets, and 300 random picks on random paper / ink pairs that pass `checkPaperInk` — in both
 * modes. Each role is computed the way the stylesheet / runtime derives it.
 */
type Mode = PaperInkMode;
const MODES = ['light', 'dark'] as const;
type Pairs = Record<Mode, PaperInkPair>;
type Scenario = { id: string; sources: ColorSources; pairs: Pairs };

type Preset = { id: string; primary: ColorSources['primary']; secondary: ColorSources['secondary'] };
const presets = (presetsJson as { presets: Preset[] }).presets;

let seed = 20261005;
const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const randHsl = (lo: number, hi: number, sMax = 60) =>
  Color.hslToHex(rnd() * 360, rnd() * sMax, lo + rnd() * (hi - lo)).toLowerCase();
function randomScenarios(count: number): Scenario[] {
  const out: Scenario[] = [];
  for (let tries = 0; out.length < count && tries < 100_000; tries++) {
    const light = { paper: randHsl(82, 100), ink: randHsl(0, 30) };
    const dark =
      rnd() < 0.4 ? { paper: light.ink, ink: light.paper } : { paper: randHsl(0, 20), ink: randHsl(78, 100) };
    const pairs = { light, dark };
    if (!MODES.every((m) => checkPaperInk(pairs[m], m).every((r) => r.pass))) continue;
    const pick = () => {
      const h = randHsl(0, 100, 100);
      return { light: h, dark: h };
    };
    out.push({
      id: `random ${out.length}`,
      sources: { ...DEFAULT_COLOR_SOURCES, primary: pick(), secondary: pick() },
      pairs,
    });
  }
  return out;
}

const SETS: Array<[string, Scenario[]]> = [
  ['defaults', [{ id: 'default', sources: DEFAULT_COLOR_SOURCES, pairs: DEFAULT_PAPER_INK }]],
  [
    'presets',
    presets.map((p) => ({
      id: p.id,
      sources: { ...DEFAULT_COLOR_SOURCES, primary: p.primary, secondary: p.secondary },
      pairs: DEFAULT_PAPER_INK,
    })),
  ],
  ['random', randomScenarios(300)],
];

/** Everything a role needs for one scenario and mode. */
function resolve({ sources, pairs }: Scenario, mode: Mode) {
  const v = buildColorVariations(sources, pairs);
  const pair = pairs[mode];
  const n = (step: number) => neutralStep(pair, step);
  const steps = NEUTRAL_ROLE_STEPS[mode];
  const fill = buildPrimaryFillTokens(v)[`--theme-primary-fill-${mode}-color`]!;
  const stops = buildButtonStopTokens(v);
  const darkLabel = buildButtonInkTokens(v)['--theme-button-fg-dark-color']!;
  return {
    grounds: textGroundsFor(pair, mode),
    pair,
    text: n(steps['--theme-text-color']),
    textSecondary: n(steps['--theme-text-secondary-color']),
    placeholder: n(750),
    link: buildLinkTokens(sources, pairs)[`--theme-link-${mode}-color`]!,
    errorInk: buildStatusInkTokens(sources, pairs)[`--theme-error-ink-${mode}-color`]!,
    onPrimary: onPrimaryFor(v),
    fillLight: buildPrimaryFillTokens(v)['--theme-primary-fill-light-color']!,
    fillDark: buildPrimaryFillTokens(v)['--theme-primary-fill-dark-color']!,
    // The solid button per mode: dark the primary variation under the dark label, light the fill under the paper.
    buttonFill: mode === 'dark' ? v['--theme-primary-dark-color']! : fill,
    buttonLabel: mode === 'dark' ? darkLabel : onPrimaryFor(v),
    primary: v[`--theme-primary-${mode}-color`]!,
    secondaryFill: stops[`--theme-secondary-fill-${mode}-color`]!,
    secondaryInverted: stops[`--theme-secondary-inverted-${mode}-color`]!,
    primarySheen: stops[`--theme-primary-sheen-${mode}-color`]!,
    success: v[`--theme-success-${mode}-color`]!,
    successBackground: v[`--theme-success-${mode}-background-color`]!,
  };
}
type Resolved = ReturnType<typeof resolve>;

const worst = (fg: string, grounds: readonly string[]) => Math.min(...grounds.map((g) => contrast(fg, g)));
const over = (ground: string, color: string, alpha: number) => compositeOver(ground, color, alpha);
const formGround = (r: Resolved, mode: Mode, g: string) =>
  mode === 'light' ? over(g, r.pair.ink, 0.04) : over(g, r.pair.paper, 0.48);

/** role → [target, worst ratio on its real grounds]. */
const ROLES: Record<string, (r: Resolved, mode: Mode) => [number, number]> = {
  '--theme-link-color on page / surfaces': (r) => [4.5, worst(r.link, r.grounds)],
  '--theme-link-color (= --portfolio-rose-color) on its 12 % / 16 % washes': (r) => [
    4.5,
    worst(
      r.link,
      r.grounds.flatMap((g) => LINK_WASH_ALPHAS.map((a) => over(g, r.link, a)))
    ),
  ],
  '--portfolio-rose-strong-color (OKLab link → text) on page and the 16 % pill wash': (r, mode) => {
    const strong = mixOklab(r.link, mode === 'light' ? 85 : 50, r.text);
    return [4.5, worst(strong, [...r.grounds, ...r.grounds.map((g) => over(g, r.link, 0.16))])];
  },
  '--theme-on-primary-color on the light primary fill': (r) => [4.5, contrast(r.onPrimary, r.fillLight)],
  '--theme-on-primary-color on the dark primary fill': (r) => [4.5, contrast(r.onPrimary, r.fillDark)],
  '--theme-primary-hover-color (the button fill) under its label': (r) => [4.5, contrast(r.buttonLabel, r.buttonFill)],
  // Opaque: the `.btn` solid / PrimeVue fallback sheen; 50 %: `--button-bg` (dark only — light is `none`).
  'resting sheen secondary-fill → primary (opaque, and dark --button-bg 50 %)': (r, mode) => [
    4.5,
    Math.min(
      worst(
        r.buttonLabel,
        gradientColorsOver(r.buttonFill, { color: r.secondaryFill, alpha: 1 }, { color: r.buttonFill, alpha: 1 })
      ),
      mode === 'dark'
        ? worst(
            r.buttonLabel,
            gradientColorsOver(r.buttonFill, { color: r.secondaryFill, alpha: 0.5 }, { color: r.primary, alpha: 0.5 })
          )
        : Infinity
    ),
  ],
  'hover sheen --theme-secondary-inverted-color → primary': (r) => [
    4.5,
    worst(
      r.buttonLabel,
      gradientColorsOver(r.buttonFill, { color: r.secondaryInverted, alpha: 1 }, { color: r.buttonFill, alpha: 1 })
    ),
  ],
  '--button-secondary-bg over --theme-secondary-fill-color (Foundation .button.secondary)': (r) => [
    4.5,
    worst(
      r.buttonLabel,
      gradientColorsOver(
        r.secondaryFill,
        { color: r.secondaryFill, alpha: SECONDARY_SHEEN_ALPHAS.from },
        { color: r.primarySheen, alpha: SECONDARY_SHEEN_ALPHAS.to }
      )
    ),
  ],
  'text on --theme-form-background-color': (r, mode) => [
    4.5,
    worst(
      r.text,
      r.grounds.map((g) => formGround(r, mode, g))
    ),
  ],
  '--theme-form-placeholder-color (neutral 750) on the form ground': (r, mode) => [
    4.5,
    worst(
      r.placeholder,
      r.grounds.map((g) => formGround(r, mode, g))
    ),
  ],
  '--theme-form-help-color (secondary text) on page / surfaces': (r) => [4.5, worst(r.textSecondary, r.grounds)],
  '--theme-form-invalid-color (error ink) text on page / surfaces': (r) => [4.5, worst(r.errorInk, r.grounds)],
  '--theme-form-invalid-color border on the form ground': (r, mode) => [
    3,
    worst(
      r.errorInk,
      r.grounds.map((g) => formGround(r, mode, g))
    ),
  ],
  '/about teal button: its paired text on its fill': (r, mode) => [
    4.5,
    mode === 'light' ? contrast(r.pair.paper, r.success) : contrast(r.pair.ink, r.successBackground),
  ],
};

describe('rule 3 derived roles reach their contrast targets', () => {
  it('builds 300 random pairs that pass checkPaperInk', () => {
    expect(SETS[2]![1]).toHaveLength(300);
    expect(SETS[1]![1]).toHaveLength(21);
  });

  for (const [setName, scenarios] of SETS)
    it(`${setName}: every role, both modes`, () => {
      const failures: string[] = [];
      for (const scenario of scenarios)
        for (const mode of MODES) {
          const r = resolve(scenario, mode);
          for (const [role, check] of Object.entries(ROLES)) {
            const [target, ratio] = check(r, mode);
            if (ratio < target) failures.push(`${scenario.id} ${mode} ${role}: ${ratio.toFixed(2)} < ${target}`);
          }
        }
      expect(failures).toEqual([]);
    }, 30_000); // 300 random pairs × 2 modes: ~7 s on CI runners

  it('defaults: the owner-approved values', () => {
    const light = resolve(SETS[0]![1][0]!, 'light');
    const dark = resolve(SETS[0]![1][0]!, 'dark');
    expect([light.link, dark.link]).toEqual(['#883412', '#e96a72']);
    expect(light.onPrimary).toBe('#faf6f3');
    expect(light.fillLight).toBe('#be4919');
    expect(contrast(light.onPrimary, light.fillLight)).toBeGreaterThanOrEqual(BUTTON_INK_TARGET);
    expect(mixOklab(light.link, 85, light.text)).toBe('#762f15');
    expect(mixOklab(dark.link, 50, dark.text)).toBe('#f3afae');
  });

  it('linkInkFor keeps a passing source and moves only lightness otherwise', () => {
    const grounds = textGroundsFor(DEFAULT_PAPER_INK.light, 'light');
    expect(linkInkFor('#0f0908', grounds)).toBe('#0f0908');
    const moved = linkInkFor('#d9531d', grounds);
    expect(moved).not.toBe('#d9531d');
    expect(Color.create(moved).h).toBeCloseTo(Color.create('#d9531d').h, 0);
    expect(Color.create(moved).s).toBeCloseTo(Color.create('#d9531d').s, 0);
  });

  it('gradientColorsOver samples the painted colours; gradientStopFor keeps a passing stop', () => {
    const points = gradientColorsOver('#000000', { color: '#ffffff', alpha: 1 }, { color: '#ffffff', alpha: 0 });
    expect(points[0]).toBe('#ffffff');
    expect(points.at(-1)).toBe('#000000');
    const uses = [{ alpha: 1, other: { color: '#202020', alpha: 1 } }];
    expect(gradientStopFor('#101010', uses, '#202020', '#ffffff')).toBe('#101010');
    const moved = gradientStopFor('#e0e0ff', uses, '#202020', '#ffffff');
    expect(
      Math.min(
        ...gradientColorsOver('#202020', { color: moved, alpha: 1 }, uses[0]!.other).map((g) => contrast('#ffffff', g))
      )
    ).toBeGreaterThanOrEqual(4.5);
  });
});
