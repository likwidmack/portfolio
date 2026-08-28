import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..');

describe('SPA page data loading', () => {
  it('keys NuxtPage by fullPath so route changes remount pages', async () => {
    const app = await readFile(join(root, 'app/app.vue'), 'utf8');
    expect(app).toContain(':page-key="(route) => route.fullPath"');
  });

  it('disables page/layout Transition out-in (Suspense + async setup conflict)', async () => {
    const appProp = await readFile(join(root, 'config-properties/app-prop.ts'), 'utf8');
    expect(appProp).toContain('pageTransition: false');
    expect(appProp).toContain('layoutTransition: false');
    expect(appProp).not.toMatch(/pageTransition:\s*\{[^}]*mode:\s*['"]out-in['"]/);
    expect(appProp).not.toMatch(/layoutTransition:\s*\{[^}]*mode:\s*['"]out-in['"]/);
  });

  it('uses hydration-only cache for portfolio content fetches', async () => {
    const helper = await readFile(join(root, 'app/composables/useContentAsyncData.ts'), 'utf8');
    const fetchHelper = await readFile(join(root, 'app/composables/fetchContentCollection.ts'), 'utf8');
    const home = await readFile(join(root, 'app/pages/index.vue'), 'utf8');
    const caseStudy = await readFile(join(root, 'app/pages/work/[slug].vue'), 'utf8');
    const api = await readFile(join(root, 'server/api/content/[collection].get.ts'), 'utf8');

    expect(helper).toContain('nuxtApp.isHydrating');
    expect(helper).toContain('return undefined');
    expect(helper).toContain('withContentQueryLock');
    expect(fetchHelper).toContain('/api/content/');
    expect(api).toContain('queryCollection(event, collection)');
    // Code + Writing shelves must be allowlisted or /code and /blog 500 with empty content.
    for (const collection of ['code', 'writing', 'gallery', 'home'] as const) {
      expect(fetchHelper).toMatch(new RegExp(`['"]${collection}['"]`));
      expect(api).toMatch(new RegExp(`['"]${collection}['"]`));
    }
    expect(home).toContain('useContentAsyncData');
    expect(home).toContain('fetchContentCollection');
    expect(home).toContain('computed(() => homeContent.value');
    expect(home).not.toContain('Promise.all([');
    expect(home).not.toContain('queryCollection(');
    expect(caseStudy).toContain('watch: [slug]');
    expect(caseStudy).toContain('computed(() => (data.value');
    expect(caseStudy).toContain('fetchContentCollection');
  });
});
