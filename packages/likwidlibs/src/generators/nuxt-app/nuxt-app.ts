import { formatFiles, generateFiles, joinPathFragments, offsetFromRoot, Tree, updateJson } from '@nx/devkit';
import * as path from 'path';
import { NuxtAppGeneratorSchema } from './schema';

interface RootTsConfig {
  references?: Array<{ path: string }>;
}

/**
 * Scaffold the companion Cypress E2E project. Nx infers its graph entry from its package.json,
 * like `core/web-e2e`; no project.json.
 */
function scaffoldCompanionE2e(tree: Tree, name: string, directory: string) {
  const e2eRoot = joinPathFragments(directory, `${name}-e2e`);
  generateFiles(tree, path.join(__dirname, 'files-e2e'), e2eRoot, {
    name,
    offsetFromRoot: offsetFromRoot(e2eRoot),
    tmpl: '',
  });
}

export async function nuxtAppGenerator(tree: Tree, options: NuxtAppGeneratorSchema) {
  const directory = options.directory || 'core';
  const name = options.name;
  const projectRoot = joinPathFragments(directory, name);
  const deploymentTarget = options.deploymentTarget || 'aws-sam';
  const includeE2e = options.includeE2e ?? true;

  // 1. Application files; Nx infers targets from package.json scripts and the config files
  generateFiles(tree, path.join(__dirname, 'files'), projectRoot, {
    name,
    directory,
    deploymentTarget,
    offsetFromRoot: offsetFromRoot(projectRoot),
    dot: '.',
    tmpl: '',
  });

  // 2. Companion E2E project
  if (includeE2e) {
    scaffoldCompanionE2e(tree, name, directory);
  }

  // 3. CD workflow(s) for the target; aws-sam also gets a production workflow and its SAM template
  generateFiles(tree, path.join(__dirname, 'files-workflows', deploymentTarget), '.github/workflows', {
    name,
    projectRoot,
    tmpl: '',
  });
  if (deploymentTarget === 'aws-sam') {
    generateFiles(tree, path.join(__dirname, 'files-aws-sam'), projectRoot, { name, tmpl: '' });
  }

  // 4. Root tsconfig.json references
  if (tree.exists('tsconfig.json')) {
    updateJson<RootTsConfig>(tree, 'tsconfig.json', (json) => {
      json.references = json.references || [];
      const refPath = `./${projectRoot}`;
      if (!json.references.some((r) => r.path === refPath)) {
        json.references.push({ path: refPath });
      }
      if (includeE2e) {
        const e2eRefPath = `./${directory}/${name}-e2e`;
        if (!json.references.some((r) => r.path === e2eRefPath)) {
          json.references.push({ path: e2eRefPath });
        }
      }
      return json;
    });
  }

  await formatFiles(tree);
}

export default nuxtAppGenerator;
