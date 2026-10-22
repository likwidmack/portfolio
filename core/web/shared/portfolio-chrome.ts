/**
 * App atmosphere chrome (`--portfolio-*-color`) — the blend recipes behind `assets/css/_variables.scss`
 * and a JS mirror that resolves them (colour system, web-globals stage — R-T4b).
 *
 * Every atmosphere colour is a `color-mix(in srgb, …)` (or, for `roseStrong`, `in oklab`) of the
 * theme's active colours and roles (`--theme-{paper,ink,primary,accent,success,link,text}-color`,
 * `--theme-success-background-color`), so a Style Studio change of paper, ink or
 * the brand colours reaches the atmosphere without a rebuild. {@link PORTFOLIO_CHROME_BLENDS} is the
 * recipe table; `portfolio-chrome.spec.ts` checks that `_variables.scss` declares exactly
 * {@link portfolioBlendCss} of each recipe, and that {@link getPortfolioChrome} matches the Sass
 * dump under `assets/css/export/` for the theme's default colours.
 * UI keeps reading the CSS custom properties; this module is the parity / tooling surface.
 *
 * CSS-only (not mirrored): the translucent `--portfolio-rule-color` / `--portfolio-grid-line-color`
 * and the `--portfolio-particle-shadow-strong` shadow.
 */
import {
  buildColorVariations,
  buildLinkTokens,
  Color,
  DEFAULT_COLOR_SOURCES,
  DEFAULT_PAPER_INK,
  mixOklab,
  NEUTRAL_ROLE_STEPS,
  neutralStep,
  themeColors,
  type ThemeModeName,
} from '@tgmc/theme';

export type PortfolioChromeMode = ThemeModeName;

/** The theme colours a blend may use (the mode's active variation / role of each). */
export type PortfolioChromeInput =
  'paper' | 'ink' | 'primary' | 'accent' | 'success' | 'success-background' | 'link' | 'text';

/**
 * One input, `[a, percentOfA, b]` = `color-mix(in srgb, a percentOfA%, b)`, or
 * `[a, percentOfA, b, 'oklab']` = `color-mix(in oklab, …)`.
 */
export type PortfolioBlend =
  | PortfolioChromeInput
  | readonly [PortfolioBlend, number, PortfolioBlend]
  | readonly [PortfolioBlend, number, PortfolioBlend, 'oklab'];

export type PortfolioChrome = {
  rose: string;
  roseStrong: string;
  tealFill: string;
  onTeal: string;
  haze1: string;
  haze2: string;
  haze3: string;
  haze4: string;
  particleStrong: string;
  particleMid: string;
  particleSoft: string;
  gridGlow: string;
  teal: string;
  coral: string;
  ink: string;
  ivory: string;
};

export type PortfolioChromeKey = keyof PortfolioChrome;

/** Chrome key → its CSS custom property (`roseStrong` → `--portfolio-rose-strong-color`). */
export function portfolioChromeVariable(key: PortfolioChromeKey): string {
  return `--portfolio-${key
    .replace(/([A-Z])/g, '-$1')
    .replace(/(\D)(\d)/g, '$1-$2')
    .toLowerCase()}-color`;
}

/**
 * Blend recipes per mode, tuned so the default theme stays close to the pre-blend atmosphere
 * (before / after and ΔE: `docs/web/features/app-scss.md`). Light mode is the `:root` default.
 */
export const PORTFOLIO_CHROME_BLENDS: Readonly<
  Record<PortfolioChromeMode, Readonly<Record<PortfolioChromeKey, PortfolioBlend>>>
> = {
  light: {
    // Links: the theme link ink (≥ 4.5:1 on page, surfaces and its own washes); hover mixes it
    // toward the text colour in OKLab, so it stays ≥ 4.5:1 too.
    rose: 'link',
    roseStrong: ['link', 85, 'text', 'oklab'],
    // A teal button (/about): a status fill with its paired text — the variation reads ≥ 4.5:1 with
    // the paper (light), the `-background` variation with the ink (dark).
    tealFill: 'success',
    onTeal: 'paper',
    haze1: ['accent', 10, ['primary', 30, 'paper']],
    haze2: ['accent', 8, ['primary', 23, 'paper']],
    haze3: ['accent', 6, ['primary', 16, 'paper']],
    haze4: ['accent', 4, ['primary', 10, 'paper']],
    particleStrong: ['primary', 71, 'ink'],
    particleMid: ['accent', 31, 'primary'],
    particleSoft: ['accent', 6, ['primary', 19, 'paper']],
    gridGlow: ['accent', 4, ['primary', 12, 'paper']],
    teal: 'success',
    coral: 'accent',
    ink: 'ink',
    ivory: 'paper',
  },
  dark: {
    rose: 'link',
    roseStrong: ['link', 50, 'text', 'oklab'],
    tealFill: 'success-background',
    onTeal: 'ink',
    haze1: ['primary', 49, 'paper'],
    haze2: ['primary', 10, 'paper'],
    haze3: ['primary', 12, 'paper'],
    haze4: 'paper',
    particleStrong: ['primary', 53, 'ink'],
    particleMid: ['primary', 56, 'ink'],
    particleSoft: ['ink', 97, 'paper'],
    gridGlow: ['primary', 65, 'paper'],
    teal: ['success', 87, 'paper'],
    coral: 'accent',
    ink: ['ink', 97, 'paper'],
    ivory: 'paper',
  },
};

/** The CSS value of a blend: `var(--theme-<input>-color)` / `color-mix(in srgb, <a> <p>%, <b>)`. */
export function portfolioBlendCss(blend: PortfolioBlend): string {
  if (typeof blend === 'string') return `var(--theme-${blend}-color)`;
  const [a, percent, b, space = 'srgb'] = blend;
  return `color-mix(in ${space}, ${portfolioBlendCss(a)} ${percent}%, ${portfolioBlendCss(b)})`;
}

type Channels = [number, number, number];

function channels(hex: string): Channels {
  const rgb = Color.hexToRgb(Color.toHex(hex));
  if (!rgb) throw new Error(`portfolio-chrome: not a hex colour: ${hex}`);
  return [rgb.r, rgb.g, rgb.b];
}

/** CSS `color-mix(in srgb, …)` of opaque colours, in float channels (rounded once, at the end). */
function evaluate(blend: PortfolioBlend, inputs: Record<PortfolioChromeInput, string>): Channels {
  if (typeof blend === 'string') return channels(inputs[blend]);
  const [a, percent, b, space] = blend;
  const t = percent / 100;
  const A = evaluate(a, inputs);
  const B = evaluate(b, inputs);
  if (space === 'oklab') {
    const hex = (c: Channels) => Color.rgbToHex(Math.round(c[0]), Math.round(c[1]), Math.round(c[2]));
    return channels(mixOklab(hex(A), percent, hex(B)));
  }
  return [0, 1, 2].map((k) => A[k]! * t + B[k]! * (1 - t)) as Channels;
}

/** The theme's default active colours for a mode (the stylesheet defaults, before Style Studio). */
export function defaultPortfolioChromeInputs(mode: PortfolioChromeMode): Record<PortfolioChromeInput, string> {
  const variations = buildColorVariations(DEFAULT_COLOR_SOURCES, DEFAULT_PAPER_INK);
  const pick = (name: string): string => {
    const value = variations[`--theme-${name}-${mode}-color`];
    if (!value) throw new Error(`portfolio-chrome: missing --theme-${name}-${mode}-color`);
    return value;
  };
  const pair = DEFAULT_PAPER_INK[mode];
  return {
    paper: pick('paper'),
    ink: pick('ink'),
    primary: pick('primary'),
    accent: pick('accent'),
    success: pick('success'),
    'success-background': variations[`--theme-success-${mode}-background-color`]!,
    link: buildLinkTokens(DEFAULT_COLOR_SOURCES, DEFAULT_PAPER_INK)[`--theme-link-${mode}-color`]!,
    text: neutralStep(pair, NEUTRAL_ROLE_STEPS[mode]['--theme-text-color']),
  };
}

/**
 * Resolved atmosphere chrome for light (`:root` defaults) or dark (`html[data-theme=dark]`), from
 * the theme's default colours or from `inputs` (e.g. a Style Studio pick).
 */
export function getPortfolioChrome(
  mode: PortfolioChromeMode,
  inputs: Record<PortfolioChromeInput, string> = defaultPortfolioChromeInputs(mode)
): PortfolioChrome {
  const recipes = PORTFOLIO_CHROME_BLENDS[mode];
  const out = {} as PortfolioChrome;
  for (const key of Object.keys(recipes) as PortfolioChromeKey[]) {
    const [r, g, b] = evaluate(recipes[key], inputs);
    out[key] = Color.rgbToHex(Math.round(r), Math.round(g), Math.round(b));
  }
  return out;
}

/** Paper ivory — theme light background (matches `PORTFOLIO_IVORY` / personalization). */
export const PORTFOLIO_IVORY_HEX = Color.toHex(themeColors.light.background);

/** Paper ink — theme dark background (matches `PORTFOLIO_INK` / personalization). */
export const PORTFOLIO_INK_HEX = Color.toHex(themeColors.dark.background);
