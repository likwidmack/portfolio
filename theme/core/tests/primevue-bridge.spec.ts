// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { applyPrimeVueBridge, clearPrimeVueBridge } from '../src/set-theme-variable';

/**
 * Task 7 fix round 1: `applyPrimeVueBridge` reads the `--theme-…-color` token keys and normalises an
 * old-keyed patch with `normalizeColorNames` first (Task 8), so both shapes write the same `--p-*` values.
 */
const root = () => document.documentElement;

/** Every `--p-*` custom property written inline on `:root`. */
function inlinePrimeVue(): Record<string, string> {
  const out: Record<string, string> = {};
  const style = root().style;
  for (let i = 0; i < style.length; i++) {
    const name = style.item(i);
    if (name.startsWith('--p-')) out[name] = style.getPropertyValue(name);
  }
  return out;
}

function written(patch: Record<string, string>): Record<string, string> {
  root().removeAttribute('style');
  applyPrimeVueBridge(patch);
  return inlinePrimeVue();
}

afterEach(() => {
  clearPrimeVueBridge();
  root().removeAttribute('style');
});

describe('applyPrimeVueBridge', () => {
  it('writes the same --p-* values for an old-key patch and the equivalent new-key patch', () => {
    const old = written({ '--primary-color': '#112233', '--form-border-color': '#445566', '--success': '#778899' });
    const next = written({
      '--theme-primary-color': '#112233',
      '--theme-border-strong-color': '#445566',
      '--theme-success-hue-color': '#778899',
    });
    expect(Object.keys(old).length).toBeGreaterThan(0);
    expect(old).toEqual(next);
    expect(next['--p-primary-color']).toBe('#112233');
    expect(next['--p-form-field-border-color']).toBe('#445566');
    expect(next['--p-green-500']).toBe('#778899');
    expect(next['--p-highlight-background']).toBe('color-mix(in srgb, #112233 18%, transparent)');
  });

  it('writes nothing for a patch with no colour keys', () => {
    expect(written({ '--space-4': '1rem', '--border-radius-sm': '0.25rem' })).toEqual({});
  });

  it('a new key beats an old key when both are present', () => {
    const out = written({ '--primary-color': '#000001', '--theme-primary-color': '#000002' });
    expect(out['--p-primary-color']).toBe('#000002');
    expect(out['--p-highlight-color']).toBe('#000002');
  });
});
