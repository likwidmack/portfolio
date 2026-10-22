// @vitest-environment node

import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..');
const repoRoot = join(root, '..', '..');
const css = (...parts: string[]) => join(root, 'assets', 'css', ...parts);

function runMeasureAppScss(): Record<string, unknown> {
  const out = execFileSync(process.execPath, [join(repoRoot, 'scripts', 'measure-app-scss.mjs')], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, SKIP_CONTRACT_TESTS: '1' },
  });
  return JSON.parse(out.trim()) as Record<string, unknown>;
}

describe('app SCSS source of truth', () => {
  it('keeps portfolio :root tokens in _variables.scss, not portfolio-launch.scss', async () => {
    const variables = await readFile(css('_variables.scss'), 'utf8');
    const launch = await readFile(css('portfolio-launch.scss'), 'utf8');

    expect(variables).toContain(':root');
    expect(variables).toContain('--portfolio-coral-color');
    expect(variables).toContain('--portfolio-space');
    expect(variables).toContain("html[data-theme='dark']");
    expect(variables).toContain("html[data-theme='light']");

    expect(launch).not.toMatch(/(^|\n):root\s*\{/);
    expect(launch).toMatch(/@use ['"]\.?\/?variables['"]/);
  });

  it('keeps mixin APIs in _mixins.scss (no selectors)', async () => {
    const mixins = await readFile(css('_mixins.scss'), 'utf8');

    expect(mixins).toContain('@mixin portfolio-box-contain');
    expect(mixins).toContain('@mixin portfolio-soft-surface');
    expect(mixins).toContain('@mixin portfolio-eyebrow');
    expect(mixins).toContain('@mixin portfolio-type-display');
    expect(mixins).toContain('@mixin portfolio-type-title');
    expect(mixins).toContain('@mixin portfolio-type-eyebrow');
    expect(mixins).toContain('@mixin portfolio-type-meta');
    expect(mixins).toContain('@mixin portfolio-stack');

    expect(mixins).not.toMatch(/(^|\n)\s*\.[a-zA-Z]/);
    expect(mixins).not.toMatch(/(^|\n)\s*#[a-zA-Z]/);
    expect(mixins).not.toMatch(/(^|\n)\s*(html|body|section|article)\s*\{/);
  });

  it('emits common HTML tags and shared selectors from _globals.scss', async () => {
    const globals = await readFile(css('_globals.scss'), 'utf8');
    const launch = await readFile(css('portfolio-launch.scss'), 'utf8');

    expect(globals).toContain('.page-content');
    expect(globals).toContain(':where(h1, h2, h3, h4, h5, h6)');
    expect(globals).toContain(':where(section, article, aside');
    expect(globals).toContain(':where(p, li, dd, dt, h1, h2, h3, h4, h5, h6, a)');
    expect(globals).toContain(':where(img, video, canvas, iframe, svg)');
    expect(globals).toContain("a:where(:not(.p-button):not([class*='btn']))");
    expect(globals).toContain('.eyebrow-container');
    expect(globals).toContain('.tag');
    expect(globals).toContain('.portfolio-page');

    expect(globals).toMatch(/@use ['"]\.?\/?mixins['"]/);
    expect(launch).toMatch(/@use ['"]\.?\/?globals['"]/);
    expect(launch).not.toContain('.page-content');
    expect(launch).not.toMatch(/a:where\(:not\(\.p-button\)/);
    // Layer 2 entry only: token + selector modules and the IBM Plex faces — no selectors of its own.
    const selectors = launch.match(/^[^/@\s$}][^;]*\{$/gm) ?? [];
    expect(selectors).toEqual([]);
    // Raw width media queries are gone from the app-global layer (bp-up / bp-down only).
    expect(globals + launch).not.toMatch(/@media[^{]*(max|min)-width/);
  });

  it('wires mixins from portfolio-launch and home index sheets', async () => {
    const launch = await readFile(css('portfolio-launch.scss'), 'utf8');
    const home = await readFile(join(root, 'app/pages/index.scss'), 'utf8');

    const globals = await readFile(css('_globals.scss'), 'utf8');
    expect(globals).toContain('@include portfolio-soft-surface');
    expect(globals).toContain('@include portfolio-stack');
    expect(launch).not.toContain('@include');

    expect(home).toMatch(/@use ['"]mixins['"]/);
    expect(home).toContain('@include portfolio-soft-surface');
    expect(home).toContain('@include portfolio-stack');
  });

  it('opts gallery, work, process, ai-lab, and key chrome sheets into mixins', async () => {
    const sheets = [
      'app/pages/gallery/index.scss',
      'app/pages/work/index.scss',
      'app/pages/code/index.scss',
      'app/pages/about.scss',
      'app/pages/blog/index.scss',
      'app/pages/product/index.scss',
      'app/pages/process/process.scss',
      'app/pages/ai-lab/ai-lab.scss',
      'app/components/AppWorkCard/AppWorkCard.scss',
      'app/components/AppOrbitStage/AppOrbitStage.scss',
      'app/components/AppPrimaryNav/AppPrimaryNav.scss',
    ] as const;

    for (const rel of sheets) {
      const src = await readFile(join(root, rel), 'utf8');
      expect(src, rel).toMatch(/@use ['"]mixins['"]/);
      expect(src, rel).toMatch(/@include portfolio-/);
      expect(src, rel).not.toMatch(/@use ['"].*globals['"]/);
      expect(src, rel).not.toMatch(/@use ['"][^'"]*assets\/css\/mixins['"]/);
    }
  });

  it('relies on Vue additionalData for portfolio mixins (no relative assets/css @use)', async () => {
    const vueSheets = ['app/pages/docs/index.vue'] as const;

    for (const rel of vueSheets) {
      const src = await readFile(join(root, rel), 'utf8');
      expect(src, rel).toMatch(/@include portfolio-/);
      expect(src, rel).not.toMatch(/@use ['"][^'"]*mixins['"]/);
      expect(src, rel).not.toMatch(/@use ['"].*globals['"]/);
    }
  });

  it('keeps Foundation layout on in styles.scss; PrimeVue is Nora styled mode with no Sass switch', async () => {
    const styles = await readFile(css('styles.scss'), 'utf8');
    expect(styles).toContain('$theme-enable-foundation: true');
    expect(styles).toContain("$theme-foundation-mode: 'layout'");
    expect(styles).not.toContain('$theme-enable-primevue');
    expect(styles).toMatch(/nuxt-auto/);
  });

  it('keeps coral as an accent bridge, not a static hex SoT', async () => {
    const variables = await readFile(css('_variables.scss'), 'utf8');
    expect(variables).toMatch(/--portfolio-coral-color:\s*var\(--theme-accent-color\);/);
    expect(variables).not.toMatch(/--portfolio-coral:/);
    expect(variables).not.toMatch(/--portfolio-coral(?:-color)?:\s*#[0-9a-fA-F]/);
  });

  it('does not own proven twin hex SoTs for teal / ivory / ink (AE1)', async () => {
    const variables = await readFile(css('_variables.scss'), 'utf8');

    // Teal is the theme's success colour (dark: blended with paper to keep today's depth).
    expect(variables).not.toMatch(/#1b7a7a/i);
    expect(variables).not.toMatch(/#146060/i);
    expect(variables).toMatch(/:root\s*\{[\s\S]*?--portfolio-teal-color:\s*var\(--theme-success-color\);/);
    expect(variables).toMatch(
      /html\[data-theme='dark'\][\s\S]*?--portfolio-teal-color:\s*color-mix\(in srgb, var\(--theme-success-color\) \d+%, var\(--theme-paper-color\)\);/
    );

    // Ivory / ink are the active paper / ink (dark ink = ink with a touch of paper, today's text).
    expect(variables).toMatch(/:root\s*\{[\s\S]*?--portfolio-ivory-color:\s*var\(--theme-paper-color\);/);
    expect(variables).toMatch(/:root\s*\{[\s\S]*?--portfolio-ink-color:\s*var\(--theme-ink-color\);/);
    expect(variables).toMatch(
      /html\[data-theme='dark'\][\s\S]*?--portfolio-ink-color:\s*color-mix\(in srgb, var\(--theme-ink-color\) \d+%, var\(--theme-paper-color\)\);/
    );
    expect(variables).not.toMatch(/--portfolio-(?:ivory|ink|teal)(?:-color)?:\s*#/i);
  });

  it('keeps atmosphere chrome as blends of theme colours, without Sass colour values (AE2)', async () => {
    const variables = await readFile(css('_variables.scss'), 'utf8');
    const chromeStems = [
      'rose',
      'rose-strong',
      'haze-1',
      'haze-2',
      'haze-3',
      'haze-4',
      'particle-strong',
      'particle-mid',
      'particle-soft',
      'grid-glow',
    ] as const;

    for (const stem of chromeStems) {
      expect(variables, stem).toMatch(new RegExp(`--portfolio-${stem}-color:\\s*(?:var|color-mix)\\(`));
      expect(variables, stem).not.toMatch(new RegExp(`--portfolio-${stem}:`)); // old alias gone (Task 8)
    }

    // Rule 6: web globals hold CSS colour variables only — no Sass colour values or rgb()/hex.
    const code = variables.replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/\$[a-z]/i);
    expect(code).not.toMatch(/#\{/);
    expect(code).not.toMatch(/rgba?\(/i);
    expect(code).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it('measure harness emits scss_lines and duplicate_color_sot inventory', () => {
    const metrics = runMeasureAppScss();

    expect(typeof metrics.scss_lines).toBe('number');
    expect(metrics.scss_lines).toBeGreaterThan(0);
    expect(typeof metrics.duplicate_color_sot).toBe('number');
    expect(metrics.coral_counted_as_static_twin).toBe(0);

    const rows = metrics.duplicate_color_sot_rows as Array<{ id: string; webProp: string }>;
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.some((r) => r.webProp === '--portfolio-coral-color')).toBe(false);

    // After twin cut: starter teal / ivory / ink rows and teal redeclaration are gone.
    const cutIds = new Set([
      'teal-dark',
      'teal-light',
      'ivory-light',
      'ivory-dark',
      'ink-light',
      'ink-dark',
      'redeclare---portfolio-teal-color',
    ]);
    expect(rows.filter((r) => cutIds.has(r.id))).toEqual([]);
  });
});
