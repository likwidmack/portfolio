// @vitest-environment node

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { Color, contrastHex, NEUTRAL_ROLE_STEPS, neutralStep } from '@tgmc/theme';
import * as sass from 'sass';
import { describe, expect, it } from 'vitest';

import {
  defaultPortfolioChromeInputs,
  getPortfolioChrome,
  PORTFOLIO_CHROME_BLENDS,
  PORTFOLIO_INK_HEX,
  PORTFOLIO_IVORY_HEX,
  portfolioBlendCss,
  portfolioChromeVariable,
  type PortfolioChromeKey,
  type PortfolioChromeMode,
} from '../shared/portfolio-chrome';
import { PORTFOLIO_INK, PORTFOLIO_IVORY } from '../shared/preferences/document';

const root = join(import.meta.dirname, '..');
const repoRoot = join(root, '..', '..');
const themeCore = join(repoRoot, 'theme', 'core');
const dumpPath = join(root, 'assets', 'css', 'export', 'portfolio-chrome-dump.scss');
const variablesPath = join(root, 'assets', 'css', '_variables.scss');

const MODE_SELECTOR: Record<PortfolioChromeMode, string> = {
  light: ':root',
  dark: "html[data-theme='dark']",
};

function parseCssColor(raw: string): string {
  const value = raw.trim();
  const pct = value.match(/rgb\(\s*([\d.]+)%\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/i);
  if (pct?.[1] && pct[2] && pct[3]) {
    return Color.rgbToHex(
      Math.round((Number(pct[1]) / 100) * 255),
      Math.round((Number(pct[2]) / 100) * 255),
      Math.round((Number(pct[3]) / 100) * 255)
    );
  }
  const rgb = value.match(/rgb\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/i);
  if (rgb?.[1] && rgb[2] && rgb[3]) {
    return Color.rgbToHex(Math.round(Number(rgb[1])), Math.round(Number(rgb[2])), Math.round(Number(rgb[3])));
  }
  return Color.toHex(value);
}

/** Body of the first top-level rule for `selector` (braces balanced; `#{…}` interpolation allowed). */
function blockBody(source: string, selector: string): string {
  const start = source.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`missing block for ${selector}`);
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(source.indexOf('{', start) + 1, i);
  }
  throw new Error(`unbalanced block for ${selector}`);
}

/** `--name: value;` declarations of a block, whitespace-normalised (`( a` → `(a`). */
function declarations(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  const text = body.replace(/\/\/.*$/gm, '');
  for (const m of text.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out[m[1]!] = m[2]!.replace(/\s+/g, ' ').replace(/\(\s/g, '(').replace(/\s\)/g, ')').trim();
  }
  return out;
}

function compileDump(): string {
  return sass.compile(dumpPath, { loadPaths: [themeCore], style: 'expanded' }).css;
}

const KEYS = Object.keys(PORTFOLIO_CHROME_BLENDS.light) as PortfolioChromeKey[];

describe('portfolio chrome blends (colour system)', () => {
  it('declares each --portfolio-*-color in _variables.scss as exactly its mirrored blend recipe', async () => {
    const variables = await readFile(variablesPath, 'utf8');
    const light = declarations(blockBody(variables, MODE_SELECTOR.light));
    const dark = { ...light, ...declarations(blockBody(variables, MODE_SELECTOR.dark)) };
    const byMode = { light, dark };

    for (const mode of ['light', 'dark'] as const) {
      for (const key of KEYS) {
        const variable = portfolioChromeVariable(key);
        expect(byMode[mode][variable], `${mode} ${variable}`).toBe(
          portfolioBlendCss(PORTFOLIO_CHROME_BLENDS[mode][key])
        );
      }
    }
  });

  it('mirrors the Sass dump for light and dark with the theme default colours', () => {
    const css = compileDump();
    for (const mode of ['light', 'dark'] as const) {
      const dumped = declarations(blockBody(css, mode === 'light' ? ':root' : 'html[data-theme=dark]'));
      const chrome = getPortfolioChrome(mode);
      for (const key of KEYS) {
        const variable = portfolioChromeVariable(key);
        expect(dumped[variable], `dump ${mode} ${variable}`).toBeTruthy();
        // Same maths in floats; hex rounding of an exact .5 channel may differ by one step.
        const [x, y] = [Color.hexToRgb(chrome[key])!, Color.hexToRgb(parseCssColor(dumped[variable]!))!];
        const drift = Math.max(Math.abs(x.r - y.r), Math.abs(x.g - y.g), Math.abs(x.b - y.b));
        expect(drift, `${mode} ${key}: ${chrome[key]} vs dump ${dumped[variable]}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('keeps the atmosphere close to the pre-blend look (documented ΔE budget)', () => {
    // Pre-blend (Sass recipe) values of the default theme — before / after: docs/web/features/app-scss.md.
    const before: Record<PortfolioChromeMode, Partial<Record<PortfolioChromeKey, string>>> = {
      light: { haze1: '#e0bdbf', haze4: '#f1e2e1', gridGlow: '#efdedd', teal: '#146060', coral: '#1b95c7' },
      // rose / roseStrong left the budget with the derived link ink (rule 3, owner decision 2026-10-05:
      // dark `#dc7b88` → `#e96a72`, rose-strong `#ebb3bb` → `#f3afae`).
      dark: { haze1: '#621c25', teal: '#1b7a7a', ink: '#f3efec' },
    };
    const oklab = (hex: string) => {
      const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      const { r, g, b } = Color.hexToRgb(hex)!;
      const [R, G, B] = [r, g, b].map((v) => lin(v / 255)) as [number, number, number];
      const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
      const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
      const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
      return [
        0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
      ];
    };
    for (const mode of ['light', 'dark'] as const) {
      const chrome = getPortfolioChrome(mode);
      for (const [key, hex] of Object.entries(before[mode]) as Array<[PortfolioChromeKey, string]>) {
        const [a, b] = [oklab(hex), oklab(chrome[key])];
        const deltaE = 100 * Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
        expect(deltaE, `${mode} ${key} ${hex} → ${chrome[key]}`).toBeLessThanOrEqual(3);
      }
    }
  });

  it('follows the inputs: a new primary moves the primary blends, not the others', () => {
    // The link ink derives from the primary (theme `buildLinkTokens`), so a new primary moves it too.
    const inputs = { ...defaultPortfolioChromeInputs('dark'), primary: '#1f4fd1', link: '#7d9bf0' };
    const moved = getPortfolioChrome('dark', inputs);
    const base = getPortfolioChrome('dark');
    expect(moved.rose).not.toBe(base.rose);
    expect(moved.haze1).not.toBe(base.haze1);
    expect(moved.teal).toBe(base.teal);
    expect(moved.ivory).toBe(base.ivory);
  });

  it('keeps rose / rose-strong link text ≥ 4.5:1 on every background it is painted on (both modes)', () => {
    // Where the rose family is text (fix round 1): links on paper / surface / the 88% soft surface
    // (`portfolio-soft-surface`); gallery tabs (text 4% wash); nav links on hover (rose 12% tint,
    // AppPrimaryNav); outlined buttons on hover (UiButton, paper / surface); and rose-strong on the
    // active work filter (rose 16% tint, pages/work). Tints are composited over paper and surface.
    const over = (fg: string, alpha: number, ground: string): string => {
      const [a, g] = [Color.hexToRgb(fg)!, Color.hexToRgb(ground)!];
      const ch = (x: number, y: number) => Math.round(x * alpha + y * (1 - alpha));
      return Color.rgbToHex(ch(a.r, g.r), ch(a.g, g.g), ch(a.b, g.b));
    };
    for (const mode of ['light', 'dark'] as const) {
      const inputs = defaultPortfolioChromeInputs(mode);
      const pair = { paper: inputs.paper, ink: inputs.ink };
      const surface = neutralStep(pair, NEUTRAL_ROLE_STEPS[mode]['--theme-surface-color']);
      const text = neutralStep(pair, NEUTRAL_ROLE_STEPS[mode]['--theme-text-color']);
      const chrome = getPortfolioChrome(mode);
      const plain: Record<string, string> = {
        paper: inputs.paper,
        surface,
        'soft surface 88%': over(surface, 0.88, inputs.paper),
      };
      for (const [name, ground] of [
        ['paper', inputs.paper],
        ['surface', surface],
      ] as const) {
        plain[`text 4% on ${name}`] = over(text, 0.04, ground);
        plain[`rose 12% on ${name}`] = over(chrome.rose, 0.12, ground);
      }
      const strongGrounds: Record<string, string> = {
        paper: inputs.paper,
        surface,
        'soft surface 88%': plain['soft surface 88%']!,
        'rose 16% on paper': over(chrome.rose, 0.16, inputs.paper),
        'rose 16% on surface': over(chrome.rose, 0.16, surface),
      };
      for (const [name, ground] of Object.entries(plain))
        expect(
          contrastHex(chrome.rose, ground),
          `${mode} rose ${chrome.rose} on ${name} ${ground}`
        ).toBeGreaterThanOrEqual(4.5);
      for (const [name, ground] of Object.entries(strongGrounds))
        expect(
          contrastHex(chrome.roseStrong, ground),
          `${mode} rose-strong ${chrome.roseStrong} on ${name} ${ground}`
        ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('aligns paper / ink helpers with theme defaults', () => {
    expect(PORTFOLIO_IVORY_HEX).toBe(PORTFOLIO_IVORY);
    expect(PORTFOLIO_INK_HEX).toBe(PORTFOLIO_INK);
    expect(getPortfolioChrome('light').ivory).toBe(PORTFOLIO_IVORY_HEX);
    expect(getPortfolioChrome('dark').ivory).toBe(PORTFOLIO_INK_HEX);
  });
});
