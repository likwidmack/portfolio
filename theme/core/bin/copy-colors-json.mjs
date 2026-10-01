/**
 * Copy `src/colors.json` into `dist/` after `tsc` (tsc does not emit JSON assets).
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = ['colors.json', 'theme-presets.json'];
for (const name of files) {
  const src = join(root, 'src', name);
  const dest = join(root, 'dist', name);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
}
