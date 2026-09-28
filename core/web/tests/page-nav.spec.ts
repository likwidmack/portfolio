// @vitest-environment node

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const web = join(import.meta.dirname, '..');
const read = (rel: string) => readFile(join(web, rel), 'utf8');

/**
 * On-page nav (AppPageNav, AppWorkSubNav) on phones: one labelled disclosure — never a sideways,
 * swipe-only row (UI rule: responsive · accessible · touch).
 */
describe('page nav on phones', () => {
  it('renders a labelled toggle wired to the list for both navs', async () => {
    for (const rel of ['app/components/AppPageNav/index.vue', 'app/components/AppWorkSubNav.vue']) {
      const src = await read(rel);
      expect(src, rel).toContain('button.page-nav__toggle(');
      expect(src, rel).toContain(":aria-expanded=\"open ? 'true' : 'false'\"");
      expect(src, rel).toContain(':aria-controls="listId"');
      expect(src, rel).toContain('nav(:id="listId", :data-open="open ? \'\' : undefined")');
      expect(src, rel).toContain('@keydown.esc="closeAndFocus"');
      expect(src, rel).toContain('usePageNavDisclosure()');
      expect(src, rel).toContain('@click="open = false"');
    }
  });

  it('collapses the list by CSS below the tablet breakpoint and never scrolls sideways', async () => {
    const scss = await read('app/components/AppPageNav/AppPageNav.scss');
    expect(scss).not.toContain('overflow-x: auto');
    expect(scss).not.toContain('width: max-content');
    expect(scss).toMatch(/\.page-nav__toggle \{\s*display: none;/);
    expect(scss).toMatch(
      /@include bp-down\(tablet\)[\s\S]*nav \{\s*display: none;[\s\S]*&\[data-open\] \{\s*display: grid;/
    );
    expect(scss).toMatch(/\.page-nav__toggle \{\s*display: flex;[\s\S]*min-height: var\(--touch-target, 44px\);/);
  });

  it('closes on Esc (focus back to the toggle) and on path navigation', async () => {
    const src = await read('app/composables/usePageNavDisclosure.ts');
    expect(src).toContain("querySelector<HTMLButtonElement>('.page-nav__toggle')?.focus()");
    expect(src).toContain('route.path');
    expect(src).not.toContain('route.fullPath');
    expect(src).toContain('toggleOpen');
    expect(src).toContain('useId()');
  });

  it('wires both nav toggles through toggleOpen (stopPropagation)', async () => {
    for (const rel of ['app/components/AppPageNav/index.vue', 'app/components/AppWorkSubNav.vue']) {
      const src = await read(rel);
      expect(src, rel).toContain('@click="toggleOpen"');
      expect(src, rel).toContain('toggleOpen');
      expect(src, rel).not.toContain('@click="open = !open"');
    }
  });
});
