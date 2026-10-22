/**
 * Colour variation builder — spec: `docs/superpowers/specs/2026-09-24-color-system-design.md`.
 *
 * Every solid colour (main / status / focus) has four variations: `light`, `dark` derive from
 * the source hex lightness-adjusted against that mode's paper until it reaches its contrast
 * target; `light-background`, `dark-background` derive from the source hex lightness-adjusted
 * against that mode's ink until ink reads on it at 4.5:1. Ink and paper have only the per-mode
 * pair (they are the grounds themselves). Only lightness moves — hue and saturation stay.
 *
 * `adjustLightnessFor` is the one implementation of the lightness-step search (2-point HSL steps,
 * clamp 8–92, best-reached fallback); results then stay inside the lightness band
 * (`LIGHTNESS_FLOOR`–`LIGHTNESS_CEILING`) wherever their contrast target still holds. It tries the direction *away* from the ground first; core/web
 * (Style Studio presets, runtime variations) uses it too — its old local copy (`adjustForAa`, which
 * tried toward the ground first) was removed in Task 3.
 */
import { contrast, hexToRgb, mixOklab, rgbToHex } from './color-mix.js';
import { Color } from './color.js';
import colors from './colors.json' with { type: 'json' };
import { ON_FILL_INK_DARK, ON_FILL_INK_LIGHT } from './contrast.js';
import { NEUTRAL_ROLE_STEPS, neutralStep, type PaperInkMode, type PaperInkPair } from './paper-ink.js';

export const SOLID_COLORS = ['primary', 'secondary', 'accent', 'warning', 'error', 'info', 'success', 'focus'] as const;
export type SolidColor = (typeof SOLID_COLORS)[number];
export type ColorSources = Record<SolidColor, { light: string; dark: string }>;

/** Main colours are fills / graphics (WCAG 1.4.11), flags are read as text, focus is a UI indicator. */
export const CONTRAST_TARGET: Record<SolidColor, number> = {
  primary: 3,
  secondary: 3,
  accent: 3,
  focus: 3,
  warning: 4.5,
  error: 4.5,
  info: 4.5,
  success: 4.5,
};

/**
 * Lightness band (HSL L, 0–100) for adjusted colours: below the floor a colour reads as black on
 * the dark paper, above the ceiling as white on the light paper. Contrast wins: a colour is only
 * moved into the band as far as its contrast target still holds.
 */
export const LIGHTNESS_FLOOR = 15;
export const LIGHTNESS_CEILING = 90;

/**
 * Move `color` toward the lightness band in 2-point steps while its worst-case contrast against
 * `grounds` stays ≥ `min`; stops at the band edge or at the last step that still reads.
 */
export function withinLightnessBand(color: string, grounds: readonly string[], min: number): string {
  const hex = Color.toHex(color);
  const base = Color.create(hex);
  const target = Math.min(LIGHTNESS_CEILING, Math.max(LIGHTNESS_FLOOR, base.l));
  if (target === base.l) return hex;
  const ratioOf = (fg: string) => Math.min(...grounds.map((g) => Color.contrastRatio(fg, g)));
  const direction = target > base.l ? 1 : -1;
  let best = hex;
  for (let l = base.l + direction * 2; direction > 0 ? l < target : l > target; l += direction * 2) {
    const candidate = Color.hslToHex(base.h, base.s, l);
    if (ratioOf(candidate) < min) return best;
    best = candidate;
  }
  const edge = Color.hslToHex(base.h, base.s, target);
  return ratioOf(edge) >= min ? edge : best;
}

/**
 * Shift only `color`'s HSL lightness (2-point steps, clamped 8–92) until it reaches `min`
 * contrast against `against` — one ground, or several (then the worst-case ratio counts). Tries
 * the direction away from the (first) ground's lightness first, then the other; returns the best
 * ratio reached when `min` is unreachable. The result is then kept inside the lightness band
 * ({@link withinLightnessBand}) wherever `min` still holds.
 */
export function adjustLightnessFor(color: string, against: string | readonly string[], min: number): string {
  const grounds = typeof against === 'string' ? [against] : against;
  const ratioOf = (fg: string) => Math.min(...grounds.map((g) => Color.contrastRatio(fg, g)));
  const hex = Color.toHex(color);
  let best = hex;
  let bestRatio = ratioOf(hex);
  if (bestRatio >= min) return withinLightnessBand(hex, grounds, min);
  const base = Color.create(hex);
  const directions: Array<1 | -1> = base.l <= Color.create(grounds[0]!).l ? [-1, 1] : [1, -1];
  for (const direction of directions)
    for (let step = 2; step <= 84; step += 2) {
      const candidate = Color.hslToHex(base.h, base.s, Math.min(92, Math.max(8, base.l + direction * step)));
      const ratio = ratioOf(candidate);
      if (ratio > bestRatio) [best, bestRatio] = [candidate, ratio];
      if (ratio >= min) return withinLightnessBand(candidate, grounds, min);
    }
  return best;
}

/**
 * Background variation: lighten under dark ink, darken under light ink, until the ink reads
 * (≥ 4.5:1). A source colour that already reads at its own lightness is not moved further away
 * from the ink, only into the lightness band ({@link withinLightnessBand}) while ink still reads.
 * When 4.5:1 is unreachable in that direction, returns the best-contrast candidate reached
 * rather than a hard-coded black/white, so hue and saturation are never discarded.
 */
export function backgroundFor(color: string, ink: string): string {
  const inkIsDark = Color.create(ink).l < 50;
  const hex = Color.toHex(color).toLowerCase();
  const base = Color.create(hex);
  let best = hex;
  let bestRatio = Color.contrastRatio(ink, hex);
  if (bestRatio >= 4.5) return withinLightnessBand(hex, [ink], 4.5).toLowerCase();
  for (let step = 2; step <= 86; step += 2) {
    const l = Math.min(96, Math.max(4, base.l + (inkIsDark ? step : -step)));
    const candidate = Color.hslToHex(base.h, base.s, l);
    const ratio = Color.contrastRatio(ink, candidate);
    if (ratio > bestRatio) [best, bestRatio] = [candidate, ratio];
    if (ratio >= 4.5) return withinLightnessBand(candidate, [ink], 4.5).toLowerCase();
  }
  return best;
}

/**
 * Build every `--theme-*-color` variable: the four variations for each solid colour, plus the
 * per-mode paper / ink pair. Hex output is always lowercase.
 */
export function buildColorVariations(
  sources: ColorSources,
  paperInk: { light: PaperInkPair; dark: PaperInkPair }
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const mode of ['light', 'dark'] as const) {
    out[`--theme-paper-${mode}-color`] = paperInk[mode].paper.toLowerCase();
    out[`--theme-ink-${mode}-color`] = paperInk[mode].ink.toLowerCase();
  }
  for (const c of SOLID_COLORS)
    for (const mode of ['light', 'dark'] as const) {
      const pair = paperInk[mode];
      const grounds = c === 'focus' ? textGroundsFor(pair, mode) : pair.paper;
      out[`--theme-${c}-${mode}-color`] = adjustLightnessFor(
        sources[c][mode],
        grounds,
        CONTRAST_TARGET[c]
      ).toLowerCase();
      out[`--theme-${c}-${mode}-background-color`] = backgroundFor(sources[c][mode], pair.ink).toLowerCase();
    }
  return out;
}

/** Button text (`--theme-button-fg-color`) reads as body text on its fill: WCAG 1.4.3. */
export const BUTTON_INK_TARGET = 4.5;

/**
 * Button text for a solid fill: the better of the two on-fill inks (`ON_FILL_INK_LIGHT` /
 * `ON_FILL_INK_DARK`, the site's button inks) when it reaches 4.5:1; otherwise pure white or
 * black, whichever reads better — one of them always reaches 4.5:1 on any fill.
 */
export function buttonInkFor(fill: string): string {
  const hex = Color.toHex(fill);
  const ratio = (ink: string) => Color.contrastRatio(ink, hex);
  const pair = ratio(ON_FILL_INK_LIGHT) >= ratio(ON_FILL_INK_DARK) ? ON_FILL_INK_LIGHT : ON_FILL_INK_DARK;
  if (ratio(pair) >= BUTTON_INK_TARGET) return pair;
  return ratio('#ffffff') >= ratio('#000000') ? '#ffffff' : '#000000';
}

/**
 * `--theme-button-fg-dark-color`: the button text for dark mode's primary variation (the solid fill
 * `button-base` paints under `--button-bg`). Light mode's buttons sit on the primary fill instead
 * (built for the on-primary label, the light paper; owner option C, Task 3 fix round 1), so light
 * button text is `--theme-on-primary-color` in the stylesheet and needs no per-pick value. The
 * stylesheet points `--theme-button-fg-color` at the active one.
 */
export function buildButtonInkTokens(variations: Record<string, string>): Record<string, string> {
  const fill = variations['--theme-primary-dark-color'];
  return fill ? { '--theme-button-fg-dark-color': buttonInkFor(fill).toLowerCase() } : {};
}

/**
 * Text on the primary fill (`--theme-on-primary-color`): the light-mode paper, the "white" of the
 * pen & paper pair, so it follows a custom paper. The default (`$css-on-primary`) is the default
 * light paper; `buildPrimaryFillTokens` reads the actual light paper from the variation map.
 */
export const ON_PRIMARY_INK = (colors.sass as Record<string, string>).cssOnPrimary!;

/**
 * The primary fill for solid buttons: the colour with only its lightness moved until the on-primary
 * text (`onPrimary`, default `ON_PRIMARY_INK`) reads on it at ≥ 4.5:1 (`adjustLightnessFor`, so
 * darker first).
 */
export function primaryFillFor(primary: string, onPrimary: string = ON_PRIMARY_INK): string {
  return adjustLightnessFor(primary, onPrimary, BUTTON_INK_TARGET).toLowerCase();
}

/** The on-primary text for a variation map: its light paper (`ON_PRIMARY_INK` when absent). */
export function onPrimaryFor(variations: Record<string, string>): string {
  return (variations['--theme-paper-light-color'] ?? ON_PRIMARY_INK).toLowerCase();
}

/**
 * `--theme-primary-fill-{light,dark}-color` from each mode's primary variation, against the map's
 * on-primary text (`onPrimaryFor`). The stylesheet points `--theme-primary-fill-color` at the
 * active one; light-mode primary buttons paint it (no gradient) with `--theme-on-primary-color` text.
 */
export function buildPrimaryFillTokens(variations: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  const onPrimary = onPrimaryFor(variations);
  for (const mode of ['light', 'dark'] as const) {
    const primary = variations[`--theme-primary-${mode}-color`];
    if (primary) out[`--theme-primary-fill-${mode}-color`] = primaryFillFor(primary, onPrimary);
  }
  return out;
}

/** Brand-coloured small text (`--theme-primary-ink-color`) reads as body text: WCAG 1.4.3. */
export const PRIMARY_INK_TARGET = 4.5;

/**
 * The grounds text sits on in a mode, from its paper / ink pair: page, secondary page, surface
 * and surface variant (`NEUTRAL_ROLE_STEPS`) — the same set `checkPaperInk` checks body text on.
 */
export function textGroundsFor(pair: PaperInkPair, mode: PaperInkMode): string[] {
  const steps = NEUTRAL_ROLE_STEPS[mode];
  return [
    steps['--theme-main-background-color'],
    steps['--theme-main-background-secondary-color'],
    steps['--theme-surface-color'],
    steps['--theme-surface-variant-color'],
  ].map((step) => neutralStep(pair, step));
}

/**
 * Primary as text: the primary source with only its lightness moved until it reads ≥ 4.5:1 on
 * every ground in `grounds` (worst case; best-reached fallback — `adjustLightnessFor`).
 */
export function primaryInkFor(primary: string, grounds: readonly string[]): string {
  return adjustLightnessFor(primary, grounds, PRIMARY_INK_TARGET).toLowerCase();
}

/**
 * `--theme-primary-ink-{light,dark}-color` from each mode's primary source and paper / ink pair.
 * The main variation (`--theme-primary-color`) only reaches 3:1 — right for fills and graphics
 * (WCAG 1.4.11), too faint for words. The stylesheet points `--theme-primary-ink-color` at the
 * active one; eyebrows, labels and hover / current text paint it.
 */
export function buildPrimaryInkTokens(
  sources: Pick<ColorSources, 'primary'>,
  paperInk: Record<PaperInkMode, PaperInkPair>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const mode of ['light', 'dark'] as const)
    out[`--theme-primary-ink-${mode}-color`] = primaryInkFor(
      sources.primary[mode],
      textGroundsFor(paperInk[mode], mode)
    );
  return out;
}

/** Secondary-coloured small text (`--theme-secondary-ink-color`) reads as body text: WCAG 1.4.3. */
export const SECONDARY_INK_TARGET = 4.5;

/**
 * Secondary as text: the secondary source with only its lightness moved until it reads ≥ 4.5:1 on
 * every ground in `grounds` (worst case; best-reached fallback — `adjustLightnessFor`).
 */
export function secondaryInkFor(secondary: string, grounds: readonly string[]): string {
  return adjustLightnessFor(secondary, grounds, SECONDARY_INK_TARGET).toLowerCase();
}

/**
 * `--theme-secondary-ink-{light,dark}-color` from each mode's secondary source and paper / ink
 * pair — the secondary twin of `buildPrimaryInkTokens`. `--theme-secondary-color` only reaches
 * 3:1 (fills, borders, graphics); list markers, table headers, `dt` labels and other
 * secondary-coloured words paint `--theme-secondary-ink-color`, which the stylesheet points at the
 * active one.
 */
export function buildSecondaryInkTokens(
  sources: Pick<ColorSources, 'secondary'>,
  paperInk: Record<PaperInkMode, PaperInkPair>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const mode of ['light', 'dark'] as const)
    out[`--theme-secondary-ink-${mode}-color`] = secondaryInkFor(
      sources.secondary[mode],
      textGroundsFor(paperInk[mode], mode)
    );
  return out;
}

/** The four status flags; each has a text role `--theme-<s>-ink-color`. */
export const STATUS_COLORS = ['success', 'warning', 'error', 'info'] as const;
export type StatusColor = (typeof STATUS_COLORS)[number];

/** Status text (`--theme-<s>-ink-color`) reads as body text: WCAG 1.4.3. */
export const STATUS_INK_TARGET = 4.5;

/**
 * Where each status ink starts: the status variation mixed N % toward the mode's text colour
 * (`color-mix(in oklab, …)`, the pre-builder stylesheet definition — kept so the default inks do
 * not change). 100 = the variation itself.
 */
export const STATUS_INK_MIX: Record<PaperInkMode, Record<StatusColor, number>> = {
  light: { success: 100, warning: 70, error: 90, info: 100 },
  dark: { success: 80, warning: 100, error: 80, info: 90 },
};

/**
 * Status as text: `hue` mixed `mix` % toward `text` (OKLab), then only its lightness moved until it
 * reads ≥ 4.5:1 on every ground in `grounds` (worst case; best-reached fallback). A start that
 * already passes is returned unchanged.
 */
export function statusInkFor(hue: string, text: string, mix: number, grounds: readonly string[]): string {
  const start = mix >= 100 ? Color.toHex(hue) : mixOklab(Color.toHex(hue), mix, Color.toHex(text));
  return adjustLightnessFor(start, grounds, STATUS_INK_TARGET).toLowerCase();
}

/**
 * `--theme-<status>-ink-{light,dark}-color` from each mode's status source and paper / ink pair:
 * the status variation (as `buildColorVariations` makes it) mixed toward that pair's text colour
 * (`STATUS_INK_MIX`), then lightness-adjusted to ≥ 4.5:1 on page, secondary page, surface and
 * variant (`textGroundsFor`). The stylesheet points `--theme-<status>-ink-color` at the active one.
 */
export function buildStatusInkTokens(
  sources: Pick<ColorSources, StatusColor>,
  paperInk: Record<PaperInkMode, PaperInkPair>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const mode of ['light', 'dark'] as const) {
    const pair = paperInk[mode];
    const text = neutralStep(pair, NEUTRAL_ROLE_STEPS[mode]['--theme-text-color']);
    const grounds = textGroundsFor(pair, mode);
    for (const c of STATUS_COLORS) {
      const hue = adjustLightnessFor(sources[c][mode], pair.paper, CONTRAST_TARGET[c]);
      out[`--theme-${c}-ink-${mode}-color`] = statusInkFor(hue, text, STATUS_INK_MIX[mode][c], grounds);
    }
  }
  return out;
}

/**
 * Hover / active washes (`--theme-{primary,secondary}-wash-color`) are painted at this alpha
 * (`color-mix(in srgb, <wash> 24%, transparent)`) behind `--theme-primary-ink-color` text on
 * `.btn` outline / ghost and PrimeVue `.p-button` / outlined / text buttons. Mirrored in Sass as
 * `$theme-wash-alpha` (generated).
 */
export const WASH_ALPHA = 0.24;
/** Ink text on a wash reads as body text: WCAG 1.4.3. */
export const WASH_TARGET = 4.5;

/** `color` at `alpha` composited over an opaque `ground` (sRGB, as browsers paint it). */
export function compositeOver(ground: string, color: string, alpha: number): string {
  const g = hexToRgb(Color.toHex(ground));
  const c = hexToRgb(Color.toHex(color));
  return rgbToHex({ r: g.r + alpha * (c.r - g.r), g: g.g + alpha * (c.g - g.g), b: g.b + alpha * (c.b - g.b) });
}

/**
 * A hover / active wash: `tint` with only its lightness moved (toward the grounds, away from the
 * text) until `text` reads ≥ 4.5:1 on the wash at every alpha up to `WASH_ALPHA` composited over
 * every ground in `grounds` (worst case; best-reached fallback). A tint that already passes is
 * returned unchanged.
 */
export function washFor(tint: string, text: string, grounds: readonly string[]): string {
  const alphas = [WASH_ALPHA / 3, (2 * WASH_ALPHA) / 3, WASH_ALPHA];
  const worst = (wash: string) =>
    Math.min(...grounds.flatMap((g) => alphas.map((a) => contrast(text, compositeOver(g, wash, a)))));
  const hex = Color.toHex(tint).toLowerCase();
  let best = hex;
  let bestRatio = worst(hex);
  if (bestRatio >= WASH_TARGET) return hex;
  const base = Color.create(hex);
  const away = Color.create(grounds[0]!).l >= Color.create(text).l ? 1 : -1;
  for (const direction of [away, -away])
    for (let step = 2; step <= 96; step += 2) {
      const candidate = Color.hslToHex(base.h, base.s, Math.min(96, Math.max(4, base.l + direction * step)));
      const ratio = worst(candidate);
      if (ratio > bestRatio) [best, bestRatio] = [candidate.toLowerCase(), ratio];
      if (ratio >= WASH_TARGET) return candidate.toLowerCase();
    }
  return best;
}

/**
 * `--theme-{primary,secondary}-wash-{light,dark}-color`: the primary (hover) and secondary
 * (active) variation, lightness-moved per mode so `--theme-primary-ink-color` reads ≥ 4.5:1 on the
 * wash over page, secondary page, surface and variant (`textGroundsFor`). The stylesheet points
 * `--theme-{primary,secondary}-wash-color` at the active one.
 */
export function buildWashTokens(
  variations: Record<string, string>,
  primaryInk: Record<string, string>,
  paperInk: Record<PaperInkMode, PaperInkPair>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const mode of ['light', 'dark'] as const) {
    const text = primaryInk[`--theme-primary-ink-${mode}-color`];
    if (!text) continue;
    const grounds = textGroundsFor(paperInk[mode], mode);
    for (const c of ['primary', 'secondary'] as const) {
      const tint = variations[`--theme-${c}-${mode}-color`];
      if (tint) out[`--theme-${c}-wash-${mode}-color`] = washFor(tint, text, grounds);
    }
  }
  return out;
}

const s = colors.sass as Record<string, string>;
export const DEFAULT_COLOR_SOURCES: ColorSources = {
  primary: { light: s.primaryColorLight!, dark: s.primaryColorDark! },
  secondary: { light: s.secondaryColorLight!, dark: s.secondaryColorDark! },
  accent: { light: s.accentColorLight!, dark: s.accentColorDark! },
  warning: { light: s.warningLight!, dark: s.warningDark! },
  error: { light: s.errorLight!, dark: s.errorDark! },
  info: { light: s.infoLight!, dark: s.infoDark! },
  success: { light: s.successLight!, dark: s.successDark! },
  focus: { light: s.cssFocusRingLight!, dark: s.cssFocusRingDark! },
};

/** Link text (`--theme-link-color`, and the app's prose links) reads as body text: WCAG 1.4.3. */
export const LINK_TARGET = 4.5;
/**
 * Links also sit on their own wash: the nav current item (12 %) and the /work active pill (16 %)
 * paint the link colour at these alphas behind link-coloured text.
 */
export const LINK_WASH_ALPHAS = [0.12, 0.16] as const;

/**
 * Link ink: the primary source with only its lightness moved (2-point HSL steps, away from the
 * first ground first, clamp 8–92) until it reads ≥ 4.5:1 on every ground in `grounds` **and** on
 * its own wash (`LINK_WASH_ALPHAS`) composited over each of them (worst case; best-reached
 * fallback). A source that already passes is returned unchanged.
 */
export function linkInkFor(primary: string, grounds: readonly string[]): string {
  const ratioOf = (c: string) =>
    Math.min(
      ...grounds.map((g) => contrast(c, g)),
      ...grounds.flatMap((g) => LINK_WASH_ALPHAS.map((a) => contrast(c, compositeOver(g, c, a))))
    );
  const hex = Color.toHex(primary).toLowerCase();
  let best = hex;
  let bestRatio = ratioOf(hex);
  if (bestRatio >= LINK_TARGET) return hex;
  const base = Color.create(hex);
  const directions: Array<1 | -1> = base.l <= Color.create(grounds[0]!).l ? [-1, 1] : [1, -1];
  for (const direction of directions)
    for (let step = 2; step <= 84; step += 2) {
      const candidate = Color.hslToHex(
        base.h,
        base.s,
        Math.min(92, Math.max(8, base.l + direction * step))
      ).toLowerCase();
      const ratio = ratioOf(candidate);
      if (ratio > bestRatio) [best, bestRatio] = [candidate, ratio];
      if (ratio >= LINK_TARGET) return candidate;
    }
  return best;
}

/**
 * `--theme-link-{light,dark}-color` from each mode's primary source and paper / ink pair
 * (`linkInkFor` over `textGroundsFor`). The stylesheet points `--theme-link-color` at the active
 * one; core/web's `--portfolio-rose-color` is the link colour.
 */
export function buildLinkTokens(
  sources: Pick<ColorSources, 'primary'>,
  paperInk: Record<PaperInkMode, PaperInkPair>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const mode of ['light', 'dark'] as const)
    out[`--theme-link-${mode}-color`] = linkInkFor(sources.primary[mode], textGroundsFor(paperInk[mode], mode));
  return out;
}

/** One stop of a `linear-gradient()`: a colour at an alpha (1 = opaque). */
export type GradientStop = { color: string; alpha: number };

/** Points sampled along a two-stop gradient (t = 0 … 1). */
const GRADIENT_SAMPLES = 16;

/**
 * Every colour a two-stop `linear-gradient(from, to)` paints over an opaque `fill`, sampled:
 * stops interpolate premultiplied in sRGB (as browsers do), then composite over the fill.
 */
export function gradientColorsOver(fill: string, from: GradientStop, to: GradientStop): string[] {
  const f = hexToRgb(Color.toHex(fill));
  const a = hexToRgb(Color.toHex(from.color));
  const b = hexToRgb(Color.toHex(to.color));
  const out: string[] = [];
  for (let i = 0; i <= GRADIENT_SAMPLES; i++) {
    const t = i / GRADIENT_SAMPLES;
    const alpha = from.alpha + (to.alpha - from.alpha) * t;
    const channel = (k: 'r' | 'g' | 'b') =>
      f[k] * (1 - alpha) + from.alpha * a[k] + (to.alpha * b[k] - from.alpha * a[k]) * t;
    out.push(rgbToHex({ r: channel('r'), g: channel('g'), b: channel('b') }));
  }
  return out;
}

/** One gradient a stop paints in: the stop at `alpha`, toward `other`. */
export type GradientUse = { alpha: number; other: GradientStop };

/**
 * A gradient stop the button label keeps reading on: `stop` with only its lightness moved
 * (2-point HSL steps, away from the label first, clamp 4–96) until `label` reads ≥ 4.5:1 on every
 * colour each gradient it starts (`uses`) paints over `fill` (`gradientColorsOver`; worst case;
 * best-reached fallback). A stop that already passes is returned unchanged.
 */
export function gradientStopFor(stop: string, uses: readonly GradientUse[], fill: string, label: string): string {
  const ratioOf = (c: string) =>
    Math.min(
      ...uses.flatMap(({ alpha, other }) =>
        gradientColorsOver(fill, { color: c, alpha }, other).map((g) => contrast(label, g))
      )
    );
  const hex = Color.toHex(stop).toLowerCase();
  let best = hex;
  let bestRatio = ratioOf(hex);
  if (bestRatio >= BUTTON_INK_TARGET) return hex;
  const base = Color.create(hex);
  const away: 1 | -1 = Color.create(label).l >= 50 ? -1 : 1;
  for (const direction of [away, -away] as const)
    for (let step = 2; step <= 92; step += 2) {
      const candidate = Color.hslToHex(
        base.h,
        base.s,
        Math.min(96, Math.max(4, base.l + direction * step))
      ).toLowerCase();
      const ratio = ratioOf(candidate);
      if (ratio > bestRatio) [best, bestRatio] = [candidate, ratio];
      if (ratio >= BUTTON_INK_TARGET) return candidate;
    }
  return best;
}

/** Alphas of `--button-secondary-bg` (Foundation `.button.secondary`): secondary 62 % → primary 42 %. */
export const SECONDARY_SHEEN_ALPHAS = { from: 0.62, to: 0.42 } as const;

/**
 * The solid-button gradient stops, per mode, so the button label reads ≥ 4.5:1 on every point:
 *
 * - `--theme-secondary-fill-{mode}-color`: the secondary variation lightness-moved until the
 *   label reads on the opaque `secondary-fill → button fill` gradient (dark `.btn` solid / PrimeVue
 *   primary sheen; the 50 % `--button-bg` version paints a subset of those colours). It is also the
 *   fill of Foundation `.button.secondary`.
 * - `--theme-secondary-inverted-{mode}-color`: the hover / active start stop, the *other* mode's
 *   secondary variation moved the same way.
 * - `--theme-primary-sheen-{mode}-color`: the 42 % primary end stop of `--button-secondary-bg`
 *   over the secondary fill.
 *
 * Button fill and label per mode: dark the primary variation under `--theme-button-fg-dark-color`;
 * light the primary fill under `--theme-on-primary-color` (`onPrimaryFor`).
 */
export function buildButtonStopTokens(variations: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  const fills = buildPrimaryFillTokens(variations);
  const onPrimary = onPrimaryFor(variations);
  const darkPrimary = variations['--theme-primary-dark-color'];
  const darkLabel = darkPrimary ? buttonInkFor(darkPrimary) : undefined;
  for (const mode of ['light', 'dark'] as const) {
    const other = mode === 'light' ? 'dark' : 'light';
    const fill = mode === 'dark' ? darkPrimary : fills[`--theme-primary-fill-${mode}-color`];
    const label = mode === 'dark' ? darkLabel : onPrimary;
    const secondary = variations[`--theme-secondary-${mode}-color`];
    const otherSecondary = variations[`--theme-secondary-${other}-color`];
    const primary = variations[`--theme-primary-${mode}-color`];
    if (!fill || !label || !secondary || !otherSecondary || !primary) continue;
    // Opaque (`.btn` solid / PrimeVue sheen) and, in dark mode, 50 % over the fill (`--button-bg`).
    const opaque: GradientUse = { alpha: 1, other: { color: fill, alpha: 1 } };
    const sheen: GradientUse[] =
      mode === 'dark' ? [opaque, { alpha: 0.5, other: { color: primary, alpha: 0.5 } }] : [opaque];
    const secondaryFill = gradientStopFor(secondary, sheen, fill, label);
    out[`--theme-secondary-fill-${mode}-color`] = secondaryFill;
    out[`--theme-secondary-inverted-${mode}-color`] = gradientStopFor(otherSecondary, [opaque], fill, label);
    out[`--theme-primary-sheen-${mode}-color`] = gradientStopFor(
      primary,
      [{ alpha: SECONDARY_SHEEN_ALPHAS.to, other: { color: secondaryFill, alpha: SECONDARY_SHEEN_ALPHAS.from } }],
      secondaryFill,
      label
    );
  }
  return out;
}
