import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const nuxtConfigPath = join(import.meta.dirname, '../nuxt.config.ts');

describe('AWS CDN Nuxt contract', () => {
  it('disables Nitro static serving on aws_lambda and wires app.cdnURL', async () => {
    const config = await readFile(nuxtConfigPath, 'utf8');

    expect(config).toMatch(/nitroPreset === 'aws_lambda' \? \{ serveStatic: false/);
    expect(config).toMatch(/cdnURL: CDN_URL/);
    expect(config).toMatch(/NUXT_APP_CDN_URL/);
    expect(config).toMatch(/Lambda CodeUri is server-only/);
  });
});
