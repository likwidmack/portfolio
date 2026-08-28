// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
  buildWritingGrid,
  formatWritingKicker,
  partitionWritingGrid,
  type WritingEssay,
} from '../shared/writing-types';

const essays: WritingEssay[] = [
  {
    id: 'a',
    category: 'Product',
    status: 'planned',
    featured: true,
    title: 'Featured',
    excerpt: 'Lead essay',
    href: '/docs',
  },
  {
    id: 'b',
    category: 'Architecture',
    status: 'proposed',
    title: 'ADR',
    excerpt: 'Decision',
  },
  {
    id: 'c',
    category: 'Security',
    status: 'planned',
    title: 'Boundaries',
    excerpt: 'Agents',
  },
  {
    id: 'd',
    category: 'Operations',
    status: 'draft',
    title: 'Validated',
    excerpt: 'Columns',
  },
];

describe('writing-types', () => {
  it('formats category · status kickers', () => {
    expect(formatWritingKicker('Product', 'planned')).toBe('Product · planned');
  });

  it('builds an editorial shelf with featured essay first then notes', () => {
    const cards = buildWritingGrid(
      essays,
      [{ id: '1', slug: 'hello', title: 'Hello', excerpt: 'Note', publishedAt: '2026-08-01T00:00:00.000Z' }],
      () => 'Aug 1, 2026'
    );
    expect(cards[0]?.featured).toBe(true);
    expect(cards[0]?.title).toBe('Featured');
    expect(cards.at(-1)?.kicker).toContain('Notes · published');
    expect(cards.at(-1)?.href).toBe('/blog/hello');
  });

  it('partitions into feature, primary cells, and secondary cells', () => {
    const layout = partitionWritingGrid(buildWritingGrid(essays, [], () => ''));
    expect(layout.feature?.title).toBe('Featured');
    expect(layout.primaryCells).toHaveLength(2);
    expect(layout.secondaryCells).toHaveLength(1);
  });
});
