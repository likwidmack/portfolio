import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..');
const read = (path: string) => readFile(join(root, path), 'utf8');

describe('AppBrowseToolbar', () => {
  it('renders one control per facet with counts, a live status line and Clear filters', async () => {
    const src = await read('app/components/AppBrowseToolbar.vue');
    expect(src).not.toContain('groups-select');
    expect(src).not.toContain('kinds-select');
    expect(src).toContain('aria-live="polite"');
    expect(src).toContain('Clear filters');
    expect(src).toContain('option.count');
    expect(src).toContain('span Search');
    expect(src).not.toContain('span Query');
  });

  it('stays inside the viewport and swaps to labelled native pickers on narrow screens', async () => {
    const src = await read('app/components/AppBrowseToolbar.vue');
    // Regression: an implicit `auto` grid track let the segment rows push phones sideways.
    expect(src).toContain('grid-template-columns: minmax(0, 1fr)');
    expect(src).toContain('label.browse-toolbar__picker.browse-toolbar__groups-picker');
    expect(src).toContain('label.browse-toolbar__picker.browse-toolbar__kinds-picker');
    expect(src).toContain('select(v-model="group")');
    expect(src).toContain('select(v-model="kind")');
    expect(src).toContain('optionText(option)');
    // Exactly one control per facet at each width: segments hide where pickers show.
    // Range syntax pair (≤ 768 pickers / > 768 inline) so exactly one applies at 768px.
    expect(src).toMatch(/@media \(width <= #\{\$breakpoint-tablet\}\)[\s\S]*&__groups,\s*&__kinds \{\s*display: none;/);
    expect(src).toContain('@media (width > #{$breakpoint-tablet})');
    // Touch: 44px targets, 16px select text (no iOS zoom), no swipe-only scroll row.
    expect(src).toContain('min-height: var(--touch-target, 44px)');
    expect(src).toContain('font-size: 1rem');
    expect(src).not.toContain('overflow-x: auto');
    expect(src).not.toMatch(/min-height: (3\d|4[0-3])px/);
  });

  it('syncs Gallery and Docs filters to the URL and drops the old count paragraphs', async () => {
    for (const page of ['app/pages/gallery/index.vue', 'app/pages/docs/index.vue']) {
      const src = await read(page);
      expect(src).toContain('useBrowseQuery(');
      expect(src).toContain('@clear="clearFilters"');
      expect(src).not.toMatch(/p\.(gallery-page|docs-index)__count/);
    }
  });
});
