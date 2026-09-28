import { Tree, readProjectConfiguration } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import { libGenGenerator } from '../../../src/generators/lib-gen/lib-gen';
import { LibGenGeneratorSchema } from '../../../src/generators/lib-gen/schema';

describe('lib-gen generator', () => {
  let tree: Tree;
  const options: LibGenGeneratorSchema = { name: 'test' };

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should run successfully', async () => {
    await libGenGenerator(tree, options);
    const config = readProjectConfiguration(tree, 'test');
    expect(config).toBeDefined();
  });
});
