import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as sass from 'sass';
import { describe, expect, it } from 'vitest';

const scssRoot = join(dirname(fileURLToPath(import.meta.url)), '../scss');

function compileProbe(source: string): string {
  return sass.compileString(source, {
    loadPaths: [scssRoot],
    style: 'expanded',
  }).css;
}

describe('scss color-fns', () => {
  it('compiles theme helpers and probes expected behavior', () => {
    const css = compileProbe(`
      @use 'sass:color';
      @use 'sass:list';
      @use 'sass:meta';
      @use 'tokens/color-fns' as *;

      $mid: #808080;
      $lightened: theme-lighten($mid, 10%);
      $darkened: theme-darken($mid, 10%);
      $analogous: theme-analogous(#ac1922);
      $complement: theme-complementary(#ac1922);
      $ratio: theme-contrast-ratio(#000000, #ffffff);

      :root {
        --probe-ok: #{meta.type-of($lightened)};
        --probe-lighten-l: #{meta.inspect(color.channel($lightened, "lightness", $space: hsl))};
        --probe-darken-l: #{meta.inspect(color.channel($darkened, "lightness", $space: hsl))};
        --probe-mid-l: #{meta.inspect(color.channel($mid, "lightness", $space: hsl))};
        --probe-analogous-len: #{list.length($analogous)};
        --probe-complement: #{meta.type-of($complement)};
        --probe-ratio: #{$ratio};
        --probe-ink-light-bg: #{theme-contrast-ink(#faf6f3)};
        --probe-ink-dark-bg: #{theme-contrast-ink(#0f0908)};
      }
    `);

    expect(css).toMatch(/--probe-ok:\s*color/);
    expect(css).toMatch(/--probe-analogous-len:\s*2/);
    expect(css).toMatch(/--probe-complement:\s*color/);
    expect(css).toMatch(/--probe-ratio:\s*([2-9]\d|[3-9]\d)/);

    const midL = Number(css.match(/--probe-mid-l:\s*([\d.]+)%/)?.[1]);
    const lightL = Number(css.match(/--probe-lighten-l:\s*([\d.]+)%/)?.[1]);
    const darkL = Number(css.match(/--probe-darken-l:\s*([\d.]+)%/)?.[1]);
    expect(midL).toBeGreaterThan(0);
    expect(lightL).toBeGreaterThan(midL);
    expect(darkL).toBeLessThan(midL);

    expect(css).toMatch(/--probe-ink-light-bg:\s*#1c1412/i);
    expect(css).toMatch(/--probe-ink-dark-bg:\s*#f2ece8/i);
  });

  it('compiles tokens module with theme-darken/lighten demo accents', () => {
    const css = compileProbe(`
      @use 'tokens/colors' as c;

      :root {
        --dark-accent: #{c.$main-background-dark-accent};
        --light-accent: #{c.$main-background-light-accent};
      }
    `);

    expect(css).toMatch(/--dark-accent:\s*(#|rgb|hsl|hwb|lab|lch|oklab|oklch)/i);
    expect(css).toMatch(/--light-accent:\s*(#|rgb|hsl|hwb|lab|lch|oklab|oklch)/i);
  });

  it('forwards theme-* helpers from nuxt-auto (Vue SFC inject parity)', () => {
    const css = compileProbe(`
      @use 'sass:meta';
      @use 'nuxt-auto' as *;

      :root {
        --nuxt-auto-lighten: #{meta.type-of(theme-lighten(#808080, 10%))};
        --nuxt-auto-accent: #{meta.type-of($accent-color-dark)};
      }
    `);

    expect(css).toMatch(/--nuxt-auto-lighten:\s*color/);
    expect(css).toMatch(/--nuxt-auto-accent:\s*color/);
  });

  it('exposes foundation accent token from foundation-settings bridge', () => {
    const css = compileProbe(`
      @use 'sass:meta';
      @use 'bridges/foundation-settings' as *;

      :root {
        --foundation-accent-hex: #{meta.type-of($foundation-accent-color)};
      }
    `);

    expect(css).toMatch(/--foundation-accent-hex:\s*color/);
  });
});
