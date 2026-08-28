import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const productPagePath = join(import.meta.dirname, '../app/pages/product/index.vue');
const productDataPath = join(import.meta.dirname, '../content/product.json');
const contentConfigPath = join(import.meta.dirname, '../content.config.ts');
const navPath = join(import.meta.dirname, '../app/components/AppPrimaryNav.vue');

describe('product presentation page', () => {
  it('loads Nuxt Content and exposes codebase, diagram, and description views', async () => {
    const page = await readFile(productPagePath, 'utf8');
    const data = await readFile(productDataPath, 'utf8');
    const contentConfig = await readFile(contentConfigPath, 'utf8');
    const nav = await readFile(navPath, 'utf8');

    expect(page).toContain("fetchContentCollection<ProductContent>('product'");
    expect(page).not.toContain('queryCollection(');
    expect(page).toContain('AppPageNav');
    expect(page).toContain('AppArchitectureDiagram');
    expect(page).toContain('UiCodeBlock');
    expect(page).toContain('useAppToast');
    expect(page).toContain('#panel-description');
    expect(page).toContain('#panel-diagram');
    expect(page).toContain('#panel-code');
    expect(contentConfig).toContain("source: 'product.json'");
    expect(data).toContain('Diagram / UML');
    expect(data).toContain('ArchitectureDiagram');
    expect(nav).not.toContain('to="/product"');
  });
});
