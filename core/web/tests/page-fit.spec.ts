// @vitest-environment node

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..');

const screenPages = [
  'app/pages/index.vue',
  'app/pages/work/index.vue',
  'app/pages/gallery/index.vue',
  'app/pages/code/index.vue',
  'app/pages/ai-lab.vue',
  'app/pages/product/index.vue',
  'app/pages/styles/index.vue',
  'app/pages/media-player.vue',
] as const;

const prosePages = [
  'app/pages/about.vue',
  'app/pages/blog/index.vue',
  'app/pages/blog/[slug].vue',
  'app/pages/docs/index.vue',
  'app/pages/docs/[...slug].vue',
  'app/pages/process.vue',
  'app/pages/work/[slug].vue',
] as const;

describe('page fit layout contract', () => {
  it('marks immersive pages with data-fit="screen"', async () => {
    for (const rel of screenPages) {
      const src = await readFile(join(root, rel), 'utf8');
      expect(src, rel).toMatch(/data-fit=["']screen["']/);
    }
  });

  it('marks reading pages with data-fit="prose"', async () => {
    for (const rel of prosePages) {
      const src = await readFile(join(root, rel), 'utf8');
      expect(src, rel).toMatch(/data-fit=["']prose["']/);
    }
  });

  it('exposes theme page-fit tokens and breakpoint ladder', async () => {
    const rootScss = await readFile(join(root, '../../theme/core/scss/globals/_root.scss'), 'utf8');
    const layouts = await readFile(join(root, '../../theme/core/scss/globals/_layouts.scss'), 'utf8');
    const variables = await readFile(join(root, '../../theme/core/scss/tokens/_variables.scss'), 'utf8');

    expect(variables).toContain('$breakpoint-mobile: 480px');
    expect(variables).toContain('$breakpoint-tablet: 768px');
    expect(variables).toContain('$breakpoint-standard: 1080px');
    expect(variables).toContain('$breakpoint-widescreen: 1440px');
    expect(variables).toContain('$breakpoint-ultrawide: 1920px');

    expect(rootScss).toContain('--page-fill-min');
    expect(rootScss).toContain('--page-screen-max');
    expect(rootScss).toContain('--page-shell-max');
    expect(rootScss).toContain('--prose-max');
    expect(rootScss).toContain('--media-ratio');
    expect(rootScss).toContain('--card-ratio');
    expect(rootScss).toContain('(orientation: landscape)');

    expect(layouts).toContain("data-fit='screen'");
    expect(layouts).toContain("data-fit='prose'");
  });
});
