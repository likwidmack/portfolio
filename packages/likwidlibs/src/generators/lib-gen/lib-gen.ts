import { addProjectConfiguration, formatFiles, generateFiles, installPackagesTask, Tree } from '@nx/devkit';
import { libraryGenerator } from '@nx/js';
import * as path from 'path';
import { LibGenGeneratorSchema } from './schema';

export async function init(tree: Tree, schema: any) {
  await libraryGenerator(tree, { directory: '', name: schema.name });
  await formatFiles(tree);
  return () => {
    installPackagesTask(tree);
  };
}
export async function libGenGenerator(tree: Tree, options: LibGenGeneratorSchema) {
  const projectRoot = `libs/${options.name}`;
  addProjectConfiguration(tree, options.name, {
    root: projectRoot,
    projectType: 'library',
    sourceRoot: `${projectRoot}/src`,
    targets: {},
  });
  generateFiles(tree, path.join(__dirname, 'files'), projectRoot, options);
  await formatFiles(tree);
}

export default libGenGenerator;
