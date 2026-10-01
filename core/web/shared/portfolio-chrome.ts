/**
 * App `--portfolio-*` atmosphere chrome — JS recipe mirrors of Sass in
 * `assets/css/_variables.scss` (and the test dump under `assets/css/export/`).
 *
 * Sass remains the CSS emit SoT. These recipes use the same named theme inputs
 * (`Color.named`) so agents/tests can resolve chrome without a second hex table.
 * UI should keep reading CSS custom properties; this module is the parity surface.
 *
 * CSS-only (not mirrored): coral bridge, rule/grid-line `color-mix` with vars,
 * soft/semantic alias block, particle-shadow multi-value.
 */
import { Color, themeColors, type ThemeModeName } from '@tgmc/theme';

export type PortfolioChromeMode = ThemeModeName;

export type PortfolioChrome = {
  rose: string;
  roseStrong: string;
  haze1: string;
  haze2: string;
  haze3: string;
  haze4: string;
  particleStrong: string;
  particleMid: string;
  particleSoft: string;
  gridGlow: string;
};

/** Paper ivory — theme light background (matches `PORTFOLIO_IVORY` / personalization). */
export const PORTFOLIO_IVORY_HEX = Color.toHex(themeColors.light.background);

/** Paper ink — theme dark background (matches `PORTFOLIO_INK` / personalization). */
export const PORTFOLIO_INK_HEX = Color.toHex(themeColors.dark.background);

function requireNamed(name: string): string {
  const value = Color.named(name);
  if (!value) {
    throw new Error(`portfolio-chrome: missing theme named color "${name}"`);
  }
  return Color.toHex(value);
}

/**
 * Float HSL lightness adjust matching Sass `theme-lighten` / `theme-darken`
 * (`color.adjust` in hsl). Integer-rounded `Color.lighten` differs by ~1 channel.
 */
function adjustLightnessPrecise(hex: string, amount: number): string {
  const rgb = Color.hexToRgb(Color.toHex(hex));
  if (!rgb) return Color.toHex(hex);

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }

  l = Math.max(0, Math.min(1, l + amount / 100));
  s = Math.max(0, Math.min(1, s));

  const a = s * Math.min(l, 1 - l);
  const f = (n: number): number => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };

  return Color.rgbToHex(Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255));
}

/** Sass `color.mix($a, $b, $weight%)` — `$weight` percent of `$a` in sRGB channels. */
function mixSrgb(colorA: string, colorB: string, weightPercent: number): string {
  const a = Color.hexToRgb(Color.toHex(colorA));
  const b = Color.hexToRgb(Color.toHex(colorB));
  if (!a || !b) {
    throw new Error('portfolio-chrome: mix requires resolvable hex colors');
  }
  const t = weightPercent / 100;
  return Color.rgbToHex(
    Math.round(a.r * t + b.r * (1 - t)),
    Math.round(a.g * t + b.g * (1 - t)),
    Math.round(a.b * t + b.b * (1 - t))
  );
}

/**
 * Resolved atmosphere chrome for light (`:root` defaults) or dark (`html[data-theme=dark]`).
 * Expressions mirror `_variables.scss` / `export/portfolio-chrome-dump.scss`.
 */
export function getPortfolioChrome(mode: PortfolioChromeMode): PortfolioChrome {
  const oxbloodDark = requireNamed('oxbloodDark');
  const oxbloodLight = requireNamed('oxbloodLight');
  const primaryColorDark = requireNamed('primaryColorDark');
  const mainBackgroundLight = requireNamed('mainBackgroundLight');
  const mainBackgroundDark = requireNamed('mainBackgroundDark');
  const textColorDark = requireNamed('textColorDark');
  const textColorSecondaryDark = requireNamed('textColorSecondaryDark');

  if (mode === 'light') {
    return {
      // theme-lighten($oxblood-dark, 10%)
      rose: adjustLightnessPrecise(oxbloodDark, 10),
      // $primary-color-dark
      roseStrong: primaryColorDark,
      // color.mix($main-background-light, $oxblood-dark, 72|78|84|90%)
      haze1: mixSrgb(mainBackgroundLight, oxbloodDark, 72),
      haze2: mixSrgb(mainBackgroundLight, oxbloodDark, 78),
      haze3: mixSrgb(mainBackgroundLight, oxbloodDark, 84),
      haze4: mixSrgb(mainBackgroundLight, oxbloodDark, 90),
      // $primary-color-dark
      particleStrong: primaryColorDark,
      // color.mix($oxblood-dark, $text-color-secondary-dark, 55%)
      particleMid: mixSrgb(oxbloodDark, textColorSecondaryDark, 55),
      // color.mix($main-background-light, $oxblood-dark, 82%)
      particleSoft: mixSrgb(mainBackgroundLight, oxbloodDark, 82),
      // color.mix($main-background-light, $oxblood-dark, 88%)
      gridGlow: mixSrgb(mainBackgroundLight, oxbloodDark, 88),
    };
  }

  return {
    // theme-lighten($oxblood-dark, 28%)
    rose: adjustLightnessPrecise(oxbloodDark, 28),
    // theme-lighten($oxblood-dark, 42%)
    roseStrong: adjustLightnessPrecise(oxbloodDark, 42),
    // color.mix($main-background-dark, $oxblood-dark, 42%)
    haze1: mixSrgb(mainBackgroundDark, oxbloodDark, 42),
    // color.mix($main-background-dark, $oxblood-light, 55%)
    haze2: mixSrgb(mainBackgroundDark, oxbloodLight, 55),
    // theme-darken($oxblood-light, 4%)
    haze3: adjustLightnessPrecise(oxbloodLight, -4),
    // theme-darken($oxblood-light, 10%)
    haze4: adjustLightnessPrecise(oxbloodLight, -10),
    // theme-lighten($primary-color-dark, 32%)
    particleStrong: adjustLightnessPrecise(primaryColorDark, 32),
    // theme-lighten($oxblood-dark, 28%)
    particleMid: adjustLightnessPrecise(oxbloodDark, 28),
    // $text-color-dark
    particleSoft: textColorDark,
    // theme-darken($oxblood-dark, 8%)
    gridGlow: adjustLightnessPrecise(oxbloodDark, -8),
  };
}

/** `--portfolio-teal` twin from theme named tokens (success / portfolio teal). */
export function portfolioTeal(mode: PortfolioChromeMode): string {
  return requireNamed(mode === 'dark' ? 'tealSignalDark' : 'tealSignalLight');
}
