import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..');

function rule(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} rule`).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf('}', start));
}

// iOS Safari: after Done, the Personalize mask blocked the page for seconds (PrimeVue removes it
// only after the dialog leave transition ends). See docs/solutions/ui-bugs/dialog-mask-lingers-ios-safari.md.
describe('PrimeVue dialog mask', () => {
  it('drops the mask from view and hit-testing as soon as the dialog starts closing', async () => {
    const css = await readFile(join(root, 'assets/css/_globals.scss'), 'utf8');
    const leavingMask = rule(css, '.p-dialog-mask.p-overlay-mask-leave-active');
    expect(leavingMask).toContain('background: transparent !important;');
    expect(leavingMask).toContain('pointer-events: none !important;');
    expect(rule(css, '.p-dialog.p-dialog-leave-active')).toContain('pointer-events: none !important;');
  });

  it('keeps backdrop-filter off the dialog surface', async () => {
    const css = await readFile(join(root, 'assets/css/_globals.scss'), 'utf8');
    expect(rule(css, '.p-dialog')).not.toMatch(/backdrop-filter/);
  });
});
