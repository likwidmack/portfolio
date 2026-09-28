// @vitest-environment node

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..');

const screenPages = [
  'app/components/AppSplash/index.vue',
  'app/pages/work/index.vue',
  'app/pages/ai-lab/index.vue',
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
  'app/pages/process/index.vue',
  'app/pages/work/[slug].vue',
] as const;

describe('page fit layout contract', () => {
  it('marks immersive pages with data-fit="screen"', async () => {
    for (const rel of screenPages) {
      const src = await readFile(join(root, rel), 'utf8');
      expect(src, rel).toMatch(/data-fit=["']screen["']/);
    }
  });

  it('marks working surfaces (code, gallery) with data-fit="fluid" and keeps them uncapped', async () => {
    for (const rel of ['app/pages/gallery/index.vue', 'app/pages/code/index.vue']) {
      const src = await readFile(join(root, rel), 'utf8');
      expect(src, rel).toMatch(/data-fit=["']fluid["']/);
    }
    const layouts = await readFile(join(root, '../../theme/core/scss/globals/_layouts.scss'), 'utf8');
    expect(layouts).toMatch(/data-fit='fluid'\][\s\S]*?max-width:\s*none/);
    const globals = await readFile(join(root, 'assets/css/_globals.scss'), 'utf8');
    expect(globals).toMatch(/\[data-fit='fluid'\][\s\S]*?max-width:\s*none/);
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
    expect(rootScss).toContain('--page-shell-max: 90rem');
    expect(rootScss).toContain('--page-screen-max: 90rem');
    expect(rootScss).toContain('--prose-max');
    expect(rootScss).toContain('--media-ratio');
    expect(rootScss).toContain('--card-ratio');
    expect(rootScss).toContain('--surface-ratio: 9 / 16');
    expect(rootScss).toContain('--button-radius: var(--border-radius-sm)');
    expect(rootScss).toContain('(orientation: landscape)');
    // Page-fit surface/card/media stay 9:16 / 16:9 / 1:1; banner 21:9 may exist as a named box token only.
    expect(rootScss).not.toMatch(/--(?:surface|card|media)-ratio:\s*21\s*\/\s*9/);
    expect(rootScss).not.toMatch(/--(?:surface|card|media)-ratio:\s*16\s*\/\s*10/);
    expect(rootScss).toContain('--theme-box-ratio-banner');

    expect(layouts).toContain("data-fit='screen'");
    expect(layouts).toContain("data-fit='prose'");
    expect(layouts).toContain('margin-inline: auto');
    expect(layouts).toContain('flex-wrap: wrap');
    // em breakpoints via range-syntax mixins (no max/min-width overlap at exactly 768px).
    expect(layouts).toContain('@include m.bp-up(tablet)');
    expect(layouts).toContain('flex: 1 1 var(--group-item-min)');
    expect(layouts).toContain('align-items: stretch');
    expect(layouts).toContain('align-self: stretch');
    expect(layouts).toMatch(/flex-direction:\s*column[\s\S]*?>\s*\*\s*\{[\s\S]*?width:\s*100%/);
    expect(layouts).toContain('> :where(section, article, .panel)');
    expect(layouts).toContain('flex: 1 1 auto');
    expect(layouts).toMatch(/data-fit='prose'[\s\S]*?min-height:\s*100%/);

    // Page shell (splash lock, flexing main) lives in the layout layer; the theme stays universal.
    const siteScss = await readFile(join(root, 'app/layouts/site.scss'), 'utf8');
    // One shell rule for every page, home included: min-100dvh column, main takes the slack.
    expect(siteScss).not.toContain('body:has(.splash-page)');
    expect(siteScss).not.toMatch(/overflow:\s*hidden/);
    expect(siteScss).toContain('min-height: 100dvh');
    expect(siteScss).toContain('flex: 1 1 auto');
    const themeLayout = await readFile(join(root, '../../theme/core/scss/_layout.scss'), 'utf8');
    expect(themeLayout).not.toContain('splash-page');
    expect(siteScss).toMatch(/> main \{[\s\S]*?padding-block: 0;/);
    // Layout layer: no raw width media queries (bp-* mixins), footer row is a container query,
    // and the sub-layouts are style-free modifiers of the `site` shell.
    expect(siteScss).not.toMatch(/@media[^{]*(max|min)-width|width\s*<=\s*\$/);
    expect(siteScss).toContain('container: site-footer / inline-size');
    expect(siteScss).toMatch(/@container site-footer/);
    expect(siteScss).not.toContain('100vw');
    for (const name of ['default', 'playground', 'snippet']) {
      const vue = await readFile(join(root, `app/layouts/${name}.vue`), 'utf8');
      expect(vue, name).not.toContain('<style');
      expect(vue, name).toContain(`layout-class="layout-${name}"`);
    }
    expect(siteScss).not.toContain('padding-top: var(--main-top-padding)');

    expect(rootScss).toContain('--shadow-sm:');
    expect(rootScss).toContain('--shadow-md:');
    expect(rootScss).toContain('--shadow-lg:');
    expect(rootScss).toContain('rgb(var(--rgb-shadow)');

    const container = await readFile(join(root, '../../theme/core/scss/globals/_container.scss'), 'utf8');
    expect(container).toContain('width: fit-content');
    expect(container).toContain('.page-content > section');
    expect(container).toMatch(/\.page-content\s*>\s*section\s*\{[^}]*width:\s*100%/s);
  });
});
