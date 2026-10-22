// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const workspace = join(import.meta.dirname, '..', '..', '..');

/** Tool-generated trees the rule exempts (`.cursor/rules/javascript-esm-modules.mdc`). */
const EXEMPT_PREFIXES = [
  '.agents/skills/monitor-ci/',
  '.github/skills/monitor-ci/',
  '.gemini/skills/monitor-ci/',
  '.opencode/skills/monitor-ci/',
  'docs/superpowers/plans/',
];

/** Legacy `.mjs` files. Only shrinks: rename to `.js` (type: module package) and drop the entry. */
const MJS_ALLOWLIST = [
  'core/admin/bin/run-vitest.mjs',
  'core/web/bin/run-vitest.mjs',
  'core/web/eslint.config.mjs',
  'docker/lambda-proxy/server.mjs',
  'lint-staged.config.mjs',
  'packages/image/tools/evaluate-latency-size.mjs',
  'packages/likwidlibs/copy-build-assets.mjs',
  'packages/media/bin/media.mjs',
  'scripts/ci-is-deployable.mjs',
  'scripts/ci-is-deployable.test.mjs',
  'scripts/cicd-workflow-policy.test.mjs',
  'scripts/clean-artifacts.mjs',
  'scripts/db-migrate-local.mjs',
  'scripts/docker-admin.mjs',
  'scripts/docker-compose.mjs',
  'scripts/docker-compose.test.mjs',
  'scripts/e2e-regression.mjs',
  'scripts/e2e-regression.test.mjs',
  'scripts/enrich-extended-colors-base.mjs',
  'scripts/enrich-extended-colors-code.mjs',
  'scripts/enrich-extended-colors-css.mjs',
  'scripts/enrich-image-meta.mjs',
  'scripts/extended-colors-base.mjs',
  'scripts/extended-colors-code.mjs',
  'scripts/extended-colors-css.mjs',
  'scripts/extended-colors-io.mjs',
  'scripts/extended-colors-parse.mjs',
  'scripts/github-search-seo.test.mjs',
  'scripts/husky-prepare.mjs',
  'scripts/husky-prepare.test.mjs',
  'scripts/install-nitro-server-deps.mjs',
  'scripts/lib/gh-cli.mjs',
  'scripts/lint-staged-nx.mjs',
  'scripts/measure-app-scss.mjs',
  'scripts/measure-scss-imports.mjs',
  'scripts/nitro-output-dir.mjs',
  'scripts/nitro-output-dir.test.mjs',
  'scripts/nitro-server-pkg.mjs',
  'scripts/prepare-nitro-output.mjs',
  'scripts/prepare-nitro-output.test.mjs',
  'scripts/refactor-extended-colors.mjs',
  'scripts/rename-color-vars.mjs',
  'scripts/rename-color-vars.test.mjs',
  'scripts/resolve-version-bump.mjs',
  'scripts/resolve-version-bump.test.mjs',
  'scripts/sam-aws-helpers.mjs',
  'scripts/sam-aws-helpers.test.mjs',
  'scripts/sam-build.mjs',
  'scripts/sam-build.test.mjs',
  'scripts/sam-cd-deploy.mjs',
  'scripts/sam-deploy-flow.mjs',
  'scripts/sam-deploy-flow.test.mjs',
  'scripts/sam-deploy.mjs',
  'scripts/sam-dry-run.mjs',
  'scripts/sam-sync-public.mjs',
  'scripts/scss-units-report.mjs',
  'scripts/scss-units-report.test.mjs',
  'scripts/setup-github-environments.mjs',
  'scripts/setup-github-environments.test.mjs',
  'scripts/setup-github-merge-settings.mjs',
  'scripts/setup-github-merge-settings.test.mjs',
  'scripts/setup-github-rulesets.mjs',
  'scripts/sync-github-io-portfolio.mjs',
  'scripts/sync-github-io-portfolio.test.mjs',
  'scripts/sync-web-package-version.mjs',
  'scripts/update-agents.mjs',
  'theme/core/bin/build-color-variations.mjs',
  'theme/core/bin/build-colors-json.mjs',
  'theme/core/bin/build-theme-presets.mjs',
  'theme/core/bin/copy-colors-json.mjs',
  'theme/core/bin/run-vitest.mjs',
];

/** Legacy `.cjs` without a reason comment (ESLint 9 loads ESM — these should become `eslint.config.js`). */
const CJS_ALLOWLIST = [
  'packages/image/eslint.config.cjs',
  'packages/media-player/eslint.config.cjs',
  'packages/media/eslint.config.cjs',
];

/** Leading `// CommonJS: <why>` (or block comment) after an optional shebang. */
const CJS_REASON = /^(?:#![^\n]*\n)?\s*(?:\/\/|\/\*+)\s*CommonJS:\s*\S/;

/** Packages allowed to omit `"type": "module"`, with the reason. */
const TYPE_EXEMPT: Record<string, string> = {
  'packages/likwidlibs/package.json': 'tsc nodenext emits CommonJS dist loaded by Nx generators.json',
};

const repoFiles = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
  cwd: workspace,
  encoding: 'utf8',
})
  .split('\0')
  .filter((file) => file && existsSync(join(workspace, file)));

const guarded = repoFiles.filter((file) => !EXEMPT_PREFIXES.some((prefix) => file.startsWith(prefix)));

describe('JavaScript module format (ESM by default)', () => {
  it('adds no new .mjs files', () => {
    const offenders = guarded.filter((file) => file.endsWith('.mjs') && !MJS_ALLOWLIST.includes(file));
    expect(offenders, 'use .js in a "type": "module" package instead of .mjs').toEqual([]);
  });

  it('only adds .cjs files that state why CommonJS is required', () => {
    const offenders = guarded.filter(
      (file) =>
        file.endsWith('.cjs') &&
        !CJS_ALLOWLIST.includes(file) &&
        !CJS_REASON.test(readFileSync(join(workspace, file), 'utf8'))
    );
    expect(offenders, 'start the file with `// CommonJS: <why>` or convert it to ESM .js').toEqual([]);
  });

  it('keeps the legacy allowlists in sync (remove entries after renaming)', () => {
    const stale = [...MJS_ALLOWLIST, ...CJS_ALLOWLIST].filter((file) => !repoFiles.includes(file));
    expect(stale).toEqual([]);
  });

  it('declares "type": "module" in every package.json except documented exemptions', () => {
    const manifests = repoFiles.filter((file) => file === 'package.json' || file.endsWith('/package.json'));
    const typeOf = (file: string) =>
      (JSON.parse(readFileSync(join(workspace, file), 'utf8')) as { type?: string }).type;

    const missing = manifests.filter((file) => !(file in TYPE_EXEMPT) && typeOf(file) !== 'module');
    expect(missing, 'add "type": "module"').toEqual([]);

    const staleExemptions = Object.keys(TYPE_EXEMPT).filter(
      (file) => !manifests.includes(file) || typeOf(file) === 'module'
    );
    expect(staleExemptions, 'remove from TYPE_EXEMPT').toEqual([]);
  });
});
