const nx = require('@nx/eslint-plugin');
const jsoncParser = require('jsonc-eslint-parser');

/** Flat config for @tgmc/media (ESLint 9). Mirrors @tgmc/image. */
module.exports = [
  ...nx.configs['flat/base'],
  {
    files: ['**/*.{ts,js,mjs,cjs}'],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
    },
    rules: {
      'no-unused-vars': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredDependencies: ['vitest'],
          ignoredFiles: [
            '{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}',
            '{projectRoot}/vitest.config.{js,ts,mjs,mts}',
            '{projectRoot}/vite.config.{js,ts,mjs,mts}',
          ],
        },
      ],
    },
    languageOptions: {
      parser: jsoncParser,
    },
  },
  {
    ignores: ['**/out-tsc', '**/dist', '**/tests/fixtures/**'],
  },
];
