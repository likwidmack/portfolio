import { join } from 'node:path';
import * as sass from 'sass';
import { describe, expect, it } from 'vitest';

/**
 * Foundation CSS from npm `foundation-sites`. The layout snapshot was written from the vendored
 * copy and must stay byte-identical. The normalize snapshot is upstream normalize: it differs from
 * the vendored copy only in the file-upload selector (the vendored `input[type='file']` fix is
 * archived in `scss/_archive/2026-10-14-foundation-normalize/`). Comments are stripped before
 * comparing: only the vendored `layout.scss` carried a loud header comment.
 */

const themeRoot = join(import.meta.dirname, '..');

/** Compiles one `layers/contents` partial the way `layers/_foundation.scss` loads it, without comments. */
function compileLayer(partial: string): string {
  const { css } = sass.compileString(`@use 'sass:meta';\n@include meta.load-css('${partial}');\n`, {
    loadPaths: [join(themeRoot, 'scss')],
    importers: [new sass.NodePackageImporter(themeRoot)],
    style: 'expanded',
    logger: sass.Logger.silent,
  });
  return `${css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\n\s*\n/g, '\n')
    .trim()}\n`;
}

const UPLOAD_BUTTON = '::-webkit-file-upload-button';
const UPSTREAM_UPLOAD_BUTTON = /^::-webkit-file-upload-button \{$/m;
const VENDORED_UPLOAD_BUTTON = 'input[type=file]::-webkit-file-upload-button';
const count = (css: string, text: string) => css.split(text).length - 1;

describe('Foundation layers compile from npm foundation-sites', () => {
  it('layout mode: XY Grid, flex and visibility classes (byte-identical to the vendored copy)', async () => {
    const css = compileLayer('layers/contents/foundation-layout');
    expect(css).toMatch(/^\.grid-x \{/m);
    expect(css).toMatch(/^\.cell \{/m);
    expect(css).toMatch(/^\.flex-container \{/m);
    expect(css).toMatch(/^\s+\.hide-for-medium \{/m);
    await expect(css).toMatchFileSnapshot('./__snapshots__/foundation-layout.css.snap');
  }, 30_000);

  it('normalize layer: upstream normalize, with the unqualified upload-button rule', async () => {
    const css = compileLayer('layers/contents/normalize');
    expect(count(css, UPLOAD_BUTTON)).toBe(1);
    expect(css).toMatch(UPSTREAM_UPLOAD_BUTTON);
    expect(css).not.toContain(VENDORED_UPLOAD_BUTTON);
    await expect(css).toMatchFileSnapshot('./__snapshots__/foundation-normalize.css.snap');
  }, 30_000);

  it('full mode (foundation-everything) emits upstream normalize once', () => {
    const css = compileLayer('layers/contents/foundation-full');
    expect(count(css, UPLOAD_BUTTON)).toBe(1);
    expect(css).toMatch(UPSTREAM_UPLOAD_BUTTON);
  }, 60_000);
});
