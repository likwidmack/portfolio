// @vitest-environment node

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  codeLanguageLabel,
  codePackageOptions,
  codeRepoUrl,
  codeSampleSourceUrl,
  filterCodeSamples,
  joinCodeSampleSource,
  resolveActiveSample,
  type CodeContent,
} from '../shared/code-types';
import { PRIMARY_NAV_ITEMS } from '../shared/primary-nav';
import { publicSourceUrl, publicTreeUrl } from '../shared/public-repo';

const codePagePath = join(import.meta.dirname, '../app/pages/code/index.vue');
const codeStylesPath = join(import.meta.dirname, '../app/pages/code/index.scss');
/** Template + script (`index.vue`) and its scoped sheet (`index.scss`). */
const readCodePage = () => [codePagePath, codeStylesPath].map((path) => readFileSync(path, 'utf8')).join('\n');
const codeContentPath = join(import.meta.dirname, '../content/code.json');
const navPath = join(import.meta.dirname, '../app/components/AppPrimaryNav/index.vue');
const contentConfigPath = join(import.meta.dirname, '../content.config.ts');

function loadCodeContent(): CodeContent {
  return JSON.parse(readFileSync(codeContentPath, 'utf8')) as CodeContent;
}

describe('code page', () => {
  it('exposes language labels for teal tags', () => {
    expect(codeLanguageLabel('TypeScript')).toBe('TypeScript');
  });

  it('loads snippets and packages from the code collection into a fluid reader', () => {
    const page = readCodePage();
    const contentConfig = readFileSync(contentConfigPath, 'utf8');
    const api = readFileSync(join(import.meta.dirname, '../server/api/content/[collection].get.ts'), 'utf8');
    const fetchHelper = readFileSync(join(import.meta.dirname, '../app/composables/fetchContentCollection.ts'), 'utf8');
    const code = loadCodeContent();

    expect(page).toContain("fetchContentCollection<CodeContent>('code'");
    expect(page).toContain('data-fit="fluid"');
    expect(page).toContain('code-page__lang');
    expect(page).toContain('--portfolio-teal');
    expect(page).toContain('UiCodeBlock');
    expect(page).toContain('joinCodeSampleSource');
    expect(page).toContain('content.value.samples');
    // Window chrome lives on the code window only; the page-level editor frame, explorer and split notes are gone.
    expect(page).toContain('code-reader__lights');
    expect(page).not.toContain('code-page__chrome');
    expect(page).not.toContain('code-page__explorer');
    expect(page).not.toContain('code-page__stats');
    expect(contentConfig).toContain("source: 'code.json'");
    expect(contentConfig).toContain('samples: z.array(codeSampleSchema)');
    // Regression: missing allowlist entry → /api/content/code 404 → page 500 "Code content not found".
    expect(api).toMatch(/['"]code['"]/);
    expect(fetchHelper).toMatch(/['"]code['"]/);
    expect(code.repos.some((repo) => repo.name === 'portfolio')).toBe(true);
    expect(code.repos.every((repo) => repo.language.length > 0)).toBe(true);
    expect(code.repos.every((repo) => !('updated' in repo) && !('href' in repo))).toBe(true);
    const sampleIds = code.samples.map((sample) => sample.id);
    expect(sampleIds.length).toBeGreaterThan(0);
    expect(new Set(sampleIds).size).toBe(sampleIds.length);
    expect(code.samples.every((sample) => sample.title.length > 0 && sample.path.length > 0)).toBe(true);
    expect(code.samples.every((sample) => sample.source.length > 0)).toBe(true);
  });

  it('uses an accessible tab list, one panel with facts, copy and public source links', () => {
    const page = readCodePage();
    expect(page).toContain('role="tablist"');
    expect(page).toContain('role="tab"');
    expect(page).toContain('role="tabpanel"');
    expect(page).toContain(':tabindex="sample.id === active.id ? 0 : -1"');
    expect(page).toContain('onTabKeydown');
    expect(page).toContain('dl.code-reader__facts');
    expect(page).toContain('View source ↗');
    expect(page).toContain('copySource');
    expect(page).toContain('useBrowseQuery(');
    expect(page).toContain('group-label="Package"');
  });

  it('swaps the tab list for a labelled picker with previous/next on narrow screens', () => {
    const page = readCodePage();
    expect(page).toContain('label.code-reader__picker-label(for="code-snippet-select")');
    expect(page).toContain('select#code-snippet-select.code-reader__select');
    expect(page).toContain(':aria-label="`Previous snippet: ${prevSample.title}`"');
    expect(page).toContain(':aria-label="`Next snippet: ${nextSample.title}`"');
    expect(page).toContain('grid-template-columns: var(--touch-target, 44px) minmax(0, 1fr) var(--touch-target, 44px)');
    expect(page).toMatch(/&__tabs \{\s*display: none;/);
    // No swipe-only row on phones.
    expect(page).not.toContain('overflow-x: auto');
  });

  it('links every snippet and package through the public-repo helpers', () => {
    const code = loadCodeContent();
    const first = code.samples[0]!;
    expect(codeSampleSourceUrl(first)).toBe(publicSourceUrl(first.path));
    for (const repo of code.repos) {
      expect(codeRepoUrl(repo)).toBe(publicTreeUrl(repo.path));
    }
  });

  it('filters snippets by package with counts and keeps a valid selection', () => {
    const code = loadCodeContent();
    const options = codePackageOptions(code.samples);
    expect(options[0]).toEqual({ id: 'all', label: 'All', count: code.samples.length });
    const moduleId = code.samples[0]!.module;
    const moduleCount = code.samples.filter((sample) => sample.module === moduleId).length;
    expect(options.find((option) => option.id === moduleId)?.count).toBe(moduleCount);
    const filtered = filterCodeSamples(code.samples, moduleId);
    expect(filtered.every((sample) => sample.module === moduleId)).toBe(true);
    expect(filterCodeSamples(code.samples, 'nope')).toHaveLength(code.samples.length);
    expect(resolveActiveSample(filtered, 'missing-id')?.id).toBe(filtered[0]?.id);
    expect(resolveActiveSample(code.samples, code.samples[0]!.id)?.id).toBe(code.samples[0]!.id);
  });

  it('imports and uses codeLanguageLabel in script setup', () => {
    const page = readCodePage();
    // Imports alone are not enough: Pug + script-setup can elide template-only imports.
    expect(page).toContain("from '#shared/code-types'");
    expect(page).toContain('languageLabel: codeLanguageLabel(repo.language)');
    expect(page).toContain('v-for="repo in repos"');
    expect(page).toContain('{{ repo.languageLabel }}');
    expect(page).not.toMatch(/\{\{\s*codeLanguageLabel\(/);
  });

  it('keeps snippet source decoded with inline comments', () => {
    const code = loadCodeContent();
    expect(code.samples.length).toBeGreaterThan(0);
    for (const sample of code.samples) {
      const source = joinCodeSampleSource(sample.source);
      expect(source.length).toBeGreaterThan(0);
      expect(source).not.toContain(String.raw`\\s+`);
      expect(source).not.toContain('\\${');
      expect(source).not.toContain('\\`');
    }
    expect(code.samples.every((sample) => sample.source.some((line) => line.includes('//')))).toBe(true);
  });

  it('adds Code to primary nav', () => {
    const nav = readFileSync(navPath, 'utf8');
    expect(nav).toContain('PRIMARY_NAV_ITEMS');
    expect(PRIMARY_NAV_ITEMS.map((item) => item.to)).toContain('/code');
    expect(PRIMARY_NAV_ITEMS.map((item) => item.to)).toContain('/about');
    expect(nav).not.toContain('to="/docs"');
    expect(nav).not.toContain('to="/ai-lab"');
    expect(nav).not.toContain('to="/process"');
  });
});
