import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const processPagePath = join(import.meta.dirname, '../app/pages/process/index.vue');
const agenticCardPath = join(import.meta.dirname, '../content/decision-cards/agentic-ui.json');

describe('process first beat', () => {
  it('gives public decision cards stable ids and date-then-id sort', async () => {
    const page = await readFile(processPagePath, 'utf8');
    const card = await readFile(agenticCardPath, 'utf8');
    expect(card).toContain('"id": "agentic-ui-exploration"');
    expect(page).toContain(':id="card.id"');
    expect(page).toContain('a.id.localeCompare(b.id)');
  });
});
