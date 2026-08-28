import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { DOCS_COLLECTION_INCLUDE, REPO_DOCS_DIR } from '../shared/docs-source';

const contentDir = join(import.meta.dirname, '../content');
const contentConfigPath = join(import.meta.dirname, '../content.config.ts');
const dockerfileApp = join(import.meta.dirname, '../../../docker/Dockerfile.app');

describe('docs markdown packaging', () => {
  it('points the Content collection at the repo docs tree in place', async () => {
    expect(existsSync(join(REPO_DOCS_DIR, 'contributing.md'))).toBe(true);
    expect(existsSync(join(REPO_DOCS_DIR, 'web/reference/architecture.md'))).toBe(true);
    expect(DOCS_COLLECTION_INCLUDE).toBe('**/*.md');

    const config = await readFile(contentConfigPath, 'utf8');
    expect(config).toContain('cwd: REPO_DOCS_DIR');
    expect(config).not.toContain("cwd: '../../docs'");
  });

  it('does not duplicate markdown into core/web/content', async () => {
    const { readdir } = await import('node:fs/promises');
    const names = await readdir(contentDir, { recursive: true });
    const markdown = names.filter((name) => name.endsWith('.md'));
    expect(markdown).toEqual([]);
  });

  it('ships docs via host Nitro output instead of copying markdown into Dockerfile.app', async () => {
    if (!existsSync(dockerfileApp)) {
      return;
    }
    const dockerfile = await readFile(dockerfileApp, 'utf8');
    expect(dockerfile).toContain('COPY --chown=node:node .output/${SYS_ENV} ./.output');
    expect(dockerfile).not.toContain('COPY docs ./docs');
  });
});
