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
    expect(ratio(v['--focus-ring'], v['--main-background'])).toBeGreaterThanOrEqual(3);
    expect(ratio(v['--focus-ring'], v['--surface-color'])).toBeGreaterThanOrEqual(3);
  });

  it('link colour reads 4.5:1 on the page', () => {
    expect(ratio(v['--link-color'], v['--main-background'])).toBeGreaterThanOrEqual(4.5);
  });

  it('strong border (and form borders) read 3:1 on surfaces', () => {
    expect(ratio(v['--border-strong'], v['--surface-color'])).toBeGreaterThanOrEqual(3);
    expect(v['--form-border-color']).toBe(v['--border-strong']);
  });

  it('on-primary text reads 4.5:1 on the primary fill', () => {
    expect(ratio(v['--on-primary'], v['--primary-fill'])).toBeGreaterThanOrEqual(4.5);
  });

  it('status inks read 4.5:1 on the page', () => {
    expect(ratio(v['--success-ink'], v['--main-background'])).toBeGreaterThanOrEqual(4.5);
    expect(ratio(v['--danger-ink'], v['--main-background'])).toBeGreaterThanOrEqual(4.5);
  });
});
