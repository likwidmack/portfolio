import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const docsIndexPath = join(import.meta.dirname, '../app/pages/docs/index.vue');
const docsSlugPath = join(import.meta.dirname, '../app/pages/docs/[...slug].vue');
const contentConfigPath = join(import.meta.dirname, '../content.config.ts');
const apiPath = join(import.meta.dirname, '../server/api/content/[collection].get.ts');

describe('technical docs hub', () => {
  it('indexes markdown from the repo docs tree', async () => {
    const config = await readFile(contentConfigPath, 'utf8');
    const index = await readFile(docsIndexPath, 'utf8');
    expect(config).toContain('cwd: REPO_DOCS_DIR');
    expect(config).toContain('include: DOCS_COLLECTION_INCLUDE');
    expect(index).toContain("fetchContentCollection<DocsIndexEntry[]>('docs'");
    expect(index).toContain('docCardHref');
    expect(index).toContain('docCardTitle');
    expect(index).not.toContain('queryCollection(');
  });

  it('renders a spec by content path', async () => {
    const page = await readFile(docsSlugPath, 'utf8');
    const api = await readFile(apiPath, 'utf8');
    expect(page).toContain("fetchContentCollection<DocsPage>('docs'");
    expect(page).toContain('validate(route)');
    expect(page).toContain('ContentRenderer');
    expect(api).toContain("'docs'");
    expect(api).toContain('query.path');
  });
});
