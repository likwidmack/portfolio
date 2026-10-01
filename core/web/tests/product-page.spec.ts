import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

type ProductContent = {
  presentation: {
    tabs: { value: string; label: string }[];
    diagram: {
      nodes?: { label: string }[];
      umlSource?: string;
    };
  };
};

const productPagePath = join(import.meta.dirname, '../app/pages/product/index.vue');
const productDataPath = join(import.meta.dirname, '../content/product.json');
const contentConfigPath = join(import.meta.dirname, '../content.config.ts');
const navPath = join(import.meta.dirname, '../app/components/AppPrimaryNav/index.vue');

async function loadProductContent(): Promise<ProductContent> {
  return JSON.parse(await readFile(productDataPath, 'utf8')) as ProductContent;
}

describe('product presentation page', () => {
  it('loads Nuxt Content and exposes codebase, diagram, and description views', async () => {
    const page = await readFile(productPagePath, 'utf8');
    const product = await loadProductContent();
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
    expect(product.presentation.tabs.map((tab) => tab.value)).toEqual(
      expect.arrayContaining(['description', 'diagram', 'code'])
    );
    expect(product.presentation.tabs.every((tab) => tab.label.length > 0)).toBe(true);
    const diagramBlob = JSON.stringify(product.presentation.diagram);
    expect(diagramBlob.length).toBeGreaterThan(0);
    expect(
      product.presentation.diagram.nodes?.some((node) => node.label.length > 0) ||
        typeof product.presentation.diagram.umlSource === 'string'
    ).toBe(true);
    expect(nav).not.toContain('to="/product"');
  });
});
