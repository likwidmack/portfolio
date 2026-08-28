import { ESLint } from 'eslint';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/** `tests/eslint/` → `core/web/` */
const coreWebRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Legacy `core/web/.eslintrc.json` extended `@nuxt/eslint-config` + repo root
 * `.eslintrc.json`. The Nuxt preset is now flat-only (`createConfigForNuxt`);
 * root rules (Prettier compatibility, Nx boundaries, base severities) are merged in
 * `eslint.config.mjs`. These checks assert that merged config still exposes the
 * important rule entries from the old root extend chain.
 *
 * Prettier-as-ESLint (`prettier/prettier`) stays configured via
 * `eslint-plugin-prettier`; on GitHub Actions the rule is turned off so Prettier
 * does not execute in CI.
 */
describe('eslint.config.mjs vs legacy .eslintrc intent', () => {
  it('exposes Nx, Prettier, and root base rules on a representative TS file', async () => {
    const eslint = new ESLint({
      cwd: coreWebRoot,
      overrideConfigFile: join(coreWebRoot, 'eslint.config.mjs'),
    });
    const target = join(coreWebRoot, 'services/storage/storage-queue.ts');
    const calculated = await eslint.calculateConfigForFile(target);

    expect(calculated.plugins).toHaveProperty('@nx');
    expect(calculated.plugins).toHaveProperty('prettier');

    const onGithubActions = process.env.GITHUB_ACTIONS === 'true';
    expect(calculated.rules?.['prettier/prettier']?.[0]).toBe(onGithubActions ? 0 : 2);

    const boundaries = calculated.rules?.['@nx/enforce-module-boundaries'];
    expect(boundaries?.[0]).toBe(2);

    expect(calculated.rules?.['no-prototype-builtins']?.[0]).toBe(0);
    expect(calculated.rules?.['no-unused-vars']?.[0]).toBe(1);
    expect(calculated.rules?.['no-unused-expressions']?.[0]).toBe(1);
    expect(calculated.rules?.['no-unused-labels']?.[0]).toBe(1);
  });

  it('enables vue-pug tokenizer and rules on Vue SFCs', async () => {
    const eslint = new ESLint({
      cwd: coreWebRoot,
      overrideConfigFile: join(coreWebRoot, 'eslint.config.mjs'),
    });
    const target = join(coreWebRoot, 'app/components/AppPrimaryNav.vue');
    const calculated = await eslint.calculateConfigForFile(target);

    expect(calculated.plugins).toHaveProperty('vue-pug');
    expect(calculated.languageOptions?.parserOptions?.templateTokenizer?.pug).toBe(
      'vue-eslint-parser-template-tokenizer-pug'
    );
    expect(calculated.rules?.['vue-pug/no-parsing-error']?.[0]).toBe(2);
  });
});
