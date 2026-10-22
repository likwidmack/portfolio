// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guards for unlinking the vendored themes: Foundation comes from npm `foundation-sites`, and
 * nothing points back at the removed workspace copies.
 */

const workspace = join(import.meta.dirname, '..', '..', '..');
const NORMALIZE_ARCHIVE = 'theme/core/scss/_archive/2026-10-14-foundation-normalize';
const read = (path: string) => readFileSync(join(workspace, path), 'utf8');
const repoPath = (path: string) => relative(workspace, path).split('\\').join('/');

type Manifest = {
  workspaces?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const manifest = (path: string) => JSON.parse(read(path)) as Manifest;

/** Every `.scss` under `theme/core/scss` except `_archive/` (never compiled). */
function themeSass(dir = join(workspace, 'theme/core/scss')): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '_archive') return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return themeSass(path);
    return entry.name.endsWith('.scss') ? [path] : [];
  });
}

describe('Foundation resolves from npm foundation-sites', () => {
  it('@tgmc/theme depends on foundation-sites 6.9.0, not the vendored package', () => {
    const dependencies = manifest('theme/core/package.json').dependencies ?? {};
    expect(dependencies['foundation-sites']).toBe('6.9.0');
    expect(dependencies).not.toHaveProperty('@tgmc/theme-foundation');
  });

  it('declares sass-embedded at the root (Vite compiles theme Sass with it)', () => {
    expect(manifest('package.json').devDependencies).toHaveProperty('sass-embedded');
  });

  it('theme Sass imports Foundation only through pkg:foundation-sites', () => {
    const sources = themeSass().map((file) => ({ file: repoPath(file), source: readFileSync(file, 'utf8') }));
    const offenders = sources
      .filter(({ source }) => /foundation\/scss\/|@tgmc\/theme-foundation/.test(source))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
    const layout = sources.find(({ file }) => file.endsWith('layers/contents/_foundation-layout.scss'));
    expect(layout?.source).toContain("@import 'pkg:foundation-sites/scss/xy-grid/xy-grid';");
  });

  it('both apps pass the pkg: importer to Vite Sass and drop the vendored load path', () => {
    expect(read('core/web/config-properties/vite-prop.ts')).toContain('importers: scssImporters');
    const admin = read('core/admin/nuxt.config.ts');
    expect(admin).toContain('importers: scssImporters');
    expect(admin).not.toContain("'theme/foundation'");
  });

  it('uses upstream normalize; the vendored upload-button fix is archived, not compiled', () => {
    expect(read('theme/core/scss/layers/contents/_normalize.scss')).toContain(
      "@import 'pkg:foundation-sites/scss/vendor/normalize';"
    );
    expect(read('theme/core/scss/layers/contents/_foundation-full.scss')).not.toContain("'foundation-normalize'");
    expect(existsSync(join(workspace, 'theme/core/scss/layers/contents/_foundation-normalize.scss'))).toBe(false);
    expect(read(`${NORMALIZE_ARCHIVE}/normalize.scss`)).toContain("input[type='file']::-webkit-file-upload-button {");
    expect(read(`${NORMALIZE_ARCHIVE}/README.md`)).toContain('$theme-enable-normalize');
    expect(read('.prettierignore').split('\n')).toContain(`/${NORMALIZE_ARCHIVE}/normalize.scss`);
  });
});

describe('the vendored Foundation copy is gone', () => {
  it('removes theme/foundation, its workspace entry and its lockfile entries', () => {
    expect(existsSync(join(workspace, 'theme/foundation'))).toBe(false);
    expect(manifest('package.json').workspaces).not.toContain('./theme/foundation');
    expect(read('package-lock.json')).not.toContain('theme/foundation');
  });

  it('drops it from Nx, CI lint, Prettier, the ESM rule and the module-format guard', () => {
    expect(read('nx.json')).not.toContain('theme/foundation');
    expect(read('.github/workflows/ci.yml')).not.toContain('@tgmc/theme-foundation');
    expect(read('.prettierignore').split('\n')).not.toContain('foundation/');
    expect(read('.cursor/rules/javascript-esm-modules.mdc')).not.toContain('theme/foundation');
    expect(read('core/web/tests/module-format.spec.ts')).not.toContain('theme/foundation');
  });
});

const PRIMEVUE_ARCHIVE = 'theme/core/scss/_archive/2026-10-14-primevue-v3';

describe('PrimeVue v3 Sass is archived (Nora styled mode only)', () => {
  it('removes theme/primevue, its workspace entry, dependency and lockfile entries', () => {
    expect(existsSync(join(workspace, 'theme/primevue'))).toBe(false);
    expect(manifest('package.json').workspaces).not.toContain('./theme/primevue');
    expect(manifest('theme/core/package.json').dependencies).not.toHaveProperty('@tgmc/theme-primevue');
    expect(read('package-lock.json')).not.toContain('theme/primevue');
  });

  it('keeps mytheme, theme-base and the classic theme/core files in the dated archive', () => {
    for (const file of [
      'README.md',
      'theme/primevue/LICENSE.md',
      'theme/primevue/themes/mytheme/theme.scss',
      'theme/primevue/theme-base/_components.scss',
      'theme/core/scss/layers/_primevue.scss',
      'theme/core/scss/layers/contents/_primevue.scss',
      'theme/core/scss/bridges/_primevue-settings.scss',
    ])
      expect(existsSync(join(workspace, PRIMEVUE_ARCHIVE, file)), file).toBe(true);
  });

  it('removes the classic PassThrough config and the theme/primevue Sass load path', () => {
    expect(existsSync(join(workspace, 'core/web/config-properties/primevue'))).toBe(false);
    expect(read('core/web/config-properties/primevue-prop.ts')).not.toMatch(/classic|\.pt\b/);
    expect(read('core/admin/nuxt.config.ts')).not.toContain("'theme/primevue'");
  });

  it('drops it from Prettier, the ESM rule and the module-format guard', () => {
    const ignore = read('.prettierignore').split('\n');
    expect(ignore).not.toContain('primevue/');
    expect(ignore).toContain(`/${PRIMEVUE_ARCHIVE}/`);
    expect(read('.cursor/rules/javascript-esm-modules.mdc')).not.toContain('theme/primevue');
    expect(read('core/web/tests/module-format.spec.ts')).not.toContain('theme/primevue');
  });
});

/** Text that only described the removed vendored themes or stale aliases. */
const STALE_DOC_TEXT = [
  /theme\/(?:foundation|primevue)\//,
  /@tgmc\/theme-(?:foundation|primevue)/,
  /\$theme-(?:enable-primevue|primevue-entry)/,
  /vendored PrimeVue/,
  /primevue\/config -> /,
  /PrimeVue shim/,
  /import primevueTheme from/,
];

/** Repo docs (in-app `/docs`), except the design-history trees. */
function docFiles(dir = join(workspace, 'docs')): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return ['docs/superpowers', 'docs/plans'].includes(repoPath(path)) ? [] : docFiles(path);
    return entry.name.endsWith('.md') ? [path] : [];
  });
}

describe('docs describe npm Foundation and the archived PrimeVue v3 theme', () => {
  it('no doc, AGENTS.md or the AGENTS generator names the removed vendored themes', () => {
    const files = [...docFiles(), join(workspace, 'AGENTS.md'), join(workspace, 'scripts/update-agents.mjs')];
    const offenders = files.flatMap((file) => {
      const text = readFileSync(file, 'utf8');
      return STALE_DOC_TEXT.filter((pattern) => pattern.test(text)).map((pattern) => `${repoPath(file)} ${pattern}`);
    });
    expect(offenders).toEqual([]);
  });

  it('theme.md documents the third-party layers', () => {
    const theme = read('docs/packages/theme.md');
    expect(theme).toContain('### Third-party layers');
    expect(theme).toContain('pkg:foundation-sites');
    expect(theme).toContain('_archive/2026-10-14-primevue-v3/');
    expect(theme).toContain('_archive/2026-10-14-foundation-normalize/');
  });
});
