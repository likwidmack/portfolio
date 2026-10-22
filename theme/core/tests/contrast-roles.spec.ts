import { describe, expect, it } from 'vitest';

import { contrastRatio, parseCssColor } from '../src/contrast.js';
import { darkCssVariables, lightCssVariables } from '../src/tokens.js';

const ratio = (foreground: string, background: string): number => {
  const fg = parseCssColor(foreground);
  const bg = parseCssColor(background);
  if (!fg || !bg) throw new Error(`Unparseable colour pair: ${foreground} on ${background}`);
  return contrastRatio(fg, bg);
};

describe.each([
  ['dark', darkCssVariables],
  ['light', lightCssVariables],
] as const)('%s contrast roles (WCAG 2.x)', (_mode, v) => {
  it('focus ring reads 3:1 on the page and on surfaces', () => {
    expect(ratio(v['--theme-focus-ring-color'], v['--theme-main-background-color'])).toBeGreaterThanOrEqual(3);
    expect(ratio(v['--theme-focus-ring-color'], v['--theme-surface-color'])).toBeGreaterThanOrEqual(3);
  });

  it('link colour reads 4.5:1 on the page', () => {
    expect(ratio(v['--theme-link-color'], v['--theme-main-background-color'])).toBeGreaterThanOrEqual(4.5);
  });

  it('strong border (also the form border) reads 3:1 on surfaces', () => {
    expect(ratio(v['--theme-border-strong-color'], v['--theme-surface-color'])).toBeGreaterThanOrEqual(3);
  });

  it('on-primary text reads 4.5:1 on the primary fill', () => {
    expect(ratio(v['--theme-on-primary-color'], v['--theme-primary-fill-color'])).toBeGreaterThanOrEqual(4.5);
  });

  it('status inks read 4.5:1 on the page', () => {
    expect(ratio(v['--theme-success-ink-color'], v['--theme-main-background-color'])).toBeGreaterThanOrEqual(4.5);
    expect(ratio(v['--theme-error-ink-color'], v['--theme-main-background-color'])).toBeGreaterThanOrEqual(4.5);
  });
});
