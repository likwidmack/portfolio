// @vitest-environment node

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { Color } from '@tgmc/theme';
import * as sass from 'sass';
import { describe, expect, it } from 'vitest';

import { PORTFOLIO_INK, PORTFOLIO_IVORY } from '../shared/personalization';
import {
  getPortfolioChrome,
  PORTFOLIO_INK_HEX,
  PORTFOLIO_IVORY_HEX,
  portfolioTeal,
  type PortfolioChrome,
  type PortfolioChromeMode,
} from '../shared/portfolio-chrome';

const root = join(import.meta.dirname, '..');
const repoRoot = join(root, '..', '..');
const themeCore = join(repoRoot, 'theme', 'core');
const dumpPath = join(root, 'assets', 'css', 'export', 'portfolio-chrome-dump.scss');
const variablesPath = join(root, 'assets', 'css', '_variables.scss');

const DUMP_KEYS = [
  'rose',
  'rose-strong',
  'haze-1',
  'haze-2',
  'haze-3',
  'haze-4',
  'particle-strong',
  'particle-mid',
  'particle-soft',
  'grid-glow',
] as const;

type DumpKey = (typeof DUMP_KEYS)[number];

const KEY_TO_CHROME: Record<DumpKey, keyof PortfolioChrome> = {
  rose: 'rose',
  'rose-strong': 'roseStrong',
  'haze-1': 'haze1',
  'haze-2': 'haze2',
  'haze-3': 'haze3',
  'haze-4': 'haze4',
  'particle-strong': 'particleStrong',
  'particle-mid': 'particleMid',
  'particle-soft': 'particleSoft',
  'grid-glow': 'gridGlow',
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

function parseBlockProps(css: string, selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'm'));
  if (!match?.[1]) {
    throw new Error(`portfolio-chrome dump: missing block for ${selector}`);
  }
  const props: Record<string, string> = {};
  for (const part of match[1].split(';')) {
    const prop = part.match(/--portfolio-([\w-]+)\s*:\s*([^;]+)/);
    if (prop?.[1] && prop[2]) {
      props[prop[1]] = parseCssColor(prop[2]);
    }
  }
  return props;
}

function compileDump(): string {
  return sass.compile(dumpPath, {
    loadPaths: [themeCore],
    style: 'expanded',
  }).css;
}

function assertModeParity(mode: PortfolioChromeMode, dumpProps: Record<string, string>): void {
  const chrome = getPortfolioChrome(mode);
  for (const key of DUMP_KEYS) {
    const dumped = dumpProps[key];
    if (!dumped) {
      throw new Error(`portfolio-chrome dump missing --portfolio-${key} for ${mode}`);
    }
    expect(chrome[KEY_TO_CHROME[key]], `${mode} ${key}`).toBe(dumped);
  }
}

describe('portfolio chrome recipe parity', () => {
  it('mirrors Sass dump for light and dark atmosphere chrome', () => {
    const css = compileDump();
    assertModeParity('light', parseBlockProps(css, ':root'));
    assertModeParity('dark', parseBlockProps(css, 'html[data-theme=dark]'));
  });

  it('keeps dump recipe expressions aligned with _variables.scss', async () => {
    const dump = await readFile(dumpPath, 'utf8');
    const variables = await readFile(variablesPath, 'utf8');

    const snippets = [
      'theme-lighten($oxblood-dark, 10%)',
      'theme-lighten($oxblood-dark, 28%)',
      'theme-lighten($oxblood-dark, 42%)',
      'color.mix($main-background-light, $oxblood-dark, 72%)',
      'color.mix($main-background-light, $oxblood-dark, 78%)',
      'color.mix($main-background-light, $oxblood-dark, 84%)',
      'color.mix($main-background-light, $oxblood-dark, 90%)',
      'color.mix($oxblood-dark, $text-color-secondary-dark, 55%)',
      'color.mix($main-background-light, $oxblood-dark, 82%)',
      'color.mix($main-background-light, $oxblood-dark, 88%)',
      'color.mix($main-background-dark, $oxblood-dark, 42%)',
      'color.mix($main-background-dark, $oxblood-light, 55%)',
      'theme-darken($oxblood-light, 4%)',
      'theme-darken($oxblood-light, 10%)',
      'theme-lighten($primary-color-dark, 32%)',
      'theme-darken($oxblood-dark, 8%)',
    ];

    for (const snippet of snippets) {
      expect(dump, `dump: ${snippet}`).toContain(snippet);
      expect(variables, `variables: ${snippet}`).toContain(snippet);
    }
  });

  it('aligns Tier A paper / teal helpers with theme named tokens', () => {
    expect(PORTFOLIO_IVORY_HEX).toBe(PORTFOLIO_IVORY);
    expect(PORTFOLIO_INK_HEX).toBe(PORTFOLIO_INK);
    expect(portfolioTeal('light')).toBe(Color.toHex(Color.named('tealSignalLight')!));
    expect(portfolioTeal('dark')).toBe(Color.toHex(Color.named('tealSignalDark')!));
  });
});
