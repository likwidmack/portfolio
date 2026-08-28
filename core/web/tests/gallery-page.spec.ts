import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const navPath = join(import.meta.dirname, '../app/components/AppPrimaryNav.vue');
const galleryPagePath = join(import.meta.dirname, '../app/pages/gallery/index.vue');
const galleryDataPath = join(import.meta.dirname, '../content/gallery.json');

describe('gallery hub', () => {
  it('exposes gallery in primary navigation without a /work redirect', async () => {
    const nuxtConfig = await readFile(join(import.meta.dirname, '../nuxt.config.ts'), 'utf8');
    const nav = await readFile(navPath, 'utf8');
    expect(nuxtConfig).not.toContain("'/gallery': { redirect:");
    expect(nav).toContain('to="/gallery"');
    expect(nav).toContain('to="/docs"');
  });

  it('loads a filterable feed from the gallery collection', async () => {
    const page = await readFile(galleryPagePath, 'utf8');
    const data = await readFile(galleryDataPath, 'utf8');
    expect(page).toContain("fetchContentCollection<GalleryContent>('gallery'");
    expect(page).toContain('AppBrowseToolbar');
    expect(page).toContain('GalleryFeedCard');
    expect(page).not.toContain('queryCollection(');
    expect(data).toContain('"id": "reels"');
    expect(data).toContain('vimg-tesseract-framework.mp4');
  });
});
