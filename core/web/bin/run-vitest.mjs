/**
 * Vitest launcher for `@tgmc/web` (run from package root).
 *
 * On Windows, Git Bash often leaves `cwd` on a lowercase drive (`e:\…`) while Vite
 * normalizes ids to `E:/…`. Node then loads two Vitest runtimes and `describe()`
 * throws `Cannot read properties of undefined (reading 'config')` (vitest#10692).
 */
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);

const canonPath = (filePath) => {
  const resolved = realpathSync(filePath);
  return process.platform === 'win32'
    ? resolved.replace(/^([a-zA-Z]):/, (_, drive) => `${drive.toUpperCase()}:`)
    : resolved;
};

const root = canonPath(process.cwd());
const nodeBin = canonPath(process.execPath);
const vitestCli = canonPath(join(dirname(require.resolve('vitest/package.json')), 'vitest.mjs'));
const extraArgs = process.argv.slice(2);

const result = spawnSync(
  nodeBin,
  [
    vitestCli,
    'run',
    '--config',
    join(root, 'vitest.config.ts'),
    '--pool=forks',
    '--maxWorkers=1',
    '--no-file-parallelism',
    ...extraArgs,
  ],
  {
    cwd: root,
    env: { ...process.env, INIT_CWD: root },
    stdio: 'inherit',
    shell: false,
  }
);

process.exit(result.status ?? 1);
