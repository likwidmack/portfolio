import { createConfigForNuxt } from '@nuxt/eslint-config/flat';
import nx from '@nx/eslint-plugin';
import { createRequire } from 'node:module';
import eslintrc from '../../.eslintrc.json' with { type: 'json' };

const require = createRequire(import.meta.url);

/**
 * Keep `eslint-plugin-prettier` in the config always. On GitHub Actions, turn
 * `prettier/prettier` off so Prettier does not execute in CI (formatting stays
 * local via husky/lint-staged + `npm run format`). `eslint-config-prettier`
 * remains active through `plugin:prettier/recommended`.
 */
const onGithubActions = process.env.GITHUB_ACTIONS === 'true';
/** Same as `plugin:prettier/recommended` from legacy root `.eslintrc.json`. */
const prettierRecommended = require('eslint-plugin-prettier/recommended');

/** Pug template tokenizer + pug-aware vue rules for `<template lang="pug">`. */
const vuePug = require('eslint-plugin-vue-pug');

/**
 * ESLint 9 flat config aligned with legacy `core/web/.eslintrc.json`:
 * - `extends: ["@nuxt/eslint-config", "../../.eslintrc.json"]`
 *
 * The published `@nuxt/eslint-config` package is flat-only now; the equivalent
 * Nuxt preset is `createConfigForNuxt` from `@nuxt/eslint-config/flat`.
 *
 * From repo root `.eslintrc.json` we replicate:
 * - `eslint:recommended` + `plugin:prettier/recommended` → Prettier block (last;
 *   `prettier/prettier` disabled when `GITHUB_ACTIONS=true`)
 * - `@nx/enforce-module-boundaries` + `@nx` plugin
 * - Base rule severities: `no-unused-*`, `no-prototype-builtins`
 *
 * We do **not** add `plugin:@nx/typescript` / `plugin:@nx/javascript` extends here:
 * they duplicate/overlap `@typescript-eslint` rules already provided by the Nuxt
 * preset and would fight Nuxt’s tuned rule set.
 *
 * @type {import('@eslint/config-helpers').Config[]}
 */
const config = createConfigForNuxt(
  {
    features: {
      typescript: true,
      stylistic: true,
      vue: true,
      js: true,
      jsx: true,
      ts: true,
      tsx: true,
    },
  },
  {
    ignores: ['**/*.d.ts', '.nuxt/**', '.output/**', 'node_modules/**', '**/vitest.config.*.timestamp*'],
  },
  ...nx.configs['flat/base'],
  {
    files: ['**/*.{ts,tsx,js,jsx,vue}'],
    plugins: { '@nx': nx },
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  {
    rules: eslintrc.rules,
  },
  // Repo-root `scripts/*.mjs` helpers are exercised from web vitest; they are
  // outside the Nx project graph, so boundary checks do not apply.
  {
    files: ['tests/scripts/**/*.{ts,js}'],
    rules: {
      '@nx/enforce-module-boundaries': 'off',
    },
  },
  // Nuxt route files use single-segment names (`index.vue`, `[id].vue`).
  {
    files: ['**/pages/**/*.vue', '**/layouts/**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  // Enable vue-eslint-parser pug tokenizer so eslint-plugin-vue rules work in
  // `<template lang="pug">` SFCs (see eslint-plugin-vue-pug flat configs).
  ...vuePug.configs['flat/recommended'],
  prettierRecommended,
  // Do not execute Prettier on GitHub; keep the plugin installed/configured.
  ...(onGithubActions ? [{ rules: { 'prettier/prettier': 'off' } }] : [])
);

export default config;
