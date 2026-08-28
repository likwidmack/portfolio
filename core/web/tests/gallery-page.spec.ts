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
    expect(nav).not.toContain('to="/docs"');
    expect(nav).not.toContain('to="/ai-lab"');
    expect(nav).not.toContain('to="/process"');
  });

  it('loads a filterable feed from the gallery collection', async () => {
    const page = await readFile(galleryPagePath, 'utf8');
    const data = await readFile(galleryDataPath, 'utf8');
    expect(page).toContain("fetchContentCollection<GalleryContent>('gallery'");
    expect(page).toContain('AppBrowseToolbar');
    expect(page).toContain('GalleryFeedCard');
    expect(page).toContain('gallery-grid__stats');
    expect(page).toContain('--portfolio-teal');
    expect(page).toContain("ref<GalleryViewMode>('grid')");
    expect(page).not.toContain('queryCollection(');
    expect(data).toContain('"id": "reels"');
    expect(data).toContain('"platform": "reels"');
    expect(data).toContain('vimg-tesseract-framework.mp4');
  });

  it('imports and uses gallery aspect/platform helpers in script setup', async () => {
    const page = await readFile(galleryPagePath, 'utf8');
    // Imports alone are not enough: Pug + script-setup can elide template-only imports.
    for (const name of [
      'GALLERY_PLATFORM_LABEL',
      'galleryEngagementLabel',
      'resolveGalleryAspect',
      'resolveGalleryPlatform',
    ] as const) {
      expect(page).toContain(name);
    }
    expect(page).toContain("from '#shared/gallery-types'");
    expect(page).toContain('gridTiles');
    expect(page).toContain('resolveGalleryAspect(post)');
    expect(page).toContain('resolveGalleryPlatform(post)');
    expect(page).toContain('galleryEngagementLabel(post)');
    expect(page).toContain('GALLERY_PLATFORM_LABEL[platform]');
    // Template must not call helpers directly on _ctx (regression of the instance warning).
    expect(page).not.toMatch(/:data-aspect="resolveGalleryAspect\(/);
    expect(page).not.toMatch(/GALLERY_PLATFORM_LABEL\[resolveGalleryPlatform\(/);
    expect(page).not.toMatch(/galleryEngagementLabel\(post\)\}\}/);
  });
});
