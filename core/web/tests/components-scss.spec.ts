// @vitest-environment node

import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Layer 5 (component) contract — docs/superpowers/plans/2026-09-24-scss-hierarchy-and-units.md, Task 6.
 * Components style their own box and internals (scoped); nothing leaks globally except the one
 * named teleported dialog, and :deep() only where a component styles markup it renders but
 * doesn't template (a wrapped library, or v-html).
 */
const root = join(import.meta.dirname, '..');
const componentsDir = join(root, 'app/components');

// Global on purpose: PrimeVue teleports the dialog root out of the component's scope. One named
// class, everything nested under it.
const GLOBAL_ALLOWED = new Map([['app/components/AppEvidenceExamplesDialog/index.vue', '.evidence-examples-dialog']]);
// Wrappers that style their own library's internals, or their own v-html body.
const DEEP_ALLOWED = new Set([
  'app/components/ui/UiTabs.vue', // PrimeVue Tabs internals
  'app/components/ui/UiTimeline.vue', // PrimeVue Timeline internals
  'app/components/ui/UiCodeBlock.vue', // highlighted code is v-html
]);

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (entry.name.endsWith('.vue')) out.push(full);
  }
  return out;
}

const rel = (file: string) => relative(root, file).replaceAll('\\', '/');

/** Inline style bodies plus any external sheet a style tag points at. */
async function styleOf(file: string): Promise<{ tags: string[]; css: string }> {
  const src = await readFile(file, 'utf8');
  const tags = src.match(/<style[^>]*>/g) ?? [];
  let css = [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
  for (const tag of tags) {
    const href = tag.match(/src="([^"]+)"/)?.[1];
    if (href) css += `\n${await readFile(join(dirname(file), href), 'utf8')}`;
  }
  return { tags, css: css.replace(/\/\/.*$/gm, '') };
}

describe('component SCSS layer (Task 6)', () => {
  it('scopes every component style block (one documented global dialog)', async () => {
    for (const file of await walk(componentsDir)) {
      const { tags, css } = await styleOf(file);
      const named = GLOBAL_ALLOWED.get(rel(file));
      for (const tag of tags) {
        if (named) {
          expect(
            css
              .trim()
              .split('\n')
              .find((line) => /^[.#a-z[]/i.test(line)),
            rel(file)
          ).toContain(named);
          continue;
        }
        expect(tag, rel(file)).toMatch(/\bscoped\b/);
      }
    }
  });

  it('keeps :deep() to wrappers of a library or v-html', async () => {
    for (const file of await walk(componentsDir)) {
      if (DEEP_ALLOWED.has(rel(file))) continue;
      const { css } = await styleOf(file);
      expect(css, rel(file)).not.toMatch(/:deep\(|::v-deep/);
    }
  });

  it('uses theme mixins, range syntax or container queries — no raw min/max-width queries', async () => {
    for (const file of await walk(componentsDir)) {
      const { css } = await styleOf(file);
      expect(css, rel(file)).not.toMatch(/@media[^{]*(max|min)-width/);
    }
  });
});
