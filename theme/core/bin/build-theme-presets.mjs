#!/usr/bin/env node
/**
 * Regenerate `src/theme-presets.json` (the Theme Studio catalog `Theme.presets()` serves) from
 * `buildStudioPresets()`, which derives it from `colors.json` palettes and the Sass light / dark
 * hue pairs. Run after palettes or the preset rules change:
 *
 *   npm run build:presets --workspace=@tgmc/theme
 *
 * It compiles the library first (the builder is TypeScript), then writes the JSON Prettier-formatted
 * so a no-op run leaves the file unchanged. `tests/theme-singleton.spec.ts` fails when the committed
 * JSON drifts from the builder.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { buildStudioPresets } = await import(pathToFileURL(join(root, 'dist', 'studio-presets.js')).href);
const target = join(root, 'src', 'theme-presets.json');

const json = `${JSON.stringify({ presets: buildStudioPresets() }, null, 2)}\n`;
let output = json;
try {
  const prettier = await import('prettier');
  const config = (await prettier.resolveConfig(target)) ?? {};
  output = await prettier.format(json, { ...config, filepath: target });
} catch {
  // Prettier is a dev dependency of the workspace; without it the JSON is still valid, just unformatted.
}
writeFileSync(target, output);
console.log(`Wrote ${target} (${buildStudioPresets().length} presets)`);
