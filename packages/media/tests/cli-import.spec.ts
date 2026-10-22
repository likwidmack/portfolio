import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, expect, vi } from 'vitest';

/**
 * Regression: importing `@tgmc/media` from a server bundle must never run the CLI.
 *
 * Nitro rewrites `import.meta` to `globalThis._importMeta_` (the entry `server/index.mjs`
 * URL), which equals `process.argv[1]`. A "was I executed directly?" guard inside a
 * library module therefore evaluated true on the first request that loaded the chunk,
 * printed the CLI usage banner and called `process.exit(1)` — taking the admin server
 * down on `/admin/media`. The CLI entry lives in `bin/media.mjs` only.
 */
const cliSource = fileURLToPath(new URL('../src/cli.ts', import.meta.url));

describe('@tgmc/media import side effects', () => {
  const originalArgv = process.argv;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.argv = originalArgv;
    vi.restoreAllMocks();
  });

  it.each([
    ['cli module', '../src/cli.js'],
    ['package entry', '../src/index.js'],
  ])('does not run the CLI when the %s is imported with argv[1] pointing at it', async (_label, spec) => {
    // Simulate the bundled server: argv[1] resolves to the module's own URL.
    process.argv = [originalArgv[0], cliSource];
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const mod = await import(spec);
    await new Promise((r) => setTimeout(r, 20));

    expect(typeof mod.runCli).toBe('function');
    expect(exit).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('library source never calls process.exit (throw or return a code instead)', () => {
    const srcDir = fileURLToPath(new URL('../src/', import.meta.url));
    const offenders = (readdirSync(srcDir, { recursive: true }) as string[])
      .filter((f) => f.endsWith('.ts'))
      .filter((f) => /process\.exit\s*\(/.test(readFileSync(join(srcDir, f), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
