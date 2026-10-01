// @vitest-environment node

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const web = join(import.meta.dirname, '..');
const read = (path: string) => readFileSync(join(web, path), 'utf8');

describe('icons (Lucide via @nuxt/icon)', () => {
  it('bundles Lucide locally as inline SVG in web and admin, with no icon font', () => {
    for (const config of ['nuxt.config.ts', '../admin/nuxt.config.ts']) {
      const src = read(config);
      expect(src).toContain("'@nuxt/icon'");
      expect(src).toContain("mode: 'svg'");
      expect(src).toContain("provider: 'server'");
      expect(src).toContain('fallbackToApi: false');
      expect(src).toContain("collections: ['lucide']");
      expect(src).not.toContain('primeicons');
    }
  });

  it('UiIcon is decorative by default and named only when labelled', () => {
    const src = read('app/components/ui/UiIcon.vue');
    expect(src).toContain(`:aria-hidden="label ? undefined : 'true'"`);
    expect(src).toContain(`:role="label ? 'img' : undefined"`);
    expect(src).toContain('`lucide:${props.name}`');
  });

  it('UiButton and UiChip render Lucide icons; buttons meet the 44px touch target', () => {
    const button = read('app/components/ui/UiButton.vue');
    expect(button).toContain('UiIcon(:name="icon"');
    expect(button).toContain('min-height: var(--touch-target, 44px)');
    expect(button).not.toContain(':icon="icon"');
    const chip = read('app/components/ui/UiChip.vue');
    expect(chip).toContain('UiIcon.p-chip-icon');
    expect(chip).not.toContain('>×');
  });

  it('pre-bundles every static Lucide name used in web and admin templates', () => {
    const config = read('nuxt.config.ts');
    const names = new Set<string>();
    const roots = ['app', '../admin/app', '../../packages/web-layer-admin/app'];
    const walk = (dir: string): string[] =>
      readdirSync(join(web, dir), { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() ? walk(join(dir, entry.name)) : entry.name.endsWith('.vue') ? [join(dir, entry.name)] : []
      );
    for (const root of roots) {
      for (const file of walk(root)) {
        // Static names only (`icon="copy"`, `UiIcon(name="x")`); bound `:icon`/`:name` are skipped.
        for (const match of read(file).matchAll(/(?:UiIcon[^\n]*?[^:]name|[^:\w-]icon)="([a-z0-9-]+)"/g))
          names.add(match[1]!);
      }
    }
    expect(names.size).toBeGreaterThan(5);
    for (const name of names) expect(config).toContain(`'lucide:${name}'`);
  });
});
