// @vitest-environment node
import { compileStringAsync, Logger, NodePackageImporter } from 'sass-embedded';
import { describe, expect, it } from 'vitest';

import { scssImporters, scssLoadPaths } from '../config-properties/scss-additional-data';

describe('Vite Sass resolves the theme Foundation imports (pkg:foundation-sites)', () => {
  it('exports one sass-embedded NodePackageImporter (Vite compiles with sass-embedded)', () => {
    expect(scssImporters).toHaveLength(1);
    expect(scssImporters[0]).toBeInstanceOf(NodePackageImporter);
  });

  it('compiles the Foundation layout layer with the app load paths and importers', async () => {
    const { css } = await compileStringAsync(
      "@use 'sass:meta';\n@include meta.load-css('layers/contents/foundation-layout');\n",
      { loadPaths: scssLoadPaths, importers: scssImporters, logger: Logger.silent }
    );
    expect(css).toMatch(/^\.grid-x \{/m);
  }, 30_000);
});
