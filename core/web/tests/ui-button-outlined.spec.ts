import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * UiButton's scoped outlined hover / focus-visible rule is unlayered, so it beats the theme layer.
 * It used to paint every outlined label `--portfolio-rose-color` (a primary / ink mix that is not
 * contrast-checked: 4.20:1 for midnightMagic dark) — including outlined status buttons, whose label
 * must stay the status ink. It now paints `--theme-primary-ink-color` and leaves status
 * severities to the theme (`pv-outline-tone`).
 */
const ui = readFileSync(join(import.meta.dirname, '../app/components/ui/UiButton.vue'), 'utf8');

describe('UiButton outlined hover / focus-visible text', () => {
  const start = ui.indexOf('&.p-button-outlined');
  const block = ui.slice(start, ui.indexOf('&.p-button-text', start));

  it('reads the primary ink, never a palette colour', () => {
    expect(block).toMatch(/color: var\(--theme-primary-ink-color\)/);
    expect(block).not.toMatch(/(^|[^-])color: var\(--portfolio-/m);
  });

  it('leaves outlined status buttons (success / warn / danger / info) to the theme', () => {
    const head = block.slice(0, block.indexOf('{')).replace(/\s+/g, '');
    for (const s of ['success', 'warn', 'warning', 'danger', 'info']) expect(head, s).toContain(`:not(.p-button-${s})`);
  });
});
