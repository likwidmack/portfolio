import { readJson, Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { parse } from 'yaml';
import { nuxtAppGenerator } from '../../../src/generators/nuxt-app/nuxt-app';

type Job = {
  needs?: string;
  if?: string;
  environment?: string;
  env?: Record<string, string>;
  steps: Array<{ run?: string }>;
};
type Workflow = { on: Record<string, any>; jobs: Record<string, Job> };

const TARGETS = ['aws-sam', 'docker-node', 'static-cloudflare'] as const;
const GENERATED = /^(core\/|\.github\/workflows\/|tsconfig\.json$)/;

const readWorkflow = (tree: Tree, file: string) => parse(tree.read(file, 'utf-8')!) as Workflow;
const runs = (job: Job) => job.steps.map((step) => step.run ?? '').join('\n');

/** Every file the generator wrote, keyed by path, in path order. */
const generatedFiles = (tree: Tree): Record<string, string> =>
  Object.fromEntries(
    tree
      .listChanges()
      .filter((change) => change.type !== 'DELETE' && GENERATED.test(change.path))
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((change) => [change.path, change.content?.toString('utf-8') ?? ''])
  );

describe('nuxt-app generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    tree.write('tsconfig.json', JSON.stringify({ references: [] }));
  });

  it.each(TARGETS)('generates the expected files for %s', async (deploymentTarget) => {
    await nuxtAppGenerator(tree, { name: 'portal', deploymentTarget, includeE2e: true });
    expect(generatedFiles(tree)).toMatchSnapshot();
  });

  it('scaffolds the app, its E2E project and the tsconfig references', async () => {
    await nuxtAppGenerator(tree, { name: 'portal', deploymentTarget: 'aws-sam', includeE2e: true });

    for (const file of [
      'core/portal/nuxt.config.ts',
      'core/portal/package.json',
      'core/portal/eslint.config.js',
      'core/portal/vitest.config.ts',
      'core/portal/tests/a11y.spec.ts',
      'core/portal-e2e/cypress.config.ts',
      'core/portal-e2e/src/e2e/a11y-audit.cy.ts',
      '.github/workflows/portal-cd.yml',
    ]) {
      expect(tree.exists(file), file).toBe(true);
    }
    expect(readJson(tree, 'tsconfig.json').references).toEqual([
      { path: './core/portal' },
      { path: './core/portal-e2e' },
    ]);

    // The app ignores its build output (also keeps ESLint's gitignore lookup local to the app)
    const gitignore = tree.read('core/portal/.gitignore', 'utf-8')?.split('\n') ?? [];
    expect(gitignore).toEqual(expect.arrayContaining(['.nuxt', 'node_modules']));
  });

  it('skips the E2E project when includeE2e is false', async () => {
    await nuxtAppGenerator(tree, { name: 'dashboard', deploymentTarget: 'docker-node', includeE2e: false });

    expect(tree.exists('core/dashboard-e2e/cypress.config.ts')).toBe(false);
    expect(readJson(tree, 'tsconfig.json').references).toEqual([{ path: './core/dashboard' }]);
  });

  it('emits no .mjs files', async () => {
    await nuxtAppGenerator(tree, { name: 'portal', includeE2e: true });

    expect(tree.exists('core/portal/eslint.config.mjs')).toBe(false);
    expect(
      tree
        .listChanges()
        .map((change) => change.path)
        .filter((path) => path.endsWith('.mjs'))
    ).toEqual([]);
  });

  it('lets Nx infer targets from package.json and config files, like the rest of the repo', async () => {
    await nuxtAppGenerator(tree, { name: 'portal', includeE2e: true });

    expect(tree.exists('core/portal/project.json')).toBe(false);
    expect(tree.exists('core/portal-e2e/project.json')).toBe(false);
    expect(readJson(tree, 'core/portal/package.json').nx).toEqual({ tags: ['type:app', 'target:aws-sam'] });

    const e2e = readJson(tree, 'core/portal-e2e/package.json');
    expect(e2e.type).toBe('module');
    expect(e2e.nx.tags).toEqual(['type:e2e', 'scope:portal']);
    expect(e2e.nx.implicitDependencies).toEqual(['@tgmc/portal']);
    expect(readJson(tree, 'core/portal/tsconfig.json').extends).toBe('../../tsconfig.base.json');
    expect(readJson(tree, 'core/portal-e2e/tsconfig.json').extends).toBe('../../tsconfig.base.json');
  });

  it('points tsconfig extends at the workspace root for a nested directory', async () => {
    await nuxtAppGenerator(tree, { name: 'portal', directory: 'apps/web', includeE2e: true });

    expect(readJson(tree, 'apps/web/portal/tsconfig.json').extends).toBe('../../../tsconfig.base.json');
    expect(readJson(tree, 'apps/web/portal-e2e/tsconfig.json').extends).toBe('../../../tsconfig.base.json');
  });

  it('pins test tooling the workspace installs (no happy-dom, vitest-axe or @axe-core/cypress)', async () => {
    await nuxtAppGenerator(tree, { name: 'portal', includeE2e: true });

    const app = readJson(tree, 'core/portal/package.json');
    const e2e = readJson(tree, 'core/portal-e2e/package.json');
    for (const name of ['happy-dom', 'vitest-axe', '@nuxt/test-utils']) {
      expect(app.devDependencies).not.toHaveProperty(name);
    }
    expect(e2e.devDependencies).not.toHaveProperty('@axe-core/cypress');
    expect(app.devDependencies).toMatchObject({ 'axe-core': '^4.12.1', jsdom: '^27.1.0', vitest: '^4.1.11' });
    expect(e2e.devDependencies).toMatchObject({ 'axe-core': '^4.12.1', cypress: '^15.8.0' });
  });

  it('aws-sam: gated test deploy in the test Environment, built libs, and the generated SAM template', async () => {
    await nuxtAppGenerator(tree, { name: 'portal', deploymentTarget: 'aws-sam', includeE2e: false });

    const test = readWorkflow(tree, '.github/workflows/portal-cd.yml');
    expect(Object.keys(test.jobs)).toEqual(['deployable-gate', 'deploy-test']);
    const deploy = test.jobs['deploy-test']!;
    expect(deploy.needs).toBe('deployable-gate');
    expect(deploy.if).toBe("needs.deployable-gate.outputs.deployable == 'true'");
    expect(deploy.environment).toBe('test');
    expect(runs(deploy)).toContain('npm run build:libs');
    expect(runs(deploy)).toContain('--template-file core/portal/infra/template.yaml');
    expect(runs(deploy)).toContain('--parameter-overrides Stage=test');
    expect(runs(test.jobs['deployable-gate']!)).toContain("grep -qx '@tgmc/portal'");
    expect(tree.exists('core/portal/infra/template.yaml')).toBe(true);
  });

  it('aws-sam: production deploys on a published release or a confirmed dispatch, in the production Environment', async () => {
    await nuxtAppGenerator(tree, { name: 'portal', deploymentTarget: 'aws-sam', includeE2e: false });

    const prod = readWorkflow(tree, '.github/workflows/portal-cd-prod.yml');
    expect(prod.on.release.types).toEqual(['published']);
    expect(prod.on.workflow_dispatch.inputs.confirm.required).toBe(true);
    const deploy = prod.jobs['deploy-production']!;
    expect(deploy.environment).toBe('production');
    expect(runs(deploy)).toContain('"${{ github.event.inputs.confirm }}" != "deploy"');
    expect(runs(deploy)).toContain('--parameter-overrides Stage=production');
  });

  it.each(TARGETS)('%s workflows disable Husky on every job', async (deploymentTarget) => {
    await nuxtAppGenerator(tree, { name: 'portal', deploymentTarget, includeE2e: false });

    const files = ['.github/workflows/portal-cd.yml', '.github/workflows/portal-cd-prod.yml'].filter((file) =>
      tree.exists(file)
    );
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      for (const [id, job] of Object.entries(readWorkflow(tree, file).jobs)) {
        expect(job.env?.HUSKY, `${file} → ${id}`).toBe('0');
      }
    }
  });

  it('docker-node and static-cloudflare get one workflow and no SAM template', async () => {
    await nuxtAppGenerator(tree, { name: 'portal', deploymentTarget: 'docker-node', includeE2e: false });
    await nuxtAppGenerator(tree, { name: 'site', deploymentTarget: 'static-cloudflare', includeE2e: false });

    for (const name of ['portal', 'site']) {
      expect(tree.exists(`.github/workflows/${name}-cd-prod.yml`)).toBe(false);
      expect(tree.exists(`core/${name}/infra/template.yaml`)).toBe(false);
      expect(tree.read(`core/${name}/nuxt.config.ts`, 'utf-8')).not.toContain('serveStatic');
    }
  });
});
