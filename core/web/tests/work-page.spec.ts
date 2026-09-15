// @vitest-environment node

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..');
const navPath = join(root, 'app/components/AppPrimaryNav/index.vue');
const subNavPath = join(root, 'app/components/AppWorkSubNav.vue');
const workIndexPath = join(root, 'app/pages/work/index.vue');
const workSlugPath = join(root, 'app/pages/work/[slug].vue');

describe('work hub navigation', () => {
  it('keeps Docs, AI Lab, and Process out of the primary rail', () => {
    const nav = readFileSync(navPath, 'utf8');
    expect(nav).toMatch(/to="\/work"[\s\S]*to="\/about"[\s\S]*to="\/gallery"[\s\S]*to="\/blog"[\s\S]*to="\/code"/);
    expect(nav).not.toContain('to="/docs"');
    expect(nav).not.toContain('to="/ai-lab"');
    expect(nav).not.toContain('to="/process"');
    expect(nav).not.toContain('AI Lab');
    expect(nav).not.toContain('Process');
  });

  it('lists Docs, AI Lab, and Process in AppWorkSubNav', () => {
    const subNav = readFileSync(subNavPath, 'utf8');
    const items = readFileSync(join(root, 'shared/work-sub-nav.ts'), 'utf8');
    expect(subNav).toContain('aside.page-nav');
    expect(subNav).toContain("from '#shared/work-sub-nav'");
    expect(items).toContain("to: '/docs'");
    expect(items).toContain("to: '/ai-lab'");
    expect(items).toContain("to: '/process'");
    expect(items).toContain("label: 'Docs'");
    expect(items).toContain("label: 'AI Lab'");
    expect(items).toContain("label: 'Process'");
  });

  it('mounts Work sub-nav on the case study pages only', () => {
    const studyPage = readFileSync(workSlugPath, 'utf8');
    expect(studyPage).toContain('page-with-nav');
    expect(studyPage).toContain('AppWorkSubNav');
  });

  it('gives the work index a jump-to bar over the case study grid, matching the design', () => {
    const indexPage = readFileSync(workIndexPath, 'utf8');
    expect(indexPage).not.toContain('AppWorkSubNav');
    expect(indexPage).toContain('jump-bar');
    expect(indexPage).toContain('jump-link');
  });
});
