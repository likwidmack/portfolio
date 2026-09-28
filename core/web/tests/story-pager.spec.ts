import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { adjacentStudies, type CaseStudy } from '../shared/portfolio-types';

const root = join(import.meta.dirname, '..');
const study = (slug: string, order: number | string) =>
  ({ slug, order, title: slug.toUpperCase() }) as unknown as CaseStudy;

describe('adjacentStudies', () => {
  const list = [study('c', 3), study('a', '1'), study('b', 2)];

  it('orders by `order` (string or number) and returns neighbours', () => {
    const result = adjacentStudies(list, 'b');
    expect(result.previous?.slug).toBe('a');
    expect(result.next?.slug).toBe('c');
  });

  it('returns null at the ends and for unknown slugs', () => {
    expect(adjacentStudies(list, 'a').previous).toBeNull();
    expect(adjacentStudies(list, 'c').next).toBeNull();
    expect(adjacentStudies(list, 'zzz')).toEqual({ previous: null, next: null });
  });
});

describe('case study ending', () => {
  it('ends every case study with the story pager and a contact CTA', async () => {
    const page = await readFile(join(root, 'app/pages/work/[slug].vue'), 'utf8');
    expect(page).toContain('AppStoryPager(:previous="adjacent.previous", :next="adjacent.next")');
    const pager = await readFile(join(root, 'app/components/AppStoryPager.vue'), 'utf8');
    expect(pager).toContain('Next story →');
    expect(pager).toContain('← Previous story');
    expect(pager).toContain('Get in touch');
  });

  it('makes each work card a single link with an on-site arrow', async () => {
    const card = await readFile(join(root, 'app/components/AppWorkCard/index.vue'), 'utf8');
    expect(card.match(/NuxtLink/g)?.length).toBe(1);
    expect(card).toContain('work-card__title-link');
    expect(card).toContain('span.work-card__link(aria-hidden="true") Read the story →');
    expect(card).not.toContain('↗');
  });
});
