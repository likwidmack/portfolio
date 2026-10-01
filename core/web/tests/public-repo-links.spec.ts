import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

import { PUBLIC_REPO, publicSourceUrl, publicTreeUrl } from '../shared/public-repo';

const workspace = join(import.meta.dirname, '..', '..', '..');

function walk(dir: string, match: (file: string) => boolean, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, match, out);
    else if (match(full)) out.push(full);
  }
  return out;
}

describe('public repo links', () => {
  it('builds blob and tree URLs on likwidmack/portfolio main', () => {
    expect(PUBLIC_REPO.url).toBe('https://github.com/likwidmack/portfolio');
    expect(publicSourceUrl('/core/web/shared/blog-types.ts')).toBe(
      'https://github.com/likwidmack/portfolio/blob/main/core/web/shared/blog-types.ts'
    );
    expect(publicTreeUrl('packages/utilities/')).toBe(
      'https://github.com/likwidmack/portfolio/tree/main/packages/utilities'
    );
    expect(publicTreeUrl()).toBe('https://github.com/likwidmack/portfolio');
  });

  it('never links code or docs to the private source repo (Actions / issues links are allowed)', () => {
    const files = [
      ...walk(join(workspace, 'docs'), (file) => file.endsWith('.md')),
      ...walk(join(workspace, 'core/web/content'), (file) => file.endsWith('.json')),
      ...walk(join(workspace, 'packages'), (file) => file.endsWith('package.json')),
      join(workspace, 'README.md'),
    ];
    const offenders = files.flatMap((file) =>
      /github\.com\/tamaramack\/portfolio(\/(blob|tree)\/|#readme)/.test(readFileSync(file, 'utf8'))
        ? [relative(workspace, file)]
        : []
    );
    expect(offenders).toEqual([]);
  });
});
