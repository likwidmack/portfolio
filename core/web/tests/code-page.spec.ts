// @vitest-environment node

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { codeLanguageLabel, joinCodeSampleSource, type CodeContent } from '../shared/code-types';

const codePagePath = join(import.meta.dirname, '../app/pages/code/index.vue');
const codeContentPath = join(import.meta.dirname, '../content/code.json');
const navPath = join(import.meta.dirname, '../app/components/AppPrimaryNav.vue');
const contentConfigPath = join(import.meta.dirname, '../content.config.ts');

function loadCodeContent(): CodeContent {
  return JSON.parse(readFileSync(codeContentPath, 'utf8')) as CodeContent;
}

describe('code page', () => {
  it('exposes language labels for teal tags', () => {
    expect(codeLanguageLabel('TypeScript')).toBe('TypeScript');
  });

  it('loads repos and samples from the code content collection in an editor shell', () => {
    const page = readFileSync(codePagePath, 'utf8');
    const contentConfig = readFileSync(contentConfigPath, 'utf8');
    const api = readFileSync(join(import.meta.dirname, '../server/api/content/[collection].get.ts'), 'utf8');
    const fetchHelper = readFileSync(join(import.meta.dirname, '../app/composables/fetchContentCollection.ts'), 'utf8');
    const code = loadCodeContent();

    expect(page).toContain("fetchContentCollection<CodeContent>('code'");
    expect(page).toContain('code-page__lang');
    expect(page).toContain('--portfolio-teal');
    expect(page).toContain('isLiveRepoHref');
    expect(page).toContain('code-browser');
    expect(page).toContain('UiCodeBlock');
    expect(page).toContain('joinCodeSampleSource');
    expect(page).toContain('content.value.samples');
    expect(page).not.toContain('code-samples');
    expect(contentConfig).toContain("source: 'code.json'");
    expect(contentConfig).toContain('samples: z.array(codeSampleSchema)');
    // Regression: missing allowlist entry → /api/content/code 404 → page 500 "Code content not found".
    expect(api).toMatch(/['"]code['"]/);
    expect(fetchHelper).toMatch(/['"]code['"]/);
    expect(code.repos.some((repo) => repo.name === 'portfolio')).toBe(true);
    expect(code.repos.every((repo) => repo.language.length > 0)).toBe(true);
    // Private monorepo: public GitHub URLs 404 — placeholder until the repo is public.
    expect(code.repos.every((repo) => !repo.href || repo.href === '#' || /^https?:\/\//i.test(repo.href))).toBe(true);
    expect(code.repos.every((repo) => repo.href === '#')).toBe(true);
    expect(code.samples.map((sample) => sample.id)).toEqual([
      'slug',
      'gallery-filter',
      'accent-tokens',
      'mse-queue',
      'ai-continuation',
      'fill-contrast',
      'dna-helix',
    ]);
    const joined = code.samples.map((sample) => joinCodeSampleSource(sample.source)).join('\n');
    expect(joined).toContain('SourceBufferQueue');
    expect(joined).toContain('consumeContinuation');
    expect(joined).toContain('pickContrastingInk');
    expect(joined).toContain('GROOVE_OFFSET');
  });

  it('imports and uses codeLanguageLabel in script setup', () => {
    const page = readFileSync(codePagePath, 'utf8');
    // Imports alone are not enough: Pug + script-setup can elide template-only imports.
    expect(page).toContain("from '#shared/code-types'");
    expect(page).toContain('codeLanguageLabel');
    expect(page).toContain('languageLabel: codeLanguageLabel(repo.language)');
    expect(page).toContain('v-for="repo in repos"');
    expect(page).toContain('{{ repo.languageLabel }}');
    expect(page).not.toMatch(/\{\{\s*codeLanguageLabel\(/);
  });

  it('keeps snippet source decoded with inline comments', () => {
    const code = loadCodeContent();
    const slug = code.samples.find((sample) => sample.id === 'slug');
    const mse = code.samples.find((sample) => sample.id === 'mse-queue');
    const slugSource = joinCodeSampleSource(slug?.source ?? []);
    const mseSource = joinCodeSampleSource(mse?.source ?? []);

    expect(slugSource).toContain(String.raw`\s+`);
    expect(slugSource).not.toContain(String.raw`\\s+`);
    expect(slugSource).toContain('// Admin and public /blog');
    expect(mseSource).toContain('Missing SourceBuffer for ${next.bufferKind}');
    expect(mseSource).not.toContain('\\${');
    expect(mseSource).not.toContain('\\`');
    expect(mseSource).toContain('// MSE:');
    expect(code.samples.every((sample) => sample.source.some((line) => line.includes('//')))).toBe(true);
  });

  it('adds Code to primary nav', () => {
    const nav = readFileSync(navPath, 'utf8');
    expect(nav).toContain('to="/code"');
    expect(nav).toContain('to="/about"');
    expect(nav).not.toContain('to="/docs"');
    expect(nav).not.toContain('to="/ai-lab"');
    expect(nav).not.toContain('to="/process"');
  });
});
