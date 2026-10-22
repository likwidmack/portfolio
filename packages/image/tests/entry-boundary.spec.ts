import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const srcDir = resolve(dirname(fileURLToPath(import.meta.url)), '../src');

/** Every source file and bare package the main entry reaches through static imports. */
function moduleGraph(entry: string): { files: Set<string>; packages: Set<string> } {
  const files = new Set<string>();
  const packages = new Set<string>();
  const stack = [entry];
  while (stack.length > 0) {
    const file = stack.pop() as string;
    if (files.has(file)) {
      continue;
    }
    files.add(file);
    const source = readFileSync(join(srcDir, file), 'utf8');
    for (const match of source.matchAll(/(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]/g)) {
      const spec = match[1];
      if (spec.startsWith('.')) {
        stack.push(join(dirname(file), spec).replace(/\\/g, '/').replace(/\.js$/, '.ts'));
      } else {
        packages.add(spec);
      }
    }
  }
  return { files, packages };
}

describe('@tgmc/image main entry (bundled into Nitro / Lambda)', () => {
  it('never reaches the sanitizer, svgo, pdf-lib or ffmpeg', () => {
    const { files, packages } = moduleGraph('index.ts');
    expect([...files].filter((file) => /sanitize|mp4-boxes|media-probe|ffmpeg/.test(file))).toEqual([]);
    expect([...packages].filter((name) => /svgo|pdf-lib|ffmpeg/.test(name))).toEqual([]);
  });

  it('the sanitize entry does reach them (the walker works)', () => {
    const { packages } = moduleGraph('sanitize.ts');
    expect(packages).toContain('svgo');
    expect(packages).toContain('pdf-lib');
  });
});

describe('@tgmc/image package.json (staged into the MediaWorker Lambda by sam-build)', () => {
  const pkg = JSON.parse(readFileSync(resolve(srcDir, '../package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    peerDependenciesMeta?: Record<string, { optional?: boolean }>;
    devDependencies?: Record<string, string>;
  };

  it.each(['svgo', 'pdf-lib', 'ffmpeg-static'])(
    '%s is an optional peer, never installed with the runtime deps',
    (name) => {
      expect(pkg.dependencies?.[name]).toBeUndefined();
      expect(pkg.optionalDependencies?.[name]).toBeUndefined();
      expect(pkg.peerDependencies?.[name]).toBeDefined();
      expect(pkg.peerDependenciesMeta?.[name]?.optional).toBe(true);
    }
  );

  it.each(['svgo', 'pdf-lib'])('%s is a devDependency for the tests', (name) => {
    expect(pkg.devDependencies?.[name]).toBe(pkg.peerDependencies?.[name]);
  });
});
