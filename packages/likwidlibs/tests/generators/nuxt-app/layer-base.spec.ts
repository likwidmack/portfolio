// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const packagesRoot = join(__dirname, '../../../..');
const read = (relativePath: string) => readFileSync(join(packagesRoot, relativePath), 'utf8');

/** Names exported by `@tgmc/utilities/universal` (`export { a, b as c }` → a, c). */
const universalExports = (): Set<string> =>
  new Set(
    [...read('utilities/src/universal.ts').matchAll(/^export (?:type )?\{([^}]+)\}/gm)].flatMap((match) =>
      match[1]!
        .split(',')
        .map((part) =>
          part
            .trim()
            .split(/\s+as\s+/)
            .pop()!
            .trim()
        )
        .filter(Boolean)
    )
  );

describe('@tgmc/nuxt-layer-base auto-imports', () => {
  it('reads the universal entry exports', () => {
    expect(universalExports().has('resolveCdnPath')).toBe(true);
  });

  it('auto-imports only names @tgmc/utilities/universal really exports', () => {
    const config = read('nuxt-layer-base/nuxt.config.ts');
    const names = [...config.matchAll(/from: '@tgmc\/utilities\/universal',\s*name: '([^']+)'/g)].map((m) => m[1]!);
    const exported = universalExports();
    expect(names.filter((name) => !exported.has(name))).toEqual([]);
  });
});
