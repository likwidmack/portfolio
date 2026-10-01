// @vitest-environment node

import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Layer 4 (page) contract — docs/superpowers/plans/2026-09-24-scss-hierarchy-and-units.md, Task 5.
 * Pages style only their own elements (scoped), breakpoints come from the theme mixins or a
 * container query, and component internals are the component's job (props / variants).
 */
const root = join(import.meta.dirname, '..');
const pagesDir = join(root, 'app/pages');

// Rendered markdown is not a component with props, so these pages may reach into it.
const MARKDOWN_DEEP_ALLOWED = new Set(['app/pages/blog/[slug].vue', 'app/pages/docs/[...slug].vue']);

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (/\.(vue|scss)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const rel = (file: string) => relative(root, file).replaceAll('\\', '/');

describe('page SCSS layer (Task 5)', () => {
  it('uses theme breakpoint mixins or container queries — no raw width media queries', async () => {
    for (const file of await walk(pagesDir)) {
      const src = await readFile(file, 'utf8');
      expect(src, rel(file)).not.toMatch(/@media[^{]*(max|min)-width/);
    }
  });

  it('never restyles child component internals with :deep() (markdown bodies excepted)', async () => {
    for (const file of await walk(pagesDir)) {
      if (MARKDOWN_DEEP_ALLOWED.has(rel(file))) continue;
      const src = (await readFile(file, 'utf8')).replace(/\/\/.*$/gm, '');
      expect(src, rel(file)).not.toMatch(/:deep\(|::v-deep/);
    }
  });

  it('scopes every page style block (external sheets via src + scoped)', async () => {
    const vues = (await walk(pagesDir)).filter((file) => file.endsWith('.vue'));
    for (const file of vues) {
      const src = await readFile(file, 'utf8');
      for (const tag of src.match(/<style[^>]*>/g) ?? []) expect(tag, rel(file)).toMatch(/\bscoped\b/);
    }
    const splash = await readFile(join(root, 'app/components/AppSplash/index.vue'), 'utf8');
    expect(splash).toMatch(/<style[^>]*src="\.\.\/\.\.\/pages\/index\.scss"[^>]*scoped/);
  });

  it('keeps work page sheets flat (no pages/work/styles/)', async () => {
    const work = await readdir(join(pagesDir, 'work'));
    expect(work).not.toContain('styles');
    expect(work).toEqual(expect.arrayContaining(['index.scss', 'case-study.scss']));
  });
});
