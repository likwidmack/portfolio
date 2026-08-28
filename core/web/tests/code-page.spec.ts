// @vitest-environment node

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { codeLanguageLabel } from '../shared/code-types';

const codePagePath = join(import.meta.dirname, '../app/pages/code/index.vue');
const codeContentPath = join(import.meta.dirname, '../content/code.json');
const navPath = join(import.meta.dirname, '../app/components/AppPrimaryNav.vue');
const contentConfigPath = join(import.meta.dirname, '../content.config.ts');

describe('code page', () => {
  it('exposes language labels for teal tags', () => {
    expect(codeLanguageLabel('TypeScript')).toBe('TypeScript');
  });

  it('loads repos from the code content collection in an editor shell', () => {
    const page = readFileSync(codePagePath, 'utf8');
    const contentConfig = readFileSync(contentConfigPath, 'utf8');
    const api = readFileSync(join(import.meta.dirname, '../server/api/content/[collection].get.ts'), 'utf8');
    const fetchHelper = readFileSync(join(import.meta.dirname, '../app/composables/fetchContentCollection.ts'), 'utf8');
    const code = JSON.parse(readFileSync(codeContentPath, 'utf8')) as {
      repos: Array<{ href?: string; language: string; name: string }>;
    };

    expect(page).toContain("fetchContentCollection<CodeContent>('code'");
    expect(page).toContain('code-page__lang');
    expect(page).toContain('--portfolio-teal');
    expect(page).toContain('isLiveRepoHref');
    expect(contentConfig).toContain("source: 'code.json'");
    // Regression: missing allowlist entry → /api/content/code 404 → page 500 "Code content not found".
    expect(api).toMatch(/['"]code['"]/);
    expect(fetchHelper).toMatch(/['"]code['"]/);
    expect(code.repos.some((repo) => repo.name === 'portfolio')).toBe(true);
    expect(code.repos.every((repo) => repo.language.length > 0)).toBe(true);
    // Private monorepo: public GitHub URLs 404 — placeholder until the repo is public.
    expect(code.repos.every((repo) => !repo.href || repo.href === '#' || /^https?:\/\//i.test(repo.href))).toBe(true);
    expect(code.repos.every((repo) => repo.href === '#')).toBe(true);
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

  it('adds Code to primary nav', () => {
    const nav = readFileSync(navPath, 'utf8');
    expect(nav).toContain('to="/code"');
    expect(nav).toContain('to="/about"');
    expect(nav).not.toContain('to="/docs"');
    expect(nav).not.toContain('to="/ai-lab"');
    expect(nav).not.toContain('to="/process"');
  });
});
