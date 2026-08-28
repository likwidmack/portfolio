/**
 * Vitest launcher for `@tgmc/web` (run from package root).
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const root = process.cwd();
const require = createRequire(import.meta.url);
const vitestCli = join(dirname(require.resolve('vitest/package.json')), 'vitest.mjs');

const result = spawnSync(
  process.execPath,
  [
    vitestCli,
    'run',
    '--config',
    join(root, 'vitest.config.ts'),
    '--pool=forks',
    '--maxWorkers=1',
    '--no-file-parallelism',
  ],
  {
    cwd: root,
    env: { ...process.env, INIT_CWD: root },
    stdio: 'inherit',
    shell: false,
  }
);

process.exit(result.status ?? 1);
