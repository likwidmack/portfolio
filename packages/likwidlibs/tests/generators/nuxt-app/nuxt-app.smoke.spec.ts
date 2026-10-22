// @vitest-environment node
import type { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { nuxtAppGenerator } from '../../../src/generators/nuxt-app/nuxt-app';

/** Vitest needs an upper-case drive letter on Windows (vitest#10692). */
const canonical = (path: string) => path.replace(/^[a-z]:/, (drive) => drive.toUpperCase());
const workspaceRoot = canonical(join(__dirname, '../../../../..'));
const requireFromHere = createRequire(join(__dirname, 'smoke.js'));
const packageBin = (pkg: string, bin: string) => join(dirname(requireFromHere.resolve(`${pkg}/package.json`)), bin);

function writeTree(tree: Tree, root: string): void {
  for (const change of tree.listChanges()) {
    if (change.type === 'DELETE' || !change.content) continue;
    const target = join(root, change.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, change.content);
  }
}

function runNode(cwd: string, script: string, args: string[]): { status: number | null; output: string } {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('VITEST')));
  const result = spawnSync(process.execPath, [script, ...args], { cwd, env, encoding: 'utf8', timeout: 150_000 });
  const failure = result.error ? `\n${result.error.message}` : '';
  return { status: result.status, output: `${result.stdout ?? ''}\n${result.stderr ?? ''}${failure}` };
}

/** Generates an app under the gitignored `<root>/tmp/` so it resolves the workspace's node_modules. */
describe('nuxt-app generator output runs', () => {
  let root = '';

  beforeAll(async () => {
    const tree = createTreeWithEmptyWorkspace();
    tree.write('tsconfig.json', JSON.stringify({ references: [] }));
    await nuxtAppGenerator(tree, { name: 'portal', deploymentTarget: 'aws-sam', includeE2e: true });
    mkdirSync(join(workspaceRoot, 'tmp'), { recursive: true });
    root = canonical(mkdtempSync(join(workspaceRoot, 'tmp', 'nuxt-app-smoke-')));
    writeTree(tree, root);
    copyFileSync(join(workspaceRoot, 'tsconfig.base.json'), join(root, 'tsconfig.base.json'));
  }, 60_000);

  afterAll(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });

  it('the app unit tests pass (axe-core in jsdom)', () => {
    const { status, output } = runNode(join(root, 'core/portal'), packageBin('vitest', 'vitest.mjs'), ['run']);
    expect(status, output).toBe(0);
  }, 180_000);

  it('the app lints clean', () => {
    const { status, output } = runNode(join(root, 'core/portal'), packageBin('eslint', 'bin/eslint.js'), ['.']);
    expect(status, output).toBe(0);
  }, 180_000);

  it('the E2E project type-checks', () => {
    const { status, output } = runNode(join(root, 'core/portal-e2e'), packageBin('typescript', 'bin/tsc'), [
      '-p',
      'tsconfig.json',
    ]);
    expect(status, output).toBe(0);
  }, 180_000);
});
