import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const processPagePath = join(import.meta.dirname, '../app/pages/process/index.vue');
const agenticCardPath = join(import.meta.dirname, '../content/decision-cards/agentic-ui.json');

describe('process first beat', () => {
  it('gives public decision cards stable slug DOM ids and date-then-slug sort', async () => {
    const page = await readFile(processPagePath, 'utf8');
    const card = await readFile(agenticCardPath, 'utf8');
    // Field must be `slug`, not `id` — Nuxt Content reserves `id` for the document path.
    expect(card).toContain('"slug": "agentic-ui-exploration"');
    expect(card).not.toMatch(/^\s*"id":/m);
    expect(page).toContain(':id="card.slug"');
    expect(page).toContain('a.slug.localeCompare(b.slug)');
  });
});
