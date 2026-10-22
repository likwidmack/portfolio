import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const globals = join(import.meta.dirname, '../assets/css/_globals.scss');

/** The declarations inside the first `*, *::before, *::after { … }` block after `start`. */
function universalBlock(scss: string, start: string): string[] {
  const at = scss.indexOf(start);
  expect(at, `${start} present`).toBeGreaterThan(-1);
  const open = scss.indexOf('*::after {', at);
  const body = scss.slice(open + '*::after {'.length, scss.indexOf('}', open));
  return body
    .split(';')
    .map((line) => line.trim())
    .filter(Boolean)
    .sort();
}

// Design-system audit M8: the OS `prefers-reduced-motion` and Personalize's `data-motion='reduced'`
// must collapse the same things — transitions included (hover lifts, colour fades).
describe('reduced motion: one preference, one behaviour', () => {
  it('the OS branch collapses exactly what data-motion="reduced" collapses', async () => {
    const scss = await readFile(globals, 'utf8');
    const site = universalBlock(scss, "html[data-motion='reduced'] {");
    const os = universalBlock(scss, '@media (prefers-reduced-motion: reduce) {');
    expect(site).toContain('transition-duration: 0.01ms !important');
    expect(os).toEqual(site);
  });
});
