import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const nuxtConfigPath = join(import.meta.dirname, '../nuxt.config.ts');
const navPath = join(import.meta.dirname, '../app/components/AppPrimaryNav.vue');
const envDocsPath = join(import.meta.dirname, '../../../docs/web/setup/environment.md');

describe('dev env UI Nuxt config contract', () => {
  it('wires showEnvIndicator and a11y per Nuxt env layer', async () => {
    const config = await readFile(nuxtConfigPath, 'utf8');

    expect(config).toMatch(/\$development:\s*\{[\s\S]*showEnvIndicator:\s*true/);
    expect(config).toMatch(/\$test:\s*\{[\s\S]*showEnvIndicator:\s*true/);
    expect(config).toMatch(/\$production:\s*\{[\s\S]*showEnvIndicator:\s*false/);
    expect(config).toMatch(/\$production:\s*\{[\s\S]*a11y:\s*\{[\s\S]*enabled:\s*false/);
    expect(config).not.toMatch(/\$env:\s*undefined/);
    expect(config).not.toMatch(/\$meta:\s*undefined/);
  });

  it('renders a plain span env chip from resolveEnvIndicator', async () => {
    const nav = await readFile(navPath, 'utf8');

    expect(nav).toContain('resolveEnvIndicator');
    expect(nav).toContain('showEnvIndicator');
    expect(nav).toContain('span.app-env-chip');
    expect(nav).toContain('envChip.ariaLabel');
  });

  it('documents showEnvIndicator vs SYS_ENV chip label', async () => {
    const docs = await readFile(envDocsPath, 'utf8');

    expect(docs).toContain('showEnvIndicator');
    expect(docs).toMatch(/SYS_ENV/i);
  });
});
