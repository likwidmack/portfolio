import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Colour system Task 3 fix round 2 — controller ruling: hover / active on primary-fill or
 * status-filled controls keep their text ≥ 4.5:1. The app follows the theme's single mechanism:
 * no lightening `filter` on those controls' hover / focus (a lighter fill drops white text under
 * 4.5:1 — e.g. `brightness(1.08)` on the light primary fill `#c74c1b` ≈ 4.11:1). The hover cue is
 * an underline instead. Checked at source (Cypress cannot hover natively; see the theme's
 * `filled-control-states.spec.ts` for the filter maths).
 */
const read = (path: string) => readFileSync(join(import.meta.dirname, '..', path), 'utf8');

const FILLED_CONTROLS = [
  ['app/components/AppPrimaryNav/AppPrimaryNav.scss', '&__contact'],
  ['app/pages/index.scss', '&__link'],
  ['app/pages/about.scss', '&__resume'],
] as const;

/** The block that starts at `selector` (brace-matched). */
function block(source: string, selector: string): string {
  const start = source.indexOf(`${selector} {`);
  expect(start, selector).toBeGreaterThan(-1);
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`unbalanced ${selector}`);
}

describe('filled controls: no lightening hover filter (fix round 2)', () => {
  it.each(FILLED_CONTROLS)('%s %s keeps its fill on hover and shows an underline instead', (path, selector) => {
    const css = block(read(path), selector);
    expect(css).not.toMatch(/filter:\s*brightness\(\s*1\.\d*[1-9]/);
    expect(css).toMatch(/&:hover[^{]*\{[^}]*text-decoration: underline/);
  });

  it('UiButton leaves filled status buttons to the theme (paper text on the status fill)', () => {
    const ui = read('app/components/ui/UiButton.vue');
    const rule = /&:not\(\[disabled\]\)((?::not\([^)]*\))+)\s*\{\s*color: var\(--theme-button-secondary-fg-color/.exec(
      ui
    );
    expect(rule, 'filled-button text rule').toBeTruthy();
    for (const s of ['success', 'warn', 'warning', 'danger', 'info'])
      expect(rule![1].replace(/\s+/g, ''), s).toContain(`:not(.p-button-${s})`);
  });
});
